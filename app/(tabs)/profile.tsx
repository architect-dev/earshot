import { View, StyleSheet } from 'react-native';
import { ScreenContainer, Text, Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfileScreen() {
  const { toggleTheme, themeMode } = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text size="lg" weight="bold" color="gold">
          ))
        </Text>
        <Text size="lg" weight="semibold">
          {' '}
          Profile
        </Text>
      </View>
      <View style={styles.content}>
        <Text color="subtle" align="center" style={styles.placeholder}>
          Lorem ipsum dolor sit amet
        </Text>

        <View style={styles.themeToggle}>
          <Text size="sm" color="subtle">
            Theme: {themeMode.toUpperCase()}
          </Text>
          <Button title="TOGGLE THEME" variant="secondary" onPress={toggleTheme} style={styles.themeButton} />
        </View>
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
  placeholder: {
    marginBottom: 32,
  },
  themeToggle: {
    alignItems: 'center',
  },
  themeButton: {
    marginTop: 12,
  },
});
