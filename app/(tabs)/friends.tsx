import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, TextInput, Button, Modal, Avatar, PageHeader, Spacer } from '@/components/ui';
import { FriendRow } from '@/components/friends';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/errors';
import {
  getPendingRequests,
  getBlockedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  searchUserByUsername,
} from '@/services/friends';
import { type FriendWithProfile, type FriendRequest, type User } from '@/types';
import { useFriends } from '@/contexts/FriendsContext';

type TabType = 'friends' | 'requests' | 'blocked';

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { friends, refreshFriends, loading: friendsLoading } = useFriends();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Search
  const [friendSearch, setFriendSearch] = useState('');
  const [usernameSearch, setUsernameSearch] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  // Modals
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProfile | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [requests, blocked] = await Promise.all([getPendingRequests(user.uid), getBlockedUsers(user.uid)]);

      setIncomingRequests(requests.incoming);
      setOutgoingRequests(requests.outgoing);
      setBlockedUsers(blocked);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading friends data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = async () => {
    await Promise.all([refreshFriends(), loadData()]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Filter friends by search (fuzzy)
  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friends;
    const search = friendSearch.toLowerCase();
    return friends.filter(
      (f) => f.user.fullName.toLowerCase().includes(search) || f.user.username.toLowerCase().includes(search)
    );
  }, [friends, friendSearch]);

  // Search for new user
  const handleSearchUser = async () => {
    if (!user || !usernameSearch.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const result = await searchUserByUsername(usernameSearch, user.uid);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('User not found');
      }
    } catch (err) {
      setSearchError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  // Send friend request
  const handleSendRequest = async () => {
    if (!user || !searchResult) return;

    setActionLoading('send');
    try {
      await sendFriendRequest(user.uid, searchResult.id);
      Alert.alert('Success', 'Friend request sent!');
      setShowAddFriend(false);
      setUsernameSearch('');
      setSearchResult(null);
      await loadData(); // Only refresh requests, friends will update when accepted
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Accept request
  const handleAccept = async (requestId: string) => {
    if (!user) return;

    setActionLoading(requestId);
    try {
      await acceptFriendRequest(requestId, user.uid);
      await refreshData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Decline request
  const handleDecline = async (requestId: string) => {
    if (!user) return;

    setActionLoading(requestId);
    try {
      await declineFriendRequest(requestId, user.uid);
      await loadData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel request
  const handleCancel = async (requestId: string) => {
    if (!user) return;

    setActionLoading(requestId);
    try {
      await cancelFriendRequest(requestId, user.uid);
      await loadData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Remove friend
  const handleRemoveFriend = async () => {
    if (!user || !selectedFriend) return;

    setActionLoading(selectedFriend.friendshipId);
    try {
      await removeFriend(selectedFriend.friendshipId, user.uid);
      setSelectedFriend(null);
      await refreshData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Block user
  const handleBlockUser = async () => {
    if (!user || !selectedFriend) return;

    setActionLoading(selectedFriend.friendshipId);
    try {
      await blockUser(user.uid, selectedFriend.user.id);
      setSelectedFriend(null);
      await refreshData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Unblock user
  const handleUnblock = async (blockedId: string) => {
    if (!user) return;

    setActionLoading(blockedId);
    try {
      await unblockUser(user.uid, blockedId);
      await loadData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const requestCount = incomingRequests.length + outgoingRequests.length;

  return (
    <ScreenContainer padded={false}>
      <PageHeader
        title="Friends"
        rightElement={<Button title="ADD" variant="ghost" size="small" onPress={() => setShowAddFriend(true)} />}
        style={styles.header}
      />

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.colors.highlightLow }]}>
        <TabButton
          title="FRIENDS"
          count={friends.length}
          active={activeTab === 'friends'}
          onPress={() => setActiveTab('friends')}
        />
        <TabButton
          title="REQUESTS"
          count={requestCount}
          active={activeTab === 'requests'}
          onPress={() => setActiveTab('requests')}
        />
        <TabButton
          title="BLOCKED"
          count={blockedUsers.length}
          active={activeTab === 'blocked'}
          onPress={() => setActiveTab('blocked')}
        />
      </View>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Search friends..."
              value={friendSearch}
              onChangeText={setFriendSearch}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.friendshipId}
            renderItem={({ item }) => (
              <FriendRow
                user={item.user}
                onPress={() => router.push(`/user/${item.user.id}`)}
                onOptionsPress={() => setSelectedFriend(item)}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text color="muted">{loading || friendsLoading ? 'Loading...' : 'No friends yet'}</Text>
              </View>
            }
          />
        </>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <FlatList
          data={[
            ...incomingRequests.map((r) => ({ ...r, section: 'incoming' as const })),
            ...outgoingRequests.map((r) => ({ ...r, section: 'outgoing' as const })),
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRow
              user={item.user}
              showActions
              requestDirection={item.direction}
              loading={actionLoading === item.id}
              onAccept={() => handleAccept(item.id)}
              onDecline={() => handleDecline(item.id)}
              onCancel={() => handleCancel(item.id)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text color="muted">{loading ? 'Loading...' : 'No pending requests'}</Text>
            </View>
          }
        />
      )}

      {/* Blocked Tab */}
      {activeTab === 'blocked' && (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.blockedRow, { borderBottomColor: theme.colors.highlightLow }]}>
              <Avatar source={item.profilePhotoUrl} name={item.fullName} size="md" />
              <View style={styles.blockedInfo}>
                <Text weight="medium">{item.fullName}</Text>
                <Text size="xs" color="muted">
                  @{item.username}
                </Text>
              </View>
              <Button
                title="UNBLOCK"
                variant="ghost"
                onPress={() => handleUnblock(item.id)}
                loading={actionLoading === item.id}
              />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text color="muted">{loading ? 'Loading...' : 'No blocked users'}</Text>
            </View>
          }
        />
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriend}
        onClose={() => {
          setShowAddFriend(false);
          setUsernameSearch('');
          setSearchResult(null);
          setSearchError('');
        }}
        title="Add Friend"
      >
        <TextInput
          label="Username"
          placeholder="Enter exact username"
          value={usernameSearch}
          onChangeText={setUsernameSearch}
          autoCapitalize="none"
          error={searchError}
        />
        <Spacer size={12} />
        <Button title="SEARCH" variant="secondary" onPress={handleSearchUser} loading={searching} fullWidth />

        {searchResult && (
          <View style={[styles.searchResult, { borderColor: theme.colors.highlightMed }]}>
            <Avatar source={searchResult.profilePhotoUrl} name={searchResult.fullName} size="md" />
            <View style={styles.searchResultInfo}>
              <Text weight="medium">{searchResult.fullName}</Text>
              <Text size="xs" color="muted">
                @{searchResult.username}
              </Text>
            </View>
            <Button title="ADD" variant="primary" onPress={handleSendRequest} loading={actionLoading === 'send'} />
          </View>
        )}
      </Modal>

      {/* Friend Options Modal */}
      <Modal visible={!!selectedFriend} onClose={() => setSelectedFriend(null)} title="Friend Options">
        {selectedFriend && (
          <>
            <View style={styles.friendModalHeader}>
              <Avatar source={selectedFriend.user.profilePhotoUrl} name={selectedFriend.user.fullName} size="lg" />
              <Text size="lg" weight="semibold" style={styles.friendModalName}>
                {selectedFriend.user.fullName}
              </Text>
              <Text color="muted">@{selectedFriend.user.username}</Text>
            </View>
            <View style={styles.friendModalActions}>
              <Button
                title="REMOVE FRIEND"
                variant="secondary"
                onPress={handleRemoveFriend}
                loading={actionLoading === selectedFriend.friendshipId}
                fullWidth
              />
              <Button
                title="BLOCK USER"
                variant="error"
                onPress={handleBlockUser}
                loading={actionLoading === selectedFriend.friendshipId}
                fullWidth
              />
            </View>
          </>
        )}
      </Modal>
    </ScreenContainer>
  );
}

// Tab button component
function TabButton({
  title,
  count,
  active,
  onPress,
}: {
  title: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.tab, active && { borderBottomColor: theme.colors.gold, borderBottomWidth: 2 }]}
      onPress={onPress}
    >
      <Text size="sm" weight={active ? 'semibold' : 'normal'} color={active ? 'gold' : 'muted'}>
        {title} ({count})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  blockedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  friendModalName: {
    marginTop: 12,
  },
  friendModalActions: {
    gap: 12,
  },
});
