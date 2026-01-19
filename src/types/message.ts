import { type Timestamp } from 'firebase/firestore';
import { type QuotedContent } from './conversation';

export type MessageType = 'text' | 'photo' | 'video' | 'voice' | 'heart' | 'comment' | 'reaction';

export type ReactionType = 'heart'; // Future: 'laugh', 'thumbs-up', etc.

export interface Message {
  id: string;
  conversationId: string; // Reference to conversation
  senderId: string; // User ID
  type: MessageType;
  content?: string; // Text content (for text, comment types)
  mediaUrl?: string; // URL for photo/video
  voiceUrl?: string; // URL for voice message
  quotedContent?: QuotedContent; // Optional quoted post or message
  reactionType?: ReactionType; // For reaction messages (type='reaction')
  heartCount?: number; // For heart messages (type='heart'), default: 1
  pendingId?: string; // ID of pending message that this replaces (format: pending-${userId}-${timestampMs})
  createdAt: Timestamp;
  readBy: string[]; // Array of user IDs who have read this message
  deletedAt?: Timestamp | null; // Timestamp when message was deleted (null if not deleted)
}

export type MessageWithoutConversationId = Omit<Message, 'conversationId'>;

export interface PendingMessage {
  isPending: true;
  pendingId: string; // Format: pending-${userId}-${timestampMs}
  conversationId: string;
  senderId: string;
  type: 'text' | 'photo' | 'reaction';
  content?: string;
  reactionType?: ReactionType;
  mediaUri?: string;
  quotedContent?: QuotedContent;
  createdAt: Date;
  status: 'sending' | 'failed';
}

export interface MessageWithReactions extends Message {
  reactions: (Message | PendingMessage)[];
}

// For creating a new message
export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  quotedContent?: QuotedContent;
  reactionType?: ReactionType; // Required if type='reaction'
  heartCount?: number; // For heart messages (type='heart'), default: 1
  pendingId?: string; // ID of pending message that this replaces (format: pending-${userId}-${timestampMs})
}

// For updating message (e.g., read receipts, deletion)
export interface UpdateMessageData {
  readBy?: string[];
  deletedAt?: Timestamp | null;
}

export interface DividerMessage {
  isDivider: true;
  dividerId: string;
  conversationId: string;
  label?: string;
  component?: React.ReactNode;
}
