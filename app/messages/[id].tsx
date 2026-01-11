import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar } from '@/components/ui';
import { MessageBubble, MessageInput, MessageContextModal } from '@/components/messages';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useConversation } from '@/contexts/ConversationsContext';
import { markMessagesAsRead } from '@/services/messages';
import { getDocument } from '@/services/firebase/firestore';
import { COLLECTIONS } from '@/services/firebase/firestore';
import { type Message, type User, type QuotedContent, type PendingMessage, type MessageWithReactions } from '@/types';
import { useSendMessage } from '@/hooks/useSendMessage';

export default function ConversationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { setActiveConversationId } = useConversations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  // Use the hook to get conversation and messages
  const {
    conversation,
    messages,
    hasMore,
    loading,
    loadMoreMessages: loadMore,
    pendingMessages,
    onConversationClosed,
  } = useConversation(conversationId);
  const { sendMessage, sendingMessage } = useSendMessage(user?.uid, conversationId);

  // UI-specific state
  const [quotedContent, setQuotedContent] = useState<QuotedContent | null>(null);
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithReactions | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Store user profiles for display
  const userProfilesRef = useRef<Map<string, User>>(new Map());
  const [userProfiles, setUserProfiles] = useState<Map<string, User>>(new Map());
  const flatListRef = useRef<FlatList>(null);

  // Set active conversation when screen opens
  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
    return () => {
      setActiveConversationId(null);
      onConversationClosed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, setActiveConversationId]);

  // Handle conversation not found
  useEffect(() => {
    if (conversationId && !loading && !conversation) {
      Alert.alert('Error', 'Conversation not found');
      router.back();
    }
  }, [conversationId, loading, conversation, router]);

  // Mark messages as read when conversation loads
  useEffect(() => {
    if (!conversationId || !user || !conversation || messages.length === 0) return;

    const unreadMessageIds = messages.filter((msg) => !msg.readBy.includes(user.uid)).map((msg) => msg.id);
    if (unreadMessageIds.length > 0) {
      // Don't await - mark as read in background
      markMessagesAsRead(conversationId, user.uid, unreadMessageIds).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error marking messages as read:', err);
      });
    }
  }, [conversationId, user, conversation, messages]);

  // Load user profiles for participants
  useEffect(() => {
    if (!conversation) return;

    const loadProfiles = async () => {
      const profiles = new Map<string, User>();
      for (const participantId of conversation.participants) {
        const profile = await getDocument<User>(COLLECTIONS.USERS, participantId);
        if (profile) {
          profiles.set(participantId, profile);
        }
      }
      userProfilesRef.current = profiles;
      setUserProfiles(new Map(profiles));
    };

    loadProfiles();
  }, [conversation]);

  // Load more messages (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || !loadMore) return;

    try {
      await loadMore();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading more messages:', err);
    }
  }, [hasMore, loadMore]);

  // Send message
  const handleSend = useCallback(
    async (content: string, quotedContent: QuotedContent | null, mediaUri?: string) => {
      const success = await sendMessage(content, quotedContent, mediaUri);
      if (success) setQuotedContent(null);
    },
    [sendMessage]
  );

  // Get user profile for a participant
  const getUserProfile = useCallback((userId: string): User | null => {
    return userProfilesRef.current.get(userId) || null;
  }, []);

  // Get message by ID (for quoted content lookup)
  const getMessageById = useCallback(
    (messageId: string): Message | null => {
      return messages.find((msg) => msg.id === messageId) || null;
    },
    [messages]
  );

  // Combine messages and pending messages for display
  // Stitch reactions, add time breaks, and "New Messages" divider
  const displayMessages = useMemo(() => {
    if (!conversationId || !user) return [];

    // 1. Separate regular messages and reactions
    const regularMessages = messages.filter((msg) => msg.type !== 'reaction');
    const reactionMessages = messages.filter((msg) => msg.type === 'reaction' && msg.deletedAt == null);
    const pendingReactions = pendingMessages.filter((msg) => msg.type === 'reaction');

    // 2. Group reactions by target message ID
    const reactionsByTarget = new Map<string, (Message | PendingMessage)[]>();
    [...reactionMessages, ...pendingReactions].forEach((reaction) => {
      const targetId = reaction.quotedContent?.type === 'message' ? reaction.quotedContent.messageId : null;
      if (targetId) {
        const existing = reactionsByTarget.get(targetId) || [];
        reactionsByTarget.set(targetId, [...existing, reaction]);
      }
    });

    // 3. Convert to chronological order (oldest first) for stitching
    const chronologicalMessages = [...regularMessages].reverse();

    // 5. Stitch reactions and pending reactions after their target messages
    const stitched: Array<MessageWithReactions> = [];
    chronologicalMessages.forEach((message) => {
      stitched.push({ ...message, reactions: reactionsByTarget.get(message.id) || [] });
    });
    // 6. Reverse back to reverse chronological (for inverted FlatList)
    const reversedWithDividers = stitched.reverse();

    // 7. Add pending messages at the beginning (they're newest, so add after reversing)
    const allMessages: Array<MessageWithReactions> = [...reversedWithDividers];
    for (const pending of pendingMessages) {
      // Skip pending reactions
      if (pending.type === 'reaction') continue;

      // Convert pending to message-like object for display
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingAsMessage: any = {
        isPending: true,
        id: pending.pendingId,
        conversationId: pending.conversationId,
        senderId: pending.senderId,
        type: pending.type,
        content: pending.content,
        mediaUrl: pending.mediaUri,
        quotedContent: pending.quotedContent,
        createdAt: { toDate: () => pending.createdAt, toMillis: () => pending.createdAt.getTime() },
        readBy: [],
        deletedAt: null,
        status: pending.status,
        reactions: [],
      };
      allMessages.unshift(pendingAsMessage);
    }

    return allMessages;
  }, [messages, conversationId, pendingMessages, user]);

  // Get other user info (for DMs)
  const otherUser = useMemo(() => {
    if (!conversation || !user || conversation.type !== 'dm') return null;
    const otherUserId = conversation.participants.find((id) => id !== user.uid);
    if (!otherUserId) return null;
    // Get from userProfiles state which triggers re-render when updated
    return userProfiles.get(otherUserId) || null;
  }, [conversation, user, userProfiles]);

  // Header title and avatar
  const headerTitle = useMemo(() => {
    if (!conversation) return 'Conversation';
    if (conversation.type === 'dm' && otherUser) {
      return otherUser.fullName;
    }
    return conversation.groupName || 'Group Chat';
  }, [conversation, otherUser]);

  const headerAvatar = useMemo(() => {
    if (conversation?.type === 'dm' && otherUser) {
      return otherUser.profilePhotoUrl;
    }
    return null;
  }, [conversation, otherUser]);

  const headerAvatarName = useMemo(() => {
    if (conversation?.type === 'dm' && otherUser) {
      return otherUser.fullName;
    }
    return conversation?.groupName || 'Group';
  }, [conversation, otherUser]);

  // Handle message context modal
  const handleMessageLongPress = useCallback((message: MessageWithReactions) => {
    setSelectedMessage(message);
    setContextModalVisible(true);
  }, []);

  const handleMessageReply = useCallback(
    (message: Message) => {
      // Create quoted content from message - always use real profile
      const senderProfile = getUserProfile(message.senderId);
      const quoted: QuotedContent = {
        type: 'message',
        messageId: message.id,
        preview: {
          senderName: senderProfile?.fullName || 'Unknown',
          senderUsername: senderProfile?.username || '',
          text: message.content || undefined,
          mediaUrl: message.mediaUrl || undefined,
        },
      };
      setQuotedContent(quoted);
    },
    [getUserProfile]
  );

  const handleMessageDelete = useCallback(() => {
    // Messages will update automatically via real-time subscription
  }, []);

  // Handle quoted message press - scroll to message and highlight
  const handleQuotedMessagePress = useCallback(
    (messageId: string) => {
      // Find the message in the display messages (includes pending)
      const allMessages = displayMessages;
      const messageIndex = allMessages.findIndex((msg) => {
        // Check if it's a Message (has id) or PendingMessage (has pendingId)
        return 'id' in msg ? msg.id === messageId : false;
      });
      if (messageIndex !== -1 && flatListRef.current) {
        // FlatList is inverted, so we need to scroll to the correct index
        // In inverted lists, index 0 is at the bottom
        try {
          // Set highlighted message before scrolling
          setHighlightedMessageId(messageId);
          flatListRef.current.scrollToIndex({ index: messageIndex, animated: true, viewPosition: 0.5 });
          // Clear highlight after animation completes (2 seconds)
          setTimeout(() => {
            setHighlightedMessageId(null);
          }, 2000);
        } catch (err) {
          // If scroll fails (e.g., item not rendered), try scrolling to offset
          // eslint-disable-next-line no-console
          console.warn('Failed to scroll to message index:', err);
          // Still set highlight even if scroll fails
          setHighlightedMessageId(messageId);
          setTimeout(() => {
            setHighlightedMessageId(null);
          }, 2000);
        }
      } else {
        // Message not loaded yet - TODO: Implement fetch with context and scroll
        Alert.alert('Message', 'Message not loaded. Scroll-to-message with context fetching not yet implemented.');
      }
    },
    [displayMessages]
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.pine} />
        </View>
      </ScreenContainer>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <ScreenContainer padded={false} keyboardAvoiding>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.highlightLow,
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 16,
            marginTop: -insets.top,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={18} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Avatar source={headerAvatar} name={headerAvatarName} size="sm" style={styles.headerAvatar} />
          <Text size="lg" weight="semibold" style={styles.headerTitle}>
            {headerTitle}
          </Text>
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => {
          // Handle pending reactions
          if ('isPending' in item && item.isPending) {
            return (item as PendingMessage).pendingId;
          }
          // Handle regular messages and pending messages
          return item.id;
        }}
        renderItem={({ item }) => {
          // Handle regular messages and pending messages
          const message = item as MessageWithReactions | PendingMessage;
          const isOwn = message.senderId === user?.uid;
          const isPending = 'isPending' in message && message.isPending;
          const opacity = isPending ? 0.75 : 1;

          // Get sender info for group chats
          let senderName: string | undefined;
          let senderAvatar: string | null | undefined;
          if (!isOwn && conversation.type === 'group') {
            const senderProfile = getUserProfile(message.senderId);
            senderName = senderProfile?.fullName;
            senderAvatar = senderProfile?.profilePhotoUrl;
          }

          const messageId = 'id' in message ? message.id : message.pendingId;
          const isHighlighted = highlightedMessageId === messageId;

          return (
            <MessageBubble
              message={message as MessageWithReactions}
              isOwn={isOwn}
              senderName={senderName}
              senderAvatar={senderAvatar}
              opacity={opacity}
              isHighlighted={isHighlighted}
              getUserProfile={getUserProfile}
              getMessage={getMessageById}
              onLongPress={() => handleMessageLongPress(message as MessageWithReactions)}
              onQuotedPostPress={(postId) => router.push(`/post/${postId}`)}
              onQuotedMessagePress={handleQuotedMessagePress}
            />
          );
        }}
        inverted // Reverse chronological (newest at bottom)
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.pine} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text color="muted">No messages yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <MessageInput
        onSend={handleSend}
        quotedContent={quotedContent}
        onClearQuote={() => setQuotedContent(null)}
        disabled={sendingMessage}
      />
      <MessageContextModal
        visible={contextModalVisible}
        onClose={() => {
          setContextModalVisible(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
        conversationId={conversationId || ''}
        currentUserId={user?.uid || ''}
        onReply={handleMessageReply}
        onDelete={handleMessageDelete}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
});
