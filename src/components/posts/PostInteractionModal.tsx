import React, { useState } from 'react';
import { View, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Modal, Text, Button, TextInput, Avatar, Spacer } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { type PostWithAuthor } from '@/types';

export type InteractionType = 'heart' | 'comment';

interface InteractionModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  post: PostWithAuthor | null;
  type: InteractionType;
  loading?: boolean;
}

export function PostInteractionModal({ visible, onClose, onSend, post, type, loading = false }: InteractionModalProps) {
  const { theme } = useTheme();
  const [comment, setComment] = useState('');

  if (!post) return null;

  const handleSend = () => {
    if (type === 'heart') {
      onSend('❤️');
    } else {
      if (!comment.trim()) return;
      onSend(comment.trim());
    }
    setComment('');
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const isHeartMode = type === 'heart';
  const canSend = isHeartMode || comment.trim().length > 0;

  return (
    <Modal visible={visible} onClose={handleClose} title={isHeartMode ? 'Send Heart' : 'Send Comment'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* Quoted Post Preview */}
        <View
          style={[styles.quotedPost, { backgroundColor: theme.colors.surface, borderColor: theme.colors.highlightLow }]}
        >
          {/* Author Info */}
          <View style={styles.authorRow}>
            <Avatar source={post.author.profilePhotoUrl} name={post.author.fullName} size="sm" />
            <View style={styles.authorText}>
              <Text size="xs" weight="semibold">
                {post.author.fullName}
              </Text>
              <Text size="xs" color="muted">
                @{post.author.username}
              </Text>
            </View>
          </View>

          {/* Post Content Preview */}
          <View style={styles.contentPreview}>
            {post.media.length > 0 && (
              <Image source={{ uri: post.media[0].url }} style={styles.previewImage} resizeMode="cover" />
            )}
            <View style={styles.previewText}>
              {post.textBody ? (
                <Text size="sm" numberOfLines={3}>
                  {post.textBody}
                </Text>
              ) : post.media.length > 0 ? (
                <Text size="sm" color="muted" style={styles.italic}>
                  {post.media.length} photo{post.media.length > 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <Spacer size={16} />

        {/* Heart Preview or Comment Input */}
        {isHeartMode ? (
          <View style={styles.heartPreview}>
            <FontAwesome6 name="heart" size={32} color={theme.colors.love} solid />
            <Spacer size={8} />
            <Text size="sm" color="subtle">
              Send a heart reaction to {post.author.fullName}
            </Text>
          </View>
        ) : (
          <TextInput
            placeholder="Write a comment..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            style={styles.commentInput}
            autoFocus
          />
        )}

        <Spacer size={16} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button title="CANCEL" variant="ghost" onPress={handleClose} disabled={loading} />
          <Button
            title="SEND"
            variant="primary"
            onPress={handleSend}
            disabled={!canSend || loading}
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
  quotedPost: {
    borderWidth: 1,
    padding: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorText: {
    marginLeft: 8,
  },
  contentPreview: {
    flexDirection: 'row',
  },
  previewImage: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  previewText: {
    flex: 1,
    justifyContent: 'center',
  },
  italic: {
    fontStyle: 'italic',
  },
  heartPreview: {
    alignItems: 'center',
    paddingVertical: 16,
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
