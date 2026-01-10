import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Avatar, Modal, Button } from '@/components/ui';
import { PostCard } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/contexts/FriendsContext';
import { getPostWithAuthor } from '@/services/posts';
import { findOrCreateDM } from '@/services/conversations';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor } from '@/types';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getProfileById } = useFriends();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNonOwnerModal, setShowNonOwnerModal] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;

    try {
      const postData = await getPostWithAuthor(id, getProfileById);
      if (!postData) {
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      setPost(postData);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, getProfileById]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleMediaPress = () => {
    // TODO: Open MediaViewer
    Alert.alert('Media', 'Media viewer coming soon');
  };

  const handleOptionsPress = () => {
    if (post && post.authorId === user?.uid) {
      // Owner options - TODO: implement edit/delete for post detail
      Alert.alert('Post Options', 'Edit/Delete options coming soon');
    } else if (post) {
      setShowNonOwnerModal(true);
    }
  };

  const handleOpenDM = async () => {
    if (!post || !user) return;

    try {
      const dm = await findOrCreateDM(user.uid, post.authorId);
      setShowNonOwnerModal(false);
      router.push(`/messages/${dm.id}`);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
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

  if (!post) {
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
            source={post.author.profilePhotoUrl}
            name={post.author.fullName}
            size="sm"
            style={styles.headerAvatar}
          />
          <Text size="lg" weight="semibold" style={styles.headerTitle}>
            {post.author.fullName}'s Post
          </Text>
        </View>
      </View>

      {/* Post */}
      <View style={styles.content}>
        <PostCard
          post={post}
          onMediaPress={handleMediaPress}
          onOptionsPress={handleOptionsPress}
          isOwner={post.authorId === user?.uid}
          disableAuthorPress={true}
        />
      </View>

      {/* Post Options Modal (Non-Owner) */}
      <Modal visible={showNonOwnerModal} onClose={() => setShowNonOwnerModal(false)} title="Post Options">
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
  content: {
    flex: 1,
  },
  optionsContainer: {
    gap: 12,
  },
});
