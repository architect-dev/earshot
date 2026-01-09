import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from 'firebase/storage';
import { storage } from './config';

// Storage paths
export const STORAGE_PATHS = {
  PROFILE_PHOTOS: 'profile-photos',
  POST_MEDIA: 'post-media',
  MESSAGE_MEDIA: 'message-media',
  VOICE_MESSAGES: 'voice-messages',
} as const;

/**
 * Upload a file to Firebase Storage
 * @param path - The storage path (e.g., 'profile-photos/user123.jpg')
 * @param file - The file blob/array buffer to upload
 * @param metadata - Optional metadata for the file
 * @returns The download URL of the uploaded file
 */
export async function uploadFile(
  path: string,
  file: Blob | Uint8Array,
  metadata?: { contentType?: string }
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
}

/**
 * Upload a file with progress tracking
 * @param path - The storage path
 * @param file - The file blob to upload
 * @param onProgress - Callback for upload progress (0-100)
 * @returns Promise that resolves to the download URL
 */
export function uploadFileWithProgress(
  path: string,
  file: Blob,
  onProgress?: (progress: number) => void
): { task: UploadTask; promise: Promise<string> } {
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });

  return { task, promise };
}

/**
 * Delete a file from Firebase Storage
 * @param path - The storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
}

/**
 * Get the download URL for a file
 * @param path - The storage path
 * @returns The download URL
 */
export async function getFileUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Generate a unique file path for uploads
 * @param basePath - The base storage path (e.g., 'profile-photos')
 * @param userId - The user's ID
 * @param fileName - Original file name or extension
 * @returns A unique storage path
 */
export function generateFilePath(basePath: string, userId: string, fileName: string): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'jpg';
  return `${basePath}/${userId}/${timestamp}.${extension}`;
}

/**
 * Generate profile photo path
 */
export function getProfilePhotoPath(userId: string): string {
  return `${STORAGE_PATHS.PROFILE_PHOTOS}/${userId}/profile.jpg`;
}

/**
 * Generate post media path
 */
export function getPostMediaPath(userId: string, postId: string, index: number, extension = 'jpg'): string {
  return `${STORAGE_PATHS.POST_MEDIA}/${userId}/${postId}/${index}.${extension}`;
}

/**
 * Generate message media path
 */
export function getMessageMediaPath(conversationId: string, messageId: string, extension = 'jpg'): string {
  return `${STORAGE_PATHS.MESSAGE_MEDIA}/${conversationId}/${messageId}.${extension}`;
}

/**
 * Generate voice message path
 */
export function getVoiceMessagePath(conversationId: string, messageId: string): string {
  return `${STORAGE_PATHS.VOICE_MESSAGES}/${conversationId}/${messageId}.m4a`;
}
