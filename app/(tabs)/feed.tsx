import { View, StyleSheet } from 'react-native';
import { ScreenContainer, Text, PageHeader } from '@/components/ui';

export default function FeedScreen() {
  return (
    <ScreenContainer>
      <PageHeader title="Feed" />
      <View style={styles.content}>
        <Text color="subtle" align="center">
          Your friends' posts will appear here
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
