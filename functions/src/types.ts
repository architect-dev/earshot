import * as admin from 'firebase-admin';

/**
 * FeedItem stored in feeds/{viewerUid}/items/{postId}
 * Contains post data plus expireAt for TTL
 */
export interface FeedItem extends Post {
  expireAt: admin.firestore.Timestamp; // Required: TTL timestamp (30 days from createdAt)
}

export interface PostMedia {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  scale?: number;
  x?: number;
  y?: number;
}

export interface Post {
  id: string;
  authorId: string;
  textBody: string | null;
  media: PostMedia[];
  mediaAspectRatio?: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
