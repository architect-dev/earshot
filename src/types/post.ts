import { type Timestamp } from 'firebase/firestore';

export interface PostMedia {
  url: string;
  storagePath: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  authorId: string;
  textBody: string | null;
  media: PostMedia[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePostData {
  textBody: string | null;
  media: PostMedia[];
}

// For displaying posts with author info
export interface PostWithAuthor extends Post {
  author: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
  };
}
