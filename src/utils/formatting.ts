import { type Timestamp } from 'firebase/firestore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MS_PER_MINUTE = 1000 * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

/**
 * Format a Firestore timestamp for display.
 * - < 1 min: "Just now"
 * - < 1 hour: "Xm"
 * - < 1 day: "Xh"
 * - < 1 week: "Xd"
 * - >= 1 week: "10 Jan 2025"
 */
export function formatTimestamp(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < MS_PER_MINUTE) return 'Just now';
  if (diffMs < MS_PER_HOUR) return `${Math.floor(diffMs / MS_PER_MINUTE)}m`;
  if (diffMs < MS_PER_DAY) return `${Math.floor(diffMs / MS_PER_HOUR)}h`;
  if (diffMs < MS_PER_WEEK) return `${Math.floor(diffMs / MS_PER_DAY)}d`;

  // >= 1 week: show full date
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format a timestamp for message lists (conversations).
 * - Today: "Xm" or "Xh"
 * - Yesterday: "Yesterday"
 * - This week: Day name (e.g., "Monday")
 * - Older: "10 Jan 2025"
 */
export function formatMessageTimestamp(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Today
  if (diffMs < MS_PER_DAY && date.getDate() === now.getDate()) {
    if (diffMs < MS_PER_MINUTE) return 'Just now';
    if (diffMs < MS_PER_HOUR) return `${Math.floor(diffMs / MS_PER_MINUTE)}m`;
    return `${Math.floor(diffMs / MS_PER_HOUR)}h`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return 'Yesterday';
  }

  // Within last week
  if (diffMs < MS_PER_WEEK) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Older than a week
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
