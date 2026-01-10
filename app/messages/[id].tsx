import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar } from '@/components/ui';
import { MessageBubble, MessageInput, MessageContextModal } from '@/components/messages';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useConversation, type PendingMessage } from '@/contexts/ConversationsContext';
import { createMessage, markMessagesAsRead } from '@/services/messages';
import { getDocument } from '@/services/firebase/firestore';
import { COLLECTIONS } from '@/services/firebase/firestore';
import { uploadFile, getMessageMediaPath } from '@/services/firebase/storage';
import { getErrorMessage } from '@/utils/errors';
import { type Message, type User, type QuotedContent } from '@/types';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.8;

// Process image for message (similar to posts but simpler - no crop data)
async function processMessageImage(uri: string): Promise<Blob> {
  // First, get the original dimensions
  const contextForDimensions = ImageManipulator.manipulate(uri);
  const original = await contextForDimensions.renderAsync();

  // Calculate resize dimensions maintaining aspect ratio
  let resizeWidth: number;
  let resizeHeight: number;

  if (original.width > original.height) {
    resizeWidth = MAX_DIMENSION;
    resizeHeight = Math.round((original.height / original.width) * MAX_DIMENSION);
  } else {
    resizeHeight = MAX_DIMENSION;
    resizeWidth = Math.round((original.width / original.height) * MAX_DIMENSION);
  }

  // Create a new context for the actual manipulation
  const context = ImageManipulator.manipulate(uri);
  const resized = context.resize({ width: resizeWidth, height: resizeHeight });
  const rendered = await resized.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const response = await fetch(result.uri);
  return response.blob();
}

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
    addPendingMessage,
    updatePendingMessageStatus,
    onConversationClosed,
  } = useConversation(conversationId);

  // UI-specific state
  const [sending, setSending] = useState(false);
  const [quotedContent, setQuotedContent] = useState<QuotedContent | null>(null);
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
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
    async (content: string, mediaUri?: string) => {
      if (!user || !conversationId || sending) return;

      const pendingId = `pending-${user.uid}-${Date.now()}`;
      const pendingMessage: PendingMessage = {
        pendingId,
        conversationId,
        senderId: user.uid,
        type: mediaUri ? 'photo' : 'text',
        content: content || undefined,
        mediaUri,
        quotedContent: quotedContent || undefined,
        createdAt: new Date(),
        status: 'sending',
      };

      // Add to pending messages immediately (synchronous)
      addPendingMessage(pendingMessage);
      setSending(true);
      setQuotedContent(null); // Clear quote after sending

      try {
        let mediaUrl: string | undefined;

        // Upload photo if provided
        if (mediaUri) {
          const blob = await processMessageImage(mediaUri);
          // Use pendingId for storage path (will be replaced with real messageId later)
          const storagePath = getMessageMediaPath(conversationId, pendingId, 'jpg');
          mediaUrl = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });
        }

        // Create message with pendingId (will arrive via real-time subscription)
        await createMessage({
          conversationId,
          senderId: user.uid,
          type: mediaUri ? 'photo' : 'text',
          content: content || undefined,
          mediaUrl,
          quotedContent: quotedContent || undefined,
          pendingId,
        });

        // Pending message will be removed automatically when real message arrives via subscription
      } catch (err) {
        // Mark as failed
        updatePendingMessageStatus(pendingId, 'failed');
        Alert.alert('Error', getErrorMessage(err));
      } finally {
        setSending(false);
      }
    },
    [user, conversationId, sending, quotedContent, addPendingMessage, updatePendingMessageStatus]
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
  // Messages are already sorted newest first (from getConversationMessages)
  // We'll add pending messages at the beginning (newest)
  const displayMessages = useMemo(() => {
    if (!conversationId) return [];

    const allMessages: Array<Message | PendingMessage> = [...messages];
    // Add pending messages at the beginning (most recent)
    for (const pending of pendingMessages) {
      // Convert pending to message-like object for display
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingAsMessage: any = {
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
      };
      allMessages.unshift(pendingAsMessage);
    }

    return allMessages;
  }, [messages, conversationId, pendingMessages]);

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
  const handleMessageLongPress = useCallback((message: Message) => {
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwn = item.senderId === user?.uid;
          const isPending = 'status' in item && item.status !== 'sent';
          const opacity = isPending ? 0.75 : 1;

          // Get sender info for group chats
          let senderName: string | undefined;
          let senderAvatar: string | null | undefined;
          if (!isOwn && conversation.type === 'group') {
            const senderProfile = getUserProfile(item.senderId);
            senderName = senderProfile?.fullName;
            senderAvatar = senderProfile?.profilePhotoUrl;
          }

          const messageId = 'id' in item ? item.id : item.pendingId;
          const isHighlighted = highlightedMessageId === messageId;

          return (
            <MessageBubble
              message={item as Message}
              isOwn={isOwn}
              senderName={senderName}
              senderAvatar={senderAvatar}
              opacity={opacity}
              isHighlighted={isHighlighted}
              getUserProfile={getUserProfile}
              getMessage={getMessageById}
              onLongPress={() => handleMessageLongPress(item as Message)}
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
        disabled={sending}
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
