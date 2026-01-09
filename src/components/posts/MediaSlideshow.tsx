import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/ui';
import { getDisplayAspectRatio, calculateAspectRatio } from '@/utils/media';
import { type PostMedia } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaSlideshowProps {
  media: PostMedia[];
  onMediaPress?: (index: number) => void;
}

export function MediaSlideshow({ media, onMediaPress }: MediaSlideshowProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Calculate aspect ratio from first image, clamped to allowed range (4:5 to 1.91:1)
  const aspectRatio = useMemo(() => getDisplayAspectRatio(media), [media]);
  const containerHeight = SCREEN_WIDTH / aspectRatio;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < media.length) {
      setCurrentIndex(index);
    }
  };

  const renderItem = ({ item, index }: { item: PostMedia; index: number }) => {
    // Get crop data (defaults if not present)
    const scale = item.scale ?? 1;
    const x = item.x ?? 0.5;
    const y = item.y ?? 0.5;

    // Calculate image aspect ratio
    const imageAspectRatio = calculateAspectRatio(item.width, item.height);

    // Calculate how the image should be displayed within the container
    // The container has a fixed aspect ratio (from first image, clamped)
    // We need to scale and position the image based on crop data

    let imageWidth: number;
    let imageHeight: number;

    // Calculate base size (image should "cover" the container at scale=1)
    if (imageAspectRatio > aspectRatio) {
      // Image is wider than container - match heights
      imageHeight = containerHeight;
      imageWidth = imageHeight * imageAspectRatio;
    } else {
      // Image is taller than container - match widths
      imageWidth = SCREEN_WIDTH;
      imageHeight = imageWidth / imageAspectRatio;
    }

    // Apply scale
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    // Calculate pan offset from x/y (0-1)
    // x=0.5 is centered, x=0 is left flush, x=1 is right flush
    // Similar for y
    const maxPanX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerHeight) / 2);

    // Convert x/y (0-1) to translate values
    // x=0.5 -> translate=0, x=0 -> translate=+maxPan, x=1 -> translate=-maxPan
    const translateX = maxPanX * (1 - 2 * x);
    const translateY = maxPanY * (1 - 2 * y);

    return (
      <Pressable
        onPress={() => onMediaPress?.(index)}
        style={[styles.mediaContainer, { width: SCREEN_WIDTH, height: containerHeight }]}
      >
        <Image
          source={{ uri: item.url }}
          style={[
            styles.media,
            {
              width: scaledWidth,
              height: scaledHeight,
              transform: [{ translateX }, { translateY }],
            },
          ]}
          resizeMode="cover"
        />
      </Pressable>
    );
  };

  if (media.length === 0) {
    return null;
  }

  if (media.length === 1) {
    const item = media[0];
    const scale = item.scale ?? 1;
    const x = item.x ?? 0.5;
    const y = item.y ?? 0.5;
    const imageAspectRatio = calculateAspectRatio(item.width, item.height);

    let imageWidth: number;
    let imageHeight: number;

    if (imageAspectRatio > aspectRatio) {
      imageHeight = containerHeight;
      imageWidth = imageHeight * imageAspectRatio;
    } else {
      imageWidth = SCREEN_WIDTH;
      imageHeight = imageWidth / imageAspectRatio;
    }

    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    const maxPanX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerHeight) / 2);
    const translateX = maxPanX * (1 - 2 * x);
    const translateY = maxPanY * (1 - 2 * y);

    return (
      <Pressable
        onPress={() => onMediaPress?.(0)}
        style={[styles.singleMediaContainer, { width: SCREEN_WIDTH, height: containerHeight }]}
      >
        <Image
          source={{ uri: item.url }}
          style={[
            styles.singleMedia,
            {
              width: scaledWidth,
              height: scaledHeight,
              transform: [{ translateX }, { translateY }],
            },
          ]}
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <FlatList
        ref={flatListRef}
        data={media}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Position Indicator */}
      <View style={[styles.indicator, { backgroundColor: theme.colors.overlay }]}>
        <Text size="xs" weight="medium" color="text">
          {currentIndex + 1}/{media.length}
        </Text>
      </View>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {media.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? theme.colors.gold : theme.colors.muted,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: SCREEN_WIDTH,
  },
  mediaContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    position: 'absolute',
  },
  singleMediaContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleMedia: {
    position: 'absolute',
  },
  indicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
  },
});
