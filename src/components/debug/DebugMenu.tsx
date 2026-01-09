import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/ui';

// Types for debug menu structure
export interface DebugAction {
  type: 'action';
  label: string;
  onPress: () => void | Promise<void>;
}

export interface DebugFolder {
  type: 'folder';
  label: string;
  items: DebugMenuItem[];
}

export type DebugMenuItem = DebugAction | DebugFolder;

interface DebugMenuProps {
  visible: boolean;
  onClose: () => void;
  items: DebugMenuItem[];
}

interface DebugRowProps {
  item: DebugMenuItem;
  onFolderPress: (folder: DebugFolder) => void;
}

function DebugRow({ item, onFolderPress }: DebugRowProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (item.type === 'folder') {
      onFolderPress(item);
    } else {
      setLoading(true);
      try {
        await item.onPress();
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.colors.highlightLow },
        pressed && { backgroundColor: theme.colors.highlightLow },
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      <Text size="sm" weight="medium">
        {item.label}
      </Text>
      {item.type === 'folder' ? (
        <FontAwesome6 name="chevron-right" size={14} color={theme.colors.muted} />
      ) : loading ? (
        <FontAwesome6 name="spinner" size={12} color={theme.colors.muted} />
      ) : (
        <FontAwesome6 name="play" size={12} color={theme.colors.pine} />
      )}
    </Pressable>
  );
}

export function DebugMenu({ visible, onClose, items }: DebugMenuProps) {
  const { theme } = useTheme();
  const [navigationStack, setNavigationStack] = useState<DebugFolder[]>([]);

  if (!visible) return null;

  const currentItems = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].items : items;

  const currentTitle = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].label : 'Debug Menu';

  const handleFolderPress = (folder: DebugFolder) => {
    setNavigationStack([...navigationStack, folder]);
  };

  const handleBack = () => {
    setNavigationStack(navigationStack.slice(0, -1));
  };

  const handleClose = () => {
    setNavigationStack([]);
    onClose();
  };

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.base,
  };

  const headerStyle: ViewStyle = {
    borderBottomColor: theme.colors.highlightMed,
  };

  return (
    <SafeAreaView style={[styles.container, containerStyle]}>
      <View style={[styles.header, headerStyle]}>
        <View style={styles.headerLeft}>
          {navigationStack.length > 0 ? (
            <Pressable onPress={handleBack} style={styles.iconButton}>
              <FontAwesome6 name="chevron-left" size={20} color={theme.colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>
        <View style={styles.headerCenter}>
          <Text size="lg" weight="semibold">
            {currentTitle}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={handleClose} style={styles.iconButton}>
            <FontAwesome6 name="xmark" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentItems.map((item, index) => (
          <DebugRow key={`${item.label}-${index}`} item={item} onFolderPress={handleFolderPress} />
        ))}

        {currentItems.length === 0 && (
          <View style={styles.empty}>
            <Text color="muted">No debug options available</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.highlightMed }]}>
        <Text size="xs" color="muted" align="center">
          Development only
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 48,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 48,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  footer: {
    padding: 8,
    borderTopWidth: 1,
  },
});
