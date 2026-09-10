import crypto from 'crypto';
import type { SheetStore } from './types';

export const SHEET_HEADERS: Record<string, string[]> = {
  Tasks: [
    'id',
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
    'createdAt',
    'updatedAt',
    'parentTaskId',
    'taskType',
    'recurrenceType',
    'recurrenceInterval',
    'recurrenceDays',
    'recurrenceEndDate',
    'recurrenceSourceId',
    'arcId',
    'arcGoalId',
  ],
  Exams: [
    'id',
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
    'createdAt',
    'updatedAt',
  ],
  DailyLogs: [
    'id',
    'date',
    'sleepHours',
    'wakeTime',
    'focusHours',
    'studyHours',
    'exercise',
    'mood',
    'energy',
    'notes',
    'wentWell',
    'difficulties',
    'learnings',
    'createdAt',
    'updatedAt',
  ],
  Profile: ['key', 'value', 'updatedAt'],
  ExamTopics: [
    'id',
    'examId',
    'name',
    'description',
    'status',
    'priority',
    'estimatedHours',
    'completedAt',
    'createdAt',
    'updatedAt',
  ],
  StudyPlans: [
    'id',
    'examId',
    'topicId',
    'date',
    'plannedHours',
    'notes',
    'status',
    'createdAt',
    'updatedAt',
  ],
  StudySessions: [
    'id',
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
    'createdAt',
    'updatedAt',
  ],
  AuditLog: ['id', 'timestamp', 'action', 'entityType', 'entityId', 'source', 'details'],
  Arcs: [
    'id',
    'name',
    'description',
    'type',
    'startDate',
    'endDate',
    'status',
    'icon',
    'linkedExamId',
    'notes',
    'createdAt',
    'updatedAt',
  ],
  ArcGoals: [
    'id',
    'arcId',
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
    'createdAt',
    'updatedAt',
  ],
  ArcMilestones: [
    'id',
    'arcId',
    'title',
    'description',
    'targetDate',
    'status',
    'completedAt',
    'notes',
    'createdAt',
    'updatedAt',
  ],
};

export const ALL_SHEET_NAMES = Object.keys(SHEET_HEADERS);

/* =========================================================
   UTILITIES
   ========================================================= */

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(date: Date = new Date(), timezone = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function getColumnLetter(columnNumber: number): string {
  let temp = columnNumber;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || 'A';
}

export function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}_${ts}_${rand}`;
}

export function stringValue(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

export function numValue(val: unknown, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

export function boolValue(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = stringValue(val).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/* =========================================================
   TEXT ANALYSIS FOR REVIEWS & REFLECTIONS
   ========================================================= */

const REFLECTION_STOPWORDS = new Set([
  'the', 'and', 'to', 'a', 'in', 'that', 'is', 'was', 'for', 'it', 'with',
  'as', 'on', 'at', 'by', 'this', 'an', 'be', 'are', 'from', 'or', 'have',
  'had', 'has', 'not', 'but', 'what', 'all', 'were', 'when', 'we', 'there',
  'been', 'one', 'would', 'each', 'she', 'he', 'they', 'my', 'i', 'me', 'today',
  'day', 'very', 'really', 'much', 'some', 'could', 'did', 'do', 'so', 'just',
  'more', 'about', 'out', 'up', 'also', 'will', 'them', 'their', 'our', 'good',
  'went', 'well', 'difficult', 'learned', 'feel', 'feeling', 'felt', 'time', 'hours'
]);

export function extractKeywords(texts: string[], minCount = 2): { word: string; count: number }[] {
  const wordCounts: Record<string, number> = {};
  texts.forEach((text) => {
    if (!text) return;
    const words = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, ' ')
      .split(/\s+/);
    const seen = new Set<string>();
    words.forEach((raw) => {
      const w = raw.trim();
      if (w.length >= 3 && !REFLECTION_STOPWORDS.has(w) && !/^\d+$/.test(w)) {
        if (!seen.has(w)) {
          seen.add(w);
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      }
    });
  });

  return Object.entries(wordCounts)
    .filter(([, count]) => count >= minCount)
    .map(([w, count]) => ({
      word: w.charAt(0).toUpperCase() + w.slice(1),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function getDayName(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[d.getDay()];
    }
  } catch {}
  return '';
}

export function generateRecurrenceDates(
  startDateStr: string,
  recurrenceType: string,
  recurrenceInterval: number,
  recurrenceDaysStr?: string,
  recurrenceEndDateStr?: string,
  horizonDays = 30
): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const interval = Math.max(1, Number(recurrenceInterval) || 1);
  const maxDays = horizonDays && Number(horizonDays) > 0 ? Math.min(Number(horizonDays), 60) : 30;

  const horizon = new Date(start.getTime());
  horizon.setDate(horizon.getDate() + maxDays);

  const maxEnd = recurrenceEndDateStr ? new Date(recurrenceEndDateStr + 'T00:00:00') : horizon;
  const effectiveEnd = maxEnd < horizon ? maxEnd : horizon;

  let allowedDays: number[] | null = null;
  if (recurrenceType === 'weekly' && recurrenceDaysStr) {
    allowedDays = recurrenceDaysStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (allowedDays.length === 0) allowedDays = null;
  }

  const current = new Date(start.getTime());
  let iterations = 0;

  while (iterations < 60) {
    iterations++;
    if (recurrenceType === 'daily') {
      current.setDate(current.getDate() + interval);
    } else if (recurrenceType === 'weekly') {
      current.setDate(current.getDate() + 1);
      if (allowedDays && !allowedDays.includes(current.getDay())) {
        if (current > effectiveEnd) break;
        continue;
      }
    } else if (recurrenceType === 'monthly') {
      current.setMonth(current.getMonth() + interval);
    } else {
      break;
    }

    if (current > effectiveEnd) break;
    dates.push(formatDate(current));
  }

  return dates;
}

export async function logAuditEvent(
  store: SheetStore,
  action: string,
  entityType: string,
  entityId: string,
  details: unknown = '',
  source = 'app'
): Promise<void> {
  try {
    await store.appendRecord('AuditLog', {
      id: generateId('AUDIT'),
      timestamp: nowIso(),
      action: String(action || ''),
      entityType: String(entityType || ''),
      entityId: String(entityId || ''),
      source: String(source || 'app'),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record event:', err);
  }
}
