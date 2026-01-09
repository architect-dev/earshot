import React, { useState } from 'react';
import { TextInput as RNTextInput, View, StyleSheet, type TextInputProps as RNTextInputProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

type ValidationState = 'default' | 'error' | 'success';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  validationState?: ValidationState;
}

export function TextInput({ label, error, hint, validationState = 'default', style, ...props }: TextInputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (validationState === 'error' || error) {
      return theme.colors.love;
    }
    if (validationState === 'success') {
      return theme.colors.pine;
    }
    if (isFocused) {
      return theme.colors.gold;
    }
    return theme.colors.highlightHigh;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text size="sm" color="subtle" style={styles.label}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: getBorderColor(),
            color: theme.colors.text,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.muted}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text size="xs" color="love" style={styles.helper}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text size="xs" color="muted" style={styles.helper}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 0, // Sharp corners
    fontSize: 16,
    minHeight: 48,
  },
  helper: {
    marginTop: 4,
  },
});
