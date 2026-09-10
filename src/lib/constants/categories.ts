// ==========================================
// CONSTANTS: Categories, Priorities, Statuses
// ==========================================

import { TaskPriority, TaskStatus, ExamStatus } from '@/types';

export const DEFAULT_TASK_CATEGORIES = [
  'Study',
  'Revision',
  'Assignment',
  'Practice / Mock',
  'Reading',
  'Project',
  'Personal',
  'Health',
  'Other',
] as const;

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string; badgeClass: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'normal', label: 'Normal', color: '#2563eb', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  { value: 'high', label: 'High', color: '#d97706', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626', badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string; badgeClass: string }[] = [
  { value: 'pending', label: 'Pending', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  { value: 'completed', label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
];

export const EXAM_STATUSES: { value: ExamStatus; label: string; badgeClass: string }[] = [
  { value: 'planned', label: 'Planned', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' },
  { value: 'preparing', label: 'Preparing', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' },
  { value: 'completed', label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
];

export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great 😄' },
  { value: 'good', label: 'Good 🙂' },
  { value: 'neutral', label: 'Neutral 😐' },
  { value: 'tired', label: 'Tired 🥱' },
  { value: 'stressed', label: 'Stressed 😫' },
  { value: 'low', label: 'Low 😔' },
];

export const ENERGY_OPTIONS = [
  { value: 'high', label: 'High ⚡⚡⚡' },
  { value: 'moderate', label: 'Moderate ⚡⚡' },
  { value: 'low', label: 'Low ⚡' },
  { value: 'exhausted', label: 'Exhausted 🪫' },
];
