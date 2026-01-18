import { useState, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Hook to track the current app state (active, background, inactive)
 * @returns The current app state
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appState;
}

/**
 * Hook to check if app is in foreground
 * @returns true if app is active, false otherwise
 */
export function useIsForeground(): boolean {
  const appState = useAppState();
  return appState === 'active';
}

