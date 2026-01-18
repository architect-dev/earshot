import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { type Timestamp } from 'firebase/firestore';
import { subscribeToDocument, COLLECTIONS, getDocument } from '@/services/firebase/firestore';
import { type User } from '@/types';
import { getLastSeenString } from '@/utils/lastSeen';
import { useIsForeground } from '@/hooks/useAppState';
import { updateLastSeen } from '@/services/users';
import { useAuth } from './AuthContext';
import { useFriends } from './FriendsContext';

interface PresenceContextValue {
  lastSeen: Map<string, Timestamp | null>;
  getLastSeen: (userId: string) => Timestamp | null;
  isOnline: (userId: string) => boolean;
  loading: boolean;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

interface PresenceProviderProps {
  children: ReactNode;
}

/**
 * Hook to manage lastSeen heartbeat updates
 * Updates the current user's lastSeen timestamp every 60 seconds when app is active
 */
function useLastSeenHeartbeat() {
  const { user } = useAuth();
  const isForeground = useIsForeground();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || !isForeground) {
      // Clear interval if user logs out or app goes to background
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Start heartbeat when app is active and user is logged in
    heartbeatIntervalRef.current = setInterval(() => {
      updateLastSeen(user.uid).catch((err) => {
        // Silently fail - presence updates are non-critical
        // eslint-disable-next-line no-console
        console.error('Error updating lastSeen:', err);
      });
    }, 60000); // 60 seconds

    // Update immediately on mount/foreground
    updateLastSeen(user.uid).catch(() => {
      // Silently fail
    });

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [user, isForeground]);
}

export function PresenceProvider({ children }: PresenceProviderProps) {
  const { user } = useAuth();
  const { friendIds, loading: friendsLoading } = useFriends();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, Timestamp | null>>(new Map());
  const [loading, setLoading] = useState(true);

  // Track subscriptions for cleanup
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const updateQueueRef = useRef<Map<string, Timestamp | null>>(new Map());
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manage lastSeen heartbeat for current user
  useLastSeenHeartbeat();

  // Load initial presence data for all friends
  const loadInitialPresence = useCallback(async (friendIdsToLoad: string[]) => {
    if (friendIdsToLoad.length === 0) {
      setLastSeenMap(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch user documents directly by ID (can't query by id field)
      // Fetch all in parallel
      const promises = friendIdsToLoad.map((friendId) => getDocument<User>(COLLECTIONS.USERS, friendId));
      const results = await Promise.all(promises);

      // Extract lastSeen from all results
      const initialMap = new Map<string, Timestamp | null>();
      results.forEach((user, index) => {
        const friendId = friendIdsToLoad[index];
        initialMap.set(friendId, user?.lastSeen ?? null);
      });

      setLastSeenMap(initialMap);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading initial presence:', err);
      setLastSeenMap(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  // Queue lastSeen update with throttling
  const queueLastSeenUpdate = useCallback((friendId: string, lastSeen: Timestamp | null) => {
    updateQueueRef.current.set(friendId, lastSeen);

    // If there's already a pending update, don't create another timeout
    if (updateTimeoutRef.current) return;

    // Batch updates every 10 seconds
    updateTimeoutRef.current = setTimeout(() => {
      setLastSeenMap((prev) => {
        const newMap = new Map(prev);
        let hasChanges = false;

        updateQueueRef.current.forEach((lastSeen, friendId) => {
          const current = prev.get(friendId);

          // Only update if actually changed
          if (current?.seconds !== lastSeen?.seconds || current?.nanoseconds !== lastSeen?.nanoseconds) {
            newMap.set(friendId, lastSeen);
            hasChanges = true;
          }
        });

        updateQueueRef.current.clear();
        updateTimeoutRef.current = null;

        // Only return new map if there were changes
        return hasChanges ? newMap : prev;
      });
    }, 10000); // Update UI every 10 seconds
  }, []);

  // Subscribe to a single friend's presence
  const subscribeToFriendPresence = useCallback(
    (friendId: string) => {
      const unsubscribe = subscribeToDocument<User>(COLLECTIONS.USERS, friendId, (user) => {
        const newLastSeen = user?.lastSeen ?? null;
        queueLastSeenUpdate(friendId, newLastSeen);
      });

      subscriptionsRef.current.set(friendId, unsubscribe);
    },
    [queueLastSeenUpdate]
  );

  // Load initial presence when friends are loaded
  useEffect(() => {
    if (friendsLoading || !user) {
      return;
    }

    if (friendIds.length === 0) {
      setLastSeenMap(new Map());
      setLoading(false);
      return;
    }

    loadInitialPresence(friendIds);
  }, [friendIds, friendsLoading, user, loadInitialPresence]);

  // Cleanup helper function
  const cleanupSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    subscriptionsRef.current.clear();
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, []);

  // Subscribe to real-time updates when friendIds change
  useEffect(() => {
    if (!user || friendIds.length === 0) {
      cleanupSubscriptions();
      return;
    }

    const currentSubscriptions = subscriptionsRef.current;

    // Subscribe to new friends
    friendIds.forEach((friendId) => {
      if (!currentSubscriptions.has(friendId)) {
        subscribeToFriendPresence(friendId);
      }
    });

    // Unsubscribe from removed friends
    currentSubscriptions.forEach((unsubscribe, friendId) => {
      if (!friendIds.includes(friendId)) {
        unsubscribe();
        currentSubscriptions.delete(friendId);
      }
    });

    // Cleanup function
    return cleanupSubscriptions;
  }, [friendIds, user, subscribeToFriendPresence, cleanupSubscriptions]);

  // Get lastSeen for a user
  const getLastSeen = useCallback(
    (userId: string): Timestamp | null => {
      return lastSeenMap.get(userId) ?? null;
    },
    [lastSeenMap]
  );

  // Check if user is online (lastSeen within 2 minutes)
  const isOnline = useCallback(
    (userId: string): boolean => {
      const lastSeen = lastSeenMap.get(userId);
      if (!lastSeen) return false;

      const now = Math.round(Date.now() / 1000);
      const lastSeenTime = lastSeen.seconds;
      const diff = now - lastSeenTime;

      return diff < 120; // 2 minutes
    },
    [lastSeenMap]
  );

  const value: PresenceContextValue = {
    lastSeen: lastSeenMap,
    getLastSeen,
    isOnline,
    loading: loading || friendsLoading,
  };

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceContextValue {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}

/**
 * Hook to check if a user is online based on their lastSeen timestamp.
 * Uses PresenceContext for real-time updates.
 * @param userId - The user ID to check online status for
 * @returns boolean indicating if the user is online (lastSeen within 2 minutes)
 */
export function useIsOnline(userId: string | null | undefined): boolean {
  const { isOnline: isOnlineFn } = usePresence();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    // Check immediately
    setIsOnline(isOnlineFn(userId));

    // Update every 10 seconds to handle stale data
    const interval = setInterval(() => {
      setIsOnline(isOnlineFn(userId));
    }, 10000);

    return () => clearInterval(interval);
  }, [userId, isOnlineFn]);

  return isOnline;
}

/**
 * Hook to get a formatted "last seen" string for a user.
 * Uses PresenceContext for real-time updates.
 * @param userId - The user ID to get last seen string for
 * @returns Formatted string like "2 minutes ago" or empty string if not available
 */
export function useLastSeenString(userId: string | null | undefined): string {
  const { getLastSeen } = usePresence();
  const [lastSeenString, setLastSeenString] = useState('');

  useEffect(() => {
    if (!userId) {
      setLastSeenString('');
      return;
    }

    const lastSeen = getLastSeen(userId);
    if (!lastSeen) {
      setLastSeenString('');
      return;
    }

    // Update immediately
    setLastSeenString(getLastSeenString(lastSeen));

    // Update every 10 seconds to handle relative time changes
    const interval = setInterval(() => {
      const currentLastSeen = getLastSeen(userId);
      if (currentLastSeen) {
        setLastSeenString(getLastSeenString(currentLastSeen));
      } else {
        setLastSeenString('');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [userId, getLastSeen]);

  return lastSeenString;
}
