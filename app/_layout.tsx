import { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';

function RootLayoutNav() {
  const { theme, themeMode } = useTheme();
  const { isLoading, isAuthenticated, isEmailVerified } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inTabsGroup) {
      // Not authenticated, redirect to login
      router.replace('/(auth)/login' as Href);
    } else if (isAuthenticated && !isEmailVerified && !inAuthGroup) {
      // Authenticated but email not verified
      router.replace('/(auth)/verify-email' as Href);
    } else if (isAuthenticated && isEmailVerified && inAuthGroup) {
      // Authenticated and verified, redirect to feed
      router.replace('/(tabs)/feed' as Href);
    }
  }, [isLoading, isAuthenticated, isEmailVerified, segments, router]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.base },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
