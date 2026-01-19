import {
  COLLECTIONS,
  getDocument,
  queryDocumentsPaginated,
  queryDocuments,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runFirestoreTransaction,
  createBatch,
  arrayUnion,
  getDocRef,
  type DocumentSnapshot,
  deleteField,
} from './firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import {
  type Message,
  type CreateMessageData,
  type ReactionType,
  Conversation,
  MessageWithoutConversationId,
} from '@/types';
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
                ...(data.quotedContent.preview.text ? { text: data.quotedContent.preview.text } : {}),
                ...(data.quotedContent.preview.mediaUrl ? { mediaUrl: data.quotedContent.preview.mediaUrl } : {}),
                ...(data.quotedContent.preview.voiceUrl ? { voiceUrl: data.quotedContent.preview.voiceUrl } : {}),
              },
            }),
      }
    : null;

  const messageData = {
    senderId: data.senderId,
    type: data.type,
    content: data.content || null,
    mediaUrl: data.mediaUrl || null,
    voiceUrl: data.voiceUrl || null,
    quotedContent: cleanQuotedContent,
    reactionType: data.reactionType || null,
    heartCount: data.type === 'heart' ? data.heartCount || 1 : null,
    pendingId: data.pendingId || null,
    createdAt: serverTimestamp(),
    readBy: [data.senderId], // Sender has "read" their own message
  };

  // Use transaction to atomically create message and update conversation
  // IMPORTANT: All reads must come before all writes in Firestore transactions
  const messageId = await runFirestoreTransaction(async (transaction) => {
    // STEP 1: READ - Get conversation document first (all reads must be before writes)
    const conversationRef = getDocRef(COLLECTIONS.CONVERSATIONS, data.conversationId);
    const conversationDoc = await transaction.get(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data() as Conversation;

    // STEP 2: WRITES - Now do all writes (message creation and conversation update)
    // Create message document in subcollection
    const messageRef = getDocRef([COLLECTIONS.CONVERSATIONS, data.conversationId, 'messages']);
    transaction.set(messageRef, {
      ...messageData,
      updatedAt: serverTimestamp(),
    });

    // Prepare conversation updates
    const conversationUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    // Update lastMessageAt (reaction messages don't bump conversation to top)
    if (data.type !== 'reaction') {
      conversationUpdates.lastMessageAt = Timestamp.now();
    }

    // Increment unread counts for all participants except sender
    const updatedUnreadCounts = { ...conversationData.unreadCounts };
    Object.keys(updatedUnreadCounts).forEach((userId) => {
      if (userId === data.senderId) {
        updatedUnreadCounts[userId] = 0;
      } else {
        updatedUnreadCounts[userId] = (updatedUnreadCounts[userId] || 0) + 1;
      }
    });
    conversationUpdates.unreadCounts = updatedUnreadCounts;

    // Update typing state
    conversationUpdates[`typingTimestamp.${data.senderId}`] = deleteField();

    // Update conversation
    transaction.update(conversationRef, conversationUpdates);

    return messageRef.id;
  });

  // Get the created message to return
  const createdMessage = await getMessage(data.conversationId, messageId);
  if (!createdMessage) {
    throw new Error('Failed to retrieve created message');
  }

  // Update conversation's latestMessage (non-critical, can happen after transaction)
  // This is for caching/preview purposes, so slight delay is acceptable
  if (data.type !== 'reaction') {
    await updateConversation(data.conversationId, {
      latestMessage: createdMessage,
    }).catch((err) => {
      // Log but don't fail - this is a cache update, not critical
      // eslint-disable-next-line no-console
      console.error('Error updating latestMessage:', err);
    });
  }

  return createdMessage;
}

/**
 * Get a message by ID
 * Note: conversationId is added to the returned message for convenience, even though it's not stored in Firestore
 */
export async function getMessage(conversationId: string, messageId: string): Promise<Message | null> {
  const message = await getDocument<MessageWithoutConversationId>(
    [COLLECTIONS.CONVERSATIONS, conversationId, 'messages'],
    messageId
  );
  if (!message) return null;
  // Add conversationId for convenience (it's implicit in the path)
  return { ...message, conversationId };
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
  const result = await queryDocumentsPaginated<MessageWithoutConversationId>(
    [COLLECTIONS.CONVERSATIONS, conversationId, 'messages'],
    [orderBy('createdAt', 'desc')],
    MESSAGES_PAGE_SIZE,
    cursor
  );

  // Add conversationId to each message (it's implicit in the path)
  const messages: Message[] = result.data.map((msg) => ({ ...msg, conversationId }));

  return {
    messages,
    lastDoc: result.lastDoc,
    hasMore: result.hasMore,
  };
}

/**
 * Get the last message in a conversation (for preview)
 */
export async function getLastMessage(conversationId: string): Promise<Message | null> {
  const result = await queryDocumentsPaginated<MessageWithoutConversationId>(
    [COLLECTIONS.CONVERSATIONS, conversationId, 'messages'],
    [orderBy('createdAt', 'desc')],
    1, // Only need the most recent message
    null
  );

  return result.data.length > 0 ? { ...result.data[0], conversationId } : null;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
  // Use batch write for efficient updates
  const batch = createBatch();

  // Update each message's readBy array using arrayUnion
  for (const messageId of messageIds) {
    const messageRef = getDocRef([COLLECTIONS.CONVERSATIONS, conversationId, 'messages'], messageId);
    batch.update(messageRef, {
      readBy: arrayUnion(userId),
    });
  }

  // Reset unread count for this user in the conversation
  const conversationRef = getDocRef(COLLECTIONS.CONVERSATIONS, conversationId);
  batch.update(conversationRef, {
    [`unreadCounts.${userId}`]: 0,
  });

  // Commit all updates in a single batch
  await batch.commit();
}

/**
 * Get a quoted message (for validation and preview)
 */
export async function getQuotedMessage(conversationId: string, messageId: string): Promise<Message | null> {
  return getMessage(conversationId, messageId);
}

/**
 * Delete a message (soft delete - marks as deleted and strips content)
 * Only the sender can delete their own messages
 * Message remains in conversation to show "Deleted message" placeholder
 */
export async function deleteMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
  const message = await getMessage(conversationId, messageId);
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
  const messageRef = getDocRef([COLLECTIONS.CONVERSATIONS, conversationId, 'messages'], messageId);
  await updateDoc(messageRef, {
    deletedAt: serverTimestamp(),
    content: null,
    mediaUrl: null,
    voiceUrl: null,
    quotedContent: null, // Also remove quoted content
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all reaction messages for a target message
 */
export async function getMessageReactions(conversationId: string, targetMessageId: string): Promise<Message[]> {
  // Get all reaction messages in this conversation that quote this target message
  const allReactions = await queryDocuments<MessageWithoutConversationId>(
    [COLLECTIONS.CONVERSATIONS, conversationId, 'messages'],
    [where('type', '==', 'reaction')]
  );

  // Add conversationId and filter
  return allReactions
    .map((msg) => ({ ...msg, conversationId }))
    .filter((msg) => msg.quotedContent?.type === 'message' && msg.quotedContent.messageId === targetMessageId);
}

/**
 * Get reaction count for a specific reaction type on a message
 */
export async function getReactionCount(
  conversationId: string,
  targetMessageId: string,
  reactionType: ReactionType
): Promise<number> {
  const reactions = await getMessageReactions(conversationId, targetMessageId);
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
  const reactions = await queryDocuments<MessageWithoutConversationId>(
    [COLLECTIONS.CONVERSATIONS, conversationId, 'messages'],
    [where('type', '==', 'reaction'), where('senderId', '==', userId), where('reactionType', '==', reactionType)]
  );

  const existingReaction = reactions.find(
    (msg) =>
      msg.reactionType === reactionType &&
      msg.quotedContent?.type === 'message' &&
      msg.quotedContent.messageId === targetMessageId
  );

  return existingReaction?.id || null;
}
