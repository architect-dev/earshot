import { getLastSeenString } from '@/utils';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

const TWO_MINUTES = 2 * 60;

const getIsOnline = (lastSeen: Timestamp | null | undefined): boolean => {
  if (lastSeen == null) return false;
  const now = Math.round(Date.now() / 1000);
  const lastSeenTime = Math.round(lastSeen.toMillis() / 1000);
  const diff = now - lastSeenTime;
  return diff < TWO_MINUTES;
};

export const useIsOnline = (lastSeen: Timestamp | null | undefined): boolean => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(getIsOnline(lastSeen));
    }, 10000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  return isOnline;
};

export const useLastSeenString = (lastSeen: Timestamp | null | undefined): string => {
  const [lastSeenString, setLastSeenString] = useState('');

  useEffect(() => {
    if (lastSeen == null) return;
    const interval = setInterval(() => {
      setLastSeenString(getLastSeenString(lastSeen));
    }, 10000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  return lastSeenString;
};
