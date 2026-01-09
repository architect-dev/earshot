import React, { useState, useRef } from 'react';
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < media.length) {
      setCurrentIndex(index);
    }
  };

  const renderItem = ({ item, index }: { item: PostMedia; index: number }) => (
    <Pressable onPress={() => onMediaPress?.(index)} style={styles.mediaContainer}>
      <Image source={{ uri: item.url }} style={styles.media} resizeMode="cover" />
    </Pressable>
  );

  if (media.length === 0) {
    return null;
  }

  if (media.length === 1) {
    return (
      <Pressable onPress={() => onMediaPress?.(0)} style={styles.singleMediaContainer}>
        <Image source={{ uri: media[0].url }} style={styles.singleMedia} resizeMode="cover" />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
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
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  singleMediaContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  singleMedia: {
    width: '100%',
    height: '100%',
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

