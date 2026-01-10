import { useState, useEffect, useCallback, useRef } from 'react';
import { type DocumentSnapshot } from 'firebase/firestore';
import { getFeedPosts } from '@/services/posts';
import { type GetProfileByIdFn } from '@/types/profile';
import { type PostWithAuthor } from '@/types';

const PAGE_SIZE = 20;

interface UseFeedPostsOptions {
  userIds: string[];
  getProfileById: GetProfileByIdFn;
  enabled?: boolean; // Whether to load posts automatically
}

interface UseFeedPostsResult {
  posts: PostWithAuthor[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Reusable hook for loading feed posts from a list of user IDs
 * Handles pagination, cursor management, and loading states
 */
export function useFeedPosts({ userIds, getProfileById, enabled = true }: UseFeedPostsOptions): UseFeedPostsResult {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Store cursor for pagination
  const cursorRef = useRef<DocumentSnapshot | null>(null);
  // Track the userIds that were used for the cursor
  // If userIds changes, the cursor is invalid and must be reset
  const cursorUserIdsRef = useRef<string[]>([]);

  const loadPosts = useCallback(
    async (isRefresh = false) => {
      if (userIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      try {
        setError(null);

        // Reset cursor if userIds changed (cursor is query-specific)
        const currentIds = [...userIds].sort().join(',');
        const cursorIds = [...cursorUserIdsRef.current].sort().join(',');
        if (currentIds !== cursorIds) {
          cursorRef.current = null;
          cursorUserIdsRef.current = userIds;
        }

        // Reset cursor on refresh
        if (isRefresh) {
          cursorRef.current = null;
        }

        // loadPosts should ALWAYS use null cursor (initial load/refresh)
        // Only loadMore should use the cursor for pagination
        const result = await getFeedPosts(userIds, getProfileById, PAGE_SIZE, null);

        setPosts(result.posts);
        cursorRef.current = result.cursor;
        cursorUserIdsRef.current = userIds; // Update tracked IDs
        setHasMore(result.hasMore);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load posts');
        setError(error);
        // eslint-disable-next-line no-console
        console.error('Error loading feed:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userIds, getProfileById]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current || userIds.length === 0) return;

    // Verify cursor is still valid for current userIds
    const currentIds = [...userIds].sort().join(',');
    const cursorIds = [...cursorUserIdsRef.current].sort().join(',');
    if (currentIds !== cursorIds) {
      // User IDs changed, can't use old cursor
      setLoadingMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      setError(null);

      const result = await getFeedPosts(userIds, getProfileById, PAGE_SIZE, cursorRef.current);

      setPosts((prev) => [...prev, ...result.posts]);
      cursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more posts');
      setError(error);
      // eslint-disable-next-line no-console
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [userIds, getProfileById, loadingMore, hasMore]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(true);
  }, [loadPosts]);

  // Load posts when enabled and userIds change
  // Don't depend on loadPosts - it changes when getProfileById changes
  // Instead, depend on the actual values and call loadPosts inside
  useEffect(() => {
    if (enabled && userIds.length > 0) {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userIds.join(',')]); // Use stringified userIds to avoid array reference issues

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}
