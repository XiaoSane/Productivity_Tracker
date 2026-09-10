// ==========================================
// ANALYTICS & TRENDS TYPES
// ==========================================

import type { ExamStatus } from './exams';

export interface AnalyticsSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    completionPercentage: number;
  };
  study: {
    studyHours: number;
    focusHours: number;
  };
  exams: {
    upcoming: number;
  };
  dailyLogs: {
    recordedDays: number;
  };
}

export interface CategoryProductivityItem {
  total: number;
  completed: number;
  completionPercentage: number;
}

export interface ProductivityAnalytics {
  startDate: string;
  endDate: string;
  byCategory: Record<string, CategoryProductivityItem>;
}

export interface ExamAnalyticItem {
  id: string;
  name: string;
  subject: string;
  examDate: string;
  deadline?: string;
  status: ExamStatus;
  daysUntilExam?: number;
  daysUntilDeadline?: number | null;
  deadlinePassed: boolean;
}

export interface ExamAnalytics {
  count: number;
  exams: ExamAnalyticItem[];
}

export interface DailyTrendItem {
  date: string;
  tasksTotal: number;
  tasksCompleted: number;
  completionRate: number;
  studyHours: number;
  focusHours: number;
  sleepHours: number;
  mood?: string;
  energy?: string;
}

export interface AnalyticsTrends {
  range: '7D' | '30D' | '90D';
  numDays: number;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTasks: number;
    totalCompleted: number;
    completionRate: number;
    totalStudyHours: number;
    avgDailyStudyHours: number;
    totalFocusHours: number;
    avgDailyFocusHours: number;
    avgSleepHours: number;
  };
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  dailyTrends: DailyTrendItem[];
}
