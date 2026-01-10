import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, Text } from '@/components/ui';
import { formatMessageTimestamp } from '@/utils/formatting';
import { type Conversation, type Message } from '@/types';
import { type Timestamp } from 'firebase/firestore';

interface ConversationRowProps {
  conversation: Conversation;
  otherUser?: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
  };
  lastMessage?: Message | null;
  currentUserId: string;
  onPress?: () => void;
}

function getLastMessagePreview(message: Message | null | undefined): string {
  if (!message) return 'No messages yet';

  if (message.deletedAt) return 'Deleted message';

  switch (message.type) {
    case 'text':
      return message.content || '';
    case 'photo':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'voice':
      return '🎤 Voice message';
    case 'heart':
      return '❤️ Heart';
    case 'comment':
      return message.content ? `💬 ${message.content}` : '💬 Comment';
    case 'reaction':
      return '❤️';
    default:
      return 'Message';
  }
}

export function ConversationRow({
  conversation,
  otherUser,
  lastMessage,
  currentUserId,
  onPress,
}: ConversationRowProps) {
  const { theme } = useTheme();
  const unreadCount = conversation.unreadCounts[currentUserId] || 0;
  const isMuted = conversation.mutedBy.includes(currentUserId);

  // For DMs, show other user's info
  // For groups, show group name
  const displayName = conversation.type === 'dm' ? otherUser?.fullName || 'Unknown' : conversation.groupName || 'Group Chat';
  const displayUsername = conversation.type === 'dm' ? otherUser?.username : null;
  const avatarSource = conversation.type === 'dm' ? otherUser?.profilePhotoUrl : null;
  const avatarName = conversation.type === 'dm' ? otherUser?.fullName : conversation.groupName || 'Group';

  const preview = getLastMessagePreview(lastMessage);
  const timestamp = conversation.lastMessageAt ? formatMessageTimestamp(conversation.lastMessageAt) : '';

  return (
    <Pressable
      style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.avatarContainer}>
        <Avatar source={avatarSource} name={avatarName} size="md" />
        {unreadCount > 0 && !isMuted && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.pine }]}>
            <Text size="xs" weight="semibold" color="base">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View style={isMuted ? { opacity: 0.6 } : undefined}>
            <Text weight="medium">{displayName}</Text>
          </View>
          {timestamp && (
            <Text size="xs" color="muted">
              {timestamp}
            </Text>
          )}
        </View>
        <View style={styles.previewRow}>
          <View
            style={[
              styles.preview,
              unreadCount > 0 && !isMuted ? { opacity: 1 } : undefined,
              isMuted ? { opacity: 0.6 } : undefined,
            ]}
          >
            <Text
              size="sm"
              color="muted"
              numberOfLines={1}
              weight={unreadCount > 0 && !isMuted ? 'semibold' : 'regular'}
            >
              {preview}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
  },
});

