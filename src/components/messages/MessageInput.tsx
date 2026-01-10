import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { TextInput, Text } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { type QuotedContent } from '@/types';

interface MessageInputProps {
  onSend: (content: string, mediaUri?: string) => void;
  quotedContent?: QuotedContent | null;
  onClearQuote?: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, quotedContent, onClearQuote, disabled = false }: MessageInputProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() && !quotedContent) return;
    onSend(text.trim());
    setText('');
  };

  const handlePickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onSend('', result.assets[0].uri);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.highlightLow }]}
    >
      {/* Quoted content preview */}
      {quotedContent && (
        <View style={[styles.quotedPreview, { backgroundColor: theme.colors.highlightLow }]}>
          <View style={styles.quotedContent}>
            {quotedContent.type === 'post' && (
              <Text size="xs" color="muted">
                Replying to {quotedContent.preview.authorName}: {quotedContent.preview.text || '📷 Photo'}
              </Text>
            )}
            {quotedContent.type === 'message' && (
              <Text size="xs" color="muted">
                Replying to {quotedContent.preview.senderName}: {quotedContent.preview.text || 'Message'}
              </Text>
            )}
          </View>
          {onClearQuote && (
            <Pressable onPress={onClearQuote} style={styles.clearQuote}>
              <FontAwesome6 name="xmark" size={14} color={theme.colors.muted} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <Pressable onPress={handlePickPhoto} disabled={disabled} style={styles.iconButton}>
          <FontAwesome6 name="image" size={18} color={theme.colors.pine} />
        </Pressable>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            multiline
            style={styles.input}
            editable={!disabled}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={disabled || (!text.trim() && !quotedContent)}
          style={[styles.sendButton, { opacity: disabled || (!text.trim() && !quotedContent) ? 0.5 : 1 }]}
        >
          <FontAwesome6 name="paper-plane" size={18} color={theme.colors.pine} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: 24,
    paddingTop: 8,
  },
  quotedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quotedContent: {
    flex: 1,
  },
  clearQuote: {
    padding: 4,
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0, // Important for flex children to respect constraints
  },
  input: {
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    flexShrink: 0,
  },
});
