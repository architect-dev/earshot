import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { clampAspectRatio, calculateAspectRatio } from '@/utils/media';
import { PhotoStrip, MAX_PHOTOS } from './PhotoStrip';
import { PhotoCropEditor } from './PhotoCropEditor';
import { type PhotoItem } from './types';

interface PhotoEditorProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  onAdd: () => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoEditor({
  photos,
  onPhotosChange,
  onAdd,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: PhotoEditorProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keep selected index valid when photos change
  useEffect(() => {
    if (photos.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= photos.length) {
      setSelectedIndex(photos.length - 1);
    }
  }, [photos.length, selectedIndex]);

  // Calculate target aspect ratio from first photo
  const targetAspectRatio = useMemo(() => {
    if (photos.length === 0) return 1;
    const first = photos[0];
    if (!first.width || !first.height) return 1;
    const ratio = calculateAspectRatio(first.width, first.height);
    return clampAspectRatio(ratio);
  }, [photos]);

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= photos.length) return;

    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    onPhotosChange(newPhotos);

    // Follow the moved photo
    setSelectedIndex(toIndex);
  };

  const handleCropChange = (updates: Partial<Pick<PhotoItem, 'scale' | 'x' | 'y'>>) => {
    const newPhotos = [...photos];
    newPhotos[selectedIndex] = { ...newPhotos[selectedIndex], ...updates };
    onPhotosChange(newPhotos);
  };

  const selectedPhoto = photos[selectedIndex];

  return (
    <View style={styles.container}>
      {/* Photo Strip */}
      <PhotoStrip
        photos={photos}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onAdd={onAdd}
        onRemove={handleRemove}
        onReorder={handleReorder}
        maxPhotos={maxPhotos}
        disabled={disabled}
      />

      {/* Crop Editor */}
      {selectedPhoto ? (
        <PhotoCropEditor
          photo={selectedPhoto}
          targetAspectRatio={targetAspectRatio}
          onChange={handleCropChange}
          disabled={disabled}
        />
      ) : (
        <View style={[styles.emptyEditor, { borderColor: theme.colors.highlightMed }]}>
          <Text size="sm" color="muted" align="center">
            Add photos to adjust crop
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 24,
    minHeight: 500,
  },
  emptyEditor: {
    flex: 1,
    minHeight: 400,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
