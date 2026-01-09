import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { ScreenContainer, Text, Button, TextInput, PageHeader, UploadProgress } from '@/components/ui';
import { PhotoEditor, type PhotoItem } from '@/components/posts';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePhotoPicker } from '@/hooks';
import { createPost } from '@/services/posts';
import { getErrorMessage } from '@/utils/errors';

export default function CreateScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const { photos, setPhotos, pickPhotos, clearPhotos } = usePhotoPicker();
  const [textBody, setTextBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const handlePhotosChange = (newPhotos: PhotoItem[]) => {
    setPhotos(newPhotos);
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
      clearPhotos();
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
          clearPhotos();
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
        <PhotoEditor photos={photos} onPhotosChange={handlePhotosChange} onAdd={pickPhotos} disabled={isSubmitting} />

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
      <View style={[styles.footer, { borderTopColor: theme.colors.highlightLow }]}>
        {uploadProgress && <UploadProgress progress={uploadProgress} />}

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
  textInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
});
