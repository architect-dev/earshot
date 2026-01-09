import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface DebugContextValue {
  isDebugMenuVisible: boolean;
  showDebugMenu: () => void;
  hideDebugMenu: () => void;
  confirmModalOpener: (() => void) | null;
  setConfirmModalOpener: (opener: (() => void) | null) => void;
}

const DebugContext = createContext<DebugContextValue | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [isDebugMenuVisible, setIsDebugMenuVisible] = useState(false);
  const [confirmModalOpener, setConfirmModalOpenerState] = useState<(() => void) | null>(null);

  const showDebugMenu = useCallback(() => {
    if (__DEV__) {
      setIsDebugMenuVisible(true);
    }
  }, []);

  const hideDebugMenu = useCallback(() => {
    setIsDebugMenuVisible(false);
  }, []);

  const setConfirmModalOpener = useCallback((opener: (() => void) | null) => {
    setConfirmModalOpenerState(() => opener);
  }, []);

  const value = useMemo(
    () => ({
      isDebugMenuVisible,
      showDebugMenu,
      hideDebugMenu,
      confirmModalOpener,
      setConfirmModalOpener,
    }),
    [isDebugMenuVisible, showDebugMenu, hideDebugMenu, confirmModalOpener, setConfirmModalOpener]
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

