import React from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, FontSize } from './Text';
import { Profile } from '@/types';
import { useIsOnline } from '@/hooks/useIsOnline';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  profile?: Profile | null;
  source?: string | null;
  name?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
  online?: boolean;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const onlineIndicatorSizeMap: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

const fontSizeMap: Record<AvatarSize, FontSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

export function Avatar({ profile, source, name, size = 'md', style, online }: AvatarProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];
  const isOnline = useIsOnline(profile?.lastSeen);

  const nameOrOverride = profile?.fullName || name || '';
  const sourceOrOverride = profile?.profilePhotoUrl || source;
  const isOnlineOrOverride = online ?? isOnline;

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
    backgroundColor: theme.colors.highlightHigh,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {sourceOrOverride && <Image source={{ uri: sourceOrOverride }} style={styles.image} resizeMode="cover" />}
      {!sourceOrOverride && nameOrOverride && (
        <Text size={fontSizeMap[size]} color="subtle" weight="medium">
          {getInitials(nameOrOverride)}
        </Text>
      )}
      {isOnlineOrOverride && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: onlineIndicatorSizeMap[size],
              height: onlineIndicatorSizeMap[size],
              backgroundColor: theme.colors.pine,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 1,
  },
});
