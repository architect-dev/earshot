import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Avatar } from '@/components/ui';
import { MediaSlideshow } from './MediaSlideshow';
import { type PostWithAuthor } from '@/types';
import { type Timestamp } from 'firebase/firestore';

interface PostCardProps {
  post: PostWithAuthor;
  onAuthorPress?: () => void;
  onHeartPress?: () => void;
  onCommentPress?: () => void;
  onMediaPress?: (index: number) => void;
  onOptionsPress?: () => void;
  isOwner?: boolean;
}

function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';

  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PostCard({
  post,
  onAuthorPress,
  onHeartPress,
  onCommentPress,
  onMediaPress,
  onOptionsPress,
  isOwner = false,
}: PostCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onAuthorPress} style={styles.authorInfo}>
          <Avatar source={post.author.profilePhotoUrl} name={post.author.fullName} size="sm" />
          <View style={styles.authorText}>
            <Text size="sm" weight="semibold">
              {post.author.fullName}
            </Text>
            <Text size="xs" color="muted">
              @{post.author.username} · {formatTimestamp(post.createdAt)}
            </Text>
          </View>
        </Pressable>

        {isOwner && onOptionsPress && (
          <Pressable onPress={onOptionsPress} style={styles.optionsButton} hitSlop={8}>
            <FontAwesome6 name="ellipsis" size={16} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Media */}
      {post.media.length > 0 && <MediaSlideshow media={post.media} onMediaPress={onMediaPress} />}

      {/* Text Body */}
      {post.textBody && (
        <View style={styles.textBody}>
          <Text size="sm">{post.textBody}</Text>
        </View>
      )}

      {/* Actions - only show heart/comment for other users' posts */}
      {!isOwner && (
        <View style={styles.actions}>
          <Pressable onPress={onHeartPress} style={styles.actionButton}>
            <FontAwesome6 name="heart" size={18} color={theme.colors.love} />
          </Pressable>
          <Pressable onPress={onCommentPress} style={styles.actionButton}>
            <FontAwesome6 name="message" size={18} color={theme.colors.pine} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
    flex: 1,
  },
  optionsButton: {
    padding: 8,
  },
  textBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
  },
  actionButton: {
    padding: 4,
  },
});
