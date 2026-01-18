import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { getFriends } from '@/services/friends';
import { type FriendWithProfile } from '@/types';
import { type GetProfileByIdFn, type Profile } from '@/types/profile';
import { useAuth } from './AuthContext';

interface FriendsContextValue {
  friends: FriendWithProfile[];
  friendIds: string[];
  loading: boolean;
  error: Error | null;
  refreshFriends: () => Promise<void>;
  getFriendById: (userId: string) => FriendWithProfile | undefined;
  getProfileById: GetProfileByIdFn;
  areFriends: (userId1: string, userId2: string) => boolean;
}

const FriendsContext = createContext<FriendsContextValue | undefined>(undefined);

interface FriendsProviderProps {
  children: ReactNode;
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const { user, userProfile } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const friendsList = await getFriends(user.uid);
      setFriends(friendsList);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load friends'));
      // eslint-disable-next-line no-console
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load friends when user changes
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Get friend by user ID
  const getFriendById = useCallback(
    (userId: string): FriendWithProfile | undefined => {
      return friends.find((f) => f.user.id === userId);
    },
    [friends]
  );

  // Get profile by user ID (includes current user)
  const getProfileById = useCallback(
    (userId: string): Profile | undefined => {
      if (userProfile != null && userId === userProfile.id) {
        // Convert User to Profile (exclude lastSeen and other User-only fields)
        return {
          id: userProfile.id,
          username: userProfile.username,
          fullName: userProfile.fullName,
          profilePhotoUrl: userProfile.profilePhotoUrl,
        };
      }
      return friends.find((f) => f.user.id === userId)?.user;
    },
    [friends, userProfile]
  );

  // Check if two users are friends (using cached data)
  // Note: This context only has the current user's friends, so we can only check
  // if the current user is friends with userId2. For general areFriends checks,
  // the service function should still be used (it will be optimized later).
  const areFriends = useCallback(
    (userId1: string, userId2: string): boolean => {
      // If checking if current user is friends with userId2
      if (user?.uid === userId1) {
        return friends.some((f) => f.user.id === userId2);
      }
      // If checking if current user is friends with userId1
      if (user?.uid === userId2) {
        return friends.some((f) => f.user.id === userId1);
      }
      // For other cases, we don't have the data cached
      // This is a limitation - we'd need to check both users' friend lists
      return false;
    },
    [friends, user]
  );

  // Derive friendIds from friends list
  const friendIds = useMemo(() => {
    return friends.map((f) => f.user.id);
  }, [friends]);

  const value: FriendsContextValue = {
    friends,
    friendIds,
    loading,
    error,
    refreshFriends: loadFriends,
    getFriendById,
    getProfileById,
    areFriends,
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
}
