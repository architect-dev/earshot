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
  if (diff < ONE_HOUR) {
    const minutes = Math.floor(diff / 60);
    return `Last seen ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diff < ONE_DAY) {
    const hours = Math.floor(diff / ONE_HOUR);
    return `Last seen ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diff < ONE_WEEK) {
    const days = Math.floor(diff / ONE_DAY);
    return `Last seen ${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  const weeks = Math.floor(diff / ONE_WEEK);
  return `Last seen ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
};
