import { useConversation } from '@/contexts/ConversationsContext';
import { PendingMessage, QuotedContent, ReactionType } from '@/types';
import { useCallback, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getMessageMediaPath, uploadFile } from '@/services/firebase';
import { createMessage } from '@/services/messages';
import { getErrorMessage } from '@/utils';
import { Alert } from 'react-native';

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.8;

// Process image for message (similar to posts but simpler - no crop data)
async function processMessageImage(uri: string): Promise<Blob> {
  // First, get the original dimensions
  const contextForDimensions = ImageManipulator.manipulate(uri);
  const original = await contextForDimensions.renderAsync();

  // Calculate resize dimensions maintaining aspect ratio
  let resizeWidth: number;
  let resizeHeight: number;

  if (original.width > original.height) {
    resizeWidth = MAX_DIMENSION;
    resizeHeight = Math.round((original.height / original.width) * MAX_DIMENSION);
  } else {
    resizeHeight = MAX_DIMENSION;
    resizeWidth = Math.round((original.width / original.height) * MAX_DIMENSION);
  }

  // Create a new context for the actual manipulation
  const context = ImageManipulator.manipulate(uri);
  const resized = context.resize({ width: resizeWidth, height: resizeHeight });
  const rendered = await resized.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const response = await fetch(result.uri);
  return response.blob();
}

export const useSendMessage = (userId: string | undefined, conversationId: string | undefined) => {
  const [sending, setSending] = useState(false);
  const { addPendingMessage, updatePendingMessageStatus } = useConversation(conversationId);

  const sendMessage = useCallback(
    async (content: string, quotedContent: QuotedContent | null, mediaUri?: string, reactionType?: ReactionType) => {
      if (sending || !userId || !conversationId) return false;

      const pendingId = `pending-${userId}-${Date.now()}`;
      const pendingMessage: PendingMessage = {
        isPending: true,
        pendingId,
        conversationId,
        senderId: userId,
        type: reactionType != null ? 'reaction' : mediaUri != null ? 'photo' : 'text',
        content: content || undefined,
        reactionType: reactionType || undefined,
        mediaUri,
        quotedContent: quotedContent || undefined,
        createdAt: new Date(),
        status: 'sending',
      };

      // Add to pending messages immediately (synchronous)
      addPendingMessage(pendingMessage);
      setSending(true);

      try {
        let mediaUrl: string | undefined;

        // Upload photo if provided
        if (mediaUri) {
          const blob = await processMessageImage(mediaUri);
          // Use pendingId for storage path (will be replaced with real messageId later)
          const storagePath = getMessageMediaPath(conversationId, pendingId, 'jpg');
          mediaUrl = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });
        }

        // Create message with pendingId (will arrive via real-time subscription)
        await createMessage({
          conversationId,
          senderId: userId,
          type: reactionType != null ? 'reaction' : mediaUri != null ? 'photo' : 'text',
          content: content || undefined,
          reactionType: reactionType || undefined,
          mediaUrl,
          quotedContent: quotedContent || undefined,
          pendingId,
        });

        return true;
      } catch (err) {
        // Mark as failed
        updatePendingMessageStatus(pendingId, 'failed');
        Alert.alert('Error', getErrorMessage(err));
        return false;
      } finally {
        setSending(false);
      }
    },
    [userId, conversationId, sending, addPendingMessage, updatePendingMessageStatus]
  );

  return {
    sendMessage,
    sendingMessage: sending,
  };
};
