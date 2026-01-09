import { View, StyleSheet } from 'react-native';
import { ScreenContainer, Text, PageHeader } from '@/components/ui';

export default function CreateScreen() {
  return (
    <ScreenContainer>
      <PageHeader title="Create" />
      <View style={styles.content}>
        <Text color="subtle" align="center">
          Create a new post
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
