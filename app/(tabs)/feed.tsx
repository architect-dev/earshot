import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ScreenContainer, Text, ConfirmModal } from '@/components/ui';
import { DebugMenu, useDoubleTap, getDefaultDebugItems, setConfirmModalOpener } from '@/components/debug';

export default function FeedScreen() {
  const [debugMenuVisible, setDebugMenuVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Wire up the confirm modal opener for debug menu
  useEffect(() => {
    if (__DEV__) {
      setConfirmModalOpener(() => setConfirmModalVisible(true));
    }
  }, []);

  const handleDoubleTap = useDoubleTap({
    onDoubleTap: () => {
      if (__DEV__) {
        setDebugMenuVisible(true);
      }
    },
  });

  return (
    <ScreenContainer>
      <Pressable onPress={handleDoubleTap}>
        <View style={styles.header}>
          <Text size="lg" weight="bold" color="gold">
            ))
          </Text>
          <Text size="lg" weight="semibold">
            {' '}
            Feed
          </Text>
        </View>
      </Pressable>
      <View style={styles.content}>
        <Text color="subtle" align="center">
          Your friends' posts will appear here
        </Text>
      </View>

      {__DEV__ && (
        <>
          <DebugMenu
            visible={debugMenuVisible}
            onClose={() => setDebugMenuVisible(false)}
            items={getDefaultDebugItems()}
          />
          <ConfirmModal
            visible={confirmModalVisible}
            onClose={() => setConfirmModalVisible(false)}
            onConfirm={() => setConfirmModalVisible(false)}
            title="Confirm Action"
            message="This is a test of the confirm modal component."
            confirmText="CONFIRM"
            cancelText="CANCEL"
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
