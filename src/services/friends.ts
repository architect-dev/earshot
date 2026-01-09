import {
  COLLECTIONS,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  subscribeToQuery,
  where,
  serverTimestamp,
} from './firebase';
import { type User, type Friendship, type Block, type FriendWithProfile, type FriendRequest } from '@/types';

const MAX_FRIENDS = 150;

// Generate friendship document ID (sorted UIDs for consistency)
function getFriendshipId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Generate block document ID
function getBlockId(blockerId: string, blockedId: string): string {
  return `${blockerId}_${blockedId}`;
}

/**
 * Check if two users are friends
 */
export async function areFriends(uid1: string, uid2: string): Promise<boolean> {
  const friendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [where('status', '==', 'accepted')]);

  return friendships.some(
    (f) => (f.requesterId === uid1 && f.addresseeId === uid2) || (f.requesterId === uid2 && f.addresseeId === uid1)
  );
}

/**
 * Check if a user is blocked by another user
 */
export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const block = await getDocument<Block>(COLLECTIONS.BLOCKS, getBlockId(blockerId, blockedId));
  return block !== null;
}

/**
 * Check if either user has blocked the other
 */
export async function isEitherBlocked(uid1: string, uid2: string): Promise<boolean> {
  const [blocked1, blocked2] = await Promise.all([isBlocked(uid1, uid2), isBlocked(uid2, uid1)]);
  return blocked1 || blocked2;
}

/**
 * Get user's current friend count
 */
export async function getFriendCount(userId: string): Promise<number> {
  const user = await getDocument<User>(COLLECTIONS.USERS, userId);
  return user?.friendCount ?? 0;
}

/**
 * Check if user can add more friends
 */
export async function canAddFriend(userId: string): Promise<boolean> {
  const count = await getFriendCount(userId);
  return count < MAX_FRIENDS;
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  // Validate not self
  if (requesterId === addresseeId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if blocked
  if (await isEitherBlocked(requesterId, addresseeId)) {
    throw new Error('Cannot send friend request to this user');
  }

  // Check friend limits
  const [canRequesterAdd, canAddresseeAdd] = await Promise.all([canAddFriend(requesterId), canAddFriend(addresseeId)]);

  if (!canRequesterAdd) {
    throw new Error('You have reached the maximum number of friends (150)');
  }

  if (!canAddresseeAdd) {
    throw new Error('This user has reached the maximum number of friends');
  }

  // Check if friendship already exists
  const existingFriendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [
    where('requesterId', 'in', [requesterId, addresseeId]),
  ]);

  const existing = existingFriendships.find(
    (f) =>
      (f.requesterId === requesterId && f.addresseeId === addresseeId) ||
      (f.requesterId === addresseeId && f.addresseeId === requesterId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('Already friends with this user');
    }
    if (existing.status === 'pending') {
      throw new Error('Friend request already pending');
    }
  }

  // Create friendship request
  const friendshipId = getFriendshipId(requesterId, addresseeId);
  await setDocument(COLLECTIONS.FRIENDSHIPS, friendshipId, {
    requesterId,
    addresseeId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId: string, currentUserId: string): Promise<void> {
  const friendship = await getDocument<Friendship>(COLLECTIONS.FRIENDSHIPS, friendshipId);

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  if (friendship.addresseeId !== currentUserId) {
    throw new Error('Cannot accept this friend request');
  }

  if (friendship.status !== 'pending') {
    throw new Error('Friend request is no longer pending');
  }

  // Check friend limits again
  const [canRequesterAdd, canAddresseeAdd] = await Promise.all([
    canAddFriend(friendship.requesterId),
    canAddFriend(friendship.addresseeId),
  ]);

  if (!canRequesterAdd || !canAddresseeAdd) {
    throw new Error('Friend limit reached');
  }

  // Update friendship status
  await updateDocument(COLLECTIONS.FRIENDSHIPS, friendshipId, { status: 'accepted' });

  // Increment friend counts for both users
  const requester = await getDocument<User>(COLLECTIONS.USERS, friendship.requesterId);
  const addressee = await getDocument<User>(COLLECTIONS.USERS, friendship.addresseeId);

  await Promise.all([
    updateDocument(COLLECTIONS.USERS, friendship.requesterId, {
      friendCount: (requester?.friendCount ?? 0) + 1,
    }),
    updateDocument(COLLECTIONS.USERS, friendship.addresseeId, {
      friendCount: (addressee?.friendCount ?? 0) + 1,
    }),
  ]);
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(friendshipId: string, currentUserId: string): Promise<void> {
  const friendship = await getDocument<Friendship>(COLLECTIONS.FRIENDSHIPS, friendshipId);

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  if (friendship.addresseeId !== currentUserId) {
    throw new Error('Cannot decline this friend request');
  }

  // Delete the friendship document
  await deleteDocument(COLLECTIONS.FRIENDSHIPS, friendshipId);
}

/**
 * Cancel an outgoing friend request
 */
export async function cancelFriendRequest(friendshipId: string, currentUserId: string): Promise<void> {
  const friendship = await getDocument<Friendship>(COLLECTIONS.FRIENDSHIPS, friendshipId);

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  if (friendship.requesterId !== currentUserId) {
    throw new Error('Cannot cancel this friend request');
  }

  if (friendship.status !== 'pending') {
    throw new Error('Friend request is no longer pending');
  }

  await deleteDocument(COLLECTIONS.FRIENDSHIPS, friendshipId);
}

/**
 * Remove a friend
 */
export async function removeFriend(friendshipId: string, currentUserId: string): Promise<void> {
  const friendship = await getDocument<Friendship>(COLLECTIONS.FRIENDSHIPS, friendshipId);

  if (!friendship) {
    throw new Error('Friendship not found');
  }

  if (friendship.requesterId !== currentUserId && friendship.addresseeId !== currentUserId) {
    throw new Error('Cannot remove this friendship');
  }

  if (friendship.status !== 'accepted') {
    throw new Error('Not currently friends');
  }

  // Delete friendship
  await deleteDocument(COLLECTIONS.FRIENDSHIPS, friendshipId);

  // Decrement friend counts
  const requester = await getDocument<User>(COLLECTIONS.USERS, friendship.requesterId);
  const addressee = await getDocument<User>(COLLECTIONS.USERS, friendship.addresseeId);

  await Promise.all([
    updateDocument(COLLECTIONS.USERS, friendship.requesterId, {
      friendCount: Math.max(0, (requester?.friendCount ?? 1) - 1),
    }),
    updateDocument(COLLECTIONS.USERS, friendship.addresseeId, {
      friendCount: Math.max(0, (addressee?.friendCount ?? 1) - 1),
    }),
  ]);
}

/**
 * Block a user
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  // Create block
  const blockId = getBlockId(blockerId, blockedId);
  await setDocument(COLLECTIONS.BLOCKS, blockId, {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });

  // Remove friendship if exists
  const friendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [where('status', '==', 'accepted')]);

  const existingFriendship = friendships.find(
    (f) =>
      (f.requesterId === blockerId && f.addresseeId === blockedId) ||
      (f.requesterId === blockedId && f.addresseeId === blockerId)
  );

  if (existingFriendship) {
    await removeFriend(existingFriendship.id, blockerId);
  }

  // Also remove any pending requests
  const pendingFriendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [
    where('status', '==', 'pending'),
  ]);

  const pendingRequest = pendingFriendships.find(
    (f) =>
      (f.requesterId === blockerId && f.addresseeId === blockedId) ||
      (f.requesterId === blockedId && f.addresseeId === blockerId)
  );

  if (pendingRequest) {
    await deleteDocument(COLLECTIONS.FRIENDSHIPS, pendingRequest.id);
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const blockId = getBlockId(blockerId, blockedId);
  await deleteDocument(COLLECTIONS.BLOCKS, blockId);
}

/**
 * Get list of friends for a user
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  // Get all accepted friendships where user is involved
  const friendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [where('status', '==', 'accepted')]);

  const userFriendships = friendships.filter((f) => f.requesterId === userId || f.addresseeId === userId);

  // Get friend profiles
  const friendsWithProfiles: FriendWithProfile[] = [];

  for (const friendship of userFriendships) {
    const friendId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
    const friend = await getDocument<User>(COLLECTIONS.USERS, friendId);

    if (friend) {
      friendsWithProfiles.push({
        friendshipId: friendship.id,
        user: {
          id: friend.id,
          username: friend.username,
          fullName: friend.fullName,
          profilePhotoUrl: friend.profilePhotoUrl,
          lastSeen: friend.lastSeen,
        },
        friendsSince: friendship.updatedAt || friendship.createdAt,
      });
    }
  }

  return friendsWithProfiles;
}

/**
 * Get pending friend requests (incoming and outgoing)
 */
export async function getPendingRequests(userId: string): Promise<{
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const friendships = await queryDocuments<Friendship>(COLLECTIONS.FRIENDSHIPS, [where('status', '==', 'pending')]);

  const userRequests = friendships.filter((f) => f.requesterId === userId || f.addresseeId === userId);

  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];

  for (const request of userRequests) {
    const isIncoming = request.addresseeId === userId;
    const otherUserId = isIncoming ? request.requesterId : request.addresseeId;
    const otherUser = await getDocument<User>(COLLECTIONS.USERS, otherUserId);

    if (otherUser) {
      const friendRequest: FriendRequest = {
        id: request.id,
        user: {
          id: otherUser.id,
          username: otherUser.username,
          fullName: otherUser.fullName,
          profilePhotoUrl: otherUser.profilePhotoUrl,
        },
        createdAt: request.createdAt,
        direction: isIncoming ? 'incoming' : 'outgoing',
      };

      if (isIncoming) {
        incoming.push(friendRequest);
      } else {
        outgoing.push(friendRequest);
      }
    }
  }

  return { incoming, outgoing };
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(blockerId: string): Promise<User[]> {
  const blocks = await queryDocuments<Block>(COLLECTIONS.BLOCKS, [where('blockerId', '==', blockerId)]);

  const blockedUsers: User[] = [];
  for (const block of blocks) {
    const user = await getDocument<User>(COLLECTIONS.USERS, block.blockedId);
    if (user) {
      blockedUsers.push(user);
    }
  }

  return blockedUsers;
}

/**
 * Search for a user by exact username
 */
export async function searchUserByUsername(username: string, currentUserId: string): Promise<User | null> {
  const normalizedUsername = username.toLowerCase().replace('@', '');

  const users = await queryDocuments<User>(COLLECTIONS.USERS, [where('username', '==', normalizedUsername)]);

  if (users.length === 0) return null;

  const user = users[0];

  // Don't return if it's the current user
  if (user.id === currentUserId) return null;

  // Don't return if blocked
  if (await isEitherBlocked(currentUserId, user.id)) return null;

  return user;
}

/**
 * Subscribe to friends list updates
 */
export function subscribeToFriendships(userId: string, callback: (friendships: Friendship[]) => void) {
  return subscribeToQuery<Friendship>(COLLECTIONS.FRIENDSHIPS, [where('status', '==', 'accepted')], (friendships) => {
    const userFriendships = friendships.filter((f) => f.requesterId === userId || f.addresseeId === userId);
    callback(userFriendships);
  });
}
