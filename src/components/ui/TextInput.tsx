import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Pressable,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

type ValidationState = 'default' | 'error' | 'success';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  validationState?: ValidationState;
}

export function TextInput({
  label,
  error,
  hint,
  validationState = 'default',
  secureTextEntry,
  style,
  ...props
}: TextInputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry !== undefined;

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

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text size="sm" color="subtle" style={styles.label}>
          {label}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <RNTextInput
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              backgroundColor: theme.colors.surface,
              borderColor: getBorderColor(),
              color: theme.colors.text,
            },
            style,
          ]}
          placeholderTextColor={theme.colors.muted}
          secureTextEntry={isPassword && !isPasswordVisible}
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
        {isPassword && (
          <Pressable
            style={[styles.toggleButton, { borderColor: getBorderColor(), backgroundColor: theme.colors.surface }]}
            onPress={togglePasswordVisibility}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text size="sm" color="muted">
              {isPasswordVisible ? 'HIDE' : 'SHOW'}
            </Text>
          </Pressable>
        )}
      </View>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 0, // Sharp corners
    fontSize: 16,
    minHeight: 48,
  },
  inputWithToggle: {
    borderRightWidth: 0,
  },
  toggleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderLeftWidth: 0,
    minHeight: 48,
  },
  helper: {
    marginTop: 4,
  },
});
