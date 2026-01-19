import { type Timestamp } from 'firebase/firestore';
import { type Post } from './post';

/**
 * FeedItem stored in feeds/{viewerUid}/items/{postId}
 * Contains full post data plus expireAt for TTL
 */
export interface FeedItem extends Post {
  expireAt: Timestamp; // Required: TTL timestamp (30 days from createdAt)
}
