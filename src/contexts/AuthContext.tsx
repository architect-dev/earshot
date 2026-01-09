import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import {
  auth,
  signIn,
  signUp,
  signOut,
  resetPassword,
  resendVerificationEmail,
  changeEmail,
  changePassword,
  deleteAccount,
} from '@/services/firebase';
import {
  COLLECTIONS,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  where,
  serverTimestamp,
} from '@/services/firebase';
import { uploadFile, deleteFile, getProfilePhotoPath } from '@/services/firebase/storage';
import { type User, type CreateUserData, type UpdateUserData } from '@/types';

interface AuthContextValue {
  // State
  user: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;

  // Auth Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: CreateUserData) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;

  // Profile Actions
  updateProfile: (data: UpdateUserData) => Promise<void>;
  updateProfilePhoto: (imageUri: string) => Promise<void>;
  updateEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  deleteUserAccount: (currentPassword: string) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;
  const isEmailVerified = user?.emailVerified ?? false;

  // Fetch user profile from Firestore
  const fetchUserProfile = useCallback(async (uid: string) => {
    try {
      const profile = await getDocument<User>(COLLECTIONS.USERS, uid);
      setUserProfile(profile);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  // Re-authenticate user (required for sensitive operations)
  const reauthenticate = useCallback(async (currentPassword: string) => {
    if (!user || !user.email) {
      throw new Error('No authenticated user');
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }, [user]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register a new user
  const register = useCallback(
    async (email: string, password: string, userData: CreateUserData) => {
      setIsLoading(true);
      try {
        const userCredential = await signUp(email, password);
        const uid = userCredential.user.uid;

        // Create user profile in Firestore
        await setDocument(COLLECTIONS.USERS, uid, {
          username: userData.username.toLowerCase(),
          fullName: userData.fullName,
          email: userData.email.toLowerCase(),
          profilePhotoUrl: null,
          createdAt: serverTimestamp(),
          friendCount: 0,
        });

        // Fetch the created profile
        await fetchUserProfile(uid);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserProfile]
  );

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send password reset email
  const sendPasswordReset = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  // Send verification email
  const sendVerificationEmail = useCallback(async () => {
    await resendVerificationEmail();
  }, []);

  // Refresh user profile
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  }, [user, fetchUserProfile]);

  // Update profile (fullName)
  const updateProfile = useCallback(
    async (data: UpdateUserData) => {
      if (!user) throw new Error('No authenticated user');

      await updateDocument(COLLECTIONS.USERS, user.uid, data);
      await fetchUserProfile(user.uid);
    },
    [user, fetchUserProfile]
  );

  // Update profile photo
  const updateProfilePhoto = useCallback(
    async (imageUri: string) => {
      if (!user) throw new Error('No authenticated user');

      // Fetch the image and convert to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const path = getProfilePhotoPath(user.uid);
      const downloadUrl = await uploadFile(path, blob, { contentType: 'image/jpeg' });

      // Update Firestore profile
      await updateDocument(COLLECTIONS.USERS, user.uid, { profilePhotoUrl: downloadUrl });
      await fetchUserProfile(user.uid);
    },
    [user, fetchUserProfile]
  );

  // Check if username is available
  const checkUsernameAvailable = useCallback(
    async (username: string): Promise<boolean> => {
      const normalizedUsername = username.toLowerCase();
      const existingUsers = await queryDocuments<User>(COLLECTIONS.USERS, [
        where('username', '==', normalizedUsername),
      ]);

      // If no users found, or the only user is the current user, it's available
      if (existingUsers.length === 0) return true;
      if (existingUsers.length === 1 && user && existingUsers[0].id === user.uid) return true;
      return false;
    },
    [user]
  );

  // Update username
  const updateUsername = useCallback(
    async (newUsername: string) => {
      if (!user) throw new Error('No authenticated user');

      const normalizedUsername = newUsername.toLowerCase();

      // Check availability
      const isAvailable = await checkUsernameAvailable(normalizedUsername);
      if (!isAvailable) {
        throw new Error('Username is already taken');
      }

      await updateDocument(COLLECTIONS.USERS, user.uid, { username: normalizedUsername });
      await fetchUserProfile(user.uid);
    },
    [user, fetchUserProfile, checkUsernameAvailable]
  );

  // Update email (requires re-authentication)
  const updateEmail = useCallback(
    async (newEmail: string, currentPassword: string) => {
      if (!user) throw new Error('No authenticated user');

      // Re-authenticate first
      await reauthenticate(currentPassword);

      // Update Firebase Auth email
      await changeEmail(newEmail);

      // Update Firestore profile
      await updateDocument(COLLECTIONS.USERS, user.uid, { email: newEmail.toLowerCase() });

      // Send new verification email
      await resendVerificationEmail();

      await fetchUserProfile(user.uid);
    },
    [user, fetchUserProfile, reauthenticate]
  );

  // Update password (requires re-authentication)
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error('No authenticated user');

      // Re-authenticate first
      await reauthenticate(currentPassword);

      // Update password
      await changePassword(newPassword);
    },
    [user, reauthenticate]
  );

  // Delete account (requires re-authentication)
  const deleteUserAccount = useCallback(
    async (currentPassword: string) => {
      if (!user) throw new Error('No authenticated user');

      // Re-authenticate first
      await reauthenticate(currentPassword);

      // Delete profile photo if exists
      if (userProfile?.profilePhotoUrl) {
        try {
          const path = getProfilePhotoPath(user.uid);
          await deleteFile(path);
        } catch {
          // Ignore if photo doesn't exist
        }
      }

      // Delete Firestore profile
      await deleteDocument(COLLECTIONS.USERS, user.uid);

      // Delete Firebase Auth account
      await deleteAccount();

      setUserProfile(null);
    },
    [user, userProfile, reauthenticate]
  );

  const value = useMemo(
    () => ({
      user,
      userProfile,
      isLoading,
      isAuthenticated,
      isEmailVerified,
      login,
      register,
      logout,
      sendPasswordReset,
      sendVerificationEmail,
      refreshUserProfile,
      updateProfile,
      updateProfilePhoto,
      updateEmail,
      updatePassword,
      updateUsername,
      deleteUserAccount,
      checkUsernameAvailable,
    }),
    [
      user,
      userProfile,
      isLoading,
      isAuthenticated,
      isEmailVerified,
      login,
      register,
      logout,
      sendPasswordReset,
      sendVerificationEmail,
      refreshUserProfile,
      updateProfile,
      updateProfilePhoto,
      updateEmail,
      updatePassword,
      updateUsername,
      deleteUserAccount,
      checkUsernameAvailable,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
