import { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { type DocumentSnapshot } from 'firebase/firestore';
import { ScreenContainer, Text, PageHeader, Modal, Button, ConfirmModal, Spacer } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getFeedPosts, deletePost } from '@/services/posts';
import { getFriends } from '@/services/friends';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor } from '@/types';

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Store cursor and friend IDs for pagination
  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const friendIdsRef = useRef<string[]>([]);

  // Post options state
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPosts = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      try {
        // Get friend IDs first (only on initial load or refresh)
        if (isRefresh || friendIdsRef.current.length === 0) {
          const friends = await getFriends(user.uid);
          friendIdsRef.current = friends.map((f) => f.user.id);
          // Include own posts in feed
          friendIdsRef.current.push(user.uid);
        }

        // Reset cursor on refresh
        if (isRefresh) {
          cursorRef.current = null;
        }

        // Fetch posts
        const result = await getFeedPosts(friendIdsRef.current, PAGE_SIZE, null);
        setPosts(result.posts);
        cursorRef.current = result.cursor;
        setHasMore(result.hasMore);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading feed:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const loadMorePosts = useCallback(async () => {
    if (!user || loadingMore || !hasMore || !cursorRef.current) return;

    setLoadingMore(true);
    try {
      const result = await getFeedPosts(friendIdsRef.current, PAGE_SIZE, cursorRef.current);
      setPosts((prev) => [...prev, ...result.posts]);
      cursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, hasMore]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(true);
    setRefreshing(false);
  };

  const handleHeartPress = (post: PostWithAuthor) => {
    // TODO: Open InteractionModal for heart
    Alert.alert('Heart', `Send a heart to ${post.author.fullName}?`);
  };

  const handleCommentPress = (post: PostWithAuthor) => {
    // TODO: Open InteractionModal for comment
    Alert.alert('Comment', `Send a comment to ${post.author.fullName}?`);
  };

  const handleAuthorPress = (post: PostWithAuthor) => {
    // TODO: Navigate to user profile
    Alert.alert('Profile', `View ${post.author.fullName}'s profile`);
  };

  const handleMediaPress = (post: PostWithAuthor, index: number) => {
    // TODO: Open MediaViewer
    Alert.alert('Media', `View media ${index + 1} of ${post.media.length}`);
  };

  const handleOptionsPress = (post: PostWithAuthor) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
  };

  const handleEditPress = () => {
    if (!selectedPost) return;
    setShowOptionsModal(false);
    router.push(`/post/${selectedPost.id}/edit`);
  };

  const handleDeletePress = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPost || !user) return;

    setActionLoading(true);
    try {
      await deletePost(selectedPost.id, user.uid);
      // Remove from local state
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      setShowDeleteConfirm(false);
      setSelectedPost(null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(false);
    setSelectedPost(null);
  };

  const renderPost = ({ item }: { item: PostWithAuthor }) => (
    <PostCard
      post={item}
      onAuthorPress={() => handleAuthorPress(item)}
      onHeartPress={() => handleHeartPress(item)}
      onCommentPress={() => handleCommentPress(item)}
      onMediaPress={(index) => handleMediaPress(item, index)}
      onOptionsPress={() => handleOptionsPress(item)}
      isOwner={item.authorId === user?.uid}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text size="lg" weight="semibold" color="subtle" align="center">
        No posts yet
      </Text>
      <Text size="sm" color="muted" align="center" style={styles.emptyText}>
        Posts from you and your friends will appear here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.gold} />
      </View>
    );
  };

  return (
    <ScreenContainer padded={false}>
      <PageHeader title="Feed" style={styles.header} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text color="muted">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Post Options Modal */}
      <Modal visible={showOptionsModal} onClose={closeModals} title="Post Options">
        <View style={styles.optionsContainer}>
          <Button title="EDIT" variant="secondary" onPress={handleEditPress} fullWidth />
          <Spacer size={12} />
          <Button title="DELETE" variant="error" onPress={handleDeletePress} fullWidth />
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="DELETE"
        cancelText="CANCEL"
        confirmVariant="error"
        loading={actionLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 8,
  },
  optionsContainer: {
    paddingTop: 8,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
