/**
 * Date formatting utilities for consistent date display across the application
 * All dates are formatted in dd/mm/yy format
 */

/**
 * Format a timestamp to dd/mm/yy format
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "25/12/23")
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
  return `${day}/${month}/${year}`;
};

/**
 * Format a timestamp to dd/mm/yyyy format (full year)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "25/12/2023")
 */
export const formatDateFullYear = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a timestamp to include time in dd/mm/yy HH:MM format
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string (e.g., "25/12/23 14:30")
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format a timestamp to a short date format (e.g., "25 Dec")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted short date string (e.g., "25 Dec")
 */
export const formatShortDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day} ${month}`;
};

/**
 * Format current date to dd/mm/yy format
 * @returns Current date in dd/mm/yy format
 */
export const formatCurrentDate = (): string => {
  return formatDate(Date.now());
};

/**
 * Format current date and time to dd/mm/yy HH:MM format
 * @returns Current date and time in dd/mm/yy HH:MM format
 */
export const formatCurrentDateTime = (): string => {
  return formatDateTime(Date.now());
};

/**
 * Format a timestamp to a short date format with full year (e.g., "25 December 2023")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted short date string with full year (e.g., "25 December 2023")
 */
export const formatShortDateWithYear = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}; 