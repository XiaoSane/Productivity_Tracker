// ==========================================
// SHARED COMMON TYPES
// ==========================================

import type { TasksListResponse } from './tasks';
import type { ExamsListResponse, Exam } from './exams';
import type { DailyLog } from './daily';
import type { AnalyticsSummary } from './analytics';
import type { StudyPlan, StudySession } from './study';
import type { ArcDetail } from './arcs';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  } | string | null;
  timestamp?: string;
}

export interface HealthCheckResponse {
  app?: string;
  version?: string;
  status: string;
  timestamp?: string;
  mode?: string;
  database?: string;
}

export interface DashboardStudyTarget {
  plannedHours: number;
  completedHours: number;
  sessionsCount: number;
}

export interface DashboardData {
  date: string;
  candidateName?: string;
  tasks: TasksListResponse;
  exams: ExamsListResponse;
  nextExam?: Exam | null;
  dailyLog: DailyLog | null;
  analytics: AnalyticsSummary;
  studyTarget?: DashboardStudyTarget;
  studyPlans?: StudyPlan[];
  studySessions?: StudySession[];
  activeArc?: ArcDetail | null;
}

export interface ProfileResponse {
  name: string;
  message?: string;
}
