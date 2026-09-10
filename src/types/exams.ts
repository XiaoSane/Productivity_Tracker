// ==========================================
// EXAMS & TOPICS TYPES
// ==========================================

export type ExamStatus = 'planned' | 'preparing' | 'completed' | 'cancelled';

export interface Exam {
  id: string;
  name: string;
  subject: string;
  examDate: string; // YYYY-MM-DD (actual examination date)
  deadline?: string; // YYYY-MM-DD (preparation cutoff date, <= examDate)
  startTime?: string;
  endTime?: string;
  venue?: string;
  syllabus?: string;
  status: ExamStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamsListResponse {
  count: number;
  exams: Exam[];
}

export type CreateExamInput = {
  name: string;
  subject: string;
  examDate: string;
  deadline?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  syllabus?: string;
  status?: ExamStatus;
  notes?: string;
};

export type UpdateExamInput = Partial<CreateExamInput> & {
  id: string;
};

export type ExamFilters = {
  status?: ExamStatus | 'all';
  subject?: string | 'all';
  upcoming?: boolean | string;
  search?: string;
};

// ==========================================
// EXAM TOPICS & SYLLABUS
// ==========================================

export type TopicStatus = 'pending' | 'in_progress' | 'completed';
export type TopicPriority = 'low' | 'normal' | 'high';

export interface ExamTopic {
  id: string;
  examId: string;
  name: string;
  description?: string;
  status: TopicStatus;
  priority: TopicPriority;
  estimatedHours?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamTopicsResponse {
  count: number;
  topics: ExamTopic[];
}

export type CreateExamTopicInput = {
  examId: string;
  name: string;
  description?: string;
  status?: TopicStatus;
  priority?: TopicPriority;
  estimatedHours?: number;
};

export type UpdateExamTopicInput = Partial<CreateExamTopicInput> & {
  id: string;
};

export interface ExamPreparationProgress {
  examId: string;
  totalTopics: number;
  completedTopics: number;
  progressPercentage: number;
  totalEstimatedHours: number;
  completedEstimatedHours: number;
}
