import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, Text, Button } from '@/components/ui';
import { Profile } from '@/types';
import { LastSeenText } from '../ui/LastSeenText';

interface FriendRowProps {
  user: Profile;
  onPress?: () => void;
  // For friend requests
  showActions?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  // For friends list
  onRemove?: () => void;
  onBlock?: () => void;
  onOptionsPress?: () => void; // Three dots button for user management
  // Loading state
  loading?: boolean;
  // Request direction (for showing appropriate buttons)
  requestDirection?: 'incoming' | 'outgoing';
}

export function FriendRow({
  user,
  onPress,
  showActions = false,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
  onOptionsPress,
  loading = false,
  requestDirection,
}: FriendRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.container, { borderBottomColor: theme.colors.highlightLow }]}
      onPress={onPress}
      disabled={!onPress || loading}
    >
      <Avatar profile={user} size="md" />

      <View style={styles.info}>
        <Text weight="medium">{user.fullName}</Text>
        <Text size="xs" color="muted">
          @{user.username}
        </Text>
        <LastSeenText lastSeen={user.lastSeen} size="xs" color="muted" />
      </View>

      {onOptionsPress && !showActions && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onOptionsPress();
          }}
          style={styles.optionsButton}
          hitSlop={8}
        >
          <FontAwesome6 name="ellipsis" size={16} color={theme.colors.muted} />
        </Pressable>
      )}

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
  optionsButton: {
    padding: 8,
    marginLeft: 8,
  },
});
