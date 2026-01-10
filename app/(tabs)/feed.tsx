import { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, PageHeader, Modal, Button, ConfirmModal, Spacer } from '@/components/ui';
import { PostCard, PostInteractionModal, type InteractionType } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { deletePost } from '@/services/posts';
import { findOrCreateDM } from '@/services/conversations';
import { useFriends } from '@/contexts/FriendsContext';
import { createMessage } from '@/services/messages';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor, type QuotedContent } from '@/types';
import { useFeedPosts } from '@/hooks/useFeedPosts';

export default function FeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { friendIds, getProfileById } = useFriends();
  const router = useRouter();

  // Calculate feed user IDs (friends + current user)
  const feedUserIds = useMemo(() => {
    if (!user) return [];
    return [...friendIds, user.uid];
  }, [user, friendIds]);

  // Use the reusable feed hook
  const { posts, loading, refreshing, loadingMore, refresh, loadMore } = useFeedPosts({
    userIds: feedUserIds,
    getProfileById,
    enabled: !!user,
  });

  // Post options state
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showNonOwnerModal, setShowNonOwnerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Interaction modal state
  const [interactionPost, setInteractionPost] = useState<PostWithAuthor | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType>('heart');
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [sendingInteraction, setSendingInteraction] = useState(false);

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
      await createMessage({
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
      throw err; // Re-throw so modal can handle it
    } finally {
      setSendingInteraction(false);
    }
  };

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

  const closeModals = () => {
    setShowOptionsModal(false);
    setShowNonOwnerModal(false);
    setShowDeleteConfirm(false);
    setSelectedPost(null);
  };

  const closeInteractionModal = () => {
    setShowInteractionModal(false);
    setInteractionPost(null);
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
      <PageHeader icon="((" title="Listen" style={styles.header} />

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
              onRefresh={refresh}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Interaction Modal (Heart/Comment) */}
      <PostInteractionModal
        visible={showInteractionModal}
        onClose={closeInteractionModal}
        onSend={handleSendInteraction}
        post={interactionPost}
        type={interactionType}
        loading={sendingInteraction}
      />

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
