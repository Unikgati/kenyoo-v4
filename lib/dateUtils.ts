/**
 * Get local date string in YYYY-MM-DD format using local timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
    // Get local year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get start of day (00:00:00.000) in local timezone
 */
export function getStartOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Get end of day (23:59:59.999) in local timezone
 */
export function getEndOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Parse date string in YYYY-MM-DD format to Date object in local timezone
 */
export function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Format date to locale string with options
 */
export function formatLocalDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return date.toLocaleDateString('en-US', options);
}
