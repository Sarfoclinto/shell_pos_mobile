/**
 * Date and time formatting utilities for scan history and UI
 */

/**
 * Format timestamp to time string (e.g., "2:34 PM" or "14:34")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Use 12-hour or 24-hour format based on device locale
  const is24Hour = !new Date("2021-02-21")
    .toLocaleString("en")
    .includes("2:21");

  if (is24Hour) {
    return `${hours}:${minutes}`;
  } else {
    const hours12 = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    return `${hours12}:${minutes} ${period}`;
  }
}

/**
 * Format timestamp to full date-time string (e.g., "Jan 15, 2:34 PM")
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en", { month: "short" });
  const day = date.getDate();
  const time = formatTime(timestamp);

  return `${month} ${day}, ${time}`;
}

/**
 * Format timestamp to date string (e.g., "January 15")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en", { month: "long", day: "numeric" });
}

/**
 * Get relative time string (e.g., "2 minutes ago", "Just now")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 30) return "Just now";
  if (diffMins < 1) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older items, show the full date
  return formatDateTime(timestamp);
}

/**
 * Get time difference in minutes between two timestamps
 */
export function getMinutesDifference(
  timestamp1: number,
  timestamp2: number,
): number {
  return Math.floor(Math.abs(timestamp1 - timestamp2) / (1000 * 60));
}

/**
 * Check if two timestamps are on the same day
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Group scan results by date
 * Returns array of { date: string, items: ScanHistoryItem[] }
 */
export function groupByDate(
  items: Array<{ timestamp: number; [key: string]: any }>,
) {
  const groups: { [key: string]: typeof items } = {};

  items.forEach((item) => {
    const dateKey = formatDate(item.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}
