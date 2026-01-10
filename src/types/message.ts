import { type Timestamp } from 'firebase/firestore';
import { type QuotedContent } from './conversation';

export type MessageType = 'text' | 'photo' | 'video' | 'voice' | 'heart' | 'comment';

export interface Message {
  id: string;
  conversationId: string; // Reference to conversation
  senderId: string; // User ID
  type: MessageType;
  content?: string; // Text content (for text, comment types)
  mediaUrl?: string; // URL for photo/video
  voiceUrl?: string; // URL for voice message
  quotedContent?: QuotedContent; // Optional quoted post or message
  createdAt: Timestamp;
  readBy: string[]; // Array of user IDs who have read this message
  deletedAt?: Timestamp | null; // Timestamp when message was deleted (null if not deleted)
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
}

// For updating message (e.g., read receipts, deletion)
export interface UpdateMessageData {
  readBy?: string[];
  deletedAt?: Timestamp | null;
}
