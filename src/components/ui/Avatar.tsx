import React from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, FontSize } from './Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const fontSizeMap: Record<AvatarSize, FontSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

export function Avatar({ source, name, size = 'md', style }: AvatarProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];

  // Get initials from name (first letter of first two words)
  const getInitials = (fullName?: string): string => {
    if (!fullName) return '';
    const words = fullName.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    backgroundColor: theme.colors.highlightMed,
  };

  // If no source, show grey square (or initials if name provided)
  if (!source) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        {name && (
          <Text size={fontSizeMap[size]} color="subtle" weight="medium">
            {getInitials(name)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Image source={{ uri: source }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0, // Sharp corners
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
