import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Avatar } from '@/components/ui';
import { type QuotedContent } from '@/types';
import { Profile } from '@/types/profile';

export type QuotedContentVariant = 'message' | 'input' | 'modal';

interface QuotedContentProps {
  quotedContent: QuotedContent;
  senderProfile: Profile;
  variant?: QuotedContentVariant; // 'message' for message bubbles, 'input' for input preview, 'modal' for modals
  postReplyType?: 'comment' | 'heart';
  onPress?: () => void; // For message bubbles - navigate to quoted content
  onClear?: () => void; // For input - clear the quote
}

export function QuotedContent({
  quotedContent,
  variant = 'message',
  postReplyType,
  onPress,
  onClear,
  senderProfile,
}: QuotedContentProps) {
  const { theme } = useTheme();

  // Get quoted message sender profile

  const displayName =
    quotedContent.type === 'post'
      ? quotedContent.preview.authorName
      : senderProfile.fullName || quotedContent.preview.senderName;
  const displayAvatar = quotedContent.type === 'post' ? null : senderProfile.profilePhotoUrl || null;

  // Different styles based on variant
  const containerStyle =
    variant === 'input'
      ? [styles.inputContainer]
      : variant === 'modal'
        ? [styles.modalContainer]
        : [styles.messageContainer];

  const postContainerStyle =
    postReplyType === 'heart'
      ? { backgroundColor: theme.colors.loveMed }
      : postReplyType === 'comment'
        ? { backgroundColor: theme.colors.pineMed }
        : { backgroundColor: theme.colors.highlightMed };

  const Component = onPress ? Pressable : View;

  return (
    <Component style={[styles.container, containerStyle, postContainerStyle]} onPress={onPress}>
      {/* Header with avatar and name */}
      <View style={styles.header}>
        {quotedContent.type === 'post' && (
          <>
            {postReplyType === 'heart' && (
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.love }]}>
                <FontAwesome6 name="heart" size={14} color={theme.colors.base} solid />
              </View>
            )}
            {postReplyType === 'comment' && (
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.pine }]}>
                <FontAwesome6 name="message" size={14} color={theme.colors.base} solid />
              </View>
            )}
          </>
        )}
        <Avatar source={displayAvatar} name={displayName} size="xs" />
        <Text size="xs" weight="semibold" color="subtle">
          {displayName}
          {quotedContent.type === 'post' && `'s Post`}
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
  modalContainer: {},
  header: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconContainer: {
    width: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
