import React, { useCallback } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/ui';
import { type PhotoItem } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 8;
const PADDING = 32; // 16px each side
export const MAX_PHOTOS = 6;

// Calculate photo size to fit all photos + add button in one row
const calculatePhotoSize = (): number => {
  const totalGaps = MAX_PHOTOS - 1;
  const availableWidth = SCREEN_WIDTH - PADDING - totalGaps * GAP;
  return Math.floor(availableWidth / MAX_PHOTOS);
};

interface PhotoStripProps {
  photos: PhotoItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

function PhotoItemComponent({
  photo,
  photoSize,
  isSelected,
  onSelect,
  onRemove,
  drag,
  isActive,
  disabled,
  theme,
}: {
  photo: PhotoItem;
  photoSize: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  drag: () => void;
  isActive: boolean;
  disabled: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <ScaleDecorator>
      <Pressable
        onPress={onSelect}
        onLongPress={drag}
        disabled={disabled || isActive}
        style={[
          styles.photoContainer,
          {
            width: photoSize,
            height: photoSize,
            borderColor: isSelected ? theme.colors.gold : theme.colors.highlightMed,
            borderWidth: isSelected ? 2 : 1,
            opacity: isActive ? 0.8 : 1,
          },
        ]}
      >
        <Image source={{ uri: photo.uri }} style={styles.photo} />

        <View style={styles.overlay}>
          <Pressable
            style={[styles.removeButton, { backgroundColor: theme.colors.love }]}
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled || isActive}
          >
            <FontAwesome6 name="xmark" size={10} color={theme.colors.text} />
          </Pressable>
        </View>
      </Pressable>
    </ScaleDecorator>
  );
}

export function PhotoStrip({
  photos,
  selectedIndex,
  onSelect,
  onAdd,
  onRemove,
  onReorder,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: PhotoStripProps) {
  const { theme } = useTheme();
  const photoSize = calculatePhotoSize();

  const handleDragEnd = useCallback(
    ({ from, to }: { data: PhotoItem[]; from: number; to: number }) => {
      if (from !== to) {
        onReorder(from, to);
        // Update selected index if the dragged item was selected or if selection moved
        if (selectedIndex === from) {
          onSelect(to);
        } else if (selectedIndex > from && selectedIndex <= to) {
          onSelect(selectedIndex - 1);
        } else if (selectedIndex < from && selectedIndex >= to) {
          onSelect(selectedIndex + 1);
        }
      }
    },
    [onReorder, onSelect, selectedIndex]
  );

  const renderItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<PhotoItem>) => {
      const index = getIndex() ?? 0;
      return (
        <PhotoItemComponent
          photo={item}
          photoSize={photoSize}
          isSelected={index === selectedIndex}
          onSelect={() => onSelect(index)}
          onRemove={() => onRemove(index)}
          drag={drag}
          isActive={isActive}
          disabled={disabled}
          theme={theme}
        />
      );
    },
    [photoSize, selectedIndex, onSelect, onRemove, disabled, theme]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size="sm" weight="medium" color="subtle">
          Photos ({photos.length}/{maxPhotos})
        </Text>
        <Text size="xs" color="muted">
          Tap to select • Drag to reorder
        </Text>
      </View>

      <View style={styles.row}>
        <DraggableFlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          onDragEnd={handleDragEnd}
          horizontal
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          activationDistance={10}
        />

        {photos.length < maxPhotos && (
          <Pressable
            style={[
              styles.addButton,
              {
                width: photoSize,
                height: photoSize,
                borderColor: theme.colors.highlightMed,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={onAdd}
            disabled={disabled}
          >
            <FontAwesome6 name="plus" size={20} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 8,
  },
  row: {
    marginLeft: -GAP / 2,
    marginRight: -GAP / 2,
    flexDirection: 'row',
  },
  listContent: {},
  photoContainer: {
    position: 'relative',
    margin: GAP / 2,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  removeButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    margin: GAP / 2,
  },
});
