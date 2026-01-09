import { useState } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { ScreenContainer, Text, Button, TextInput, PageHeader, Spacer } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/services/posts';
import { getErrorMessage } from '@/utils/errors';

const MAX_PHOTOS = 6;

export default function CreateScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [photos, setPhotos] = useState<string[]>([]);
  const [textBody, setTextBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const handlePickPhotos = async () => {
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
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMovePhoto = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= photos.length) return;

    setPhotos((prev) => {
      const newPhotos = [...prev];
      [newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]];
      return newPhotos;
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: photos.length });

    try {
      await createPost(user.uid, photos, textBody || null, (current, total) => {
        setUploadProgress({ current, total });
      });

      // Success - reset form
      setPhotos([]);
      setTextBody('');
      Alert.alert('Success', 'Your post has been shared!');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleReset = () => {
    if (photos.length === 0 && !textBody) return;

    Alert.alert('Discard Post?', 'Your post will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setPhotos([]);
          setTextBody('');
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <PageHeader
        title="Create"
        rightElement={
          (photos.length > 0 || textBody) && !isSubmitting ? (
            <Button title="CLEAR" variant="ghost" size="small" onPress={handleReset} />
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Photo Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text size="sm" weight="medium" color="subtle">
              Photos ({photos.length}/{MAX_PHOTOS})
            </Text>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={uri} style={[styles.photoContainer, { borderColor: theme.colors.highlightMed }]}>
                <Image source={{ uri }} style={styles.photo} />
                <View style={styles.photoOverlay}>
                  <View style={styles.photoActions}>
                    {index > 0 && (
                      <Pressable
                        style={[styles.photoActionButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => handleMovePhoto(index, 'left')}
                      >
                        <FontAwesome6 name="chevron-left" size={10} color={theme.colors.text} />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.photoActionButton, { backgroundColor: theme.colors.love }]}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <FontAwesome6 name="xmark" size={10} color={theme.colors.text} />
                    </Pressable>
                    {index < photos.length - 1 && (
                      <Pressable
                        style={[styles.photoActionButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => handleMovePhoto(index, 'right')}
                      >
                        <FontAwesome6 name="chevron-right" size={10} color={theme.colors.text} />
                      </Pressable>
                    )}
                  </View>
                  <View style={[styles.photoIndex, { backgroundColor: theme.colors.surface }]}>
                    <Text size="xs" weight="medium">
                      {index + 1}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <Pressable
                style={[
                  styles.addPhotoButton,
                  { borderColor: theme.colors.highlightMed, backgroundColor: theme.colors.surface },
                ]}
                onPress={handlePickPhotos}
              >
                <FontAwesome6 name="plus" size={24} color={theme.colors.muted} />
                <Spacer size={4} />
                <Text size="xs" color="muted">
                  Add
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Text Body */}
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
      <View style={[styles.footer, { borderTopColor: theme.colors.highlightLow }]}>
        {/* Upload Progress */}
        {uploadProgress && (
          <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
            <Text size="sm" color="subtle">
              Uploading photo {uploadProgress.current} of {uploadProgress.total}...
            </Text>
            <Spacer size={8} />
            <View style={[styles.progressBar, { backgroundColor: theme.colors.highlightLow }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.gold,
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <Button
          title={isSubmitting ? 'POSTING...' : 'POST'}
          variant="primary"
          onPress={handleSubmit}
          disabled={(photos.length === 0 && !textBody.trim()) || isSubmitting}
          loading={isSubmitting}
          fullWidth
        />
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderWidth: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 4,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  photoActionButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndex: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
  progressContainer: {
    padding: 16,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});
