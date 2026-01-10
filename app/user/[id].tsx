import { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar, Modal, Button } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/contexts/FriendsContext';
import { findOrCreateDM } from '@/services/conversations';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor } from '@/types';
import { useFeedPosts } from '@/hooks/useFeedPosts';

export default function UserFeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getProfileById } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const userIds = useMemo(() => (id ? [id] : []), [id]);
  const profile = useMemo(() => (id ? getProfileById(id) : undefined), [id, getProfileById]);

  // Use the reusable feed hook
  const { posts, loading, loadingMore, loadMore } = useFeedPosts({
    userIds,
    getProfileById,
    enabled: !!id,
  });

  const [showNonOwnerModal, setShowNonOwnerModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);

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

  if (!profile) {
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
          <Avatar source={profile.profilePhotoUrl} name={profile.fullName} size="sm" style={styles.headerAvatar} />
          <Text size="lg" weight="semibold" style={styles.headerTitle}>
            {profile.fullName}
          </Text>
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        onEndReached={loadMore}
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
