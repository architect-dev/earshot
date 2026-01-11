import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Avatar } from '@/components/ui';
import { PendingMessage, Profile, type Message, type MessageWithReactions } from '@/types';
import { QuotedContent } from './QuotedContent';
import { FontAwesome6 } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: MessageWithReactions;
  senderProfile: Profile;
  isOwn: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onQuotedPostPress?: (postId: string) => void;
  onQuotedMessagePress?: (messageId: string) => void;
  getUserProfile?: (userId: string) => { fullName: string; profilePhotoUrl: string | null } | null; // For quoted message avatars
  opacity?: number; // For pending messages (0.5)
  isHighlighted?: boolean; // For flash effect when scrolling to message
}

export function MessageBubble({
  message,
  senderProfile,
  isOwn,
  onPress,
  onLongPress,
  onQuotedPostPress,
  onQuotedMessagePress,
  opacity = 1,
  isHighlighted = false,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const highlightProgress = useSharedValue(0);
  const hasQuotedContent = !!message.quotedContent;
  const isHeartOnPost = message.quotedContent?.type === 'post' && message.type === 'heart';
  const isCommentOnPost = message.quotedContent?.type === 'post' && message.type === 'comment';

  // Animate highlight when isHighlighted changes
  useEffect(() => {
    if (isHighlighted) {
      highlightProgress.value = withTiming(1, { duration: 300 });
      // Auto-fade out after 2 seconds
      const timeout = setTimeout(() => {
        highlightProgress.value = withTiming(0, { duration: 500 });
      }, 2000);
      return () => clearTimeout(timeout);
    } else {
      highlightProgress.value = withTiming(0, { duration: 500 });
    }
  }, [isHighlighted, highlightProgress]);

  // Animated background color (always highlightLow, animate to highlightHigh when highlighted)
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const baseColor = isCommentOnPost
      ? theme.colors.pineLow
      : isHeartOnPost
        ? theme.colors.loveLow
        : theme.colors.highlightLow;
    const highlightColor = isCommentOnPost
      ? theme.colors.pineMed
      : isHeartOnPost
        ? theme.colors.loveMed
        : theme.colors.highlightHigh;

    const backgroundColor = interpolateColor(highlightProgress.value, [0, 1], [baseColor, highlightColor]);

    return {
      backgroundColor,
    };
  });

  // Deleted message placeholder
  if (message.deletedAt) {
    return (
      <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
        <View
          style={[
            styles.bubble,
            isOwn
              ? [styles.ownBubble, { backgroundColor: theme.colors.highlightLow }]
              : [styles.otherBubble, { backgroundColor: theme.colors.highlightMed }],
            { opacity },
          ]}
        >
          <Text size="sm" color="muted" style={{ fontStyle: 'italic' }}>
            Deleted message
          </Text>
        </View>
      </View>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <Text size="sm">{message.content}</Text>;
      case 'photo':
        return message.mediaUrl ? (
          <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : null;
      case 'video':
        return message.mediaUrl ? (
          <View style={[styles.media, { backgroundColor: theme.colors.highlightLow }]}>
            <Text size="sm" color="muted">
              🎥 Video
            </Text>
          </View>
        ) : null;
      case 'voice':
        return (
          <View style={[styles.voiceContainer, { backgroundColor: theme.colors.highlightMed }]}>
            <Text size="sm">🎤 Voice message</Text>
          </View>
        );
      case 'heart':
        const count = message.heartCount || 1;
        return (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: count }, (_, i) => (
              <FontAwesome6 key={i} name="heart" size={20} color={theme.colors.love} solid />
            ))}
          </View>
        );
      case 'comment':
        return <Text size="sm">{message.content}</Text>;
      default:
        return <Text size="sm">Message</Text>;
    }
  };

  const getReactionIsPending = (reaction: Message | PendingMessage): reaction is PendingMessage => {
    return 'isPending' in reaction && reaction.isPending;
  };
  const getReactionId = (reaction: Message | PendingMessage) => {
    return getReactionIsPending(reaction) ? reaction.pendingId : reaction.id;
  };

  const renderReactions = () => {
    if (message.reactions.length === 0) return null;
    const reactionsContainerStyle = isOwn ? styles.ownReactionsContainer : styles.otherReactionsContainer;
    return (
      <View style={[styles.reactionsContainer, reactionsContainerStyle]}>
        {message.reactions.map((reaction) => (
          <View
            key={getReactionId(reaction)}
            style={[
              styles.reactionBubble,
              { opacity: getReactionIsPending(reaction) ? 0.3 : 1, backgroundColor: theme.colors.highlightLow },
            ]}
          >
            {reaction.reactionType === 'heart' && (
              <FontAwesome6 name="heart" size={14} color={theme.colors.love} solid />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer, { opacity }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Group chat: show sender avatar and name */}
      {!isOwn && senderProfile.fullName && (
        <View style={styles.senderInfo}>
          <Avatar source={senderProfile.profilePhotoUrl} name={senderProfile.fullName} size="xs" />
          {senderProfile.fullName && (
            <Text size="xs" color="muted" style={styles.senderName}>
              {senderProfile.fullName}
            </Text>
          )}
        </View>
      )}

      {/* Quoted content - separate element above bubble */}
      {message.quotedContent && (
        <QuotedContent
          quotedContent={message.quotedContent}
          senderProfile={senderProfile}
          variant="message"
          postReplyType={
            message.quotedContent.type === 'post' ? (message.type === 'heart' ? 'heart' : 'comment') : undefined
          }
          onPress={() => {
            if (message.quotedContent?.type === 'post' && onQuotedPostPress) {
              onQuotedPostPress(message.quotedContent.postId);
            } else if (message.quotedContent?.type === 'message' && onQuotedMessagePress) {
              onQuotedMessagePress(message.quotedContent.messageId);
            }
          }}
        />
      )}

      {/* Message bubble - always highlightLow background */}
      <Animated.View
        style={[
          styles.bubble,
          { opacity },
          isHeartOnPost && styles.heartOnPostBubble,
          animatedBackgroundStyle,
          hasQuotedContent && styles.bubbleWithQuote,
        ]}
      >
        {/* Main content */}
        {renderContent()}

        {/* Timestamp and read receipt */}
        {/* <View style={styles.footer}>
          <Text size="xs" color={isOwn ? 'foam' : 'muted'}>
            {formatTimestamp(message.createdAt)}
          </Text>
          {isOwn && message.readBy && message.readBy.length > 1 && (
            <Text size="xs" color="foam" style={styles.readReceipt}>
              ✓✓
            </Text>
          )}
        </View> */}
      </Animated.View>

      {/* Reactions */}
      {renderReactions()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownContainer: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  otherContainer: {
    alignItems: 'flex-start',
    marginRight: 'auto',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 0, // Sharp corners
  },
  bubbleWithQuote: {
    paddingTop: 16, // Additional top padding when quoted
    marginTop: -8, // Overlap with quoted content
  },
  ownBubble: {},
  otherBubble: {},
  heartOnPostBubble: {
    paddingHorizontal: 24,
  },
  media: {
    width: 200,
    height: 200,
    borderRadius: 0,
  },
  voiceContainer: {
    padding: 12,
    borderRadius: 0,
  },
  quotedContent: {
    maxWidth: '80%', // 80% of screen width
    padding: 8,
    marginBottom: 0, // No margin, will overlap with bubble
    borderRadius: 0,
    zIndex: 1, // Overlay the message bubble
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  quotedAvatar: {
    width: 16,
    height: 16,
  },
  quotedBody: {
    gap: 4,
  },
  quotedImage: {
    width: 64,
    height: 64,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  readReceipt: {
    marginLeft: 4,
  },
  reactionBubble: {
    padding: 4,
    paddingHorizontal: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: -4,
  },
  ownReactionsContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  otherReactionsContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
});
