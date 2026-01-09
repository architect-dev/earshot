import { View, StyleSheet } from 'react-native';
import { ScreenContainer, Text } from '@/components/ui';

export default function CreateScreen() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text size="lg" weight="bold" color="gold">
          ))
        </Text>
        <Text size="lg" weight="semibold">
          {' '}
          Create
        </Text>
      </View>
      <View style={styles.content}>
        <Text color="subtle" align="center">
          Lorem ipsum dolor sit amet
        </Text>
      </View>
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
