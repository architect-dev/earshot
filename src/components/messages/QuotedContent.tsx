import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Avatar } from '@/components/ui';
import { type QuotedContent, type Message } from '@/types';

export type QuotedContentVariant = 'message' | 'input' | 'modal';

interface QuotedContentProps {
  quotedContent: QuotedContent;
  variant?: QuotedContentVariant; // 'message' for message bubbles, 'input' for input preview, 'modal' for modals
  onPress?: () => void; // For message bubbles - navigate to quoted content
  onClear?: () => void; // For input - clear the quote
  getUserProfile?: (userId: string) => { fullName: string; profilePhotoUrl: string | null } | null; // For quoted message avatars
  getMessage?: (messageId: string) => Message | null; // To get senderId from quoted message
}

export function QuotedContent({
  quotedContent,
  variant = 'message',
  onPress,
  onClear,
  getUserProfile,
  getMessage,
}: QuotedContentProps) {
  const { theme } = useTheme();

  // Get quoted message sender profile
  const getQuotedMessageSender = () => {
    if (quotedContent.type === 'message' && getMessage && getUserProfile) {
      const quotedMsg = getMessage(quotedContent.messageId);
      if (quotedMsg) {
        return getUserProfile(quotedMsg.senderId);
      }
    }
    return null;
  };

  const quotedSenderProfile = getQuotedMessageSender();
  const displayName =
    quotedContent.type === 'post'
      ? quotedContent.preview.authorName
      : quotedSenderProfile?.fullName || quotedContent.preview.senderName;
  const displayAvatar = quotedContent.type === 'post' ? null : quotedSenderProfile?.profilePhotoUrl || null;

  // Different styles based on variant
  const containerStyle =
    variant === 'input'
      ? [styles.inputContainer]
      : variant === 'modal'
        ? [styles.modalContainer]
        : [styles.messageContainer];

  const Component = onPress ? Pressable : View;

  return (
    <Component
      style={[styles.container, containerStyle, { backgroundColor: theme.colors.highlightMed }]}
      onPress={onPress}
    >
      {/* Header with avatar and name */}
      <View style={styles.header}>
        <Avatar source={displayAvatar} name={displayName} size="xs" />
        <Text size="xs" weight="semibold" color="subtle">
          {displayName}
        </Text>
        {onClear && (
          <Pressable onPress={onClear} style={styles.clearButton} hitSlop={8}>
            <FontAwesome6 name="xmark" size={14} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Body with content */}
      <View style={styles.body}>
        {quotedContent.type === 'post' ? (
          <>
            {quotedContent.preview.mediaUrl && (
              <Image source={{ uri: quotedContent.preview.mediaUrl }} style={styles.image} resizeMode="cover" />
            )}
            {quotedContent.preview.text && (
              <Text size="xs" color="muted" numberOfLines={variant === 'modal' ? 3 : 2}>
                {quotedContent.preview.text}
              </Text>
            )}
            {!quotedContent.preview.text && !quotedContent.preview.mediaUrl && (
              <Text size="xs" color="muted">
                📷 Photo
              </Text>
            )}
          </>
        ) : (
          <>
            {quotedContent.preview.mediaUrl && (
              <Image source={{ uri: quotedContent.preview.mediaUrl }} style={styles.image} resizeMode="cover" />
            )}
            {quotedContent.preview.voiceUrl && (
              <View style={[styles.image, { backgroundColor: theme.colors.highlightLow }]}>
                <Text size="xs" color="muted">
                  🎤
                </Text>
              </View>
            )}
            {quotedContent.preview.text && (
              <Text size="xs" color="muted" numberOfLines={variant === 'modal' ? 3 : 2}>
                {quotedContent.preview.text}
              </Text>
            )}
            {!quotedContent.preview.text && !quotedContent.preview.mediaUrl && !quotedContent.preview.voiceUrl && (
              <Text size="xs" color="muted">
                Message
              </Text>
            )}
          </>
        )}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 0,
    zIndex: 1, // Overlay the message bubble
  },
  messageContainer: {
    maxWidth: '80%', // 80% of screen width
    marginBottom: 0, // No margin, will overlap with bubble
  },
  inputContainer: {
    flexShrink: 1,
    marginLeft: 12,
    marginRight: 'auto',
  },
  modalContainer: {
    borderWidth: 1,
    padding: 12,
  },
  header: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  body: {
    gap: 4,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
    marginRight: -4,
    marginTop: -12,
  },
});
