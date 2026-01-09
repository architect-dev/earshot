import React, { type ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // Optional footer with action buttons
  footer?: ReactNode;
  // Close on backdrop press (default: true)
  dismissable?: boolean;
  // Show close button in header (default: true)
  showCloseButton?: boolean;
  // Animation type
  animationType?: 'none' | 'slide' | 'fade';
  // Custom styles
  containerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  dismissable = true,
  showCloseButton = true,
  animationType = 'fade',
  containerStyle,
  contentStyle,
}: ModalProps) {
  const { theme } = useTheme();

  const handleBackdropPress = () => {
    if (dismissable) {
      onClose();
    }
  };

  return (
    <RNModal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} onPress={handleBackdropPress}>
          <Pressable
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.highlightMed,
              },
              containerStyle,
            ]}
            // Prevent backdrop press from triggering when pressing modal content
            onPress={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  {title && (
                    <Text size="lg" weight="semibold">
                      {title}
                    </Text>
                  )}
                </View>
                {showCloseButton && (
                  <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                    <FontAwesome6 name="xmark" size={18} color={theme.colors.muted} />
                  </Pressable>
                )}
              </View>
            )}

            <View style={[styles.content, contentStyle]}>{children}</View>

            {footer && <View style={styles.footer}>{footer}</View>}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 0, // Sharp corners - no rounded borders
    // No shadow - completely flat design
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
