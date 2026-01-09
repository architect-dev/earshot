import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Spacer } from '@/components/ui';

export const MAX_PHOTOS = 6;

export interface PhotoItem {
  uri: string;
  isNew?: boolean;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, direction: 'left' | 'right') => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  onMove,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: PhotoGridProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size="sm" weight="medium" color="subtle">
          Photos ({photos.length}/{maxPhotos})
        </Text>
      </View>

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View
            key={`${photo.uri}-${index}`}
            style={[styles.photoContainer, { borderColor: theme.colors.highlightMed }]}
          >
            <Image source={{ uri: photo.uri }} style={styles.photo} />

            {photo.isNew && (
              <View style={[styles.newBadge, { backgroundColor: theme.colors.pine }]}>
                <Text size="xs" weight="medium">
                  NEW
                </Text>
              </View>
            )}

            <View style={styles.overlay}>
              <View style={styles.actions}>
                {index > 0 && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => onMove(index, 'left')}
                    disabled={disabled}
                  >
                    <FontAwesome6 name="chevron-left" size={10} color={theme.colors.text} />
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.love }]}
                  onPress={() => onRemove(index)}
                  disabled={disabled}
                >
                  <FontAwesome6 name="xmark" size={10} color={theme.colors.text} />
                </Pressable>
                {index < photos.length - 1 && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => onMove(index, 'right')}
                    disabled={disabled}
                  >
                    <FontAwesome6 name="chevron-right" size={10} color={theme.colors.text} />
                  </Pressable>
                )}
              </View>
              <View style={[styles.indexBadge, { backgroundColor: theme.colors.surface }]}>
                <Text size="xs" weight="medium">
                  {index + 1}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {photos.length < maxPhotos && (
          <Pressable
            style={[
              styles.addButton,
              { borderColor: theme.colors.highlightMed, backgroundColor: theme.colors.surface },
            ]}
            onPress={onAdd}
            disabled={disabled}
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
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 8,
  },
  grid: {
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
  newBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addButton: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
