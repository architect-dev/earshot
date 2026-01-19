import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  COLLECTIONS,
  getDocument,
  updateDocument,
  queryDocumentsPaginated,
  where,
  orderBy,
  serverTimestamp,
  type DocumentSnapshot,
} from './firebase/firestore';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase/config';
import { uploadFile, deleteFile, getPostMediaPath } from './firebase/storage';
import { type Post, type PostMedia, type PostWithAuthor, type GetProfileByIdFn } from '@/types';
import { type PhotoItem } from '@/components/posts';
import { calculateAspectRatio, clampAspectRatio } from '@/utils/media';

const MAX_PHOTOS = 6;
const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.8;

/**
 * Process and resize an image before upload
 * Maintains aspect ratio, scales so long side is MAX_DIMENSION
 */
async function processImage(
  uri: string,
  originalWidth?: number,
  originalHeight?: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const context = ImageManipulator.manipulate(uri);

  // Get original dimensions if not provided
  let width = originalWidth;
  let height = originalHeight;
  if (!width || !height) {
    const original = await context.renderAsync();
    width = original.width;
    height = original.height;
  }

  // Calculate resize dimensions maintaining aspect ratio
  // Scale so long side is MAX_DIMENSION
  let resizeWidth: number;
  let resizeHeight: number;

  if (width > height) {
    // Landscape - width is long side
    resizeWidth = MAX_DIMENSION;
    resizeHeight = Math.round((height / width) * MAX_DIMENSION);
  } else {
    // Portrait or square - height is long side
    resizeHeight = MAX_DIMENSION;
    resizeWidth = Math.round((width / height) * MAX_DIMENSION);
  }

  const resized = context.resize({ width: resizeWidth, height: resizeHeight });
  const rendered = await resized.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  // Fetch the processed image as blob
  const response = await fetch(result.uri);
  const blob = await response.blob();

  return {
    blob,
    width: result.width,
    height: result.height,
  };
}

/**
 * Upload multiple photos for a post with crop data
 */
async function uploadPostMedia(
  userId: string,
  postId: string,
  photos: PhotoItem[],
  onProgress?: (current: number, total: number) => void
): Promise<PostMedia[]> {
  const media: PostMedia[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    onProgress?.(i + 1, photos.length);

    const { blob, width, height } = await processImage(photo.uri, photo.width, photo.height);
    const storagePath = getPostMediaPath(userId, postId, i);
    const url = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });

    media.push({
      url,
      storagePath,
      width,
      height,
      scale: photo.scale,
      x: photo.x,
      y: photo.y,
    });
  }

  return media;
}

/**
 * Create a new post
 */
export async function createPost(
  userId: string,
  photos: PhotoItem[],
  textBody: string | null,
  onProgress?: (current: number, total: number) => void
): Promise<Post> {
  if (photos.length > MAX_PHOTOS) {
    throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);
  }

  // Calculate media aspect ratio from first photo (clamped)
  let mediaAspectRatio = 1; // Default to square if no photos
  if (photos.length > 0 && photos[0].width && photos[0].height) {
    const ratio = calculateAspectRatio(photos[0].width, photos[0].height);
    mediaAspectRatio = clampAspectRatio(ratio);
  }

  // Generate a post ID first (without creating the document)
  // This allows us to upload media using the postId, then create the post with media included
  const postRef = doc(collection(db, COLLECTIONS.POSTS));
  const postId = postRef.id;

  // Upload media with progress tracking (if any photos)
  let media: PostMedia[] = [];
  if (photos.length > 0) {
    media = await uploadPostMedia(userId, postId, photos, onProgress);
  }

  // Create the post document with media already included
  // This ensures the Cloud Function triggers with complete data
  await setDoc(postRef, {
    authorId: userId,
    textBody: textBody?.trim() || null,
    media,
    mediaAspectRatio,
    deleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Return the complete post
  const post = await getDocument<Post>(COLLECTIONS.POSTS, postId);
  if (!post) {
    throw new Error('Failed to create post');
  }

  return { ...post, id: postId };
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: string): Promise<Post | null> {
  const post = await getDocument<Post>(COLLECTIONS.POSTS, postId);
  if (!post) return null;
  return { ...post, id: postId };
}

/**
 * Get a post with author information
 * Uses FriendsContext for author data if provided (all users are friends)
 */
export async function getPostWithAuthor(
  postId: string,
  getProfileById: GetProfileByIdFn
): Promise<PostWithAuthor | null> {
  const post = await getPost(postId);
  if (!post) return null;

  const author = getProfileById(post.authorId);
  if (!author) return null;

  return { ...post, author };
}

/**
 * Media item for editing - can be existing or new
 */
export interface EditMediaItem {
  uri: string;
  isNew: boolean;
  storagePath?: string;
  width?: number;
  height?: number;
  scale?: number;
  x?: number;
  y?: number;
}

/**
 * Edit a post - handles text body, media additions, removals, and reordering
 */
export async function editPost(
  postId: string,
  userId: string,
  textBody: string | null,
  mediaItems: EditMediaItem[],
  deletedPaths: string[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const post = await getPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  if (post.authorId !== userId) {
    throw new Error('You can only edit your own posts');
  }

  // Delete removed media files
  for (const path of deletedPaths) {
    try {
      await deleteFile(path);
    } catch {
      // Continue even if delete fails
      // eslint-disable-next-line no-console
      console.warn(`Failed to delete media: ${path}`);
    }
  }

  // Count new items for progress tracking
  const newItems = mediaItems.filter((item) => item.isNew);
  let uploadedCount = 0;

  // Process media items - keep existing, upload new
  const finalMedia: PostMedia[] = [];

  for (const item of mediaItems) {
    if (!item.isNew && item.storagePath) {
      // Existing media - keep as-is, preserve crop data if provided
      const existingMedia = post.media.find((m) => m.storagePath === item.storagePath);
      finalMedia.push({
        url: item.uri,
        storagePath: item.storagePath,
        width: item.width || existingMedia?.width || 0,
        height: item.height || existingMedia?.height || 0,
        // Use new crop data if provided, otherwise keep existing
        scale: item.scale ?? existingMedia?.scale,
        x: item.x ?? existingMedia?.x,
        y: item.y ?? existingMedia?.y,
      });
    } else if (item.isNew) {
      // New media - process and upload
      uploadedCount++;
      onProgress?.(uploadedCount, newItems.length);

      const { blob, width, height } = await processImage(item.uri, item.width, item.height);
      const storagePath = getPostMediaPath(userId, postId, Date.now() + uploadedCount);
      const url = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });
      finalMedia.push({
        url,
        storagePath,
        width,
        height,
        scale: item.scale,
        x: item.x,
        y: item.y,
      });
    }
  }

  // Calculate media aspect ratio from first media (clamped)
  let mediaAspectRatio = 1; // Default to square if no media
  if (finalMedia.length > 0 && finalMedia[0].width && finalMedia[0].height) {
    const ratio = calculateAspectRatio(finalMedia[0].width, finalMedia[0].height);
    mediaAspectRatio = clampAspectRatio(ratio);
  }

  // Update the post document
  await updateDocument(COLLECTIONS.POSTS, postId, {
    textBody: textBody?.trim() || null,
    media: finalMedia,
    mediaAspectRatio,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft delete a post (removes media, clears content, marks as deleted)
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await getPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  if (post.authorId !== userId) {
    throw new Error('You can only delete your own posts');
  }
  if (post.deleted) {
    // Already deleted, nothing to do
    return;
  }

  // Delete all media files from storage
  for (const mediaItem of post.media) {
    try {
      await deleteFile(mediaItem.storagePath);
    } catch {
      // Continue even if some files fail to delete
      // eslint-disable-next-line no-console
      console.warn(`Failed to delete media: ${mediaItem.storagePath}`);
    }
  }

  // Soft delete: clear content and mark as deleted
  await updateDocument(COLLECTIONS.POSTS, postId, {
    media: [],
    mediaAspectRatio: null,
    textBody: null,
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Paginated feed result
 */
export interface PaginatedFeedResult {
  posts: PostWithAuthor[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Get posts for a user's feed (posts from friends) with pagination
 * Uses FriendsContext for author data (all users are friends)
 */
export async function getFeedPosts(
  userIds: string[],
  getProfileById: GetProfileByIdFn,
  pageSize = 20,
  cursor?: DocumentSnapshot | null
): Promise<PaginatedFeedResult> {
  if (userIds.length === 0) {
    return { posts: [], cursor: null, hasMore: false };
  }

  // Firestore 'in' queries are limited to 30 items
  // For users with more friends, we'd need to batch queries
  const queryUserIds = userIds.slice(0, 30);

  const result = await queryDocumentsPaginated<Post>(
    COLLECTIONS.POSTS,
    [where('authorId', 'in', queryUserIds), orderBy('createdAt', 'desc')],
    pageSize,
    cursor
  );

  // Enrich posts with author info from FriendsContext (no Firestore fetch needed)
  const postsWithAuthors: PostWithAuthor[] = [];

  for (const post of result.data) {
    const author = getProfileById(post.authorId);
    if (!author) continue;

    postsWithAuthors.push({
      ...post,
      author,
    });
  }

  return {
    posts: postsWithAuthors,
    cursor: result.lastDoc,
    hasMore: result.hasMore,
  };
}

/**
 * Paginated user posts result
 */
export interface PaginatedUserPostsResult {
  posts: Post[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Get posts by a specific user with pagination
 */
export async function getUserPosts(
  userId: string,
  pageSize = 20,
  cursor?: DocumentSnapshot | null
): Promise<PaginatedUserPostsResult> {
  const result = await queryDocumentsPaginated<Post>(
    COLLECTIONS.POSTS,
    [where('authorId', '==', userId), orderBy('createdAt', 'desc')],
    pageSize,
    cursor
  );

  return {
    posts: result.data,
    cursor: result.lastDoc,
    hasMore: result.hasMore,
  };
}
