import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  COLLECTIONS,
  addDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from './firebase/firestore';
import { uploadFile, deleteFile, getPostMediaPath } from './firebase/storage';
import { type Post, type PostMedia, type PostWithAuthor, type User } from '@/types';

const MAX_PHOTOS = 6;
const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.8;

/**
 * Process and resize an image before upload
 */
async function processImage(uri: string): Promise<{ blob: Blob; width: number; height: number }> {
  const context = ImageManipulator.manipulate(uri);
  const resized = context.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION });
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
 * Upload multiple photos for a post
 */
async function uploadPostMedia(
  userId: string,
  postId: string,
  imageUris: string[],
  onProgress?: (current: number, total: number) => void
): Promise<PostMedia[]> {
  const media: PostMedia[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    onProgress?.(i + 1, imageUris.length);

    const { blob, width, height } = await processImage(imageUris[i]);
    const storagePath = getPostMediaPath(userId, postId, i);
    const url = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });

    media.push({ url, storagePath, width, height });
  }

  return media;
}

/**
 * Create a new post
 */
export async function createPost(
  userId: string,
  imageUris: string[],
  textBody: string | null,
  onProgress?: (current: number, total: number) => void
): Promise<Post> {
  if (imageUris.length > MAX_PHOTOS) {
    throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);
  }

  // Create the post document first to get the ID
  const postData = {
    authorId: userId,
    textBody: textBody?.trim() || null,
    media: [] as PostMedia[],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const postId = await addDocument(COLLECTIONS.POSTS, postData);

  // Upload media with progress tracking (if any photos)
  let media: PostMedia[] = [];
  if (imageUris.length > 0) {
    media = await uploadPostMedia(userId, postId, imageUris, onProgress);
    // Update the post with media URLs
    await updateDocument(COLLECTIONS.POSTS, postId, { media });
  }

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
 */
export async function getPostWithAuthor(postId: string): Promise<PostWithAuthor | null> {
  const post = await getPost(postId);
  if (!post) return null;

  const author = await getDocument<User>(COLLECTIONS.USERS, post.authorId);
  if (!author) return null;

  return {
    ...post,
    author: {
      id: post.authorId,
      username: author.username,
      fullName: author.fullName,
      profilePhotoUrl: author.profilePhotoUrl,
    },
  };
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
      // Existing media - keep as-is
      finalMedia.push({
        url: item.uri,
        storagePath: item.storagePath,
        width: item.width || 0,
        height: item.height || 0,
      });
    } else if (item.isNew) {
      // New media - process and upload
      uploadedCount++;
      onProgress?.(uploadedCount, newItems.length);

      const { blob, width, height } = await processImage(item.uri);
      const storagePath = getPostMediaPath(userId, postId, Date.now() + uploadedCount);
      const url = await uploadFile(storagePath, blob, { contentType: 'image/jpeg' });
      finalMedia.push({ url, storagePath, width, height });
    }
  }

  // Update the post document
  await updateDocument(COLLECTIONS.POSTS, postId, {
    textBody: textBody?.trim() || null,
    media: finalMedia,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a post and its media
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await getPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  if (post.authorId !== userId) {
    throw new Error('You can only delete your own posts');
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

  // Delete the post document
  await deleteDocument(COLLECTIONS.POSTS, postId);
}

/**
 * Get posts for a user's feed (posts from friends)
 */
export async function getFeedPosts(friendIds: string[], pageSize = 20): Promise<PostWithAuthor[]> {
  if (friendIds.length === 0) {
    return [];
  }

  // Firestore 'in' queries are limited to 30 items
  // For users with more friends, we'd need to batch queries
  const queryFriendIds = friendIds.slice(0, 30);

  const posts = await queryDocuments<Post>(COLLECTIONS.POSTS, [
    where('authorId', 'in', queryFriendIds),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]);

  // Fetch author info for each post
  const postsWithAuthors: PostWithAuthor[] = [];
  const authorCache = new Map<string, User>();

  for (const post of posts) {
    let author = authorCache.get(post.authorId);
    if (!author) {
      const authorDoc = await getDocument<User>(COLLECTIONS.USERS, post.authorId);
      if (authorDoc) {
        author = authorDoc;
        authorCache.set(post.authorId, author);
      }
    }

    if (author) {
      postsWithAuthors.push({
        ...post,
        author: {
          id: post.authorId,
          username: author.username,
          fullName: author.fullName,
          profilePhotoUrl: author.profilePhotoUrl,
        },
      });
    }
  }

  return postsWithAuthors;
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(userId: string, pageSize = 20): Promise<Post[]> {
  return queryDocuments<Post>(COLLECTIONS.POSTS, [
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ]);
}
