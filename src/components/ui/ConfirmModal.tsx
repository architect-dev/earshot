import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'error';
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      dismissable={!loading}
      footer={
        <View style={styles.buttons}>
          <Button title={cancelText} variant="ghost" onPress={onClose} disabled={loading} />
          <Button title={confirmText} variant={confirmVariant} onPress={onConfirm} loading={loading} />
        </View>
      }
    >
      <Text color="subtle">{message}</Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
});
