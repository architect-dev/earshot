import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FeedItem, Post, Friendship } from './types';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Collection names
const COLLECTIONS = {
  POSTS: 'posts',
  FRIENDSHIPS: 'friendships',
  FEEDS: 'feeds',
} as const;

// TTL: 30 days in milliseconds
const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Calculate expireAt timestamp (30 days from createdAt)
 */
function calculateExpireAt(createdAt: admin.firestore.Timestamp): admin.firestore.Timestamp {
  const expireAtMillis = createdAt.toMillis() + TTL_MS;
  return admin.firestore.Timestamp.fromMillis(expireAtMillis);
}

/**
 * Create FeedItem from Post (minimal fields only)
 */
function createFeedItem(post: Post): FeedItem {
  const createdAt = post.createdAt || admin.firestore.Timestamp.now();
  const expireAt = calculateExpireAt(createdAt);

  return {
    postId: post.id,
    authorId: post.authorId,
    createdAt,
    expireAt,
  };
}

/**
 * Get all friend IDs for a user (bidirectional friendships)
 */
async function getFriendIds(userId: string): Promise<string[]> {
  const friendIds = new Set<string>();

  // Query friendships where user is requester
  const requesterQuery = db
    .collection(COLLECTIONS.FRIENDSHIPS)
    .where('requesterId', '==', userId)
    .where('status', '==', 'accepted');

  // Query friendships where user is addressee
  const addresseeQuery = db
    .collection(COLLECTIONS.FRIENDSHIPS)
    .where('addresseeId', '==', userId)
    .where('status', '==', 'accepted');

  const [requesterSnapshot, addresseeSnapshot] = await Promise.all([requesterQuery.get(), addresseeQuery.get()]);

  // Add friends from requester side
  requesterSnapshot.docs.forEach((doc) => {
    const friendship = doc.data() as Friendship;
    friendIds.add(friendship.addresseeId);
  });

  // Add friends from addressee side
  addresseeSnapshot.docs.forEach((doc) => {
    const friendship = doc.data() as Friendship;
    friendIds.add(friendship.requesterId);
  });

  return Array.from(friendIds);
}

/**
 * Fan-out post to all friends' feeds (including author's own feed)
 */
async function fanOutPostToFeeds(post: Post): Promise<void> {
  const postId = post.id;
  const authorId = post.authorId;

  // Get all friends
  const friendIds = await getFriendIds(authorId);

  // Create feed item
  const feedItem = createFeedItem(post);

  // Use BulkWriter for parallel writes (more efficient than single batch)
  const bulkWriter = db.bulkWriter();

  let successCount = 0;
  let errorCount = 0;

  // Write to author's own feed
  const authorFeedItemRef = db.collection(COLLECTIONS.FEEDS).doc(authorId).collection('items').doc(postId);
  bulkWriter
    .set(authorFeedItemRef, feedItem, { merge: false })
    .then(() => {
      successCount++;
    })
    .catch((error) => {
      errorCount++;
      functions.logger.error(`Error writing feed item for author ${authorId}:`, error);
    });

  // Write to each friend's feed
  for (const friendId of friendIds) {
    const feedItemRef = db.collection(COLLECTIONS.FEEDS).doc(friendId).collection('items').doc(postId);

    bulkWriter
      .set(feedItemRef, feedItem, { merge: false })
      .then(() => {
        successCount++;
      })
      .catch((error) => {
        errorCount++;
        functions.logger.error(`Error writing feed item for friend ${friendId}:`, error);
      });
  }

  // Wait for all writes to complete
  await bulkWriter.close();

  const totalRecipients = friendIds.length + 1; // friends + author
  functions.logger.info(
    `Post ${postId}: Fanned out to ${totalRecipients} feeds (${friendIds.length} friends + author) (${successCount} success, ${errorCount} errors)`
  );
}

/**
 * Backfill feed items for a new friendship
 */
async function backfillFeedForFriendship(requesterId: string, addresseeId: string): Promise<void> {
  const BACKFILL_LIMIT = 50;

  // Backfill requester's feed with addressee's posts
  await backfillFeedForUser(requesterId, addresseeId, BACKFILL_LIMIT);

  // Backfill addressee's feed with requester's posts
  await backfillFeedForUser(addresseeId, requesterId, BACKFILL_LIMIT);
}

/**
 * Backfill feed items for a user from a friend's posts
 */
async function backfillFeedForUser(viewerId: string, friendId: string, limit: number): Promise<void> {
  // Fetch friend's recent posts
  const postsSnapshot = await db
    .collection(COLLECTIONS.POSTS)
    .where('authorId', '==', friendId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  if (postsSnapshot.empty) {
    functions.logger.info(`No posts to backfill for viewer ${viewerId} from friend ${friendId}`);
    return;
  }

  // Use BulkWriter for parallel writes
  const bulkWriter = db.bulkWriter();
  // Note: setMaxConcurrentWrites is not available in this version, using default concurrency

  let successCount = 0;
  let errorCount = 0;

  // Create feed items for each post
  for (const postDoc of postsSnapshot.docs) {
    const post = { id: postDoc.id, ...postDoc.data() } as Post;
    const postId = postDoc.id;

    const feedItem = createFeedItem(post);

    const feedItemRef = db.collection(COLLECTIONS.FEEDS).doc(viewerId).collection('items').doc(postId);

    bulkWriter
      .set(feedItemRef, feedItem, { merge: false })
      .then(() => {
        successCount++;
      })
      .catch((error) => {
        errorCount++;
        functions.logger.error(`Error backfilling feed item for post ${postId}:`, error);
      });
  }

  // Wait for all writes to complete
  await bulkWriter.close();

  functions.logger.info(
    `Backfilled ${postsSnapshot.docs.length} posts for viewer ${viewerId} from friend ${friendId} (${successCount} success, ${errorCount} errors)`
  );
}

/**
 * Cloud Function: Triggered when a new post is created
 * Fans out the post to all friends' feeds
 */
export const onPostCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const postId = context.params.postId;
    const postData = snap.data();

    // Log raw postData to see what Firestore returns
    functions.logger.info(`Post ${postId}: Raw postData.media:`, JSON.stringify(postData.media));
    functions.logger.info(`Post ${postId}: postData.media type:`, typeof postData.media);
    functions.logger.info(`Post ${postId}: postData.media is array:`, Array.isArray(postData.media));
    if (Array.isArray(postData.media)) {
      functions.logger.info(`Post ${postId}: postData.media length:`, postData.media.length);
      if (postData.media.length > 0) {
        functions.logger.info(`Post ${postId}: First media item:`, JSON.stringify(postData.media[0]));
      }
    }

    // Validate post data
    if (!postData.authorId) {
      functions.logger.error(`Post ${postId}: Missing authorId`);
      return;
    }

    const post: Post = {
      id: postId,
      authorId: postData.authorId,
      textBody: postData.textBody ?? null,
      media: postData.media ?? [],
      mediaAspectRatio: postData.mediaAspectRatio,
      deleted: postData.deleted ?? false,
      deletedAt: postData.deletedAt ?? null,
      createdAt: postData.createdAt || admin.firestore.Timestamp.now(),
      updatedAt: postData.updatedAt || admin.firestore.Timestamp.now(),
    };

    // Log constructed post object
    functions.logger.info(`Post ${postId}: Constructed post.media:`, JSON.stringify(post.media));
    functions.logger.info(`Post ${postId}: post.media length:`, post.media.length);

    try {
      await fanOutPostToFeeds(post);
    } catch (error) {
      functions.logger.error(`Error in onPostCreate for post ${postId}:`, error);
      // Don't throw - allow post creation to succeed even if fan-out fails
    }
  });

/**
 * Cloud Function: Triggered when a friendship is created or updated
 * Backfills feed items when friendship status becomes 'accepted'
 */
export const onFriendshipWrite = functions.firestore
  .document('friendships/{friendshipId}')
  .onWrite(async (change: functions.Change<admin.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const friendshipId = context.params.friendshipId;
    const before = change.before.exists ? (change.before.data() as Friendship) : null;
    const after = change.after.exists ? (change.after.data() as Friendship) : null;

    // Only process if status changed to 'accepted'
    if (!after || after.status !== 'accepted') {
      return;
    }

    // Skip if already accepted (avoid duplicate backfills)
    if (before && before.status === 'accepted') {
      return;
    }

    const requesterId = after.requesterId;
    const addresseeId = after.addresseeId;

    try {
      await backfillFeedForFriendship(requesterId, addresseeId);
    } catch (error) {
      functions.logger.error(`Error in onFriendshipWrite for friendship ${friendshipId}:`, error);
      // Don't throw - allow friendship update to succeed even if backfill fails
    }
  });
