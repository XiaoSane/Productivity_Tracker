// ==========================================
// DAILY LOGS TYPES
// ==========================================

export interface DailyLog {
  id?: string | null;
  date: string; // YYYY-MM-DD
  sleepHours?: number | string | null;
  wakeTime?: string | null;
  focusHours?: number | string | null;
  studyHours?: number | string | null;
  exercise?: string | null;
  mood?: string | null;
  energy?: string | null;
  notes?: string | null;
  wentWell?: string | null;
  difficulties?: string | null;
  learnings?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type SaveDailyLogInput = {
  date: string;
  sleepHours?: number | string | null;
  wakeTime?: string | null;
  focusHours?: number | string | null;
  studyHours?: number | string | null;
  exercise?: string | null;
  mood?: string | null;
  energy?: string | null;
  notes?: string | null;
  wentWell?: string | null;
  difficulties?: string | null;
  learnings?: string | null;
};
