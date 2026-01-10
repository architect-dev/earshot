import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Avatar } from '@/components/ui';
import { formatTimestamp } from '@/utils/formatting';
import { type Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string; // For group chats
  senderAvatar?: string | null; // For group chats
  onPress?: () => void;
  onLongPress?: () => void;
  opacity?: number; // For pending messages (0.5)
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
  onPress,
  onLongPress,
  opacity = 1,
}: MessageBubbleProps) {
  const { theme } = useTheme();

  // Don't render reaction messages (they're handled separately)
  if (message.type === 'reaction') {
    return null;
  }

  // Deleted message placeholder
  if (message.deletedAt) {
    return (
      <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
        <View
          style={[
            styles.bubble,
            isOwn
              ? [styles.ownBubble, { backgroundColor: theme.colors.highlightLow }]
              : [styles.otherBubble, { backgroundColor: theme.colors.highlightMed }],
            { opacity },
          ]}
        >
          <Text size="sm" color="muted" style={{ fontStyle: 'italic' }}>
            Deleted message
          </Text>
        </View>
      </View>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <Text size="sm">{message.content}</Text>;
      case 'photo':
        return message.mediaUrl ? (
          <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : null;
      case 'video':
        return message.mediaUrl ? (
          <View style={[styles.media, { backgroundColor: theme.colors.highlightLow }]}>
            <Text size="sm" color="muted">
              🎥 Video
            </Text>
          </View>
        ) : null;
      case 'voice':
        return (
          <View style={[styles.voiceContainer, { backgroundColor: theme.colors.highlightMed }]}>
            <Text size="sm">🎤 Voice message</Text>
          </View>
        );
      case 'heart':
        return <Text size="lg">❤️</Text>;
      case 'comment':
        return <Text size="sm">{message.content}</Text>;
      default:
        return <Text size="sm">Message</Text>;
    }
  };

  return (
    <Pressable
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Group chat: show sender avatar and name */}
      {!isOwn && senderName && (
        <View style={styles.senderInfo}>
          <Avatar source={senderAvatar} name={senderName} size="xs" />
          {senderName && (
            <Text size="xs" color="muted" style={styles.senderName}>
              {senderName}
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isOwn
            ? [styles.ownBubble, { backgroundColor: theme.colors.highlightLow }]
            : [styles.otherBubble, { backgroundColor: theme.colors.highlightMed }],
          { opacity },
        ]}
      >
        {/* Quoted content */}
        {message.quotedContent && (
          <View style={[styles.quotedContent, { borderLeftColor: theme.colors.gold }]}>
            {message.quotedContent.type === 'post' && (
              <Text size="xs" color="muted">
                {message.quotedContent.preview.authorName}: {message.quotedContent.preview.text || '📷 Photo'}
              </Text>
            )}
            {message.quotedContent.type === 'message' && (
              <Text size="xs" color="muted">
                {message.quotedContent.preview.senderName}: {message.quotedContent.preview.text || 'Message'}
              </Text>
            )}
          </View>
        )}

        {/* Main content */}
        {renderContent()}

        {/* Timestamp and read receipt */}
        <View style={styles.footer}>
          <Text size="xs" color={isOwn ? 'foam' : 'muted'}>
            {formatTimestamp(message.createdAt)}
          </Text>
          {isOwn && message.readBy && message.readBy.length > 1 && (
            <Text size="xs" color="foam" style={styles.readReceipt}>
              ✓✓
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 0, // Sharp corners
  },
  ownBubble: {},
  otherBubble: {},
  media: {
    width: 200,
    height: 200,
    borderRadius: 0,
  },
  voiceContainer: {
    padding: 12,
    borderRadius: 0,
  },
  quotedContent: {
    paddingLeft: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
    paddingBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  readReceipt: {
    marginLeft: 4,
  },
});
