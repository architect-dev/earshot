import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getUserConversations } from '@/services/conversations';
import { subscribeToQuery, COLLECTIONS, where, orderBy } from '@/services/firebase/firestore';
import { FriendWithProfile, type Conversation } from '@/types';
import { type Profile } from '@/types/profile';
import { useAuth } from './AuthContext';
import { useFriends } from './FriendsContext';

// Enriched conversation with participant profile data
export interface EnrichedConversation extends Conversation {
  participantProfiles: Profile[];
}

// Helper function to enrich a conversation with friend data
function enrichConversation(
  conv: Conversation,
  getFriendById: (userId: string) => FriendWithProfile | undefined
): EnrichedConversation {
  const participantProfiles: Profile[] = [];

  // Enrich with all participants' profiles from FriendsContext
  for (const participantId of conv.participants) {
    const friend = getFriendById(participantId);
    if (friend) participantProfiles.push(friend.user);
  }

  return {
    ...conv,
    participantProfiles,
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
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

interface ConversationsProviderProps {
  children: ReactNode;
}

export function ConversationsProvider({ children }: ConversationsProviderProps) {
  const { user } = useAuth();
  const { loading: friendsLoading, getFriendById } = useFriends();
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
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
      const enriched = userConversations.map((conv) => enrichConversation(conv, getFriendById));

      setConversations(enriched);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
      // eslint-disable-next-line no-console
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getFriendById, friendsLoading]);

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
            return enrichConversation(mergedConv, getFriendById);
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
  }, [user, getFriendById]);

  // Get conversation by ID
  const getConversationById = useCallback(
    (conversationId: string): EnrichedConversation | undefined => {
      return conversations.find((c) => c.id === conversationId);
    },
    [conversations]
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
