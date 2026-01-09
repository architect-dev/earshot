import React, { useMemo, useEffect, useState } from 'react';
import { View, Image, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/ui';
import { calculateAspectRatio } from '@/utils/media';
import { type PhotoItem, MIN_SCALE, MAX_SCALE } from './types';

const CROP_PADDING = 36; // 36px padding on long side (18px each side = 36px total)

interface PhotoCropEditorProps {
  photo: PhotoItem;
  targetAspectRatio: number;
  onChange: (updates: Partial<Pick<PhotoItem, 'scale' | 'x' | 'y'>>) => void;
  disabled?: boolean;
}

export function PhotoCropEditor({ photo, targetAspectRatio, onChange, disabled = false }: PhotoCropEditorProps) {
  const { theme } = useTheme();
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });

  // Calculate crop frame dimensions with 36px padding on long side
  const { frameWidth, frameHeight } = useMemo(() => {
    if (editorSize.width === 0 || editorSize.height === 0) {
      return { frameWidth: 0, frameHeight: 0 };
    }

    const editorWidth = editorSize.width;
    const editorHeight = editorSize.height;
    const editorRatio = editorWidth / editorHeight;

    let fw: number;
    let fh: number;

    if (editorRatio > targetAspectRatio) {
      // Editor is wider than target - height is the long side
      // Apply padding to height
      fh = editorHeight - CROP_PADDING * 2;
      fw = fh * targetAspectRatio;
    } else {
      // Editor is taller than target - width is the long side
      // Apply padding to width
      fw = editorWidth - CROP_PADDING * 2;
      fh = fw / targetAspectRatio;
    }

    return { frameWidth: fw, frameHeight: fh };
  }, [editorSize, targetAspectRatio]);

  const handleEditorLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setEditorSize({ width, height });
  };

  // Photo dimensions
  const photoWidth = photo.width || 100;
  const photoHeight = photo.height || 100;
  const photoRatio = calculateAspectRatio(photoWidth, photoHeight);

  // Calculate base dimensions (at scale=1, photo "covers" the frame)
  const { baseWidth, baseHeight } = useMemo(() => {
    if (frameWidth === 0 || frameHeight === 0) {
      return { baseWidth: 100, baseHeight: 100 };
    }

    let bw: number;
    let bh: number;

    if (photoRatio > targetAspectRatio) {
      // Photo is wider than frame - match heights
      bh = frameHeight;
      bw = bh * photoRatio;
    } else {
      // Photo is taller than frame - match widths
      bw = frameWidth;
      bh = bw / photoRatio;
    }

    return { baseWidth: bw, baseHeight: bh };
  }, [photoRatio, targetAspectRatio, frameWidth, frameHeight]);

  // Animated values for gestures
  const scale = useSharedValue(photo.scale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(photo.scale);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const frameWidthShared = useSharedValue(frameWidth);
  const frameHeightShared = useSharedValue(frameHeight);

  // Update shared frame dimensions when they change
  useEffect(() => {
    frameWidthShared.value = frameWidth;
    frameHeightShared.value = frameHeight;
  }, [frameWidth, frameHeight, frameWidthShared, frameHeightShared]);

  // Convert x/y (0-1) to translate values for initial position
  const getTranslateFromXY = (x: number, y: number, currentScale: number) => {
    const scaledWidth = baseWidth * currentScale;
    const scaledHeight = baseHeight * currentScale;
    const maxPanX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - frameHeight) / 2);

    // x=0.5 -> translate=0, x=0 -> translate=+maxPan, x=1 -> translate=-maxPan
    const tx = maxPanX * (1 - 2 * x);
    const ty = maxPanY * (1 - 2 * y);

    return { tx, ty };
  };

  // Convert translate values back to x/y (0-1)
  const getXYFromTranslate = (tx: number, ty: number, currentScale: number) => {
    const scaledWidth = baseWidth * currentScale;
    const scaledHeight = baseHeight * currentScale;
    const maxPanX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - frameHeight) / 2);

    // Inverse of getTranslateFromXY
    const x = maxPanX > 0 ? (1 - tx / maxPanX) / 2 : 0.5;
    const y = maxPanY > 0 ? (1 - ty / maxPanY) / 2 : 0.5;

    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  // Sync animated values when photo changes (each photo has independent scale/x/y)
  // Snap instantly when switching photos (no spring animation)
  useEffect(() => {
    if (frameWidth === 0 || frameHeight === 0) return;

    const { tx, ty } = getTranslateFromXY(photo.x, photo.y, photo.scale);

    // Set values directly (no spring) for instant snap when switching photos
    scale.value = photo.scale;
    translateX.value = tx;
    translateY.value = ty;

    savedScale.value = photo.scale;
    savedTranslateX.value = tx;
    savedTranslateY.value = ty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.uri, photo.scale, photo.x, photo.y, baseWidth, baseHeight, frameWidth, frameHeight]);

  // Clamp translate to valid bounds
  const clampTranslate = (tx: number, ty: number, currentScale: number, fw: number, fh: number) => {
    'worklet';
    const scaledWidth = baseWidth * currentScale;
    const scaledHeight = baseHeight * currentScale;
    const maxPanX = Math.max(0, (scaledWidth - fw) / 2);
    const maxPanY = Math.max(0, (scaledHeight - fh) / 2);

    return {
      tx: Math.max(-maxPanX, Math.min(maxPanX, tx)),
      ty: Math.max(-maxPanY, Math.min(maxPanY, ty)),
    };
  };

  // Update parent state
  const updateState = (newScale: number, newTx: number, newTy: number) => {
    const { x, y } = getXYFromTranslate(newTx, newTy, newScale);
    onChange({ scale: newScale, x, y });
  };

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .enabled(!disabled)
    .onUpdate((e) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
      scale.value = newScale;

      // Adjust translate to keep within bounds at new scale
      const clamped = clampTranslate(
        savedTranslateX.value,
        savedTranslateY.value,
        newScale,
        frameWidthShared.value,
        frameHeightShared.value
      );
      translateX.value = clamped.tx;
      translateY.value = clamped.ty;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(updateState)(scale.value, translateX.value, translateY.value);
    });

  // Pan gesture for moving
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      const newTx = savedTranslateX.value + e.translationX;
      const newTy = savedTranslateY.value + e.translationY;
      const clamped = clampTranslate(newTx, newTy, scale.value, frameWidthShared.value, frameHeightShared.value);
      translateX.value = clamped.tx;
      translateY.value = clamped.ty;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(updateState)(scale.value, translateX.value, translateY.value);
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for the photo
  const animatedStyle = useAnimatedStyle(() => {
    const scaledWidth = baseWidth * scale.value;
    const scaledHeight = baseHeight * scale.value;

    return {
      width: scaledWidth,
      height: scaledHeight,
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size="sm" weight="medium" color="subtle">
          Crop
        </Text>
        <Text size="xs" color="muted">
          Pinch to zoom • Drag to pan
        </Text>
      </View>

      {/* Editor area - fills available space with flex, clips overflow */}
      <View style={styles.editorArea} onLayout={handleEditorLayout}>
        {frameWidth > 0 && frameHeight > 0 && (
          <GestureHandlerRootView style={styles.gestureRoot}>
            {/* Crop frame container - centered in editor area */}
            <View style={[styles.frameContainer, { width: frameWidth, height: frameHeight }]}>
              <GestureDetector gesture={composedGesture}>
                <Animated.View key={photo.uri} style={[styles.photoWrapper, animatedStyle]}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                </Animated.View>
              </GestureDetector>

              {/* Crop indicator overlay - centered */}
              <View style={[styles.frameOverlay, { borderColor: theme.colors.gold }]} pointerEvents="none" />
            </View>
          </GestureHandlerRootView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 16,
  },
  header: {
    marginBottom: 8,
  },
  editorArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  gestureRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameContainer: {
    position: 'relative',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrapper: {
    position: 'absolute',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
  hint: {
    marginTop: 8,
  },
});
