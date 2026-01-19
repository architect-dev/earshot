import * as admin from 'firebase-admin';

/**
 * FeedItem stored in feeds/{viewerUid}/items/{postId}
 * Contains minimal post reference data plus expireAt for TTL
 */
export interface FeedItem {
  postId: string; // Reference to the post document
  authorId: string; // Author ID for filtering/enrichment
  createdAt: admin.firestore.Timestamp; // Post creation timestamp (for ordering)
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
  deleted: boolean;
  deletedAt: admin.firestore.Timestamp | null;
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
