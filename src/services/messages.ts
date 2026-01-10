import {
  COLLECTIONS,
  addDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocumentsPaginated,
  queryDocuments,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from './firebase/firestore';
import { type Message, type CreateMessageData, type ReactionType, type QuotedMessage } from '@/types';
import { updateConversation, getConversation } from './conversations';

const MESSAGES_PAGE_SIZE = 50;

/**
 * Create a new message
 * For DMs, will automatically create the conversation if it doesn't exist (lazy creation)
 */
export async function createMessage(data: CreateMessageData): Promise<Message> {
  // Validate message type and content
  if (data.type === 'text' && !data.content) {
    throw new Error('Text messages must have content');
  }

  if (data.type === 'comment' && !data.content) {
    throw new Error('Comment messages must have content');
  }

  if ((data.type === 'photo' || data.type === 'video') && !data.mediaUrl) {
    throw new Error(`${data.type} messages must have mediaUrl`);
  }

  if (data.type === 'voice' && !data.voiceUrl) {
    throw new Error('Voice messages must have voiceUrl');
  }

  if (data.type === 'reaction') {
    if (!data.reactionType) {
      throw new Error('Reaction messages must have reactionType');
    }
    if (!data.quotedContent || data.quotedContent.type !== 'message') {
      throw new Error('Reaction messages must quote the target message');
    }
  }

  // Validate quoted message (must be from same conversation)
  if (data.quotedContent?.type === 'message') {
    // We'll validate this when we fetch the quoted message
    // For now, just ensure messageId is provided
    if (!data.quotedContent.messageId) {
      throw new Error('Quoted message must have messageId');
    }
  }

  // Ensure conversation exists
  // Note: For DMs, callers should use findOrCreateDM() before calling createMessage (lazy creation)
  const conversation = await getConversation(data.conversationId);
  if (!conversation) {
    throw new Error('Conversation not found. Create the conversation before sending a message.');
  }

  // Clean quoted content to remove undefined values (Firestore doesn't allow undefined)
  const cleanQuotedContent = data.quotedContent
    ? {
        type: data.quotedContent.type,
        ...(data.quotedContent.type === 'post'
          ? {
              postId: data.quotedContent.postId,
              preview: {
                authorName: data.quotedContent.preview.authorName,
                authorUsername: data.quotedContent.preview.authorUsername,
                ...(data.quotedContent.preview.text ? { text: data.quotedContent.preview.text } : {}),
                ...(data.quotedContent.preview.mediaUrl ? { mediaUrl: data.quotedContent.preview.mediaUrl } : {}),
              },
            }
          : {
              messageId: data.quotedContent.messageId,
              preview: {
                senderName: data.quotedContent.preview.senderName,
                senderUsername: data.quotedContent.preview.senderUsername,
                ...(data.quotedContent.preview.text ? { text: data.quotedContent.preview.text } : {}),
                ...(data.quotedContent.preview.mediaUrl ? { mediaUrl: data.quotedContent.preview.mediaUrl } : {}),
                ...(data.quotedContent.preview.voiceUrl ? { voiceUrl: data.quotedContent.preview.voiceUrl } : {}),
              },
            }),
      }
    : null;

  const messageData = {
    conversationId: data.conversationId,
    senderId: data.senderId,
    type: data.type,
    content: data.content || null,
    mediaUrl: data.mediaUrl || null,
    voiceUrl: data.voiceUrl || null,
    quotedContent: cleanQuotedContent,
    reactionType: data.reactionType || null,
    heartCount: data.type === 'heart' ? data.heartCount || 1 : null,
    createdAt: serverTimestamp(),
    readBy: [data.senderId], // Sender has "read" their own message
  };

  const messageId = await addDocument(COLLECTIONS.MESSAGES, messageData);

  // Update conversation's lastMessageAt with local timestamp (for sorting)
  // The actual message has serverTimestamp for accuracy
  // Note: Reaction messages don't update lastMessageAt (they shouldn't bump conversation to top)
  if (data.type !== 'reaction') {
    await updateConversation(data.conversationId, {
      lastMessageAt: Timestamp.now(),
    });
  }

  // Increment unread counts for all participants except sender
  // (conversation already fetched above)
  const updatedUnreadCounts = { ...conversation.unreadCounts };
  Object.keys(updatedUnreadCounts).forEach((userId) => {
    if (userId !== data.senderId) {
      updatedUnreadCounts[userId] = (updatedUnreadCounts[userId] || 0) + 1;
    }
  });
  await updateConversation(data.conversationId, { unreadCounts: updatedUnreadCounts });

  // Get the created message to return
  const createdMessage = await getMessage(messageId);
  if (!createdMessage) {
    throw new Error('Failed to retrieve created message');
  }

  return createdMessage;
}

/**
 * Get a message by ID
 */
export async function getMessage(messageId: string): Promise<Message | null> {
  return getDocument<Message>(COLLECTIONS.MESSAGES, messageId);
}

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  cursor?: DocumentSnapshot | null
): Promise<{
  messages: Message[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const result = await queryDocumentsPaginated<Message>(
    COLLECTIONS.MESSAGES,
    [where('conversationId', '==', conversationId), orderBy('createdAt', 'desc')],
    MESSAGES_PAGE_SIZE,
    cursor
  );

  return {
    messages: result.data,
    lastDoc: result.lastDoc,
    hasMore: result.hasMore,
  };
}

/**
 * Get the last message in a conversation (for preview)
 */
export async function getLastMessage(conversationId: string): Promise<Message | null> {
  const result = await queryDocumentsPaginated<Message>(
    COLLECTIONS.MESSAGES,
    [where('conversationId', '==', conversationId), orderBy('createdAt', 'desc')],
    1, // Only need the most recent message
    null
  );

  return result.data.length > 0 ? result.data[0] : null;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
  // Update each message's readBy array
  for (const messageId of messageIds) {
    const message = await getMessage(messageId);
    if (message && !message.readBy.includes(userId)) {
      await updateDocument(COLLECTIONS.MESSAGES, messageId, {
        readBy: [...message.readBy, userId],
      });
    }
  }

  // Reset unread count for this user in the conversation
  const conversation = await getConversation(conversationId);
  if (conversation) {
    await updateConversation(conversationId, {
      unreadCounts: {
        ...conversation.unreadCounts,
        [userId]: 0,
      },
    });
  }
}

/**
 * Get a quoted message (for validation and preview)
 */
export async function getQuotedMessage(conversationId: string, messageId: string): Promise<Message | null> {
  const message = await getMessage(messageId);

  // Validate that the quoted message is from the same conversation
  if (message && message.conversationId !== conversationId) {
    throw new Error('Quoted message must be from the same conversation');
  }

  return message;
}

/**
 * Delete a message (soft delete - marks as deleted and strips content)
 * Only the sender can delete their own messages
 * Message remains in conversation to show "Deleted message" placeholder
 */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await getMessage(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can delete their own message
  if (message.senderId !== userId) {
    throw new Error('You can only delete your own messages');
  }

  // Don't allow deleting already deleted messages
  if (message.deletedAt) {
    return; // Already deleted, no-op
  }

  // Mark as deleted and strip all content
  await updateDocument(COLLECTIONS.MESSAGES, messageId, {
    deletedAt: serverTimestamp(),
    content: null,
    mediaUrl: null,
    voiceUrl: null,
    quotedContent: null, // Also remove quoted content
  });
}

/**
 * Toggle a reaction to a message (e.g., heart)
 * Creates a reaction message if not present, deletes it if present (toggle behavior)
 */
export async function toggleMessageReaction(
  conversationId: string,
  targetMessageId: string,
  userId: string,
  reactionType: ReactionType
): Promise<void> {
  // Validate target message exists and is in the same conversation
  const targetMessage = await getMessage(targetMessageId);
  if (!targetMessage) {
    throw new Error('Target message not found');
  }

  if (targetMessage.conversationId !== conversationId) {
    throw new Error('Target message must be in the same conversation');
  }

  // Don't allow reacting to deleted messages
  if (targetMessage.deletedAt) {
    throw new Error('Cannot react to deleted messages');
  }

  // Check if user already has this reaction
  const existingReactionId = await hasUserReacted(conversationId, targetMessageId, userId, reactionType);

  if (existingReactionId) {
    // Delete the existing reaction message
    await deleteDocument(COLLECTIONS.MESSAGES, existingReactionId);
  } else {
    // Create new reaction message
    // Get sender info for quoted message preview (can be empty/minimal)
    const quotedMessage: QuotedMessage = {
      type: 'message',
      messageId: targetMessageId,
      preview: {
        // Preview can be empty as per requirements
        senderName: '', // Will be populated by UI if needed
        senderUsername: '',
      },
    };

    await createMessage({
      conversationId,
      senderId: userId,
      type: 'reaction',
      reactionType,
      quotedContent: quotedMessage,
    });
  }
}

/**
 * Get all reaction messages for a target message
 */
export async function getMessageReactions(targetMessageId: string): Promise<Message[]> {
  // Get all reaction messages that quote this target message
  const allReactions = await queryDocuments<Message>(COLLECTIONS.MESSAGES, [where('type', '==', 'reaction')]);

  return allReactions.filter(
    (msg) => msg.quotedContent?.type === 'message' && msg.quotedContent.messageId === targetMessageId
  );
}

/**
 * Get reaction count for a specific reaction type on a message
 */
export async function getReactionCount(targetMessageId: string, reactionType: ReactionType): Promise<number> {
  const reactions = await getMessageReactions(targetMessageId);
  return reactions.filter((r) => r.reactionType === reactionType).length;
}

/**
 * Check if a user has reacted to a message with a specific type
 * Returns the reaction message ID if found, null otherwise
 */
export async function hasUserReacted(
  conversationId: string,
  targetMessageId: string,
  userId: string,
  reactionType: ReactionType
): Promise<string | null> {
  const reactions = await queryDocuments<Message>(COLLECTIONS.MESSAGES, [
    where('conversationId', '==', conversationId),
    where('type', '==', 'reaction'),
    where('senderId', '==', userId),
    where('reactionType', '==', reactionType),
  ]);

  const existingReaction = reactions.find(
    (msg) =>
      msg.reactionType === reactionType &&
      msg.quotedContent?.type === 'message' &&
      msg.quotedContent.messageId === targetMessageId
  );

  return existingReaction?.id || null;
}
