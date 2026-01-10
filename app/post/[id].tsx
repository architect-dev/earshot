import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { PostInteractionModal } from '@/components/posts/PostInteractionModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPostWithAuthor } from '@/services/posts';
import { createMessage as createMessageService } from '@/services/messages';
import { getDocument } from '@/services/firebase/firestore';
import { COLLECTIONS } from '@/services/firebase/firestore';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor, type User, type QuotedContent } from '@/types';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionPost, setInteractionPost] = useState<PostWithAuthor | null>(null);
  const [interactionType, setInteractionType] = useState<'heart' | 'comment'>('heart');
  const [sendingInteraction, setSendingInteraction] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;

    try {
      const postData = await getPostWithAuthor(id);
      if (!postData) {
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      setPost(postData);

      // Load author profile
      const authorData = await getDocument<User>(COLLECTIONS.USERS, postData.authorId);
      setAuthor(authorData);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleHeartPress = () => {
    if (!post) return;
    setInteractionPost(post);
    setInteractionType('heart');
    setShowInteractionModal(true);
  };

  const handleCommentPress = () => {
    if (!post) return;
    setInteractionPost(post);
    setInteractionType('comment');
    setShowInteractionModal(true);
  };

  const handleSendInteraction = async (
    conversationId: string,
    messageType: 'heart' | 'comment',
    content: string | undefined,
    heartCount?: number
  ) => {
    if (!post || !user) return;

    setSendingInteraction(true);
    try {
      // Create quoted content for the post
      const quotedContent: QuotedContent = {
        type: 'post',
        postId: post.id,
        preview: {
          authorName: post.author.fullName,
          authorUsername: post.author.username,
          text: post.textBody || undefined,
          mediaUrl: post.media.length > 0 ? post.media[0].url : undefined,
        },
      };

      // Send message with quoted post
      await createMessageService({
        conversationId,
        senderId: user.uid,
        type: messageType === 'heart' ? 'heart' : 'comment',
        content: messageType === 'heart' ? undefined : content,
        quotedContent,
        heartCount: messageType === 'heart' ? heartCount || 1 : undefined,
      });

      setShowInteractionModal(false);
      setInteractionPost(null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      throw err;
    } finally {
      setSendingInteraction(false);
    }
  };

  const handleMediaPress = () => {
    // TODO: Open MediaViewer
    Alert.alert('Media', 'Media viewer coming soon');
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.pine} />
        </View>
      </ScreenContainer>
    );
  }

  if (!post || !author) {
    return null;
  }

  return (
    <ScreenContainer padded={false}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.highlightLow,
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 8,
            marginTop: -insets.top,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={18} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Avatar source={author.profilePhotoUrl} name={author.fullName} size="sm" style={styles.headerAvatar} />
          <Text size="lg" weight="semibold" style={styles.headerTitle}>
            {author.fullName}'s Post
          </Text>
        </View>
      </View>

      {/* Post */}
      <View style={styles.content}>
        <PostCard
          post={post}
          onAuthorPress={() => router.push(`/user/${post.authorId}`)}
          onHeartPress={handleHeartPress}
          onCommentPress={handleCommentPress}
          onMediaPress={handleMediaPress}
          isOwner={post.authorId === user?.uid}
        />
      </View>

      {/* Interaction Modal */}
      {post && (
        <PostInteractionModal
          visible={showInteractionModal}
          onClose={() => {
            setShowInteractionModal(false);
            setInteractionPost(null);
          }}
          onSend={handleSendInteraction}
          post={post}
          type={interactionType}
          loading={sendingInteraction}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    marginRight: 0,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
