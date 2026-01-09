import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, Text, Button } from '@/components/ui';
import { type Timestamp } from 'firebase/firestore';

interface FriendRowProps {
  user: {
    id: string;
    username: string;
    fullName: string;
    profilePhotoUrl: string | null;
    lastSeen?: Timestamp | null;
  };
  onPress?: () => void;
  // For friend requests
  showActions?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  // For friends list
  onRemove?: () => void;
  onBlock?: () => void;
  // Loading state
  loading?: boolean;
  // Request direction (for showing appropriate buttons)
  requestDirection?: 'incoming' | 'outgoing';
}

// Check if user is online (lastSeen within 2 minutes)
function isOnline(lastSeen: Timestamp | null | undefined): boolean {
  if (!lastSeen) return false;
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return lastSeen.toMillis() > twoMinutesAgo;
}

// Format last seen time
function formatLastSeen(lastSeen: Timestamp | null | undefined): string {
  if (!lastSeen) return '';

  const now = Date.now();
  const lastSeenTime = lastSeen.toMillis();
  const diffMs = now - lastSeenTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 2) return 'Online';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return 'A while ago';
}

export function FriendRow({
  user,
  onPress,
  showActions = false,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
  loading = false,
  requestDirection,
}: FriendRowProps) {
  const { theme } = useTheme();
  const online = isOnline(user.lastSeen);

  return (
    <Pressable
      style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}
      onPress={onPress}
      disabled={!onPress || loading}
    >
      <View style={styles.avatarContainer}>
        <Avatar source={user.profilePhotoUrl} name={user.fullName} size="md" />
        {user.lastSeen !== undefined && (
          <View
            style={[styles.onlineIndicator, { backgroundColor: online ? theme.colors.pine : theme.colors.muted }]}
          />
        )}
      </View>

      <View style={styles.info}>
        <Text weight="medium">{user.fullName}</Text>
        <Text size="xs" color="muted">
          @{user.username}
          {user.lastSeen !== undefined && !online && ` · ${formatLastSeen(user.lastSeen)}`}
        </Text>
      </View>

      {showActions && (
        <View style={styles.actions}>
          {requestDirection === 'incoming' && (
            <>
              <Button title="DECLINE" variant="ghost" onPress={onDecline} disabled={loading} />
              <Button title="ACCEPT" variant="primary" onPress={onAccept} loading={loading} />
            </>
          )}
          {requestDirection === 'outgoing' && (
            <Button title="CANCEL" variant="ghost" onPress={onCancel} loading={loading} />
          )}
          {!requestDirection && onRemove && (
            <Button title="REMOVE" variant="ghost" onPress={onRemove} loading={loading} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
