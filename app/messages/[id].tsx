import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar, Spacer } from '@/components/ui';
import { MessageBubble, MessageInput, MessageContextModal } from '@/components/messages';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useConversation } from '@/contexts/ConversationsContext';
import { markMessagesAsRead } from '@/services/messages';
import {
  type Message,
  type QuotedContent,
  type PendingMessage,
  type MessageWithReactions,
  DividerMessage,
} from '@/types';
import { useSendMessage } from '@/hooks/useSendMessage';
import { isDifferentDay, formatDateDivider } from '@/utils/formatting';
import { getMessageId, isDividerMessage } from '@/utils';
import { LastSeenText } from '@/components/ui/LastSeenText';

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
    moreMessagesLoading,
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollToBottomOpacity = useSharedValue(0);

  // Animated style for scroll to bottom button
  const scrollToBottomAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrollToBottomOpacity.value,
    pointerEvents: scrollToBottomOpacity.value > 0 ? ('auto' as const) : ('none' as const),
  }));

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
    if (!conversationId || !user || messages.length === 0) return;

    const timeout = setTimeout(() => {
      const unreadMessageIds = messages.filter((msg) => !msg.readBy.includes(user.uid)).map((msg) => msg.id);
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(conversationId, user.uid, unreadMessageIds).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Error marking messages as read:', err);
        });
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [conversationId, user, messages]);

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
      sendMessage(content, quotedContent, mediaUri);
      setQuotedContent(null);

      // Scroll to bottom after sending (small delay to ensure pending message is rendered)
      setTimeout(() => {
        if (flatListRef.current) {
          // For inverted FlatList, scroll to index 0 (bottom) or use scrollToOffset(0)
          try {
            flatListRef.current.scrollToIndex({ index: 0, animated: true });
          } catch {
            // If scrollToIndex fails (e.g., item not rendered), use scrollToOffset
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }, 100);
    },
    [sendMessage]
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

    // 5. Stitch reactions
    const stitched: Array<MessageWithReactions> = [];
    chronologicalMessages.forEach((message) => {
      stitched.push({ ...message, reactions: reactionsByTarget.get(message.id) || [] });
    });

    // 6. Reverse back to reverse chronological (for inverted FlatList)
    const reversedWithDividers = stitched.reverse();

    // 7. Add pending messages at the beginning (they're newest, so add after reversing)
    const allMessages: Array<MessageWithReactions | DividerMessage | PendingMessage> = [...reversedWithDividers];
    for (const pending of pendingMessages) {
      // Skip pending reactions
      if (pending.type === 'reaction') continue;

      // Convert pending to message-like object for display
      const pendingAsMessage: PendingMessage = {
        isPending: true,
        pendingId: pending.pendingId,
        conversationId: pending.conversationId,
        senderId: pending.senderId,
        type: pending.type,
        content: pending.content,
        mediaUri: pending.mediaUri,
        quotedContent: pending.quotedContent,
        status: pending.status,
        createdAt: pending.createdAt,
      };
      allMessages.unshift(pendingAsMessage);
    }

    // Insert typing indicator at the beginning
    if (conversation?.typing && conversation.typing.length > 0) {
      // Filter out current user from typing list
      const otherTypingUsers = conversation.typing.filter((userId) => userId !== user.uid);

      if (otherTypingUsers.length > 0) {
        // Get typing user profiles for display
        const typingProfiles = otherTypingUsers
          .map((userId) => conversation.participantProfiles.find((p) => p.id === userId))
          .filter((p): p is NonNullable<typeof p> => p != null);

        let typingLabel: string;
        if (typingProfiles.length === 1) {
          typingLabel = `${typingProfiles[0].fullName} is typing...`;
        } else if (typingProfiles.length === 2) {
          typingLabel = `${typingProfiles[0].fullName} and ${typingProfiles[1].fullName} are typing...`;
        } else {
          typingLabel = `${typingProfiles.length} people are typing...`;
        }

        allMessages.unshift({
          isDivider: true,
          dividerId: 'divider-typing',
          conversationId: conversationId,
          label: typingLabel,
        });
      }
    }

    // 8. Insert dividers (date breaks and "New Messages" divider)
    const withDividers: Array<MessageWithReactions | DividerMessage | PendingMessage> = [];
    let newMessagesDividerInserted = false;

    for (let i = 0; i < allMessages.length; i++) {
      const currentMessage = allMessages[i];

      // Skip dividers that might already be in the list (shouldn't happen, but safety check)
      if (isDividerMessage(currentMessage)) {
        withDividers.push(currentMessage);
        continue;
      }

      const currentTimestamp = currentMessage.createdAt;
      const isCurrentUnread =
        currentMessage.senderId !== user.uid && 'readBy' in currentMessage && !currentMessage.readBy.includes(user.uid);

      // Check if we need to insert "New Messages" divider
      // Insert between last unread message and first read message
      if (!newMessagesDividerInserted && i > 0) {
        const previousMessage = allMessages[i - 1];

        // Skip if previous is a divider
        if (!isDividerMessage(previousMessage)) {
          const previousIsUnread =
            previousMessage.senderId !== user.uid &&
            'readBy' in previousMessage &&
            !previousMessage.readBy.includes(user.uid);

          // If previous was unread and current is read, insert divider
          if (previousIsUnread && !isCurrentUnread) {
            const newMessagesDivider: DividerMessage = {
              isDivider: true,
              dividerId: 'divider-newMessages',
              conversationId: conversationId,
              label: 'New Messages',
            };
            withDividers.push(newMessagesDivider);
            newMessagesDividerInserted = true;
          }
        }
      }

      // Add current message
      withDividers.push(currentMessage);

      // Check if we need to insert date break after this message
      if (i < allMessages.length - 1) {
        const nextMessage = allMessages[i + 1];

        // Skip if next is a divider
        if (!isDividerMessage(nextMessage)) {
          const nextTimestamp = nextMessage.createdAt;

          // Insert date divider when days are different
          if (isDifferentDay(currentTimestamp, nextTimestamp)) {
            const dateBreak: DividerMessage = {
              isDivider: true,
              dividerId: `divider-time-${getMessageId(nextMessage)}`,
              conversationId: conversationId,
              label: formatDateDivider(nextTimestamp),
            };
            withDividers.push(dateBreak);
          }
        }
      }
    }

    if (moreMessagesLoading) {
      withDividers.push({
        isDivider: true,
        dividerId: 'divider-loadingMore',
        conversationId: conversationId,
        label: 'Loading more messages...',
      });
    }

    // Add "Beginning of conversation" divider when all messages are loaded and it's a DM
    if (!hasMore && conversation?.type === 'dm' && user) {
      const otherUserProfile = conversation.participantProfiles.find((p) => p.id !== user.uid);
      if (otherUserProfile) {
        const beginningDivider: DividerMessage = {
          isDivider: true,
          dividerId: 'divider-conversationStart',
          conversationId: conversationId,
          component: (
            <View style={styles.conversationStartContainer}>
              <Text size="sm" color="muted" style={styles.conversationStartLabel}>
                Beginning of your conversation with:
              </Text>
              <Spacer size={48} />
              <Avatar profile={otherUserProfile} size="lg" />
              <Spacer size={24} />
              <Text size="md" weight="semibold" style={styles.conversationStartName}>
                {otherUserProfile.fullName}
              </Text>
              <Text size="sm" color="muted">
                @{otherUserProfile.username}
              </Text>
              {messages.length === 0 && pendingMessages.length === 0 && (
                <>
                  <Spacer size={48} />
                  <Text size="sm" color="muted">
                    Say Hi 👋!
                  </Text>
                </>
              )}
            </View>
          ),
        };
        withDividers.push(beginningDivider);
      }
    }

    return withDividers;
  }, [messages, conversationId, pendingMessages, user, moreMessagesLoading, conversation, hasMore]);

  // Get other user info (for DMs)
  const otherUser = useMemo(() => {
    if (!conversation || !user || conversation.type !== 'dm') return null;
    const otherUserId = conversation.participants.find((id) => id !== user.uid);
    if (!otherUserId) return null;
    return conversation.participantProfiles.find((p) => p.id === otherUserId) || null;
  }, [conversation, user]);

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
      const senderProfile = conversation?.participantProfiles?.find((p) => p.id === message.senderId) || null;
      if (!senderProfile) return;

      const quoted: QuotedContent = {
        type: 'message',
        messageId: message.id,
        senderId: message.senderId,
        preview: {
          text: message.content || undefined,
          mediaUrl: message.mediaUrl || undefined,
        },
      };
      setQuotedContent(quoted);
    },
    [conversation]
  );

  const handleMessageDelete = useCallback(() => {
    // Messages will update automatically via real-time subscription
  }, []);

  // Handle quoted message press - scroll to message and highlight
  const handleQuotedMessagePress = useCallback(
    (messageId: string) => {
      // Find the message in the display messages (includes pending)
      const messageIndex = displayMessages.findIndex((msg) => getMessageId(msg) === messageId);
      if (messageIndex === -1) {
        // Message not loaded yet - TODO: Implement fetch with context and scroll
        Alert.alert('Message', 'Message not loaded. Scroll-to-message with fetching not yet implemented.');
        return;
      }

      if (!flatListRef.current) return;

      // Highlight the quoted message
      setHighlightedMessageId(messageId);

      // FlatList is inverted, so we need to scroll to the correct index
      // In inverted lists, index 0 is at the bottom
      try {
        flatListRef.current.scrollToIndex({ index: messageIndex, animated: true, viewPosition: 0.5 });
      } catch (err) {
        // If scroll fails (e.g., item not rendered), try scrolling to offset
        // eslint-disable-next-line no-console
        console.warn('Failed to scroll to message index:', err);
        // TODO: SENTRY
      }

      // Clear highlight after animation completes (2 seconds)
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    },
    [displayMessages]
  );

  // Log duplicate keys
  // useEffect(() => {
  //   const existingKeys = new Set<string>();
  //   displayMessages.forEach((item) => {
  //     const id = getMessageId(item);
  //     if (existingKeys.has(id)) {
  //       console.log('duplicate key', id, item, {
  //         isDivider: isDividerMessage(item),
  //         isPending: isPendingMessage(item),
  //         isMessage: isMessage(item),
  //         isMessageWithReactions: isMessageWithReactions(item),
  //       });
  //     }
  //     existingKeys.add(id);
  //   });
  // }, [displayMessages]);

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
          <View style={styles.headerTitleContainer}>
            <Text size="lg" weight="semibold">
              {headerTitle}
            </Text>
            <LastSeenText userId={otherUser?.id} size="xs" color="subtle" />
          </View>
        </View>
      </View>
      <View style={styles.messagesContainer}>
        <FlatList<MessageWithReactions | DividerMessage | PendingMessage>
          ref={flatListRef}
          data={displayMessages}
          onScroll={(event) => {
            const offset = event.nativeEvent.contentOffset.y;
            // For inverted FlatList, offset 0 is at bottom, higher offset = scrolled up
            const shouldShow = offset >= 400;
            if (shouldShow !== showScrollToBottom) {
              setShowScrollToBottom(shouldShow);
              scrollToBottomOpacity.value = withTiming(shouldShow ? 1 : 0, { duration: 200 });
            }
          }}
          scrollEventThrottle={16}
          keyExtractor={getMessageId}
          renderItem={({ item }) => {
            // Handle dividers
            if (isDividerMessage(item)) {
              if (item.label) {
                return (
                  <View style={styles.dividerContainer}>
                    <Text size="sm" color="muted" style={{ fontStyle: 'italic' }}>
                      {item.label}
                    </Text>
                  </View>
                );
              }
              if (item.component) {
                return <View style={styles.container}>{item.component}</View>;
              }
              return null;
            }

            // Handle regular messages and pending messages
            const message = item;
            const isOwn = message.senderId === user?.uid;

            // Get sender info for group chats
            const senderProfile = conversation?.participantProfiles?.find((p) => p.id === message.senderId) || null;
            if (!senderProfile) return null;

            const messageId = 'id' in message ? message.id : message.pendingId;
            const isHighlighted = highlightedMessageId === messageId;

            return (
              <MessageBubble
                message={message}
                senderProfile={senderProfile}
                isOwn={isOwn}
                isGroup={conversation?.type === 'group'}
                isHighlighted={isHighlighted}
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
        {/* Scroll to bottom button */}
        <Animated.View
          style={[
            styles.scrollToBottomButton,
            {
              backgroundColor: theme.colors.pine,
            },
            scrollToBottomAnimatedStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              if (flatListRef.current) {
                try {
                  flatListRef.current.scrollToIndex({ index: 0, animated: true });
                } catch {
                  flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                }
              }
            }}
            style={styles.scrollToBottomPressable}
          >
            <FontAwesome6 name="chevron-down" size={18} color={theme.colors.surface} />
          </Pressable>
        </Animated.View>
      </View>
      <MessageInput
        conversationId={conversationId || ''}
        userId={user?.uid || ''}
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
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
  },
  conversationStartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 156,
  },
  conversationStartLabel: {
    textAlign: 'center',
  },
  conversationStartName: {
    marginBottom: 4,
    textAlign: 'center',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 16, // Position above the input area
    right: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollToBottomPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitleContainer: {
    flexDirection: 'column',
    gap: 0,
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
