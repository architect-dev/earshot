import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from './Text';
import { Spacer } from './Spacer';

export interface UploadProgressData {
  current: number;
  total: number;
}

interface UploadProgressProps {
  progress: UploadProgressData;
  label?: string;
}

export function UploadProgress({ progress, label }: UploadProgressProps) {
  const { theme } = useTheme();
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const displayLabel = label || `Uploading photo ${progress.current} of ${progress.total}...`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text size="sm" color="subtle">
        {displayLabel}
      </Text>
      <Spacer size={8} />
      <View style={[styles.progressBar, { backgroundColor: theme.colors.highlightLow }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.gold,
              width: `${percentage}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});
