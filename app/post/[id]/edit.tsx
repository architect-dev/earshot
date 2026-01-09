import { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer, Text, Button, TextInput, PageHeader, LoadingSpinner, UploadProgress } from '@/components/ui';
import {
  PhotoEditor,
  MAX_PHOTOS,
  type PhotoItem,
  createPhotoItem,
  DEFAULT_SCALE,
  DEFAULT_X,
  DEFAULT_Y,
} from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPost, editPost, type EditMediaItem } from '@/services/posts';
import { getErrorMessage } from '@/utils/errors';
import { type Post } from '@/types';

// Extended PhotoItem for edit screen with storage path
interface EditPhotoItem extends PhotoItem {
  storagePath?: string;
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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Track deleted storage paths
  const deletedPathsRef = useRef<string[]>([]);

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
          scale: m.scale ?? DEFAULT_SCALE,
          x: m.x ?? DEFAULT_X,
          y: m.y ?? DEFAULT_Y,
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
        ...createPhotoItem(asset.uri, asset.width, asset.height, true),
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    }
  }, [photos.length]);

  const handlePhotosChange = useCallback((newPhotos: PhotoItem[]) => {
    // Find removed photos with storage paths and track them for deletion
    setPhotos((prevPhotos) => {
      const newUris = new Set(newPhotos.map((p) => p.uri));
      for (const prev of prevPhotos) {
        if (!newUris.has(prev.uri) && !prev.isNew && prev.storagePath) {
          deletedPathsRef.current.push(prev.storagePath);
        }
      }
      // Cast back to EditPhotoItem, preserving storagePath for existing items
      return newPhotos.map((p) => {
        const existing = prevPhotos.find((prev) => prev.uri === p.uri);
        return {
          ...p,
          storagePath: existing?.storagePath,
        } as EditPhotoItem;
      });
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
        scale: p.scale,
        x: p.x,
        y: p.y,
      }));

      await editPost(postId, user.uid, textBody, mediaItems, deletedPathsRef.current, (current, total) => {
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
      deletedPathsRef.current.length > 0 ||
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
        <PhotoEditor photos={photos} onPhotosChange={handlePhotosChange} onAdd={handlePickPhotos} disabled={saving} />

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
            numberOfLines={4}
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
