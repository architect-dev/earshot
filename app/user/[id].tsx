import { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { type DocumentSnapshot } from 'firebase/firestore';
import { ScreenContainer, Text, Avatar, Modal, Button } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { PostInteractionModal } from '@/components/posts/PostInteractionModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/contexts/FriendsContext';
import { getUserPosts } from '@/services/posts';
import { findOrCreateDM } from '@/services/conversations';
import { createMessage as createMessageService } from '@/services/messages';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor, type QuotedContent } from '@/types';

const PAGE_SIZE = 20;

export default function UserFeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getFriendById } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionPost, setInteractionPost] = useState<PostWithAuthor | null>(null);
  const [interactionType, setInteractionType] = useState<'heart' | 'comment'>('heart');
  const [sendingInteraction, setSendingInteraction] = useState(false);
  const [showNonOwnerModal, setShowNonOwnerModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);

  // Get user profile from FriendsContext
  const userProfile = id ? getFriendById(id)?.user : undefined;

  const loadUserAndPosts = useCallback(async () => {
    if (!id) return;

    // Check if user is in FriendsContext (all users are friends)
    const friend = getFriendById(id);
    if (!friend) {
      Alert.alert('Error', 'User not found');
      router.back();
      return;
    }

    try {
      // Load initial posts
      const result = await getUserPosts(id, PAGE_SIZE);
      setPosts(result.posts.map((p) => ({ ...p, author: friend.user })));
      cursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, getFriendById]);

  useEffect(() => {
    loadUserAndPosts();
  }, [loadUserAndPosts]);

  const loadMorePosts = useCallback(async () => {
    if (!id || loadingMore || !hasMore || !cursorRef.current) return;

    const friend = getFriendById(id);
    if (!friend) return;

    setLoadingMore(true);
    try {
      const result = await getUserPosts(id, PAGE_SIZE, cursorRef.current);
      const postsWithAuthor = result.posts.map((p) => ({ ...p, author: friend.user }));
      setPosts((prev) => [...prev, ...postsWithAuthor]);
      cursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore, getFriendById]);

  const handleHeartPress = (post: PostWithAuthor) => {
    setInteractionPost(post);
    setInteractionType('heart');
    setShowInteractionModal(true);
  };

  const handleCommentPress = (post: PostWithAuthor) => {
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
    if (!interactionPost || !user) return;

    setSendingInteraction(true);
    try {
      // Create quoted content for the post
      const quotedContent: QuotedContent = {
        type: 'post',
        postId: interactionPost.id,
        preview: {
          authorName: interactionPost.author.fullName,
          authorUsername: interactionPost.author.username,
          text: interactionPost.textBody || undefined,
          mediaUrl: interactionPost.media.length > 0 ? interactionPost.media[0].url : undefined,
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

  const handleMediaPress = (post: PostWithAuthor, index: number) => {
    // TODO: Open MediaViewer
    Alert.alert('Media', `View media ${index + 1} of ${post.media.length}`);
  };

  const handleOptionsPress = (post: PostWithAuthor) => {
    setSelectedPost(post);
    if (post.authorId === user?.uid) {
      // Owner options - TODO: implement edit/delete for user feed
      Alert.alert('Post Options', 'Edit/Delete options coming soon');
    } else {
      setShowNonOwnerModal(true);
    }
  };

  const handleOpenDM = async () => {
    if (!selectedPost || !user) return;

    try {
      const dm = await findOrCreateDM(user.uid, selectedPost.authorId);
      setShowNonOwnerModal(false);
      setSelectedPost(null);
      router.push(`/messages/${dm.id}`);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderPost = ({ item }: { item: PostWithAuthor }) => (
    <PostCard
      post={item}
      onHeartPress={() => handleHeartPress(item)}
      onCommentPress={() => handleCommentPress(item)}
      onMediaPress={(index) => handleMediaPress(item, index)}
      onOptionsPress={() => handleOptionsPress(item)}
      isOwner={item.authorId === user?.uid}
      disableAuthorPress={true}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.gold} />
      </View>
    );
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

  if (!userProfile) {
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
          <Avatar
            source={userProfile.profilePhotoUrl}
            name={userProfile.fullName}
            size="sm"
            style={styles.headerAvatar}
          />
          <Text size="lg" weight="semibold" style={styles.headerTitle}>
            {userProfile.fullName}
          </Text>
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text color="muted" align="center">
              No posts yet
            </Text>
          </View>
        }
      />

      {/* Interaction Modal */}
      {interactionPost && (
        <PostInteractionModal
          visible={showInteractionModal}
          onClose={() => {
            setShowInteractionModal(false);
            setInteractionPost(null);
          }}
          onSend={handleSendInteraction}
          post={interactionPost}
          type={interactionType}
          loading={sendingInteraction}
        />
      )}

      {/* Post Options Modal (Non-Owner) */}
      <Modal
        visible={showNonOwnerModal}
        onClose={() => {
          setShowNonOwnerModal(false);
          setSelectedPost(null);
        }}
        title="Post Options"
      >
        <View style={styles.optionsContainer}>
          <Button title="OPEN DM" variant="secondary" onPress={handleOpenDM} fullWidth />
        </View>
      </Modal>
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
  empty: {
    padding: 32,
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
});
