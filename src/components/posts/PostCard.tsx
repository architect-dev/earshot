import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePostInteraction } from '@/contexts/PostInteractionContext';
import { Text, Avatar } from '@/components/ui';
import { MediaSlideshow } from './MediaSlideshow';
import { formatTimestamp } from '@/utils/formatting';
import { type PostWithAuthor } from '@/types';

interface PostCardProps {
  post: PostWithAuthor;
  onAuthorPress?: () => void;
  onMediaPress?: (index: number) => void;
  onOptionsPress?: () => void;
  isOwner?: boolean;
  disableAuthorPress?: boolean; // Disable author press (e.g., when already on user's feed)
}

export function PostCard({
  post,
  onAuthorPress,
  onMediaPress,
  onOptionsPress,
  isOwner = false,
  disableAuthorPress = false,
}: PostCardProps) {
  const { theme } = useTheme();
  const { handleHeartPress, handleCommentPress } = usePostInteraction();

  if (post.deleted) {
    return (
      <View style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}>
        <Text size="sm" color="muted" style={{ fontStyle: 'italic', padding: 16 }}>
          Deleted post
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={disableAuthorPress ? undefined : onAuthorPress}
          style={styles.authorInfo}
          disabled={disableAuthorPress}
        >
          <Avatar profile={post.author} size="sm" />
          <View style={styles.authorText}>
            <Text size="sm" weight="semibold">
              {post.author.fullName}
            </Text>
            <Text size="xs" color="muted">
              @{post.author.username} · {formatTimestamp(post.createdAt)}
            </Text>
          </View>
        </Pressable>

        {onOptionsPress && (
          <Pressable onPress={onOptionsPress} style={styles.optionsButton} hitSlop={8}>
            <FontAwesome6 name="ellipsis" size={16} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Media */}
      {post.media.length > 0 && (
        <MediaSlideshow media={post.media} mediaAspectRatio={post.mediaAspectRatio} onMediaPress={onMediaPress} />
      )}

      {/* Text Body */}
      {post.textBody && (
        <View style={styles.textBody}>
          <Text size="sm">{post.textBody}</Text>
        </View>
      )}

      {/* Actions - only show heart/comment for other users' posts */}
      {!isOwner && (
        <View style={styles.actions}>
          <Pressable onPress={() => handleHeartPress(post)} style={styles.actionButton}>
            <FontAwesome6 name="heart" size={18} color={theme.colors.love} />
          </Pressable>
          <Pressable onPress={() => handleCommentPress(post)} style={styles.actionButton}>
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
