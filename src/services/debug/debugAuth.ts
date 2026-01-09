// Debug auth utilities - only for development
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { COLLECTIONS, setDocument, queryDocuments, where, serverTimestamp } from '@/services/firebase';
import { SEED_USERS, DEBUG_PASSWORD, type SeedUser } from './seedUsers';
import { type User } from '@/types';

/**
 * Create all seed users in Firebase Auth and Firestore
 * Skips users that already exist
 */
export async function createSeedUsers(): Promise<{ created: string[]; skipped: string[]; errors: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const seedUser of SEED_USERS) {
    try {
      // Check if user already exists in Firestore by username
      const existing = await queryDocuments<User>(COLLECTIONS.USERS, [where('username', '==', seedUser.username)]);

      if (existing.length > 0) {
        skipped.push(seedUser.username);
        continue;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, seedUser.email, DEBUG_PASSWORD);
      const uid = userCredential.user.uid;

      // Create Firestore profile
      await setDocument(COLLECTIONS.USERS, uid, {
        username: seedUser.username,
        fullName: seedUser.fullName,
        email: seedUser.email,
        profilePhotoUrl: null,
        createdAt: serverTimestamp(),
        friendCount: 0,
        lastSeen: null,
      });

      created.push(seedUser.username);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        skipped.push(seedUser.username);
      } else {
        errors.push(`${seedUser.username}: ${error.message || 'Unknown error'}`);
      }
    }
  }

  return { created, skipped, errors };
}

/**
 * Get all seed users that exist in Firestore
 */
export async function getExistingSeedUsers(): Promise<Array<SeedUser & { uid: string }>> {
  const existingUsers: Array<SeedUser & { uid: string }> = [];

  for (const seedUser of SEED_USERS) {
    const users = await queryDocuments<User>(COLLECTIONS.USERS, [where('username', '==', seedUser.username)]);

    if (users.length > 0) {
      existingUsers.push({
        ...seedUser,
        uid: users[0].id,
      });
    }
  }

  return existingUsers;
}

/**
 * Switch to a seed user (sign in as them)
 */
export async function switchToSeedUser(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, DEBUG_PASSWORD);
}
