import { type Timestamp } from 'firebase/firestore';

/**
 * FeedItem stored in feeds/{viewerUid}/items/{postId}
 * Contains minimal post reference data plus expireAt for TTL
 */
export interface FeedItem {
  postId: string; // Reference to the post document
  authorId: string; // Author ID for filtering/enrichment
  createdAt: Timestamp; // Post creation timestamp (for ordering)
  expireAt: Timestamp; // Required: TTL timestamp (30 days from createdAt)
}
