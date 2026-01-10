import { type Timestamp } from 'firebase/firestore';
import { Profile } from './profile';

export interface PostMedia {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  // Crop data (from PhotoEditor)
  scale?: number; // 0.5-2, default 1
  x?: number; // 0-1, default 0.5
  y?: number; // 0-1, default 0.5
}

export interface Post {
  id: string;
  authorId: string;
  textBody: string | null;
  media: PostMedia[];
  mediaAspectRatio?: number; // Clamped aspect ratio of first media (4:5 to 1.91:1), optional for backwards compatibility
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePostData {
  textBody: string | null;
  media: PostMedia[];
}

// For displaying posts with author info
export interface PostWithAuthor extends Post {
  author: Profile;
}
