import {
  COLLECTIONS,
  addDocument,
  getDocument,
  updateDocument,
  queryDocumentsPaginated,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from './firebase/firestore';
import { type Message, type CreateMessageData } from '@/types';
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

  const messageData = {
    conversationId: data.conversationId,
    senderId: data.senderId,
    type: data.type,
    content: data.content || null,
    mediaUrl: data.mediaUrl || null,
    voiceUrl: data.voiceUrl || null,
    quotedContent: data.quotedContent || null,
    createdAt: serverTimestamp(),
    readBy: [data.senderId], // Sender has "read" their own message
  };

  const messageId = await addDocument(COLLECTIONS.MESSAGES, messageData);

  // Update conversation's lastMessageAt with local timestamp (for sorting)
  // The actual message has serverTimestamp for accuracy
  await updateConversation(data.conversationId, {
    lastMessageAt: Timestamp.now(),
  });

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
