// ==========================================
// DATE UTILITIES (Safe Date-Only Handling)
// Prevents unintended timezone shifts (e.g. Asia/Kolkata)
// ==========================================

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
];

/**
 * Retrieves the currently configured timezone from localStorage (defaults to Asia/Kolkata)
 */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('SELF_TRACKER_TIMEZONE');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Updates the user's preferred timezone and dispatches a change event
 */
export function setUserTimezone(tz: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('SELF_TRACKER_TIMEZONE', tz);
    window.dispatchEvent(new CustomEvent('timezone-changed', { detail: tz }));
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the active timezone.
 */
export function getTodayDateString(timezone?: string): string {
  const tz = timezone || (typeof window !== 'undefined' ? getUserTimezone() : DEFAULT_TIMEZONE);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback if timezone not supported
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Parses YYYY-MM-DD into a plain Date object at local noon
 * to avoid any midnight timezone rollover issues.
 */
export function parseDateOnly(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
}

/**
 * Formats a YYYY-MM-DD date into a readable string: e.g. "Sep 5, 2026"
 */
export function formatDisplayDate(dateStr?: string, options?: { includeWeekday?: boolean }): string {
  if (!dateStr) return 'Not set';
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  if (options?.includeWeekday) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[d.getDay()];
    return `${weekday}, ${month} ${day}, ${year}`;
  }

  return `${month} ${day}, ${year}`;
}

/**
 * Formats date relative to today: "Today", "Tomorrow", "Yesterday", or "in X days"
 */
export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '';
  const target = parseDateOnly(dateStr);
  const todayStr = getTodayDateString();
  const today = parseDateOnly(todayStr);

  if (!target || !today) return dateStr;

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatDisplayDate(dateStr);
}

/**
 * Checks if deadline is strictly on or before examDate.
 * Both dates must be in YYYY-MM-DD format.
 */
export function isValidExamDeadline(deadline?: string, examDate?: string): boolean {
  if (!deadline || !examDate) return true; // Deadline is optional
  return deadline <= examDate;
}

/**
 * Formats 24h HH:mm or HH:mm:ss to a clean display string (e.g. "10:30 AM")
 */
export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Computes difference in days from today (positive = future, negative = past)
 */
export function daysFromToday(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = parseDateOnly(dateStr);
  const today = parseDateOnly(getTodayDateString());
  if (!target || !today) return null;

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateToYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds or subtracts days to a YYYY-MM-DD date string
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return formatDateToYmd(d);
}

/**
 * Checks if two date strings represent the same day
 */
export function isSameDay(dateStr1?: string, dateStr2?: string): boolean {
  if (!dateStr1 || !dateStr2) return false;
  return dateStr1.slice(0, 10) === dateStr2.slice(0, 10);
}

export interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Builds a standard 35 or 42 day calendar grid for a given year and month (0-indexed).
 */
export function getMonthCalendarGrid(year: number, monthIndex: number): CalendarDay[] {
  const todayStr = getTodayDateString();
  const firstDay = new Date(year, monthIndex, 1, 12);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Start from Sunday of the first week
  const startDate = new Date(year, monthIndex, 1 - startDayOfWeek, 12);
  const days: CalendarDay[] = [];

  // 6 rows * 7 columns = 42 days grid
  for (let i = 0; i < 42; i++) {
    const current = new Date(startDate.getTime());
    current.setDate(startDate.getDate() + i);
    const ymd = formatDateToYmd(current);

    days.push({
      date: ymd,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === monthIndex,
      isToday: ymd === todayStr,
    });
  }

  return days;
}

export interface WeekDayItem {
  date: string;
  dayNumber: number;
  weekdayName: string;
  isToday: boolean;
}

/**
 * Returns the 7 days of the week containing the given date (Sunday to Saturday)
 */
export function getWeekDays(centerDateStr: string): WeekDayItem[] {
  const center = parseDateOnly(centerDateStr) || new Date();
  const dayOfWeek = center.getDay(); // 0 = Sunday
  const start = new Date(center.getTime());
  start.setDate(center.getDate() - dayOfWeek);

  const todayStr = getTodayDateString();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const week: WeekDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(start.getTime());
    current.setDate(start.getDate() + i);
    const ymd = formatDateToYmd(current);

    week.push({
      date: ymd,
      dayNumber: current.getDate(),
      weekdayName: weekdays[i],
      isToday: ymd === todayStr,
    });
  }

  return week;
}
