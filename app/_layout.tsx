import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import { DebugProvider, useDebug } from '@/contexts/DebugContext';
import { LoadingSpinner, ConfirmModal } from '@/components/ui';
import { DebugMenu, getDefaultDebugItems } from '@/components/debug';

function GlobalDebugMenu() {
  const { isDebugMenuVisible, hideDebugMenu, confirmModalOpener, setConfirmModalOpener } = useDebug();
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Wire up the confirm modal opener
  useEffect(() => {
    if (__DEV__) {
      setConfirmModalOpener(() => setConfirmModalVisible(true));
    }
    return () => {
      setConfirmModalOpener(null);
    };
  }, [setConfirmModalOpener]);

  if (!__DEV__) return null;

  return (
    <>
      <DebugMenu
        visible={isDebugMenuVisible}
        onClose={hideDebugMenu}
        items={getDefaultDebugItems({ openConfirmModal: confirmModalOpener })}
      />
      <ConfirmModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={() => setConfirmModalVisible(false)}
        title="Confirm Action"
        message="This is a test of the confirm modal component."
        confirmText="CONFIRM"
        cancelText="CANCEL"
      />
    </>
  );
}

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
      >
        <Stack.Screen
          name="messages/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <GlobalDebugMenu />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <FriendsProvider>
            <DebugProvider>
              <RootLayoutNav />
            </DebugProvider>
          </FriendsProvider>
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
