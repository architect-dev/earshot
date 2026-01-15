import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Modal, Text, Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { MessageWithReactions, QuotedMessage, type Message } from '@/types';
import { deleteMessage } from '@/services/messages';
import { getErrorMessage } from '@/utils/errors';
import { Alert } from 'react-native';
import { useSendMessage } from '@/hooks/useSendMessage';

interface MessageContextModalProps {
  visible: boolean;
  onClose: () => void;
  message: MessageWithReactions | null;
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
  const heartReaction = useMemo(
    () =>
      message?.reactions.find((reaction) => reaction.senderId === currentUserId && reaction.reactionType === 'heart'),
    [message, currentUserId]
  );
  const [loading, setLoading] = useState(false);
  const { sendMessage } = useSendMessage(currentUserId, conversationId);

  const handleHeart = async () => {
    if (!message || loading) return;

    if (heartReaction != null) {
      deleteMessage((heartReaction as Message).id, currentUserId);
    } else {
      const quotedMessage: QuotedMessage = {
        type: 'message',
        senderId: message.senderId,
        messageId: message.id,
        preview: {},
      };
      sendMessage(message.content || '', quotedMessage, undefined, 'heart');
    }
    onClose();
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
                color={heartReaction != null ? theme.colors.love : theme.colors.text}
                solid={heartReaction != null}
              />
              <Text size="md" style={styles.optionText}>
                {heartReaction != null ? 'Remove Heart' : 'Heart'}
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
