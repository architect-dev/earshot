import { type Timestamp } from 'firebase/firestore';

export interface User {
  id: string; // Firebase Auth UID
  username: string;
  fullName: string;
  email: string;
  profilePhotoUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  friendCount: number; // TODO: This shouldn't be visible to everyone
  lastSeen: Timestamp | null;
}

export interface CreateUserData {
  username: string;
  fullName: string;
  email: string;
}

export interface UpdateUserData {
  username?: string;
  fullName?: string;
  profilePhotoUrl?: string | null;
}
