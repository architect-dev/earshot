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

/**
 * Get day suffix (1st, 2nd, 3rd, 4th, etc.)
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Format timestamp for time break divider
 * - If message < 24hrs old: format as time "4:11pm"
 * - If message >= 24hrs old: format as date "Jan 10th"
 */
export function formatTimeBreak(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // If message is less than 24 hours old, show time
  if (diffMs < MS_PER_DAY) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes}${ampm}`;
  }

  // If message is 24+ hours old, show date
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const daySuffix = getDaySuffix(day);
  return `${month} ${day}${daySuffix}`;
}

/**
 * Check if two timestamps are on different days
 */
export function isDifferentDay(timestamp1: Timestamp | Date, timestamp2: Timestamp | Date): boolean {
  const date1 = timestamp1 instanceof Date ? timestamp1 : timestamp1.toDate();
  const date2 = timestamp2 instanceof Date ? timestamp2 : timestamp2.toDate();
  return (
    date1.getDate() !== date2.getDate() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getFullYear() !== date2.getFullYear()
  );
}

/**
 * Check if time difference between two timestamps is > 1 hour
 */
export function isMoreThanOneHour(timestamp1: Timestamp | Date, timestamp2: Timestamp | Date): boolean {
  const date1 = timestamp1 instanceof Date ? timestamp1 : timestamp1.toDate();
  const date2 = timestamp2 instanceof Date ? timestamp2 : timestamp2.toDate();
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const MS_PER_HOUR = 60 * 60 * 1000;
  return diffMs > MS_PER_HOUR;
}

/**
 * Format date for divider (e.g., "Jan 11")
 */
export function formatDateDivider(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  return `${month} ${day}`;
}
