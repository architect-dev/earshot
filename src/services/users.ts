import { updateDocument, COLLECTIONS, serverTimestamp } from '@/services/firebase/firestore';

/**
 * Update the current user's lastSeen timestamp
 * Should be called periodically when app is active
 */
export async function updateLastSeen(userId: string): Promise<void> {
  await updateDocument(COLLECTIONS.USERS, userId, {
    lastSeen: serverTimestamp(),
  });
}

