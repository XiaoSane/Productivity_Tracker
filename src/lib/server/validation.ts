/**
 * Server-side validation and sanitization utilities for Productivity Tracker.
 * Enforces strict field allowlists, enum validation, length limits, formula injection protection,
 * and foreign key referential integrity.
 */

// ==========================================
// STRING & ENUM UTILITIES
// ==========================================

export function clampStr(val: unknown, maxLen = 2000, fallback = ''): string {
  if (val === undefined || val === null) return fallback;
  const str = String(val).trim();
  if (str.length > maxLen) {
    return str.substring(0, maxLen);
  }
  return str;
}

export function validateEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase();
    const match = allowed.find((item) => item.toLowerCase() === normalized);
    if (match) return match;
  }
  return fallback;
}

export function filterFields(
  source: Record<string, unknown>,
  allowedKeys: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Neutralizes spreadsheet formula injection (CSV/Sheets Formula Injection).
 * If a string begins with =, +, -, @, \t, or \r, prepend a single quote (')
 * so that Google Sheets / Excel parses it strictly as a literal text string.
 */
export function sanitizeCellValue(val: unknown): unknown {
  if (typeof val === 'string') {
    // Check raw string for formula starters or whitespace injection characters
    if (
      val.startsWith('=') ||
      val.startsWith('+') ||
      val.startsWith('-') ||
      val.startsWith('@') ||
      val.startsWith('\t') ||
      val.startsWith('\r')
    ) {
      return `'${val}`;
    }
    // Also check trimmed string in case of leading spaces: '   =1+1'
    const trimmed = val.trim();
    if (
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@')
    ) {
      return `'${val}`;
    }
  }
  return val;
}

// ==========================================
// FIELD ALLOWLISTS FOR MASS-ASSIGNMENT PROTECTION
// ==========================================

export const TASK_ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'date',
  'startTime',
  'endTime',
  'category',
  'priority',
  'status',
  'completedAt',
  'notes',
  'parentTaskId',
  'taskType',
  'recurrenceType',
  'recurrenceInterval',
  'recurrenceDays',
  'recurrenceEndDate',
  'recurrenceSourceId',
  'arcId',
  'arcGoalId',
] as const;

export const EXAM_ALLOWED_UPDATE_FIELDS = [
  'name',
  'subject',
  'examDate',
  'deadline',
  'startTime',
  'endTime',
  'venue',
  'syllabus',
  'status',
  'notes',
] as const;

export const EXAM_TOPIC_ALLOWED_UPDATE_FIELDS = [
  'name',
  'description',
  'status',
  'priority',
  'estimatedHours',
  'completedAt',
] as const;

export const STUDY_PLAN_ALLOWED_UPDATE_FIELDS = [
  'date',
  'plannedHours',
  'notes',
  'status',
] as const;

export const STUDY_SESSION_ALLOWED_UPDATE_FIELDS = [
  'date',
  'startTime',
  'endTime',
  'durationMinutes',
  'examId',
  'topicId',
  'subject',
  'sessionType',
  'focusRating',
  'notes',
] as const;

export const ARC_ALLOWED_UPDATE_FIELDS = [
  'name',
  'description',
  'type',
  'startDate',
  'endDate',
  'status',
  'icon',
  'linkedExamId',
  'notes',
] as const;

export const ARC_GOAL_ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'metricType',
  'targetValue',
  'currentValue',
  'unit',
  'frequency',
  'startDate',
  'endDate',
  'status',
  'priority',
  'linkedExamId',
  'notes',
] as const;

export const ARC_MILESTONE_ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'targetDate',
  'status',
  'completedAt',
  'notes',
] as const;

// ==========================================
// ALLOWED ENUM VALUES
// ==========================================

export const TASK_PRIORITIES = ['low', 'normal', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['pending', 'completed', 'cancelled'] as const;
export const TASK_TYPES = ['standard', 'subtask', 'recurring_master', 'recurring_instance'] as const;
export const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', ''] as const;

export const EXAM_STATUSES = ['planned', 'preparing', 'completed', 'cancelled', 'upcoming'] as const;

export const TOPIC_STATUSES = ['pending', 'in_progress', 'completed', 'not_started'] as const;
export const TOPIC_PRIORITIES = ['low', 'normal', 'medium', 'high', 'urgent'] as const;

export const STUDY_PLAN_STATUSES = ['planned', 'completed', 'skipped'] as const;
export const STUDY_SESSION_TYPES = ['study', 'revision', 'practice', 'mock_test', 'other'] as const;

export const ARC_TYPES = [
  'custom',
  'winter_arc',
  'exam_sprint',
  'fitness',
  'study',
  'project',
  'semester',
  'challenge',
  'other',
] as const;
export const ARC_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export const ARC_GOAL_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const ARC_METRIC_TYPES = ['count', 'hours', 'percentage', 'boolean', 'custom'] as const;
export const ARC_FREQUENCIES = ['daily', 'weekly', 'monthly', 'overall'] as const;
export const ARC_MILESTONE_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
