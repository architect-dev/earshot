import React, { type ReactNode } from 'react';
import { Modal as RNModal, View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, title, children, style }: ModalProps) {
  const { theme } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.highlightHigh,
            },
            style,
          ]}
        >
          {title && (
            <View style={[styles.header, { borderBottomColor: theme.colors.highlightMed }]}>
              <Text size="lg" weight="semibold">
                {title}
              </Text>
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 0, // Sharp corners
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  body: {
    padding: 16,
  },
});
