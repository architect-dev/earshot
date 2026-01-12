import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { TextInput } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { type QuotedContent } from '@/types';
import { QuotedContent as QuotedContentComponent } from './QuotedContent';
import { useFriends } from '@/contexts/FriendsContext';
import { markAsTyping } from '@/services/conversations';

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onSend: (content: string, quotedContent: QuotedContent | null, mediaUri?: string) => void;
  quotedContent?: QuotedContent | null;
  onClearQuote?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  userId,
  onSend,
  quotedContent,
  onClearQuote,
  disabled = false,
}: MessageInputProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const { getProfileById } = useFriends();
  const quotedSenderProfile = quotedContent ? getProfileById(quotedContent.senderId) : null;

  // Typing state management with rate limiting
  const lastTypingUpdateRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);

  // Update typing state (rate-limited to every 2 seconds)
  const updateTyping = useCallback(
    (isTyping: boolean) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastTypingUpdateRef.current;

      // Rate limit: only update if first keystroke OR 2+ seconds since last update
      if (!isTypingRef.current || isTyping || timeSinceLastUpdate >= 2000) {
        markAsTyping(conversationId, userId).catch(() => {
          // Silently fail - typing indicators are not critical
        });
        lastTypingUpdateRef.current = now;
        isTypingRef.current = isTyping;
      }
    },
    [conversationId, userId]
  );

  const handleTextChange = (newText: string) => {
    setText(newText);
    // Update typing state (rate-limited)
    if (newText.trim().length > 0) {
      updateTyping(true);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !quotedContent) return;

    onSend(text.trim(), quotedContent || null);
    isTypingRef.current = false;
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
      onSend('', quotedContent || null, result.assets[0].uri);
    }
  };

  const handleRecordVoice = () => {
    Alert.alert('Record Voice', 'This feature is not implemented yet.');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.highlightLow }]}
    >
      {/* Quoted content preview */}
      {quotedContent && quotedSenderProfile && (
        <QuotedContentComponent
          quotedContent={quotedContent}
          senderProfile={quotedSenderProfile}
          variant="input"
          onClear={onClearQuote}
        />
      )}

      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder=""
            value={text}
            onChangeText={handleTextChange}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.highlightLow,
                borderWidth: 0,
                color: theme.colors.text,
                paddingTop: quotedContent ? 20 : 12,
                marginTop: quotedContent ? -8 : 0,
              },
            ]}
            editable={!disabled}
          />
        </View>
        {!text.trim() && (
          <>
            <Pressable onPress={handlePickPhoto} disabled={disabled} style={styles.iconButton}>
              <FontAwesome6 name="image" size={18} color={theme.colors.pine} />
            </Pressable>
            <Pressable onPress={handleRecordVoice} disabled={disabled} style={styles.iconButton}>
              <FontAwesome6 name="microphone" size={18} color={theme.colors.pine} />
            </Pressable>
          </>
        )}
        {!!text.trim() && (
          <Pressable
            onPress={handleSend}
            disabled={disabled || (!text.trim() && !quotedContent)}
            style={[styles.sendButton, { opacity: disabled || (!text.trim() && !quotedContent) ? 0.5 : 1 }]}
            focusable={false}
          >
            <FontAwesome6 name="paper-plane" size={18} color={theme.colors.pine} />
          </Pressable>
        )}
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
