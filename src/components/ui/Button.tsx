import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'ghost';
type ButtonSize = 'default' | 'small';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'default',
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

  const getSizeStyles = (): { container: ViewStyle; textSize: 'xs' | 'sm' } => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingVertical: 4,
            paddingHorizontal: 8,
            minHeight: 28,
          },
          textSize: 'xs',
        };
      case 'default':
      default:
        return {
          container: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            minHeight: 36,
          },
          textSize: 'sm',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size={18} color={theme.colors[variantStyles.textColor]} />
      ) : (
        <Text size={sizeStyles.textSize} weight="semibold" color={variantStyles.textColor} style={styles.text}>
          [{title.toUpperCase()}]
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 0, // Sharp corners
    alignItems: 'center',
    justifyContent: 'center',
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
