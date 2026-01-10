import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { getUserConversations, getConversation } from '@/services/conversations';
import { getLastMessage } from '@/services/messages';
import { subscribeToQuery, subscribeToDocument, COLLECTIONS, where, orderBy } from '@/services/firebase/firestore';
import { type Conversation, type Message } from '@/types';
import { useAuth } from './AuthContext';

interface ConversationsContextValue {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  refreshConversations: () => Promise<void>;
  getConversationById: (conversationId: string) => Conversation | undefined;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

interface ConversationsProviderProps {
  children: ReactNode;
}

export function ConversationsProvider({ children }: ConversationsProviderProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Track subscriptions for cleanup
  const conversationsUnsubscribeRef = useRef<(() => void) | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Get all conversations for the user
      const userConversations = await getUserConversations(user.uid);

      // For each conversation, fetch the latest message
      const conversationsWithLatestMessage = await Promise.all(
        userConversations.map(async (conv) => {
          const latestMessage = await getLastMessage(conv.id);
          return {
            ...conv,
            latestMessage,
          };
        })
      );

      setConversations(conversationsWithLatestMessage);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
      // eslint-disable-next-line no-console
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

            // If this is a new conversation, use it as-is
            if (!prevConv) {
              return conv;
            }

            // Check if latestMessage changed (new message arrived)
            const latestMessageChanged =
              conv.latestMessage?.id !== prevConv.latestMessage?.id && conv.latestMessage !== null;

            const isFromOtherUser = conv.latestMessage?.senderId !== user.uid;
            const isConversationActive = activeConversationIdRef.current === conv.id;

            // Update unread counts if new message from other user and conversation not active
            let updatedUnreadCounts = { ...conv.unreadCounts };
            if (latestMessageChanged && isFromOtherUser && !isConversationActive) {
              updatedUnreadCounts[user.uid] = (updatedUnreadCounts[user.uid] || 0) + 1;
            }

            return {
              ...conv,
              latestMessage: conv.latestMessage || prevConv.latestMessage || null,
              unreadCounts: updatedUnreadCounts,
            };
          });

          return merged;
        });
      }
    );

    conversationsUnsubscribeRef.current = unsubscribe;

    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current();
        conversationsUnsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Subscribe to new messages for each conversation
  // Note: We subscribe to conversations which already includes latestMessage updates
  // This effect handles updating unread counts when new messages arrive
  useEffect(() => {
    if (!user || conversations.length === 0) {
      return;
    }

    // The conversation subscription will handle latestMessage updates
    // We just need to track when new messages arrive to update unread counts
    // This is handled by the conversation subscription callback above
  }, [user, conversations, activeConversationId]);

  // Get conversation by ID
  const getConversationById = useCallback(
    (conversationId: string): Conversation | undefined => {
      return conversations.find((c) => c.id === conversationId);
    },
    [conversations]
  );

  const value: ConversationsContextValue = {
    conversations,
    loading,
    error,
    refreshConversations: loadConversations,
    getConversationById,
    activeConversationId,
    setActiveConversationId,
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
