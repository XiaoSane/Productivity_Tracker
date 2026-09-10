// ==========================================
// DATA PORTABILITY, AUDIT & SEARCH TYPES
// ==========================================

import type { Task } from './tasks';
import type { Exam, ExamTopic } from './exams';
import type { DailyLog } from './daily';
import type { StudyPlan, StudySession } from './study';
import type { Arc, ArcGoal, ArcMilestone } from './arcs';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  source: string;
  details: string;
}

export interface AuditLogsResponse {
  count: number;
  logs: AuditLogEntry[];
}

export interface DataExportPayload {
  version: string;
  exportedAt: string;
  data: {
    Tasks: Task[];
    Exams: Exam[];
    DailyLogs: DailyLog[];
    Profile: { key: string; value: string; updatedAt: string }[];
    ExamTopics: ExamTopic[];
    StudyPlans: StudyPlan[];
    StudySessions: StudySession[];
    Arcs?: Arc[];
    ArcGoals?: ArcGoal[];
    ArcMilestones?: ArcMilestone[];
  };
}

export interface SheetValidationSummary {
  toAdd: number;
  toUpdate: number;
  skipped: number;
  errors: string[];
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRecords: number;
  summary: Record<string, SheetValidationSummary>;
}

export interface ImportExecutionResult {
  success: boolean;
  added: number;
  updated: number;
  total: number;
}

export interface GlobalSearchResultsGroup {
  tasks: Task[];
  exams: Exam[];
  topics: ExamTopic[];
  sessions: StudySession[];
  plans: StudyPlan[];
  logs: DailyLog[];
  arcs?: Arc[];
  goals?: ArcGoal[];
  milestones?: ArcMilestone[];
}

export interface GlobalSearchResult {
  query: string;
  totalMatches: number;
  results: GlobalSearchResultsGroup;
}
