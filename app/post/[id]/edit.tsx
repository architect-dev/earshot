import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer, Text, Button, TextInput, PageHeader, LoadingSpinner, UploadProgress } from '@/components/ui';
import { PhotoGrid, MAX_PHOTOS, type PhotoItem } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPost, editPost, type EditMediaItem } from '@/services/posts';
import { getErrorMessage } from '@/utils/errors';
import { type Post } from '@/types';

interface EditPhotoItem extends PhotoItem {
  storagePath?: string;
  width?: number;
  height?: number;
}

export default function EditPostScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: postId } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [photos, setPhotos] = useState<EditPhotoItem[]>([]);
  const [textBody, setTextBody] = useState('');
  const [deletedPaths, setDeletedPaths] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;

    try {
      const loadedPost = await getPost(postId);
      if (!loadedPost) {
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      if (loadedPost.authorId !== user?.uid) {
        Alert.alert('Error', 'You can only edit your own posts');
        router.back();
        return;
      }

      setPost(loadedPost);
      setTextBody(loadedPost.textBody || '');
      setPhotos(
        loadedPost.media.map((m) => ({
          uri: m.url,
          isNew: false,
          storagePath: m.storagePath,
          width: m.width,
          height: m.height,
        }))
      );
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [postId, user?.uid, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handlePickPhotos = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `Maximum ${MAX_PHOTOS} photos per post.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: EditPhotoItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        isNew: true,
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const item = prev[index];
      if (!item.isNew && item.storagePath) {
        setDeletedPaths((paths) => [...paths, item.storagePath!]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleMovePhoto = useCallback((fromIndex: number, direction: 'left' | 'right') => {
    setPhotos((prev) => {
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= prev.length) return prev;

      const newPhotos = [...prev];
      [newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]];
      return newPhotos;
    });
  }, []);

  const handleSave = async () => {
    if (!post || !user || !postId) return;

    setSaving(true);
    const newPhotosCount = photos.filter((p) => p.isNew).length;
    if (newPhotosCount > 0) {
      setUploadProgress({ current: 0, total: newPhotosCount });
    }

    try {
      // Convert to EditMediaItem format
      const mediaItems: EditMediaItem[] = photos.map((p) => ({
        uri: p.uri,
        isNew: p.isNew ?? false,
        storagePath: p.storagePath,
        width: p.width,
        height: p.height,
      }));

      await editPost(postId, user.uid, textBody, mediaItems, deletedPaths, (current, total) => {
        setUploadProgress({ current, total });
      });

      Alert.alert('Success', 'Post updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleCancel = () => {
    const hasChanges =
      textBody !== (post?.textBody || '') ||
      photos.length !== post?.media.length ||
      deletedPaths.length > 0 ||
      photos.some((p) => p.isNew);

    if (hasChanges) {
      Alert.alert('Discard Changes?', 'Your changes will not be saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingSpinner fullScreen message="Loading post..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title="Edit Post" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <PhotoGrid
          photos={photos}
          onAdd={handlePickPhotos}
          onRemove={handleRemovePhoto}
          onMove={handleMovePhoto}
          disabled={saving}
        />

        {/* Caption */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text size="sm" weight="medium" color="subtle">
              Caption (optional)
            </Text>
          </View>
          <TextInput
            placeholder="Write something..."
            value={textBody}
            onChangeText={setTextBody}
            multiline
            numberOfLines={6}
            style={styles.textInput}
          />
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.highlightLow, paddingBottom: insets.bottom + 8 }]}>
        {uploadProgress && <UploadProgress progress={uploadProgress} />}
        <View style={styles.footerButtons}>
          <Button title="CANCEL" variant="ghost" onPress={handleCancel} disabled={saving} />
          <Button title="SAVE" variant="primary" onPress={handleSave} loading={saving} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  textInput: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
