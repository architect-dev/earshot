import { useState, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, PageHeader, Modal, Button, ConfirmModal, Spacer } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { deletePost } from '@/services/posts';
import { findOrCreateDM } from '@/services/conversations';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor } from '@/types';

export default function FeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use FeedContext for main feed
  const { posts, loading, loadingMore, hasMore, unseenPostsCount, refresh, loadMore, viewNewPosts } = useFeed();

  // Calculate if user is scrolled down (more than 400px from top)
  const showNewPostsBanner = unseenPostsCount > 0;

  // Post options state
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showNonOwnerModal, setShowNonOwnerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAuthorPress = (post: PostWithAuthor) => {
    router.push(`/user/${post.authorId}`);
  };

  const handleMediaPress = (post: PostWithAuthor, index: number) => {
    // TODO: Open MediaViewer
    Alert.alert('Media', `View media ${index + 1} of ${post.media.length}`);
  };

  const handleOptionsPress = (post: PostWithAuthor) => {
    setSelectedPost(post);
    if (post.authorId === user?.uid) {
      setShowOptionsModal(true);
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
      // Refresh feed to remove deleted post
      await refresh();
      setShowDeleteConfirm(false);
      setSelectedPost(null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewNewPosts = () => {
    viewNewPosts();
    // Scroll to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const closeModals = () => {
    setShowOptionsModal(false);
    setShowNonOwnerModal(false);
    setShowDeleteConfirm(false);
    setSelectedPost(null);
  };

  const renderPost = ({ item }: { item: PostWithAuthor }) => (
    <PostCard
      post={item}
      onAuthorPress={() => handleAuthorPress(item)}
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
      <PageHeader icon="((" title="Listen" style={styles.header} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text color="muted">Loading...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.gold}
                colors={[theme.colors.gold]}
              />
            }
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
          />

          {/* "N new posts" banner */}
          {showNewPostsBanner && (
            <Pressable style={styles.newPostsBanner} onPress={handleViewNewPosts}>
              <Text size="sm" weight="semibold" color="base">
                {unseenPostsCount} new post{unseenPostsCount !== 1 ? 's' : ''}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Post Options Modal (Owner) */}
      <Modal visible={showOptionsModal} onClose={closeModals} title="Post Options">
        <View style={styles.optionsContainer}>
          <Button title="EDIT" variant="secondary" onPress={handleEditPress} fullWidth />
          <Spacer size={12} />
          <Button title="DELETE" variant="error" onPress={handleDeletePress} fullWidth />
        </View>
      </Modal>

      {/* Post Options Modal (Non-Owner) */}
      <Modal visible={showNonOwnerModal} onClose={closeModals} title="Post Options">
        <View style={styles.optionsContainer}>
          <Button title="OPEN DM" variant="secondary" onPress={handleOpenDM} fullWidth />
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
  listContainer: {
    flex: 1,
    position: 'relative',
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
  newPostsBanner: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: '#FFD700', // gold color
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
});
