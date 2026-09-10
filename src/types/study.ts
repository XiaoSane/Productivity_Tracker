// ==========================================
// STUDY PLANS & SESSIONS TYPES
// ==========================================

export type StudyPlanStatus = 'planned' | 'completed' | 'skipped';

export interface StudyPlan {
  id: string;
  examId?: string;
  topicId?: string;
  date: string; // YYYY-MM-DD
  plannedHours: number;
  notes?: string;
  status: StudyPlanStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyPlansResponse {
  count: number;
  plans: StudyPlan[];
}

export type CreateStudyPlanInput = {
  examId?: string;
  topicId?: string;
  date: string;
  plannedHours: number;
  notes?: string;
  status?: StudyPlanStatus;
};

export type UpdateStudyPlanInput = Partial<CreateStudyPlanInput> & {
  id: string;
};

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  examId?: string;
  topicId?: string;
  subject?: string;
  sessionType?: string;
  focusRating?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudySessionsResponse {
  count: number;
  sessions: StudySession[];
}

export type CreateStudySessionInput = {
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  examId?: string;
  topicId?: string;
  subject?: string;
  sessionType?: string;
  focusRating?: number;
  notes?: string;
};

export type UpdateStudySessionInput = Partial<CreateStudySessionInput> & {
  id: string;
};
