// ==========================================================
// CENTRALIZED API CLIENT FOR GOOGLE APPS SCRIPT WEB APP
// Aligned 100% with backend: Code.gs, Tasks.gs, Exams.gs, Analytics.gs, Sheets.gs
// Includes automatic same-origin proxying to completely eliminate localhost CORS errors
// ==========================================================

import {
  ApiResponse,
  HealthCheckResponse,
  DashboardData,
  Task,
  TaskStatus,
  TasksListResponse,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  Exam,
  ExamsListResponse,
  CreateExamInput,
  UpdateExamInput,
  ExamFilters,
  ExamStatus,
  ExamTopic,
  ExamTopicsResponse,
  CreateExamTopicInput,
  UpdateExamTopicInput,
  ExamPreparationProgress,
  StudyPlan,
  StudyPlansResponse,
  CreateStudyPlanInput,
  UpdateStudyPlanInput,
  StudySession,
  StudySessionsResponse,
  CreateStudySessionInput,
  UpdateStudySessionInput,
  DailyLog,
  SaveDailyLogInput,
  AnalyticsSummary,
  ProductivityAnalytics,
  ExamAnalytics,
  AnalyticsTrends,
  AuditLogsResponse,
  DataExportPayload,
  ImportValidationResult,
  ImportExecutionResult,
  GlobalSearchResult,
  ProfileResponse,
  Arc,
  ArcDetail,
  ArcGoal,
  ArcMilestone,
  ArcAnalytics,
  ArcsListResponse,
  ArcGoalsListResponse,
  ArcMilestonesListResponse,
  CreateArcInput,
  UpdateArcInput,
  CreateArcGoalInput,
  UpdateArcGoalInput,
  CreateArcMilestoneInput,
  UpdateArcMilestoneInput,
  WeeklyReviewData,
  MonthlyReviewData,
  ArcReviewData,
  ReflectionInsightsData,
} from '@/types';

export class ApiError extends Error {
  status?: number;
  action?: string;
  code?: string;

  constructor(message: string, action?: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.action = action;
    this.status = status;
    this.code = code;
  }
}

/**
 * Local candidate name caching and event dispatching
 */
export function getStoredCandidateName(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('SELF_TRACKER_CANDIDATE_NAME')?.trim() || '';
  }
  return '';
}

export function setStoredCandidateName(name: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem('SELF_TRACKER_CANDIDATE_NAME', trimmed);
    } else {
      localStorage.removeItem('SELF_TRACKER_CANDIDATE_NAME');
    }
    window.dispatchEvent(new CustomEvent('candidate-name-changed', { detail: trimmed }));
  }
}

/**
 * Returns the currently active API URL (always same-origin /api/proxy)
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy`;
  }
  return '/api/proxy';
}

/**
 * Checks if a backend connection is configured and authenticated
 */
export function isBackendConfigured(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('SELF_TRACKER_CONFIGURED') === 'true';
  }
  return false;
}

/**
 * Checks if an error indicates setup or authentication is required
 */
export function isSetupRequiredError(error: unknown): boolean {
  if (!error) return false;
  let msg = '';
  let code = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      msg = (error as { message: string }).message;
    }
    if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
      code = (error as { code: string }).code;
    }
  }
  return (
    code === 'UNAUTHENTICATED' ||
    code === 'SETUP_REQUIRED' ||
    msg.includes('Authentication required') ||
    msg.includes('Database setup required') ||
    msg.includes('Backend URL is not configured')
  );
}

/**
 * Deprecated: Manual endpoint override is no longer used with Google OAuth.
 */
export function setApiUrlOverride(_url: string): void {
  void _url;
  // No-op in Google OAuth mode
}


/**
 * Deprecated: Always false in Google OAuth mode
 */
export function hasCustomApiUrl(): boolean {
  return false;
}

/**
 * Deprecated: No-op in Google OAuth mode
 */
export function clearApiUrlOverride(): void {
  // No-op in Google OAuth mode
}

interface RequestOptions {
  action: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Generic request dispatcher for Productivity Tracker.
 * Automatically routes through the local Next.js proxy (/api/proxy) using secure session cookies.
 */
async function request<T>(options: RequestOptions): Promise<T> {
  const { action, method = 'GET', params = {}, body } = options;
  const isBrowser = typeof window !== 'undefined';
  const baseUrl = isBrowser ? window.location.origin : 'http://localhost:3000';
  const requestUrl = new URL('/api/proxy', baseUrl);

  // Set action query parameter
  requestUrl.searchParams.set('action', action);

  // Set additional query parameters
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      requestUrl.searchParams.set(key, String(val));
    }
  });

  const headers: Record<string, string> = {};
  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify({
      action,
      params,
      data: body || {},
    });
  }

  let response: Response;
  try {
    response = await fetch(requestUrl.toString(), fetchOptions);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[API Network Error] ${action}:`, errorMsg);
    throw new ApiError(
      `Network request failed for "${action}". Check your connection or server status.`,
      action
    );
  }

  let jsonResult: ApiResponse<T> | T;
  try {
    const rawText = await response.text();
    if (!rawText.trim()) {
      return {} as T;
    }
    jsonResult = JSON.parse(rawText);
  } catch (parseErr) {
    console.error(`[API Parse Error] ${action}:`, parseErr);
    throw new ApiError(`Invalid response format received from backend for "${action}".`, action);
  }

  // Handle standard backend response wrapper { success: boolean, data?: T, error?: { message } }
  if (
    typeof jsonResult === 'object' &&
    jsonResult !== null &&
    'success' in jsonResult
  ) {
    const apiResp = jsonResult as ApiResponse<T>;
    if (apiResp.success === false) {
      let errorMessage = `Action "${action}" failed on backend.`;
      if (apiResp.error) {
        if (typeof apiResp.error === 'object' && 'message' in apiResp.error && apiResp.error.message) {
          errorMessage = apiResp.error.message;
        } else if (typeof apiResp.error === 'string') {
          errorMessage = apiResp.error;
        }
      }
      let errorCode: string | undefined;
      if (typeof apiResp.error === 'object' && apiResp.error && 'code' in apiResp.error && typeof (apiResp.error as { code: unknown }).code === 'string') {
        errorCode = (apiResp.error as { code: string }).code;
      }
      const apiError = new ApiError(errorMessage, action, response.status, errorCode);
      if (isSetupRequiredError(apiError) && typeof window !== 'undefined') {
        localStorage.removeItem('SELF_TRACKER_CONFIGURED');
      }
      throw apiError;

    }
    if (apiResp.data !== undefined) {
      return apiResp.data;
    }
  }

  if (!response.ok) {
    throw new ApiError(`HTTP Error ${response.status}: ${response.statusText}`, action, response.status);
  }

  return jsonResult as T;
}

// ==========================================
// EXPORTED API CLIENT METHODS
// ==========================================

export const apiClient = {
  // HEALTH CHECK
  async healthCheck(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>({
      action: 'health',
      method: 'GET',
    });
  },

  // SETUP SHEETS
  async setupSheets(): Promise<{ message: string }> {
    return request<{ message: string }>({
      action: 'setup',
      method: 'GET',
    });
  },

  // DASHBOARD
  async getDashboard(): Promise<DashboardData> {
    return request<DashboardData>({
      action: 'dashboard',
      method: 'GET',
    });
  },

  // TASKS
  async listTasks(filters?: TaskFilters): Promise<TasksListResponse> {
    return request<TasksListResponse>({
      action: 'tasks.list',
      method: 'GET',
      params: {
        date: filters?.date,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status !== 'all' ? filters?.status : undefined,
        category: filters?.category !== 'all' ? filters?.category : undefined,
        priority: filters?.priority !== 'all' ? filters?.priority : undefined,
        parentTaskId: filters?.parentTaskId,
      },
    });
  },

  async getTask(id: string): Promise<Task> {
    return request<Task>({
      action: 'tasks.get',
      method: 'GET',
      params: { id },
    });
  },

  async createTask(data: CreateTaskInput): Promise<Task> {
    return request<Task>({
      action: 'tasks.create',
      method: 'POST',
      body: data,
    });
  },

  async createRecurringTask(data: CreateTaskInput): Promise<{ master: Task; instancesCreated: number; instances: Task[] }> {
    return request<{ master: Task; instancesCreated: number; instances: Task[] }>({
      action: 'tasks.createRecurring',
      method: 'POST',
      body: data,
    });
  },

  async generateRecurrenceInstances(sourceId: string, horizonDays?: number): Promise<{ generatedCount: number; instances: Task[] }> {
    return request<{ generatedCount: number; instances: Task[] }>({
      action: 'tasks.generateInstances',
      method: 'POST',
      body: { sourceId, horizonDays },
    });
  },

  async updateTask(data: UpdateTaskInput): Promise<Task> {
    return request<Task>({
      action: 'tasks.update',
      method: 'POST',
      body: data,
    });
  },

  async completeTask(id: string): Promise<Task> {
    return request<Task>({
      action: 'tasks.complete',
      method: 'POST',
      body: { id },
    });
  },

  async deleteTask(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'tasks.delete',
      method: 'POST',
      body: { id },
    });
  },

  async getTasks(filters?: TaskFilters): Promise<TasksListResponse> {
    return this.listTasks(filters);
  },

  async toggleTask(id: string, currentStatus?: TaskStatus): Promise<Task> {
    if (currentStatus === 'completed') {
      return this.updateTask({ id, status: 'pending' });
    }
    return this.completeTask(id);
  },

  // EXAMS
  async listExams(filters?: ExamFilters): Promise<ExamsListResponse> {
    return request<ExamsListResponse>({
      action: 'exams.list',
      method: 'GET',
      params: {
        status: filters?.status !== 'all' ? filters?.status : undefined,
        subject: filters?.subject !== 'all' ? filters?.subject : undefined,
        upcoming: filters?.upcoming ? String(filters.upcoming) : undefined,
      },
    });
  },

  async getExam(id: string): Promise<Exam> {
    return request<Exam>({
      action: 'exams.get',
      method: 'GET',
      params: { id },
    });
  },

  async createExam(data: CreateExamInput): Promise<Exam> {
    return request<Exam>({
      action: 'exams.create',
      method: 'POST',
      body: data,
    });
  },

  async updateExam(data: UpdateExamInput): Promise<Exam> {
    return request<Exam>({
      action: 'exams.update',
      method: 'POST',
      body: data,
    });
  },

  async updateExamStatus(id: string, status: ExamStatus): Promise<Exam> {
    return request<Exam>({
      action: 'exams.status',
      method: 'POST',
      body: { id, status },
    });
  },

  async deleteExam(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'exams.delete',
      method: 'POST',
      body: { id },
    });
  },

  async getExams(filters?: ExamFilters): Promise<ExamsListResponse> {
    return this.listExams(filters);
  },

  // EXAM TOPICS
  async listExamTopics(filters?: { examId?: string; status?: string; priority?: string }): Promise<ExamTopicsResponse> {
    return request<ExamTopicsResponse>({
      action: 'examTopics.list',
      method: 'GET',
      params: filters,
    });
  },

  async getExamTopic(id: string): Promise<ExamTopic> {
    return request<ExamTopic>({
      action: 'examTopics.get',
      method: 'GET',
      params: { id },
    });
  },

  async createExamTopic(data: CreateExamTopicInput): Promise<ExamTopic> {
    return request<ExamTopic>({
      action: 'examTopics.create',
      method: 'POST',
      body: data,
    });
  },

  async updateExamTopic(data: UpdateExamTopicInput): Promise<ExamTopic> {
    return request<ExamTopic>({
      action: 'examTopics.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteExamTopic(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'examTopics.delete',
      method: 'POST',
      body: { id },
    });
  },

  async getExamPreparationProgress(examId: string): Promise<ExamPreparationProgress> {
    return request<ExamPreparationProgress>({
      action: 'examTopics.progress',
      method: 'GET',
      params: { examId },
    });
  },

  // STUDY PLANS
  async listStudyPlans(filters?: { examId?: string; topicId?: string; date?: string; startDate?: string; endDate?: string; status?: string }): Promise<StudyPlansResponse> {
    return request<StudyPlansResponse>({
      action: 'studyPlans.list',
      method: 'GET',
      params: filters,
    });
  },

  async createStudyPlan(data: CreateStudyPlanInput): Promise<StudyPlan> {
    return request<StudyPlan>({
      action: 'studyPlans.create',
      method: 'POST',
      body: data,
    });
  },

  async updateStudyPlan(data: UpdateStudyPlanInput): Promise<StudyPlan> {
    return request<StudyPlan>({
      action: 'studyPlans.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteStudyPlan(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'studyPlans.delete',
      method: 'POST',
      body: { id },
    });
  },

  // STUDY SESSIONS
  async listStudySessions(filters?: { date?: string; startDate?: string; endDate?: string; examId?: string; topicId?: string; subject?: string }): Promise<StudySessionsResponse> {
    return request<StudySessionsResponse>({
      action: 'studySessions.list',
      method: 'GET',
      params: filters,
    });
  },

  async createStudySession(data: CreateStudySessionInput): Promise<StudySession> {
    return request<StudySession>({
      action: 'studySessions.create',
      method: 'POST',
      body: data,
    });
  },

  async updateStudySession(data: UpdateStudySessionInput): Promise<StudySession> {
    return request<StudySession>({
      action: 'studySessions.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteStudySession(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'studySessions.delete',
      method: 'POST',
      body: { id },
    });
  },

  // DAILY LOG
  async getDailyLog(date: string): Promise<DailyLog | null> {
    const res = await request<DailyLog>({
      action: 'daily.get',
      method: 'GET',
      params: { date },
    });
    if (!res || !res.id) {
      return null;
    }
    return res;
  },

  async saveDailyLog(data: SaveDailyLogInput): Promise<DailyLog> {
    return request<DailyLog>({
      action: 'daily.save',
      method: 'POST',
      body: data,
    });
  },

  async listDailyLogs(filters?: { startDate?: string; endDate?: string }): Promise<{ count: number; logs: DailyLog[] }> {
    return request<{ count: number; logs: DailyLog[] }>({
      action: 'daily.list',
      method: 'GET',
      params: filters,
    });
  },

  // REVIEWS & REFLECTIONS
  async getWeeklyReview(weekStartDate?: string): Promise<WeeklyReviewData> {
    return request<WeeklyReviewData>({
      action: 'reviews.week',
      method: 'GET',
      params: { weekStartDate },
    });
  },

  async getMonthlyReview(yearMonth?: string): Promise<MonthlyReviewData> {
    return request<MonthlyReviewData>({
      action: 'reviews.month',
      method: 'GET',
      params: { yearMonth },
    });
  },

  async getArcReview(arcId: string): Promise<ArcReviewData> {
    return request<ArcReviewData>({
      action: 'reviews.arc',
      method: 'GET',
      params: { arcId },
    });
  },

  async getReflectionInsights(range?: string): Promise<ReflectionInsightsData> {
    return request<ReflectionInsightsData>({
      action: 'analytics.reflections',
      method: 'GET',
      params: { range },
    });
  },

  // ANALYTICS & TRENDS
  async getAnalyticsSummary(filters?: { startDate?: string; endDate?: string }): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>({
      action: 'analytics.summary',
      method: 'GET',
      params: {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      },
    });
  },

  async getProductivityAnalytics(filters?: { startDate?: string; endDate?: string }): Promise<ProductivityAnalytics> {
    return request<ProductivityAnalytics>({
      action: 'analytics.productivity',
      method: 'GET',
      params: {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      },
    });
  },

  async getExamAnalytics(filters?: { status?: string }): Promise<ExamAnalytics> {
    return request<ExamAnalytics>({
      action: 'analytics.exams',
      method: 'GET',
      params: {
        status: filters?.status,
      },
    });
  },

  async getAnalyticsTrends(range: '7D' | '30D' | '90D' = '7D'): Promise<AnalyticsTrends> {
    return request<AnalyticsTrends>({
      action: 'analytics.trends',
      method: 'GET',
      params: { range },
    });
  },

  // AUDIT
  async listAuditLogs(filters?: { limit?: number; action?: string; entityType?: string; entityId?: string }): Promise<AuditLogsResponse> {
    return request<AuditLogsResponse>({
      action: 'audit.list',
      method: 'GET',
      params: filters,
    });
  },

  // DATA PORTABILITY
  async exportData(): Promise<DataExportPayload> {
    return request<DataExportPayload>({
      action: 'data.export',
      method: 'GET',
    });
  },

  async validateImportData(payload: unknown): Promise<ImportValidationResult> {
    return request<ImportValidationResult>({
      action: 'data.validateImport',
      method: 'POST',
      body: payload,
    });
  },

  async importConfirmedData(payload: unknown): Promise<ImportExecutionResult> {
    return request<ImportExecutionResult>({
      action: 'data.import',
      method: 'POST',
      body: payload,
    });
  },

  // GLOBAL SEARCH
  async search(query: string): Promise<GlobalSearchResult> {
    return request<GlobalSearchResult>({
      action: 'search.global',
      method: 'GET',
      params: { q: query },
    });
  },

  // ==========================================
  // ARCS
  // ==========================================
  async listArcs(filters?: { status?: string; type?: string }): Promise<ArcsListResponse> {
    return request<ArcsListResponse>({
      action: 'arcs.list',
      method: 'GET',
      params: filters,
    });
  },

  async getArcs(filters?: { status?: string; type?: string }): Promise<ArcsListResponse> {
    return this.listArcs(filters);
  },

  async getArc(id: string): Promise<ArcDetail> {
    return request<ArcDetail>({
      action: 'arcs.get',
      method: 'GET',
      params: { id },
    });
  },

  async getArcById(id: string): Promise<ArcDetail> {
    return this.getArc(id);
  },

  async createArc(data: CreateArcInput): Promise<Arc> {
    return request<Arc>({
      action: 'arcs.create',
      method: 'POST',
      body: data,
    });
  },

  async updateArc(data: UpdateArcInput): Promise<Arc> {
    return request<Arc>({
      action: 'arcs.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteArc(id: string): Promise<{ id: string; deleted: boolean; message: string }> {
    return request<{ id: string; deleted: boolean; message: string }>({
      action: 'arcs.delete',
      method: 'POST',
      body: { id },
    });
  },

  async setArcStatus(id: string, status: string): Promise<Arc> {
    return request<Arc>({
      action: 'arcs.status',
      method: 'POST',
      body: { id, status },
    });
  },

  async linkTaskToArc(
    arg1: string | { taskId: string; arcId: string; arcGoalId?: string },
    arcId?: string,
    arcGoalId?: string
  ): Promise<Task> {
    const payload =
      typeof arg1 === 'object'
        ? arg1
        : { taskId: arg1, arcId: arcId || '', arcGoalId };
    return request<Task>({
      action: 'arcs.linkTask',
      method: 'POST',
      body: payload,
    });
  },

  async unlinkTaskFromArc(taskId: string): Promise<Task> {
    return request<Task>({
      action: 'arcs.unlinkTask',
      method: 'POST',
      body: { taskId },
    });
  },

  async getArcAnalytics(id: string): Promise<ArcAnalytics> {
    return request<ArcAnalytics>({
      action: 'arcs.analytics',
      method: 'GET',
      params: { id },
    });
  },

  // ==========================================
  // ARC GOALS
  // ==========================================
  async listArcGoals(filters?: { arcId?: string; status?: string }): Promise<ArcGoalsListResponse> {
    return request<ArcGoalsListResponse>({
      action: 'arcGoals.list',
      method: 'GET',
      params: filters,
    });
  },

  async createArcGoal(data: CreateArcGoalInput): Promise<ArcGoal> {
    return request<ArcGoal>({
      action: 'arcGoals.create',
      method: 'POST',
      body: data,
    });
  },

  async updateArcGoal(data: UpdateArcGoalInput): Promise<ArcGoal> {
    return request<ArcGoal>({
      action: 'arcGoals.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteArcGoal(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'arcGoals.delete',
      method: 'POST',
      body: { id },
    });
  },

  async updateArcGoalProgress(
    arg1: string | { id: string; currentValue?: number; incrementBy?: number },
    currentValue?: number,
    incrementBy?: number
  ): Promise<ArcGoal> {
    const payload =
      typeof arg1 === 'object'
        ? arg1
        : { id: arg1, currentValue, incrementBy };
    return request<ArcGoal>({
      action: 'arcGoals.updateProgress',
      method: 'POST',
      body: payload,
    });
  },

  // ==========================================
  // ARC MILESTONES
  // ==========================================
  async listArcMilestones(filters?: { arcId?: string; status?: string }): Promise<ArcMilestonesListResponse> {
    return request<ArcMilestonesListResponse>({
      action: 'arcMilestones.list',
      method: 'GET',
      params: filters,
    });
  },

  async createArcMilestone(data: CreateArcMilestoneInput): Promise<ArcMilestone> {
    return request<ArcMilestone>({
      action: 'arcMilestones.create',
      method: 'POST',
      body: data,
    });
  },

  async updateArcMilestone(data: UpdateArcMilestoneInput): Promise<ArcMilestone> {
    return request<ArcMilestone>({
      action: 'arcMilestones.update',
      method: 'POST',
      body: data,
    });
  },

  async deleteArcMilestone(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>({
      action: 'arcMilestones.delete',
      method: 'POST',
      body: { id },
    });
  },

  async setArcMilestoneStatus(id: string, status: string): Promise<ArcMilestone> {
    return request<ArcMilestone>({
      action: 'arcMilestones.status',
      method: 'POST',
      body: { id, status },
    });
  },

  // PROFILE / CANDIDATE NAME
  async getProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>({
      action: 'profile.get',
      method: 'GET',
    });
  },

  async updateProfile(name: string): Promise<ProfileResponse> {
    const trimmed = name.trim();
    const res = await request<ProfileResponse>({
      action: 'profile.update',
      method: 'POST',
      body: { name: trimmed },
    });
    setStoredCandidateName(trimmed);
    return res;
  },
};


