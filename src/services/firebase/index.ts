// Firebase configuration and instances
export { app, auth, db, storage } from './config';

// Auth services
export {
  signUp,
  signIn,
  signOut,
  resetPassword,
  resendVerificationEmail,
  changeEmail,
  changePassword,
  deleteAccount,
  getCurrentUser,
  isEmailVerified,
} from './auth';

// Firestore services
export {
  COLLECTIONS,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  subscribeToDocument,
  subscribeToQuery,
  getDocRef,
  timestampToDate,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from './firestore';

// Storage services
export {
  STORAGE_PATHS,
  uploadFile,
  uploadFileWithProgress,
  deleteFile,
  getFileUrl,
  generateFilePath,
  getProfilePhotoPath,
  getPostMediaPath,
  getMessageMediaPath,
  getVoiceMessagePath,
} from './storage';
