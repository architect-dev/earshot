import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { type DocumentSnapshot, type Timestamp } from 'firebase/firestore';
import { getUserConversations } from '@/services/conversations';
import { getConversationMessages } from '@/services/messages';
import { subscribeToQuery, COLLECTIONS, where, orderBy, limit } from '@/services/firebase/firestore';
import { type PendingMessage, type Conversation, type Message } from '@/types';
import { GetProfileByIdFn, type Profile } from '@/types/profile';
import { useAuth } from './AuthContext';
import { useFriends } from './FriendsContext';

// Enriched conversation with participant profile data
export interface EnrichedConversation extends Conversation {
  participantProfiles: Profile[];
  typing: string[]; // Computed: array of user IDs currently typing (filtered from typingTimestamp)
}

// Messages for a conversation
export interface ConversationMessages {
  messages: Message[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
  lastFetchedAt: Timestamp;
}
// Helper function to enrich a conversation with friend data
function enrichConversation(conv: Conversation, getProfileById: GetProfileByIdFn): EnrichedConversation {
  const participantProfiles: Profile[] = [];

  // Enrich with all participants' profiles from FriendsContext
  for (const participantId of conv.participants) {
    const profile = getProfileById(participantId);
    if (profile != null) participantProfiles.push(profile);
  }

  // console.log('enrichConversation', conv.participants, participantProfiles);

  // Compute initial typing array (filter stale typing states)
  const now = Math.round(Date.now() / 1000);
  const STALE_TYPING_SECONDS = 4;
  const typing: string[] = conv.typingTimestamp
    ? Object.entries(conv.typingTimestamp)
        .filter(([_userId, timestamp]) => {
          if (timestamp == null) return false;
          const age = now - timestamp.seconds;
          return age <= STALE_TYPING_SECONDS;
        })
        .map(([userId]) => userId)
    : [];

  return {
    ...conv,
    participantProfiles,
    typing,
  };
}

interface ConversationsContextValue {
  conversations: EnrichedConversation[];
  loading: boolean;
  error: Error | null;
  refreshConversations: () => Promise<void>;
  getConversationById: (conversationId: string) => EnrichedConversation | undefined;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  // Message methods
  getMessages: (conversationId: string) => ConversationMessages | undefined;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  messagesLoading: Map<string, boolean>;
  moreMessagesLoading: Map<string, boolean>;
  // Pending message methods
  addPendingMessage: (conversationId: string, pendingMessage: PendingMessage) => void;
  removePendingMessage: (conversationId: string, pendingId: string) => void;
  getPendingMessages: (conversationId: string) => PendingMessage[];
  updatePendingMessageStatus: (conversationId: string, pendingId: string, status: 'sending' | 'failed') => void;
  onConversationClosed: (conversationId: string) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

interface ConversationsProviderProps {
  children: ReactNode;
}

export function ConversationsProvider({ children }: ConversationsProviderProps) {
  const { user } = useAuth();
  const { loading: friendsLoading, getProfileById } = useFriends();
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Map<string, ConversationMessages>>(new Map());
  const [messagesLoading, setMessagesLoading] = useState<Map<string, boolean>>(new Map());
  const [moreMessagesLoading, setMoreMessagesLoading] = useState<Map<string, boolean>>(new Map());
  const [pendingMessages, setPendingMessages] = useState<Map<string, PendingMessage[]>>(new Map());

  // Track subscriptions for cleanup
  const conversationsUnsubscribeRef = useRef<(() => void) | null>(null);
  const messagesUnsubscribeRefs = useRef<Map<string, () => void>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Pre-fetch messages for all conversations
  const preFetchMessages = useCallback(async (conversationIds: string[]) => {
    if (conversationIds.length === 0) return;

    // Set loading for all conversations
    setMessagesLoading((prev) => {
      const newMap = new Map(prev);
      conversationIds.forEach((id) => newMap.set(id, true));
      return newMap;
    });

    try {
      // Load messages for all conversations in parallel
      const messagePromises = conversationIds.map(async (conversationId) => {
        try {
          const result = await getConversationMessages(conversationId, null);
          return {
            conversationId,
            messagesData: {
              messages: result.messages,
              cursor: result.lastDoc,
              hasMore: result.hasMore,
              lastFetchedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp,
            },
          };
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Error pre-fetching messages for conversation ${conversationId}:`, err);
          return null;
        }
      });

      const results = await Promise.all(messagePromises);

      // Update messages with all fetched data
      setMessages((prev) => {
        const newMap = new Map(prev);
        results.forEach((result) => {
          if (result) {
            newMap.set(result.conversationId, result.messagesData);
          }
        });
        return newMap;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error pre-fetching messages:', err);
    } finally {
      // Clear loading for all conversations
      setMessagesLoading((prev) => {
        const newMap = new Map(prev);
        conversationIds.forEach((id) => newMap.set(id, false));
        return newMap;
      });
    }
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user || friendsLoading) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Get all conversations for the user
      const userConversations = await getUserConversations(user.uid);

      // Enrich conversations with friend data
      const enriched = userConversations.map((conv) => enrichConversation(conv, getProfileById));

      setConversations(enriched);

      // Pre-fetch messages for all conversations (don't await - load in background)
      const conversationIds = enriched.map((conv) => conv.id);
      preFetchMessages(conversationIds).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error pre-fetching messages:', err);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
      // eslint-disable-next-line no-console
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getProfileById, friendsLoading, preFetchMessages]);

  // Load conversations when user changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!user) {
      return;
    }

    // Subscribe to conversations query
    const unsubscribe = subscribeToQuery<Conversation>(
      COLLECTIONS.CONVERSATIONS,
      [where('participants', 'array-contains', user.uid), orderBy('lastMessageAt', 'desc')],
      (updatedConversations) => {
        setConversations((prev) => {
          const prevMap = new Map(prev.map((c) => [c.id, c]));

          // Merge conversations, handling unread count updates for new messages
          const merged = updatedConversations.map((conv) => {
            const prevConv = prevMap.get(conv.id);

            // Check if latestMessage changed (new message arrived)
            const latestMessageChanged =
              prevConv && conv.latestMessage?.id !== prevConv.latestMessage?.id && conv.latestMessage !== null;

            const isFromOtherUser = conv.latestMessage?.senderId !== user.uid;
            const isConversationActive = activeConversationIdRef.current === conv.id;

            // Update unread counts if new message from other user and conversation not active
            let updatedUnreadCounts = { ...conv.unreadCounts };
            if (latestMessageChanged && isFromOtherUser && !isConversationActive) {
              updatedUnreadCounts[user.uid] = (updatedUnreadCounts[user.uid] || 0) + 1;
            }

            // Merge with previous conversation data
            const mergedConv: Conversation = {
              ...conv,
              latestMessage: conv.latestMessage || prevConv?.latestMessage || null,
              unreadCounts: updatedUnreadCounts,
            };

            // Enrich the conversation with friend data
            return enrichConversation(mergedConv, getProfileById);
          });

          return merged;
        });
      }
    );

    conversationsUnsubscribeRef.current = unsubscribe;

    // 1-second interval to filter stale typing states
    const typingInterval = setInterval(() => {
      setConversations((prev) => {
        return prev.map((conv) => {
          return enrichConversation(conv, getProfileById);
        });
      });
    }, 1000); // Every 1 second

    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current();
        conversationsUnsubscribeRef.current = null;
      }
      clearInterval(typingInterval);
    };
  }, [user, getProfileById]);

  // Memoize conversation IDs - only changes when IDs actually change (not when conversation data updates)
  // Create a stable sorted array that only changes when the actual IDs change
  const conversationIdsKey = useMemo(() => {
    return conversations
      .map((c) => c.id)
      .sort()
      .join(',');
  }, [conversations]);

  const conversationIds = useMemo(() => {
    const ids = conversations.map((c) => c.id);
    return [...ids].sort(); // Sort for stable comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdsKey]); // Only re-compute when the key (IDs) changes, not when conversation data changes

  // Subscribe to real-time message updates for all conversations
  useEffect(() => {
    if (!user || conversationIds.length === 0) {
      return;
    }

    // Capture ref at start of effect
    const currentRef = messagesUnsubscribeRefs.current;

    const isInitialSnapshot = new Map<string, boolean>();
    const subscriptionsCreated = new Map<string, () => void>();

    conversationIds.forEach((conversationId) => {
      // Only subscribe if we don't already have a subscription
      if (!currentRef.has(conversationId)) {
        isInitialSnapshot.set(conversationId, true);

        try {
          const unsubscribe = subscribeToQuery<Message>(
            COLLECTIONS.MESSAGES,
            [
              where('conversationId', '==', conversationId),
              orderBy('createdAt', 'desc'),
              limit(50), // Get the 50 most recent messages for real-time updates
            ],
            (subscriptionMessages) => {
              const isInitial = isInitialSnapshot.get(conversationId);
              if (isInitial) {
                // First snapshot - ignore, we already have messages from pre-fetch
                isInitialSnapshot.set(conversationId, false);
                return;
              }

              if (subscriptionMessages.length === 0) {
                return;
              }

              // Remove pending messages for any messages that have a pendingId
              subscriptionMessages.forEach((msg) => {
                if (msg.pendingId) {
                  removePendingMessage(conversationId, msg.pendingId);
                }
              });

              // Merge subscription messages with cached messages
              setMessages((prev) => {
                const existing = prev.get(conversationId);
                if (!existing) {
                  return prev; // Messages not initialized yet
                }

                // Create a map of subscription messages by ID for fast lookup
                const subscriptionMessagesMap = new Map<string, Message>();
                subscriptionMessages.forEach((msg) => {
                  subscriptionMessagesMap.set(msg.id, msg);
                });

                // Merge logic:
                // 1. Update existing messages if they're in the subscription (handles deletions/updates)
                // 2. Keep older messages that aren't in the subscription
                // 3. Add new messages from subscription that aren't in cache
                const mergedMessages: Message[] = [];
                const subscriptionMessageIds = new Set(subscriptionMessagesMap.keys());

                // console.log('existing messages', existing.messages);

                // Process cached messages
                existing.messages.forEach((cachedMsg) => {
                  if (subscriptionMessageIds.has(cachedMsg.id)) {
                    // Message is in subscription - use the subscription version (handles updates/deletions)
                    mergedMessages.push(subscriptionMessagesMap.get(cachedMsg.id)!);
                  } else {
                    // Message is not in subscription (older than top 50) - keep cached version
                    mergedMessages.push(cachedMsg);
                  }
                });

                // console.log('mergedMessages', mergedMessages);

                // Add any new messages from subscription that aren't in cache
                subscriptionMessages.forEach((subMsg) => {
                  const existsInCache = existing.messages.some((msg) => msg.id === subMsg.id);
                  if (!existsInCache) {
                    // New message - add it (will be sorted by createdAt below)
                    mergedMessages.push(subMsg);
                  }
                });

                // console.log('mergedMessages after new messages', mergedMessages);

                // Sort by createdAt desc (most recent first)
                mergedMessages.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

                // Update lastFetchedAt to the most recent message's timestamp
                const mostRecentTimestamp =
                  mergedMessages.length > 0 ? mergedMessages[0].createdAt : existing.lastFetchedAt;

                const newMap = new Map(prev);
                newMap.set(conversationId, {
                  ...existing,
                  messages: mergedMessages,
                  lastFetchedAt: mostRecentTimestamp,
                });

                return newMap;
              });
            }
          );

          currentRef.set(conversationId, unsubscribe);
          subscriptionsCreated.set(conversationId, unsubscribe);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Messages Subscription] Error creating subscription for:', conversationId, err);
        }
      }
    });

    // Cleanup: unsubscribe from conversations that no longer exist
    currentRef.forEach((unsubscribe, conversationId) => {
      if (!conversationIds.includes(conversationId)) {
        unsubscribe();
        currentRef.delete(conversationId);
      }
    });

    return () => {
      // Cleanup subscriptions created in this effect
      subscriptionsCreated.forEach((unsubscribe, conversationId) => {
        unsubscribe();
        // Remove from ref as well (using captured ref)
        currentRef.delete(conversationId);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversationIds]);

  // Get conversation by ID
  const getConversationById = useCallback(
    (conversationId: string): EnrichedConversation | undefined => {
      return conversations.find((c) => c.id === conversationId);
    },
    [conversations]
  );

  // Get messages for a conversation
  const getMessages = useCallback(
    (conversationId: string): ConversationMessages | undefined => {
      return messages.get(conversationId);
    },
    [messages]
  );

  // Load more messages for a conversation (pagination)
  const loadMoreMessages = useCallback(
    async (conversationId: string) => {
      const existing = messages.get(conversationId);
      if ((!existing || !existing.cursor || !existing.hasMore || moreMessagesLoading.get(conversationId)) ?? false)
        return;

      setMoreMessagesLoading((prev) => {
        const newMap = new Map(prev);
        newMap.set(conversationId, true);
        return newMap;
      });

      try {
        const result = await getConversationMessages(conversationId, existing.cursor);
        setMessages((prev) => {
          const newMap = new Map(prev);
          const existingData = newMap.get(conversationId);
          if (existingData) {
            // Create a Set of existing message IDs to prevent duplicates
            const existingMessageIds = new Set(existingData.messages.map((msg) => msg.id));

            // Filter out any messages that already exist
            const newMessages = result.messages.filter((msg) => !existingMessageIds.has(msg.id));

            newMap.set(conversationId, {
              messages: [...existingData.messages, ...newMessages],
              cursor: result.lastDoc,
              hasMore: result.hasMore,
              lastFetchedAt: existingData.lastFetchedAt,
            });
          }
          return newMap;
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error loading more messages for conversation ${conversationId}:`, err);
      } finally {
        setMoreMessagesLoading((prev) => {
          const newMap = new Map(prev);
          newMap.set(conversationId, false);
          return newMap;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]
  );

  // Pending message management functions
  const addPendingMessage = useCallback(
    (conversationId: string, pendingMessage: PendingMessage) => {
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(conversationId) || [];

        // Check if a real message with this pendingId already exists (race condition protection)
        const messagesData = messages.get(conversationId);
        if (messagesData?.messages.some((msg) => msg.pendingId === pendingMessage.pendingId)) {
          // Real message already exists, don't add pending
          return prev;
        }

        newMap.set(conversationId, [...existing, pendingMessage]);
        return newMap;
      });
    },
    [messages]
  );

  const removePendingMessage = useCallback((conversationId: string, pendingId: string) => {
    setPendingMessages((prev) => {
      const newMap = new Map(prev);
      const conversationPending = newMap.get(conversationId) || [];
      const filtered = conversationPending.filter((p) => p.pendingId !== pendingId);
      if (filtered.length === 0) {
        newMap.delete(conversationId);
      } else {
        newMap.set(conversationId, filtered);
      }
      return newMap;
    });
  }, []);

  const getPendingMessages = useCallback(
    (conversationId: string): PendingMessage[] => {
      return pendingMessages.get(conversationId) || [];
    },
    [pendingMessages]
  );

  const updatePendingMessageStatus = useCallback(
    (conversationId: string, pendingId: string, status: 'sending' | 'failed') => {
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        const conversationPending = newMap.get(conversationId) || [];
        const updated = conversationPending.map((p) => (p.pendingId === pendingId ? { ...p, status } : p));
        newMap.set(conversationId, updated);
        return newMap;
      });
    },
    []
  );

  const clearPendingMessages = useCallback((conversationId: string) => {
    setPendingMessages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  const onConversationClosed = useCallback(
    (conversationId: string) => {
      clearPendingMessages(conversationId);
      // Future: Add other cleanup logic here (e.g., unsubscribe from typing indicators)
    },
    [clearPendingMessages]
  );

  // Loading is true if conversations are loading OR friends are loading
  const isLoading = loading || friendsLoading;

  const value: ConversationsContextValue = {
    conversations,
    loading: isLoading,
    error,
    refreshConversations: loadConversations,
    getConversationById,
    activeConversationId,
    setActiveConversationId,
    getMessages,
    loadMoreMessages,
    messagesLoading,
    moreMessagesLoading,
    addPendingMessage,
    removePendingMessage,
    getPendingMessages,
    updatePendingMessageStatus,
    onConversationClosed,
  };

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations(): ConversationsContextValue {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
}

// Hook to get conversation and messages for a specific conversation ID
export function useConversation(conversationId: string | null | undefined) {
  const {
    getConversationById,
    getMessages,
    messagesLoading,
    moreMessagesLoading: moreMessagesLoadingContext,
    loadMoreMessages,
    addPendingMessage: addPendingMessageContext,
    removePendingMessage: removePendingMessageContext,
    getPendingMessages: getPendingMessagesContext,
    updatePendingMessageStatus: updatePendingMessageStatusContext,
    onConversationClosed: onConversationClosedContext,
  } = useConversations();

  const conversation = conversationId ? getConversationById(conversationId) : undefined;
  const messagesData = conversationId ? getMessages(conversationId) : undefined;
  const loading = conversationId ? (messagesLoading.get(conversationId) ?? false) : false;
  const pendingMessages = conversationId ? getPendingMessagesContext(conversationId) : [];
  const moreMessagesLoading = conversationId ? (moreMessagesLoadingContext.get(conversationId) ?? false) : false;

  // Pending message functions bound to this conversationId
  const addPendingMessage = useCallback(
    (pendingMessage: PendingMessage) => {
      if (conversationId) {
        addPendingMessageContext(conversationId, pendingMessage);
      }
    },
    [conversationId, addPendingMessageContext]
  );

  const removePendingMessage = useCallback(
    (pendingId: string) => {
      if (conversationId) {
        removePendingMessageContext(conversationId, pendingId);
      }
    },
    [conversationId, removePendingMessageContext]
  );

  const updatePendingMessageStatus = useCallback(
    (pendingId: string, status: 'sending' | 'failed') => {
      if (conversationId) {
        updatePendingMessageStatusContext(conversationId, pendingId, status);
      }
    },
    [conversationId, updatePendingMessageStatusContext]
  );

  const onConversationClosed = useCallback(() => {
    if (conversationId) {
      onConversationClosedContext(conversationId);
    }
  }, [conversationId, onConversationClosedContext]);

  return {
    conversation,
    messages: messagesData?.messages ?? [],
    cursor: messagesData?.cursor ?? null,
    hasMore: messagesData?.hasMore ?? false,
    loading,
    moreMessagesLoading,
    loadMoreMessages: conversationId ? () => loadMoreMessages(conversationId) : undefined,
    // Pending message functions
    pendingMessages,
    addPendingMessage,
    removePendingMessage,
    updatePendingMessageStatus,
    onConversationClosed,
  };
}
