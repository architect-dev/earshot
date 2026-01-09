import React, { type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from './Text';
import { useDoubleTap } from '@/components/debug';
import { useDebug } from '@/contexts/DebugContext';

interface PageHeaderProps {
  title: string;
  icon?: string; // Text icon to display before title (e.g., "))", "((", ")(")
  rightElement?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PageHeader({ title, icon = '))', rightElement, style }: PageHeaderProps) {
  const { showDebugMenu } = useDebug();

  const handleDoubleTap = useDoubleTap({
    onDoubleTap: showDebugMenu,
  });

  return (
    <Pressable onPress={handleDoubleTap}>
      <View style={[styles.header, style]}>
        <View style={styles.titleContainer}>
          <Text size="lg" weight="bold" color="gold">
            {icon}
          </Text>
          <Text size="lg" weight="semibold">
            {' '}
            {title}
          </Text>
        </View>
        {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightElement: {
    marginLeft: 'auto',
  },
});
