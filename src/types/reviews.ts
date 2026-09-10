// ==========================================
// REVIEWS & REFLECTIONS TYPES
// ==========================================

import type { Arc } from './arcs';

export interface DailyReflectionItem {
  date: string;
  dayName: string;
  sleepHours?: number | null;
  studyHours?: number | null;
  focusHours?: number | null;
  exercise?: string | null;
  mood?: string | null;
  energy?: string | null;
  notes?: string | null;
  wentWell?: string | null;
  difficulties?: string | null;
  learnings?: string | null;
  hasReflection: boolean;
}

export interface WeeklyReviewData {
  period: {
    startDate: string;
    endDate: string;
    weekLabel: string;
  };
  metrics: {
    studyHours: number;
    focusHours: number;
    tasksCompleted: number;
    tasksPlanned: number;
    completionRate: number;
    exerciseDays: number;
    avgSleep: number;
    daysWithReflections: number;
    totalDays: number;
  };
  reflections: DailyReflectionItem[];
  summary: {
    frequentKeywords: { word: string; count: number }[];
    descriptiveNotes: string[];
  };
}

export interface MonthlyReviewData {
  period: {
    yearMonth: string;
    monthLabel: string;
    startDate: string;
    endDate: string;
  };
  metrics: {
    studyHours: number;
    focusHours: number;
    tasksCompleted: number;
    tasksPlanned: number;
    completionRate: number;
    exerciseDays: number;
    avgSleep: number;
    daysWithReflections: number;
    totalDays: number;
  };
  reflections: DailyReflectionItem[];
  recurringThemes: { word: string; count: number }[];
  hasEnoughData: boolean;
}

export interface ArcReviewHighlight {
  phase: 'Beginning' | 'Middle' | 'Later' | 'Ending';
  date: string;
  highlight: string;
  field: string;
}

export interface ArcReviewData {
  arc: Arc;
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  stats: {
    totalStudyHours: number;
    tasksCompleted: number;
    milestonesCompleted: number;
    totalMilestones: number;
    reflectionsCount: number;
  };
  journeyHighlights: ArcReviewHighlight[];
  reflections: DailyReflectionItem[];
}

export interface ReflectionInsightsData {
  range: string;
  numDays: number;
  reflectionsRecorded: number;
  totalDays: number;
  frequentlyMentioned: { word: string; count: number }[];
  positiveObservations: { observation: string; count: number }[];
  recurringDifficulties: { difficulty: string; count: number }[];
  notes: string[];
}
