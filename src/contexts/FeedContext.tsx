import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  type DocumentSnapshot,
  type Timestamp,
  orderBy,
  limit,
  startAfter,
  getDocs,
  query,
  collection,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { subscribeToQuery } from '@/services/firebase/firestore';
import { type FeedItem } from '@/types/feed';
import { type PostWithAuthor } from '@/types/post';
import { type GetProfileByIdFn } from '@/types/profile';

// Paginated query result
interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}
import { useAuth } from './AuthContext';
import { useFriends } from './FriendsContext';

// Feed data structure
interface FeedData {
  posts: PostWithAuthor[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
  lastSeenAt: Timestamp | null; // Timestamp of the most recent post when user was at top
  newPosts: PostWithAuthor[]; // New posts that arrived via subscription (not yet viewed)
}

interface FeedContextValue {
  // Main feed data
  posts: PostWithAuthor[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadingMore: boolean;
  // New posts tracking
  newPosts: PostWithAuthor[];
  unseenPostsCount: number;
  // Methods
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  viewNewPosts: () => void; // Merge newPosts into posts
}

const FeedContext = createContext<FeedContextValue | undefined>(undefined);

interface FeedProviderProps {
  children: ReactNode;
}

const HEAD_SIZE = 50; // Real-time subscription limit
const PAGE_SIZE = 20; // Pagination page size

/**
 * Convert FeedItem to PostWithAuthor by enriching with author profile
 */
function enrichFeedItem(feedItem: FeedItem, getProfileById: GetProfileByIdFn): PostWithAuthor | null {
  const author = getProfileById(feedItem.authorId);
  if (!author) return null;

  // Remove FeedItem-specific fields to get Post
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { expireAt, ...post } = feedItem;

  return {
    ...post,
    author,
  };
}

export function FeedProvider({ children }: FeedProviderProps) {
  const { user } = useAuth();
  const { loading: friendsLoading, getProfileById } = useFriends();
  const [feedData, setFeedData] = useState<FeedData>({
    posts: [],
    cursor: null,
    hasMore: true,
    lastSeenAt: null,
    newPosts: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track subscriptions for cleanup
  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const isInitialSnapshotRef = useRef(true);

  // Keep refs in sync for use in subscription callbacks
  const getProfileByIdRef = useRef(getProfileById);
  useEffect(() => {
    getProfileByIdRef.current = getProfileById;
  }, [getProfileById]);

  /**
   * Load feed head (real-time subscription)
   */
  const subscribeToFeedHead = useCallback(() => {
    if (!user || friendsLoading) return;

    // Track if this is the initial snapshot
    isInitialSnapshotRef.current = true;

    // Use subscribeToQuery with subcollection path array
    const unsubscribe = subscribeToQuery<FeedItem>(
      ['feeds', user.uid, 'items'],
      [orderBy('createdAt', 'desc'), limit(HEAD_SIZE)],
      (feedItems) => {
        // Skip initial snapshot - we'll load it via refresh
        if (isInitialSnapshotRef.current) {
          isInitialSnapshotRef.current = false;
          return;
        }

        // Enrich feed items with author profiles
        const enrichedPosts = feedItems
          .map((item) => enrichFeedItem(item, getProfileByIdRef.current))
          .filter((post): post is PostWithAuthor => post !== null);

        // Update feed data
        setFeedData((prev) => {
          // Check for duplicates in both posts and newPosts
          const existingPostIds = new Set([...prev.posts.map((p) => p.id), ...prev.newPosts.map((p) => p.id)]);
          const trulyNewPosts = enrichedPosts.filter((p) => !existingPostIds.has(p.id));

          // Add new posts to newPosts list (not to posts)
          const updatedNewPosts = [...prev.newPosts, ...trulyNewPosts].sort(
            (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
          );

          return {
            ...prev,
            newPosts: updatedNewPosts,
          };
        });
      }
    );

    feedUnsubscribeRef.current = unsubscribe;
  }, [user, friendsLoading]);

  /**
   * Load initial feed data (head + first page of tail)
   */
  const loadInitialFeed = useCallback(async () => {
    if (!user || friendsLoading) return;

    setLoading(true);
    setError(null);

    try {
      // Construct subcollection reference: feeds/{userId}/items
      const itemsRef = collection(db, 'feeds', user.uid, 'items');
      const headQuery = query(itemsRef, orderBy('createdAt', 'desc'), limit(HEAD_SIZE));
      const headSnapshot = await getDocs(headQuery);

      const headData = headSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FeedItem[];

      const headResult: PaginatedResult<FeedItem> = {
        data: headData,
        lastDoc: headSnapshot.docs.length > 0 ? headSnapshot.docs[headSnapshot.docs.length - 1] : null,
        hasMore: headSnapshot.docs.length === HEAD_SIZE,
      };

      // Enrich with author profiles
      const enrichedHeadPosts = headResult.data
        .map((item: FeedItem) => enrichFeedItem(item, getProfileById))
        .filter((post: PostWithAuthor | null): post is PostWithAuthor => post !== null);

      // Set initial lastSeenAt to most recent post
      const initialLastSeenAt = enrichedHeadPosts.length > 0 ? enrichedHeadPosts[0].createdAt : null;

      setFeedData({
        posts: enrichedHeadPosts,
        cursor: headResult.lastDoc,
        hasMore: headResult.hasMore,
        lastSeenAt: initialLastSeenAt,
        newPosts: [],
      });

      // Start real-time subscription for head
      subscribeToFeedHead();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load feed'));
      // eslint-disable-next-line no-console
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, friendsLoading, getProfileById, subscribeToFeedHead]);

  /**
   * Load more posts (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !feedData.hasMore || !feedData.cursor) return;

    setLoadingMore(true);
    setError(null);

    try {
      // Construct subcollection reference: feeds/{userId}/items
      const itemsRef = collection(db, 'feeds', user.uid, 'items');
      const constraints = feedData.cursor
        ? [orderBy('createdAt', 'desc'), startAfter(feedData.cursor), limit(PAGE_SIZE)]
        : [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];
      const tailQuery = query(itemsRef, ...constraints);
      const tailSnapshot = await getDocs(tailQuery);

      const tailData = tailSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FeedItem[];

      const result: PaginatedResult<FeedItem> = {
        data: tailData,
        lastDoc: tailSnapshot.docs.length > 0 ? tailSnapshot.docs[tailSnapshot.docs.length - 1] : null,
        hasMore: tailSnapshot.docs.length === PAGE_SIZE,
      };

      // Enrich with author profiles
      const enrichedPosts = result.data
        .map((item: FeedItem) => enrichFeedItem(item, getProfileById))
        .filter((post: PostWithAuthor | null): post is PostWithAuthor => post !== null);

      // Merge with existing posts (avoid duplicates)
      const existingPostIds = new Set(feedData.posts.map((p) => p.id));
      const newPosts = enrichedPosts.filter((p: PostWithAuthor) => !existingPostIds.has(p.id));

      setFeedData((prev) => ({
        ...prev,
        posts: [...prev.posts, ...newPosts],
        cursor: result.lastDoc,
        hasMore: result.hasMore,
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more posts'));
      // eslint-disable-next-line no-console
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, feedData.hasMore, feedData.cursor, feedData.posts, getProfileById]);

  /**
   * Refresh feed (reload from beginning)
   */
  const refresh = useCallback(async () => {
    // Unsubscribe from current subscription
    if (feedUnsubscribeRef.current) {
      feedUnsubscribeRef.current();
      feedUnsubscribeRef.current = null;
    }

    // Reset state and reload
    setFeedData({
      posts: [],
      cursor: null,
      hasMore: true,
      lastSeenAt: null,
      newPosts: [],
    });

    await loadInitialFeed();
  }, [loadInitialFeed]);

  /**
   * Merge newPosts into posts (when user clicks "N new posts" banner)
   */
  const viewNewPosts = useCallback(() => {
    setFeedData((prev) => {
      if (prev.newPosts.length === 0) {
        return prev;
      }

      // Merge newPosts into posts and sort by createdAt desc
      const allPosts = [...prev.newPosts, ...prev.posts].sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      );

      // Update lastSeenAt to most recent post
      const newLastSeenAt = allPosts.length > 0 ? allPosts[0].createdAt : prev.lastSeenAt;

      return {
        ...prev,
        posts: allPosts.slice(0, HEAD_SIZE), // Keep only HEAD_SIZE most recent
        newPosts: [], // Clear newPosts after merging
        lastSeenAt: newLastSeenAt,
      };
    });
  }, []);

  // Load initial feed when user and friends are ready
  useEffect(() => {
    if (!user || friendsLoading) {
      setLoading(true);
      return;
    }

    loadInitialFeed();

    // Cleanup subscription on unmount
    return () => {
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current();
        feedUnsubscribeRef.current = null;
      }
    };
  }, [user, friendsLoading, loadInitialFeed]);

  const value: FeedContextValue = {
    posts: feedData.posts,
    loading,
    error,
    hasMore: feedData.hasMore,
    loadingMore,
    newPosts: feedData.newPosts,
    unseenPostsCount: feedData.newPosts.length,
    loadMore,
    refresh,
    viewNewPosts,
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed(): FeedContextValue {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
}
