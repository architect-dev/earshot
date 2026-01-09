import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateEmail,
  updatePassword,
  deleteUser,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './config';

/**
 * Create a new user account with email and password
 */
export async function signUp(email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Send email verification
  if (userCredential.user) {
    await sendEmailVerification(userCredential.user);
  }

  return userCredential;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Resend email verification to current user
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return sendEmailVerification(user);
}

/**
 * Update user's email address
 * Note: User may need to re-authenticate before this operation
 */
export async function changeEmail(newEmail: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return updateEmail(user, newEmail);
}

/**
 * Update user's password
 * Note: User may need to re-authenticate before this operation
 */
export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return updatePassword(user, newPassword);
}

/**
 * Delete the current user's account
 * Note: User may need to re-authenticate before this operation
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return deleteUser(user);
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Check if current user's email is verified
 */
export function isEmailVerified(): boolean {
  const user = auth.currentUser;
  return user?.emailVerified ?? false;
}
