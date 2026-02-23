/**
 * Parse a date string (YYYY-MM-DD or ISO format) as a local date at midnight.
 * Avoids the UTC timezone shift where new Date("2026-02-23") becomes Feb 22
 * in negative UTC offset timezones (e.g., US timezones).
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Get today's date at local midnight.
 */
export const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
