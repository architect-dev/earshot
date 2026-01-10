import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { type DocumentSnapshot } from 'firebase/firestore';
import { ScreenContainer, Text, Avatar } from '@/components/ui';
import { MessageBubble, MessageInput, MessageContextModal } from '@/components/messages';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getConversation } from '@/services/conversations';
import { getConversationMessages, createMessage } from '@/services/messages';
import { getDocument } from '@/services/firebase/firestore';
import { COLLECTIONS } from '@/services/firebase/firestore';
import { uploadFile, getMessageMediaPath } from '@/services/firebase/storage';
import { getErrorMessage } from '@/utils/errors';
import { type Conversation, type Message, type User, type QuotedContent } from '@/types';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

interface PendingMessage {
  tempId: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'photo';
  content?: string;
  mediaUri?: string;
  quotedContent?: QuotedContent;
  createdAt: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [quotedContent, setQuotedContent] = useState<QuotedContent | null>(null);
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Store cursor and user profiles for pagination and display
  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const userProfilesRef = useRef<Map<string, User>>(new Map());
  const [userProfiles, setUserProfiles] = useState<Map<string, User>>(new Map());
  const flatListRef = useRef<FlatList>(null);

  // Load conversation and initial messages
  const loadConversation = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      const [conv, initialMessages] = await Promise.all([
        getConversation(conversationId),
        getConversationMessages(conversationId),
      ]);

      if (!conv) {
        Alert.alert('Error', 'Conversation not found');
        router.back();
        return;
      }

      setConversation(conv);
      setMessages(initialMessages.messages);
      cursorRef.current = initialMessages.lastDoc;
      setHasMore(initialMessages.hasMore);

      // Load user profiles for participants (including current user for consistency)
      const profiles = new Map<string, User>();
      for (const participantId of conv.participants) {
        const profile = await getDocument<User>(COLLECTIONS.USERS, participantId);
        if (profile) {
          profiles.set(participantId, profile);
        }
      }
      userProfilesRef.current = profiles;
      setUserProfiles(new Map(profiles));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, router]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Load more messages (infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore || !cursorRef.current) return;

    setLoadingMore(true);
    try {
      const result = await getConversationMessages(conversationId, cursorRef.current);
      setMessages((prev) => [...prev, ...result.messages]);
      cursorRef.current = result.lastDoc;
      setHasMore(result.hasMore);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, loadingMore, hasMore]);

  // Send message
  const handleSend = useCallback(
    async (content: string, mediaUri?: string) => {
      if (!user || !conversationId || sending) return;

      const tempId = `pending-${Date.now()}-${Math.random()}`;
      const pendingMessage: PendingMessage = {
        tempId,
        conversationId,
        senderId: user.uid,
        type: mediaUri ? 'photo' : 'text',
        content: content || undefined,
        mediaUri,
        quotedContent: quotedContent || undefined,
        createdAt: new Date(),
        status: 'sending',
      };

      // Add to pending messages immediately
      setPendingMessages((prev) => [...prev, pendingMessage]);
      setSending(true);
      setQuotedContent(null); // Clear quote after sending

      try {
        let mediaUrl: string | undefined;

        // Upload photo if provided
        if (mediaUri) {
          const blob = await processMessageImage(mediaUri);
          const messageId = tempId; // Temporary ID for storage path
          const storagePath = getMessageMediaPath(conversationId, messageId, 'jpg');
          mediaUrl = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });
        }

        // Create message
        const message = await createMessage({
          conversationId,
          senderId: user.uid,
          type: mediaUri ? 'photo' : 'text',
          content: content || undefined,
          mediaUrl,
          quotedContent: quotedContent || undefined,
        });

        // Remove pending message (real message will arrive via listener)
        setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));

        // Add message to list immediately (optimistic update)
        setMessages((prev) => [message, ...prev]);
      } catch (err) {
        // Mark as failed
        setPendingMessages((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, status: 'failed' as const } : p)));
        Alert.alert('Error', getErrorMessage(err));
      } finally {
        setSending(false);
      }
    },
    [user, conversationId, sending, quotedContent]
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
    const allMessages: Array<Message | PendingMessage> = [...messages];

    // Add pending messages at the beginning (most recent)
    for (const pending of pendingMessages) {
      // Convert pending to message-like object for display
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingAsMessage: any = {
        id: pending.tempId,
        conversationId: pending.conversationId,
        senderId: pending.senderId,
        type: pending.type,
        content: pending.content,
        mediaUrl: pending.mediaUri,
        quotedContent: pending.quotedContent,
        createdAt: { toDate: () => pending.createdAt, toMillis: () => pending.createdAt.getTime() },
        readBy: [],
        deletedAt: null,
      };
      allMessages.unshift(pendingAsMessage);
    }

    return allMessages;
  }, [messages, pendingMessages]);

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
    // Refresh messages list to show deleted state
    loadConversation();
  }, [loadConversation]);

  // Handle quoted message press - scroll to message and highlight
  const handleQuotedMessagePress = useCallback(
    (messageId: string) => {
      // Find the message in the display messages (includes pending)
      const allMessages = displayMessages;
      const messageIndex = allMessages.findIndex((msg) => {
        // Check if it's a Message (has id) or PendingMessage (has tempId)
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
          const opacity = isPending ? 0.5 : 1;

          // Get sender info for group chats
          let senderName: string | undefined;
          let senderAvatar: string | null | undefined;
          if (!isOwn && conversation.type === 'group') {
            const senderProfile = getUserProfile(item.senderId);
            senderName = senderProfile?.fullName;
            senderAvatar = senderProfile?.profilePhotoUrl;
          }

          const messageId = 'id' in item ? item.id : item.tempId;
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
              onQuotedMessagePress={handleQuotedMessagePress}
            />
          );
        }}
        inverted // Reverse chronological (newest at bottom)
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
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
