import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Modal, Text, Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { type Message } from '@/types';
import { toggleMessageReaction, hasUserReacted, deleteMessage } from '@/services/messages';
import { getErrorMessage } from '@/utils/errors';
import { Alert } from 'react-native';

interface MessageContextModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message | null;
  conversationId: string;
  currentUserId: string;
  onReply: (message: Message) => void;
  onDelete: () => void;
}

export function MessageContextModal({
  visible,
  onClose,
  message,
  conversationId,
  currentUserId,
  onReply,
  onDelete,
}: MessageContextModalProps) {
  const { theme } = useTheme();
  const [hasReacted, setHasReacted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user has reacted when message changes
  useEffect(() => {
    if (message && visible) {
      checkReactionStatus();
    }
  }, [message, visible]);

  const checkReactionStatus = async () => {
    if (!message) return;
    try {
      const reactionId = await hasUserReacted(conversationId, message.id, currentUserId, 'heart');
      setHasReacted(!!reactionId);
    } catch (err) {
      // Silently fail - will show as not reacted
      setHasReacted(false);
    }
  };

  const handleHeart = async () => {
    if (!message || loading) return;

    setLoading(true);
    try {
      await toggleMessageReaction(conversationId, message.id, currentUserId, 'heart');
      setHasReacted(!hasReacted);
      onClose();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    if (!message) return;
    onReply(message);
    onClose();
  };

  const handleDelete = () => {
    if (!message || loading) return;

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteMessage(message.id, currentUserId);
            onDelete();
            onClose();
          } catch (err) {
            Alert.alert('Error', getErrorMessage(err));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (!message) return null;

  const isOwnMessage = message.senderId === currentUserId;
  const isDeleted = !!message.deletedAt;

  return (
    <Modal visible={visible} onClose={onClose} dismissable={!loading} showCloseButton={false}>
      <View style={styles.container}>
        {/* Heart option - available for all non-deleted messages */}
        {!isDeleted && (
          <Pressable
            onPress={handleHeart}
            disabled={loading}
            style={[styles.option, { borderBottomColor: theme.colors.highlightLow }]}
          >
            <View style={styles.optionContent}>
              <FontAwesome6
                name="heart"
                size={18}
                color={hasReacted ? theme.colors.love : theme.colors.text}
                solid={hasReacted}
              />
              <Text size="md" style={styles.optionText}>
                {hasReacted ? 'Remove Heart' : 'Heart'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Reply option - available for all non-deleted messages */}
        {!isDeleted && (
          <Pressable
            onPress={handleReply}
            disabled={loading}
            style={[styles.option, { borderBottomColor: theme.colors.highlightLow }]}
          >
            <View style={styles.optionContent}>
              <FontAwesome6 name="reply" size={18} color={theme.colors.text} />
              <Text size="md" style={styles.optionText}>
                Reply
              </Text>
            </View>
          </Pressable>
        )}

        {/* Delete option - only for own messages */}
        {isOwnMessage && !isDeleted && (
          <Pressable
            onPress={handleDelete}
            disabled={loading}
            style={[styles.option, { borderBottomColor: theme.colors.highlightLow }]}
          >
            <View style={styles.optionContent}>
              <FontAwesome6 name="trash" size={18} color={theme.colors.love} />
              <Text size="md" style={[styles.optionText, { color: theme.colors.love }]}>
                Delete
              </Text>
            </View>
          </Pressable>
        )}

        {/* Cancel button */}
        <View style={styles.footer}>
          <Button title="CANCEL" variant="ghost" onPress={onClose} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 200,
  },
  option: {
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  footer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

