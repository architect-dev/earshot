import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();

  const getVariantStyles = (): {
    container: ViewStyle;
    textColor: 'text' | 'subtle' | 'muted' | 'love' | 'pine' | 'gold';
  } => {
    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.muted : theme.colors.gold,
            borderColor: isDisabled ? theme.colors.muted : theme.colors.gold,
          },
          textColor: 'text',
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: isDisabled ? theme.colors.muted : theme.colors.subtle,
          },
          textColor: isDisabled ? 'muted' : 'subtle',
        };
      case 'success':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.muted : theme.colors.pine,
            borderColor: isDisabled ? theme.colors.muted : theme.colors.pine,
          },
          textColor: 'text',
        };
      case 'error':
        return {
          container: {
            backgroundColor: isDisabled ? theme.colors.muted : theme.colors.love,
            borderColor: isDisabled ? theme.colors.muted : theme.colors.love,
          },
          textColor: 'text',
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          textColor: isDisabled ? 'muted' : 'subtle',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors[variantStyles.textColor]} />
      ) : (
        <Text size="sm" weight="semibold" color={variantStyles.textColor} style={styles.text}>
          [{title.toUpperCase()}]
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 0, // Sharp corners
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    letterSpacing: 1,
  },
});
