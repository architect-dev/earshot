import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Modal, Text, Button, TextInput, Avatar, Spacer } from '@/components/ui';
import { QuotedContent } from '@/components/messages';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { findOrCreateDM, getConversationsWithUser } from '@/services/conversations';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor, type Conversation, type QuotedContent as QuotedContentType } from '@/types';

export type InteractionType = 'heart' | 'comment';

interface InteractionModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (
    conversationId: string,
    messageType: 'heart' | 'comment',
    content: string | undefined,
    heartCount?: number
  ) => Promise<void>;
  post: PostWithAuthor | null;
  type: InteractionType;
  loading?: boolean;
}

interface ConversationOption {
  conversation: Conversation;
  displayName: string;
  displayAvatar: string | null;
}

export function PostInteractionModal({ visible, onClose, onSend, post, type, loading = false }: InteractionModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [conversations, setConversations] = useState<ConversationOption[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [creatingDM, setCreatingDM] = useState(false);
  const [heartCount, setHeartCount] = useState(1);

  const loadConversations = useCallback(async () => {
    if (!post || !user) return;

    setLoadingConversations(true);
    try {
      // Get all conversations (DMs and groups) with the post author
      const convs = await getConversationsWithUser(user.uid, post.author.id);

      // Format conversations for display
      const options: ConversationOption[] = convs.map((conv) => {
        if (conv.type === 'dm') {
          // For DM, show the other user's name
          return {
            conversation: conv,
            displayName: post.author.fullName,
            displayAvatar: post.author.profilePhotoUrl,
          };
        } else {
          // For group, show group name
          return {
            conversation: conv,
            displayName: conv.groupName || 'Group Chat',
            displayAvatar: null,
          };
        }
      });

      setConversations(options);

      // Auto-select first conversation if available, or prepare to create DM
      if (options.length > 0) {
        setSelectedConversationId(options[0].conversation.id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [post, user]);

  // Load conversations when modal opens
  useEffect(() => {
    if (visible && post && user) {
      loadConversations();
    } else {
      // Reset state when modal closes
      setConversations([]);
      setSelectedConversationId(null);
      setComment('');
    }
  }, [visible, post, user, loadConversations]);

  const handleCreateDM = useCallback(async () => {
    if (!post || !user) return;

    setCreatingDM(true);
    try {
      const dm = await findOrCreateDM(user.uid, post.author.id);
      setSelectedConversationId(dm.id);
      // Add to conversations list if not already there
      setConversations((prev) => {
        const exists = prev.some((opt) => opt.conversation.id === dm.id);
        if (exists) return prev;
        return [
          {
            conversation: dm,
            displayName: post.author.fullName,
            displayAvatar: post.author.profilePhotoUrl,
          },
          ...prev,
        ];
      });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setCreatingDM(false);
    }
  }, [post, user]);

  const handleSend = async () => {
    if (!post || !user) return;

    // If no conversation selected, create DM first
    let conversationId = selectedConversationId;
    if (!conversationId) {
      try {
        const dm = await findOrCreateDM(user.uid, post.author.id);
        conversationId = dm.id;
        setSelectedConversationId(dm.id);
      } catch (err) {
        Alert.alert('Error', getErrorMessage(err));
        return;
      }
    }

    const content = type === 'comment' ? comment.trim() : undefined;
    if (type === 'comment' && !content) return;

    try {
      await onSend(conversationId, type, content, isHeartMode ? heartCount : undefined);
      setComment('');
      setHeartCount(1);
      handleClose();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleClose = () => {
    setComment('');
    setConversations([]);
    setSelectedConversationId(null);
    setHeartCount(1);
    onClose();
  };

  const handleHeartPress = () => {
    setHeartCount((prev) => prev + 1);
  };

  if (!post) return null;

  const isHeartMode = type === 'heart';
  const canSend = isHeartMode || comment.trim().length > 0;
  const hasConversations = conversations.length > 0;
  const showCreateDM = !loadingConversations && (!hasConversations || selectedConversationId === null);

  // Create quoted content for the post
  const quotedContent: QuotedContentType = {
    type: 'post',
    postId: post.id,
    senderId: post.author.id,
    preview: {
      authorName: post.author.fullName,
      authorUsername: post.author.username,
      text: post.textBody || undefined,
      mediaUrl: post.media.length > 0 ? post.media[0].url : undefined,
    },
  };

  return (
    <Modal visible={visible} onClose={handleClose} title={isHeartMode ? 'Send Heart' : 'Send Comment'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* Conversation Selection */}
        {loadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.pine} />
          </View>
        ) : hasConversations ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.conversation.id}
            contentContainerStyle={styles.conversationList}
            renderItem={({ item }) => {
              const isSelected = selectedConversationId === item.conversation.id;
              return (
                <Pressable
                  onPress={() => setSelectedConversationId(item.conversation.id)}
                  style={[
                    styles.conversationOption,
                    {
                      backgroundColor: isSelected ? theme.colors.highlightLow : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.pine : theme.colors.highlightLow,
                    },
                  ]}
                >
                  <Avatar profile={item.conversation.type === 'dm' ? post.author : null} size="sm" />
                  <View style={styles.conversationInfo}>
                    <Text size="sm" weight={isSelected ? 'semibold' : undefined}>
                      {item.conversation.type === 'dm' ? post.author.fullName : item.conversation.groupName}
                    </Text>
                    <Text size="xs" color="muted">
                      {item.conversation.type === 'dm' ? 'Direct Message' : 'Group Chat'}
                    </Text>
                  </View>
                  {isSelected && <FontAwesome6 name="check" size={16} color={theme.colors.pine} />}
                </Pressable>
              );
            }}
            scrollEnabled={false}
          />
        ) : null}
        {showCreateDM && (
          <Pressable
            onPress={handleCreateDM}
            disabled={creatingDM}
            style={[
              styles.createDMButton,
              {
                backgroundColor: theme.colors.highlightLow,
                borderColor: theme.colors.pine,
              },
            ]}
          >
            {creatingDM ? (
              <ActivityIndicator size="small" color={theme.colors.pine} />
            ) : (
              <>
                <FontAwesome6 name="plus" size={16} color={theme.colors.pine} />
                <Text size="sm" weight="semibold" style={{ color: theme.colors.pine }}>
                  Create new DM with {post.author.fullName}
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Spacer size={16} />

        {/* Quoted Post Preview */}
        <QuotedContent quotedContent={quotedContent} senderProfile={post.author} variant="modal" postReplyType={type} />

        {isHeartMode && (
          <>
            <Pressable onPress={handleHeartPress} style={styles.heartBubbleContainer}>
              <View style={[styles.heartBubble, { backgroundColor: theme.colors.loveLow }]}>
                {Array.from({ length: heartCount }, (_, i) => (
                  <FontAwesome6 key={i} name="heart" size={20} color={theme.colors.love} solid />
                ))}
              </View>
            </Pressable>
            <Spacer size={8} />
            <Text size="sm" color="subtle" style={styles.heartHint}>
              (Tap to add more hearts)
            </Text>
          </>
        )}

        {!isHeartMode && (
          <>
            <Spacer size={16} />

            <TextInput
              placeholder="Write a comment..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              style={styles.commentInput}
              autoFocus
            />
          </>
        )}

        <Spacer size={16} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button title="CANCEL" variant="ghost" onPress={handleClose} disabled={loading} />
          <Button
            title="SEND"
            variant="primary"
            onPress={handleSend}
            disabled={!canSend || loading || (!selectedConversationId && creatingDM)}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  conversationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 0,
    gap: 12,
  },
  conversationList: {
    gap: 8,
  },
  conversationInfo: {
    flex: 1,
  },
  createDMButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 0,
    gap: 8,
  },
  heartPreview: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  heartBubbleContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  heartBubble: {
    flexWrap: 'wrap',
    padding: 8,
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 4,
    maxWidth: '70%',
  },
  heartHint: {
    width: '100%',
    textAlign: 'right',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  commentInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
