import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, signIn, signUp, signOut, resetPassword, resendVerificationEmail } from '@/services/firebase';
import { COLLECTIONS, getDocument, setDocument, serverTimestamp } from '@/services/firebase';
import { type User, type CreateUserData } from '@/types';

interface AuthContextValue {
  // State
  user: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: CreateUserData) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
