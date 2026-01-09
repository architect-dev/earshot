import { type Timestamp } from 'firebase/firestore';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  requesterId: string; // UID of user who sent the request
  addresseeId: string; // UID of user who received the request
  status: FriendshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Block {
  id: string;
  blockerId: string; // UID of user who blocked
  blockedId: string; // UID of user who was blocked
  createdAt: Timestamp;
}

// Helper type for displaying friends with user info
export interface FriendWithProfile {
  friendshipId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
    lastSeen: Timestamp | null;
  };
  friendsSince: Timestamp;
}

// Helper type for friend requests
export interface FriendRequest {
  id: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
  };
  createdAt: Timestamp;
  direction: 'incoming' | 'outgoing';
}

