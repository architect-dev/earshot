import { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, PageHeader, Modal, Button, TextInput } from '@/components/ui';
import { ConversationRow } from '@/components/messages';
import { FriendRow } from '@/components/friends';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useConversations } from '@/contexts/ConversationsContext';
import { useFriends } from '@/contexts/FriendsContext';
import { findOrCreateDM } from '@/services/conversations';
import { type FriendWithProfile } from '@/types';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { conversations, loading, refreshConversations } = useConversations();
  const { friends, loading: friendsLoading } = useFriends();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  // New conversation modal
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingDM, setCreatingDM] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversationId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/messages/${conversationId}` as any);
  };

  // Filter friends by search query (fuzzy)
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const search = searchQuery.toLowerCase();
    return friends.filter(
      (f) => f.user.fullName.toLowerCase().includes(search) || f.user.username.toLowerCase().includes(search)
    );
  }, [friends, searchQuery]);

  // Handle friend selection - find or create DM
  const handleFriendSelect = async (friend: FriendWithProfile) => {
    if (!user || creatingDM) return;

    setCreatingDM(true);
    try {
      const conversation = await findOrCreateDM(user.uid, friend.user.id);
      setShowNewConversation(false);
      setSearchQuery('');
      // Refresh conversations to get the new one
      await refreshConversations();
      // Navigate to the conversation
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error creating/finding DM:', err);
      Alert.alert('Error', 'Failed to open conversation');
    } finally {
      setCreatingDM(false);
    }
  };

  // Handle create group button
  const handleCreateGroup = () => {
    Alert.alert('Create Group', 'Group chat creation coming soon!');
  };

  return (
    <ScreenContainer padded={false}>
      <PageHeader
        icon=")("
        title="Talk"
        rightElement={<Button title="NEW" variant="ghost" size="small" onPress={() => setShowNewConversation(true)} />}
        style={styles.header}
      />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            currentUserId={user?.uid || ''}
            onPress={() => handleConversationPress(item.id)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text color="muted">{loading ? 'Loading...' : 'No conversations yet'}</Text>
          </View>
        }
      />

      {/* New Conversation Modal */}
      <Modal
        visible={showNewConversation}
        onClose={() => {
          setShowNewConversation(false);
          setSearchQuery('');
        }}
        title="New Conversation"
      >
        <View style={styles.modalContent}>
          <TextInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoFocus
          />

          <View style={[styles.createGroupButton, { borderTopColor: theme.colors.highlightLow }]}>
            <Button title="CREATE GROUP" variant="ghost" onPress={handleCreateGroup} />
          </View>

          {friendsLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="muted">Loading friends...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => item.friendshipId}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleFriendSelect(item)} disabled={creatingDM}>
                  <FriendRow user={item.user} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyFriends}>
                  <Text color="muted">{searchQuery.trim() ? 'No friends found' : 'No friends yet'}</Text>
                </View>
              }
              style={styles.friendsList}
            />
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  modalContent: {
    maxHeight: 500,
  },
  createGroupButton: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'transparent', // Will be set dynamically
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  friendsList: {
    maxHeight: 400,
    marginTop: 8,
  },
  emptyFriends: {
    padding: 20,
    alignItems: 'center',
  },
});
