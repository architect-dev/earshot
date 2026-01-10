import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { fontSize as fontSizes, fontWeight as fontWeights } from '@/theme';

export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;

interface TextProps extends RNTextProps {
  size?: FontSize;
  weight?: FontWeight;
  color?: 'text' | 'subtle' | 'muted' | 'love' | 'pine' | 'gold' | 'iris' | 'foam' | 'rose';
  align?: 'left' | 'center' | 'right';
}

export function Text({
  size = 'md',
  weight = 'normal',
  color = 'text',
  align = 'left',
  style,
  children,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  return (
    <RNText
      style={[
        styles.base,
        {
          fontSize: fontSizes[size],
          fontWeight: fontWeights[weight],
          color: theme.colors[color],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    // Base text styles
  },
});
