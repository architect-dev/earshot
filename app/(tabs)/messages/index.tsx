import { View, StyleSheet } from 'react-native';
import { ScreenContainer, Text, PageHeader } from '@/components/ui';

export default function MessagesScreen() {
  return (
    <ScreenContainer>
      <PageHeader icon=")(" title="Messages" />
      <View style={styles.content}>
        <Text color="subtle" align="center">
          Your conversations will appear here
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
