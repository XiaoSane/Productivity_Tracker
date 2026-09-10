// ==========================================
// TASKS & RECURRENCE TYPES
// ==========================================

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'completed' | 'cancelled';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type TaskType = 'standard' | 'subtask' | 'recurring_master' | 'recurring_instance';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  category?: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Subtasks & Recurrence Extensions
  parentTaskId?: string;
  taskType?: TaskType;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: string; // Comma-separated day indices (0-6) or strings
  recurrenceEndDate?: string;
  recurrenceSourceId?: string;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  arcId?: string;
  arcGoalId?: string;
}

export interface TasksListResponse {
  count: number;
  tasks: Task[];
}

export type CreateTaskInput = {
  title: string;
  date: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  notes?: string;
  parentTaskId?: string;
  taskType?: TaskType;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: string;
  recurrenceEndDate?: string;
  recurrenceSourceId?: string;
  arcId?: string;
  arcGoalId?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  id: string;
  completedAt?: string | null;
};

export type TaskFilters = {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: TaskStatus | 'all';
  category?: string | 'all';
  priority?: TaskPriority | 'all';
  parentTaskId?: string;
  search?: string;
};
