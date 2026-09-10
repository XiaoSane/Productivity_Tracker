// ==========================================
// ARC MODULE TYPES
// ==========================================

import type { Task } from './tasks';
import type { Exam } from './exams';

export type ArcType =
  | 'custom'
  | 'winter_arc'
  | 'exam_sprint'
  | 'fitness'
  | 'study'
  | 'project'
  | 'semester'
  | 'challenge'
  | 'other';

export type ArcStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export type ArcMetricType = 'count' | 'hours' | 'percentage' | 'boolean' | 'custom';

export type ArcGoalStatus = 'active' | 'completed' | 'cancelled';

export type ArcMilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ArcMetrics {
  totalGoals: number;
  completedGoals: number;
  goalProgress: number; // 0-100%
  totalMilestones: number;
  completedMilestones: number;
  milestoneProgress: number; // 0-100%
  totalTasks: number;
  completedTasks: number;
  taskProgress: number; // 0-100%
  overallProgress: number; // 0-100%
  daysRemaining: number | null;
  daysElapsed: number;
  totalDays: number;
  upcomingMilestone?: ArcMilestone | null;
}

export interface Arc {
  id: string;
  name: string;
  description?: string;
  type: ArcType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ArcStatus;
  icon?: string;
  linkedExamId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  metrics?: ArcMetrics;
}

export interface ArcGoal {
  id: string;
  arcId: string;
  title: string;
  description?: string;
  metricType: ArcMetricType;
  targetValue: number;
  currentValue: number;
  unit?: string;
  frequency?: 'total' | 'daily' | 'weekly';
  startDate?: string;
  endDate?: string;
  status: ArcGoalStatus;
  priority?: 'low' | 'normal' | 'high';
  linkedExamId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArcMilestone {
  id: string;
  arcId: string;
  title: string;
  description?: string;
  targetDate: string; // YYYY-MM-DD
  status: ArcMilestoneStatus;
  completedAt?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArcDetail {
  arc: Arc;
  goals: ArcGoal[];
  milestones: ArcMilestone[];
  linkedTasks: Task[];
  linkedExam?: Exam | null;
  metrics: ArcMetrics;
}

export interface ArcTimelineEvent {
  id?: string;
  date: string;
  type: 'arc_start' | 'arc_end' | 'milestone' | 'exam_deadline' | 'exam_date';
  title: string;
  description?: string;
  status: string;
}

export interface ArcAnalytics {
  arc: Arc;
  metrics: ArcMetrics;
  goals: ArcGoal[];
  milestones: ArcMilestone[];
  linkedTasks: Task[];
  linkedExam?: Exam | null;
  studyStats: {
    totalSessionsCount: number;
    totalStudyHours: number;
    totalFocusHours: number;
    activeDaysCount: number;
  };
  timeline: ArcTimelineEvent[];
}

export interface ArcsListResponse {
  count: number;
  arcs: Arc[];
}

export interface ArcGoalsListResponse {
  count: number;
  goals: ArcGoal[];
}

export interface ArcMilestonesListResponse {
  count: number;
  milestones: ArcMilestone[];
}

export interface CreateArcInput {
  name: string;
  description?: string;
  type?: ArcType;
  startDate: string;
  endDate: string;
  status?: ArcStatus;
  icon?: string;
  linkedExamId?: string;
  notes?: string;
}

export interface UpdateArcInput extends Partial<CreateArcInput> {
  id: string;
}

export interface CreateArcGoalInput {
  arcId: string;
  title: string;
  description?: string;
  metricType?: ArcMetricType;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  frequency?: 'total' | 'daily' | 'weekly';
  startDate?: string;
  endDate?: string;
  status?: ArcGoalStatus;
  priority?: 'low' | 'normal' | 'high';
  linkedExamId?: string;
  notes?: string;
}

export interface UpdateArcGoalInput extends Partial<CreateArcGoalInput> {
  id: string;
}

export interface CreateArcMilestoneInput {
  arcId: string;
  title: string;
  description?: string;
  targetDate: string;
  status?: ArcMilestoneStatus;
  notes?: string;
}

export interface UpdateArcMilestoneInput extends Partial<CreateArcMilestoneInput> {
  id: string;
}
