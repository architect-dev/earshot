import { Timestamp } from 'firebase/firestore';

const TWO_MINUTES = 2 * 60;
const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;
const ONE_WEEK = 7 * 24 * 60 * 60;

export const getLastSeenString = (lastSeen: Timestamp | null | undefined): string => {
  if (lastSeen == null) return '';
  const now = Math.round(Date.now() / 1000);
  const lastSeenTime = Math.round(lastSeen.toMillis() / 1000);
  const diff = now - lastSeenTime;
  if (diff < TWO_MINUTES) return 'Online';
  if (diff < ONE_HOUR) return `Last seen ${diff} minutes ago`;
  if (diff < ONE_DAY) return `Last seen ${diff} hours ago`;
  if (diff < ONE_WEEK) return `Last seen ${diff} days ago`;
  return `Last seen ${diff} weeks ago`;
};
