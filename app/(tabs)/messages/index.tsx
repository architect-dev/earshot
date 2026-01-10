import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Text, PageHeader, Modal, Button, TextInput } from '@/components/ui';
import { ConversationRow } from '@/components/messages';
import { FriendRow } from '@/components/friends';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserConversations, findOrCreateDM } from '@/services/conversations';
import { getLastMessage } from '@/services/messages';
import { getDocument } from '@/services/firebase/firestore';
import { COLLECTIONS } from '@/services/firebase/firestore';
import { getFriends } from '@/services/friends';
import { type Conversation, type Message, type User } from '@/types';
import { type FriendWithProfile } from '@/types';

interface ConversationWithData extends Conversation {
  otherUser?: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
  };
  lastMessage?: Message | null;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New conversation modal
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingDM, setCreatingDM] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get all conversations for the user
      const userConversations = await getUserConversations(user.uid);

      // Enrich conversations with last message and other user data
      const enrichedConversations: ConversationWithData[] = await Promise.all(
        userConversations.map(async (conv) => {
          const enriched: ConversationWithData = { ...conv };

          // Get last message for preview
          const lastMsg = await getLastMessage(conv.id);
          enriched.lastMessage = lastMsg;

          // For DMs, get the other user's profile
          if (conv.type === 'dm' && conv.participants.length === 2) {
            const otherUserId = conv.participants.find((id) => id !== user.uid);
            if (otherUserId) {
              const otherUser = await getDocument<User>(COLLECTIONS.USERS, otherUserId);
              if (otherUser) {
                enriched.otherUser = {
                  id: otherUser.id,
                  username: otherUser.username,
                  fullName: otherUser.fullName,
                  profilePhotoUrl: otherUser.profilePhotoUrl,
                };
              }
            }
          }

          return enriched;
        })
      );

      setConversations(enrichedConversations);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load friends when modal opens
  const loadFriends = useCallback(async () => {
    if (!user) return;

    setLoadingFriends(true);
    try {
      const friendsList = await getFriends(user.uid);
      setFriends(friendsList);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    if (showNewConversation) {
      loadFriends();
    }
  }, [showNewConversation, loadFriends]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversationId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/messages/${conversationId}` as any);
  };

  // Sort conversations by lastMessageAt (most recent first)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
    });
  }, [conversations]);

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
      // Reload conversations to get the new one
      await loadConversations();
      // Navigate to the conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/messages/${conversation.id}` as any);
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
        data={sortedConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            otherUser={item.otherUser}
            lastMessage={item.lastMessage}
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

          {loadingFriends ? (
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
