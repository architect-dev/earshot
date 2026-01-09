import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ScreenContainer, Text, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SEEN_KEY = '@earshot/welcome_seen';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem(WELCOME_SEEN_KEY);

        if (hasSeenWelcome === 'true') {
          // User has seen welcome, route based on auth state
          if (!isLoading) {
            if (isAuthenticated && isEmailVerified) {
              router.replace('/(tabs)/feed' as Href);
            } else if (isAuthenticated && !isEmailVerified) {
              router.replace('/(auth)/verify-email' as Href);
            } else {
              router.replace('/(auth)/login' as Href);
            }
          }
        } else {
          // First time, show welcome screen
          setCheckingWelcome(false);
        }
      } catch {
        // If error reading storage, show welcome
        setCheckingWelcome(false);
      }
    };

    checkWelcomeStatus();
  }, [isLoading, isAuthenticated, isEmailVerified, router]);

  const handleNext = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    } catch {
      // Ignore storage errors
    }

    if (isAuthenticated && isEmailVerified) {
      router.replace('/(tabs)/feed' as Href);
    } else if (isAuthenticated && !isEmailVerified) {
      router.replace('/(auth)/verify-email' as Href);
    } else {
      router.replace('/(auth)/login' as Href);
    }
  };

  if (checkingWelcome || isLoading) {
    return null; // Loading is handled by root layout
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text size="xxxl" weight="bold" color="gold" style={styles.logo}>
            ))
          </Text>
          <Text size="xl" weight="medium" align="center">
            Welcome to Earshot
          </Text>
          <Text size="md" color="subtle" align="center" style={styles.subtitle}>
            Lorem ipsum dolor sit amet
          </Text>
        </View>
        <View style={styles.footer}>
          <Button title="GET STARTED" variant="primary" onPress={handleNext} fullWidth />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 80,
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
  },
  footer: {
    paddingVertical: 24,
  },
});
