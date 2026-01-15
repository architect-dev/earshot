import { type Timestamp } from 'firebase/firestore';
import { type Message } from './message';

export type ConversationType = 'dm' | 'group';

export interface QuotedPost {
  type: 'post';
  postId: string;
  senderId: string;
  preview: {
    text?: string;
    mediaUrl?: string;
    authorName: string;
    authorUsername: string;
  };
}

export interface QuotedMessage {
  type: 'message';
  messageId: string; // Only message ID needed (same conversation)
  senderId: string;
  preview: {
    text?: string;
    mediaUrl?: string;
    voiceUrl?: string;
  };
}

export type QuotedContent = QuotedPost | QuotedMessage;

export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs
  type: ConversationType; // 'dm' | 'group'
  groupName: string | null; // null for DMs, required for groups
  createdBy: string; // User ID
  createdAt: Timestamp;
  lastMessageAt: Timestamp | null; // Timestamp for sorting, updated when new messages arrive
  latestMessage: Message | null; // Latest message in the conversation (cached)
  unreadCounts: Record<string, number>; // userId -> unread count
  mutedBy: string[]; // Array of user IDs who have muted this conversation
  typingTimestamp?: Record<string, Timestamp>; // userId -> last typing timestamp
}

// For creating a new conversation
export interface CreateConversationData {
  participants: string[];
  type: ConversationType;
  groupName?: string; // Required if type='group'
  createdBy: string;
}

// For updating conversation
export interface UpdateConversationData {
  participants?: string[];
  groupName?: string;
  lastMessageAt?: Timestamp | null;
  latestMessage?: Message | null;
  unreadCounts?: Record<string, number>;
  mutedBy?: string[];
  typingTimestamp?: Record<string, Timestamp>;
}
