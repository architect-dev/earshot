import {
  COLLECTIONS,
  addDocument,
  getDocument,
  updateDocument,
  queryDocuments,
  where,
  orderBy,
  serverTimestamp,
} from './firebase/firestore';
import { type Conversation, type CreateConversationData, type UpdateConversationData } from '@/types';

/**
 * Create a new conversation (DM or group chat)
 */
export async function createConversation(data: CreateConversationData): Promise<Conversation> {
  // Validate group name for group chats
  if (data.type === 'group' && !data.groupName) {
    throw new Error('Group name is required for group chats');
  }

  // Validate participants
  if (data.participants.length < 2) {
    throw new Error('Conversation must have at least 2 participants');
  }

  // For DMs, ensure exactly 2 participants
  if (data.type === 'dm' && data.participants.length !== 2) {
    throw new Error('Direct messages must have exactly 2 participants');
  }

  // Initialize unread counts for all participants
  const unreadCounts: Record<string, number> = {};
  data.participants.forEach((userId) => {
    unreadCounts[userId] = 0;
  });

  const conversationData = {
    participants: data.participants,
    type: data.type,
    groupName: data.type === 'group' ? data.groupName : null,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    lastMessageAt: null,
    latestMessage: null,
    unreadCounts,
    mutedBy: [],
  };

  const conversationId = await addDocument(COLLECTIONS.CONVERSATIONS, conversationData);

  const conversation = await getDocument<Conversation>(COLLECTIONS.CONVERSATIONS, conversationId);
  if (!conversation) {
    throw new Error('Failed to create conversation');
  }

  return { ...conversation, id: conversationId };
}

/**
 * Get a conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  return getDocument<Conversation>(COLLECTIONS.CONVERSATIONS, conversationId);
}

/**
 * Update a conversation
 */
export async function updateConversation(conversationId: string, updates: UpdateConversationData): Promise<void> {
  await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, updates);
}

/**
 * Get all conversations for a user (DMs and groups they're in)
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const conversations = await queryDocuments<Conversation>(COLLECTIONS.CONVERSATIONS, [
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc'),
  ]);

  console.log('conversations', conversations);

  return conversations;
}

/**
 * Find or create a DM between two users
 */
export async function findOrCreateDM(userId1: string, userId2: string): Promise<Conversation> {
  // Check if DM already exists
  const existingConversations = await queryDocuments<Conversation>(COLLECTIONS.CONVERSATIONS, [
    where('type', '==', 'dm'),
    where('participants', 'array-contains', userId1),
  ]);

  // Find DM with both participants
  const existingDM = existingConversations.find(
    (conv) => conv.participants.length === 2 && conv.participants.includes(userId2)
  );

  if (existingDM) {
    return existingDM;
  }

  // Create new DM
  return createConversation({
    participants: [userId1, userId2],
    type: 'dm',
    createdBy: userId1,
  });
}

/**
 * Get conversations that include a specific user (for group chat detection)
 * TODO: This should look at conversations context instead of querying the database
 */
export async function getConversationsWithUser(currentUserId: string, otherUserId: string): Promise<Conversation[]> {
  // Get all conversations where current user is a participant
  const userConversations = await queryDocuments<Conversation>(COLLECTIONS.CONVERSATIONS, [
    where('participants', 'array-contains', currentUserId),
  ]);

  // Filter to conversations that also include the other user
  return userConversations.filter((conv) => conv.participants.includes(otherUserId));
}

/**
 * Add participant to a group chat
 */
export async function addParticipantToGroup(conversationId: string, userId: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.type !== 'group') {
    throw new Error('Can only add participants to group chats');
  }

  if (conversation.participants.includes(userId)) {
    return; // Already a participant
  }

  // Add to participants array
  const updatedParticipants = [...conversation.participants, userId];

  // Initialize unread count for new participant
  const updatedUnreadCounts = {
    ...conversation.unreadCounts,
    [userId]: 0,
  };

  await updateConversation(conversationId, {
    participants: updatedParticipants,
    unreadCounts: updatedUnreadCounts,
  });
}

/**
 * Remove participant from a group chat
 */
export async function removeParticipantFromGroup(conversationId: string, userId: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.type !== 'group') {
    throw new Error('Can only remove participants from group chats');
  }

  if (!conversation.participants.includes(userId)) {
    return; // Not a participant
  }

  // Remove from participants array
  const updatedParticipants = conversation.participants.filter((id) => id !== userId);

  // Remove from unread counts
  const updatedUnreadCounts = { ...conversation.unreadCounts };
  delete updatedUnreadCounts[userId];

  // Remove from mutedBy if present
  const updatedMutedBy = conversation.mutedBy.filter((id) => id !== userId);

  await updateConversation(conversationId, {
    participants: updatedParticipants,
    unreadCounts: updatedUnreadCounts,
    mutedBy: updatedMutedBy,
  });
}

/**
 * Update group chat name
 */
export async function updateGroupName(conversationId: string, groupName: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.type !== 'group') {
    throw new Error('Can only rename group chats');
  }

  await updateConversation(conversationId, { groupName });
}

/**
 * Toggle mute status for a conversation
 */
export async function toggleMuteConversation(conversationId: string, userId: string, muted: boolean): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const updatedMutedBy = muted ? [...conversation.mutedBy, userId] : conversation.mutedBy.filter((id) => id !== userId);

  await updateConversation(conversationId, { mutedBy: updatedMutedBy });
}

/**
 * Update typing state for a user in a conversation
 * @param conversationId - The conversation ID
 * @param userId - The user ID who is typing
 * @param isTyping - Whether the user is typing (true) or stopped (false)
 */
export async function markAsTyping(conversationId: string, userId: string): Promise<void> {
  await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, {
    [`typingTimestamp.${userId}`]: serverTimestamp(),
  });
}
