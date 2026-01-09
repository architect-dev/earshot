import React from 'react';
import { ActivityIndicator, View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function LoadingSpinner({ size = 'large', message, fullScreen = false, style }: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const content = (
    <>
      <ActivityIndicator size={size} color={theme.colors.gold} />
      {message && (
        <Text size="sm" color="subtle" style={styles.message}>
          {message}
        </Text>
      )}
    </>
  );

  if (fullScreen) {
    return <View style={[styles.fullScreen, { backgroundColor: theme.colors.base }, style]}>{content}</View>;
  }

  return <View style={[styles.container, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
  },
});
