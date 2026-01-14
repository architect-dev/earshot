import { DividerMessage, Message, MessageWithReactions, PendingMessage } from '@/types/message';
import { Timestamp } from 'firebase/firestore';

export type AllMessageTypes = Message | MessageWithReactions | DividerMessage | PendingMessage;
export type AllReactionMessageTypes = Message | PendingMessage;

export const isPendingMessage = (message: AllMessageTypes): message is PendingMessage => {
  return 'pendingId' in message && 'conversationId' in message && 'isPending' in message;
};

export const isDividerMessage = (message: AllMessageTypes): message is DividerMessage => {
  return 'dividerId' in message && 'conversationId' in message && 'isDivider' in message;
};

export const isMessage = (message: AllMessageTypes): message is Message => {
  return 'id' in message && 'conversationId' in message && !isPendingMessage(message) && !isDividerMessage(message);
};

export const isMessageWithReactions = (message: AllMessageTypes): message is MessageWithReactions => {
  return isMessage(message) && 'reactions' in message;
};

export const getMessageId = (message: AllMessageTypes): string => {
  if (isDividerMessage(message)) return message.dividerId;
  if (isPendingMessage(message)) return message.pendingId;
  if (isMessage(message)) return message.id;
  throw new Error('Invalid message type', message);
};

export const getMessageReactions = (message: AllMessageTypes): AllReactionMessageTypes[] => {
  if (isMessageWithReactions(message)) return message.reactions;
  return [];
};

export const getMessageDeletedAt = (message: AllMessageTypes): Timestamp | null => {
  if (isMessageWithReactions(message)) return message.deletedAt || null;
  return null;
};
