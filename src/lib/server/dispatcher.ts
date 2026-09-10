import type { SessionData } from '@/lib/auth/session';
import { getStore } from './stores/storeFactory';
import { stringValue, nowIso } from './utils';

import { handleTasksAction } from './services/tasksService';
import { handleExamsAction } from './services/examsService';
import { handleStudyAction } from './services/studyService';
import { handleDailyLogsAction } from './services/dailyLogService';
import { handleReviewsAction } from './services/reviewsService';
import { handleAnalyticsAction } from './services/analyticsService';
import { handleArcsAction } from './services/arcsService';
import { handleDashboardAction } from './services/dashboardService';
import { handleDataAction } from './services/dataService';
import { handleProfileAction } from './services/profileService';

export async function executeTrackerAction(
  session: SessionData,
  action: string,
  params: Record<string, unknown> = {},
  body: unknown = {}
): Promise<unknown> {
  const act = stringValue(action);

  if (act === 'health') {
    return {
      app: 'Productivity Tracker',
      version: '1.0.0',
      status: 'online',
      mode: session.isDevMode ? 'dev' : 'google_oauth',
      user: session.user.email,
      timestamp: nowIso(),
    };
  }

  const store = getStore(session);
  const bodyObj = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  // Setup & Initialization
  if (act === 'setup') {
    const res = await store.initializeAllSheets();
    return {
      message: 'Sheets initialized successfully.',
      details: res,
    };
  }

  // Profile actions
  if (act.startsWith('profile.')) {
    return handleProfileAction(store, act, params, bodyObj, session);
  }

  // Task actions
  if (act.startsWith('tasks.')) {
    return handleTasksAction(store, act, params, bodyObj);
  }

  // Exam and Exam Topics actions
  if (act.startsWith('exams.') || act.startsWith('examTopics.')) {
    return handleExamsAction(store, act, params, bodyObj);
  }

  // Study plans and sessions actions
  if (act.startsWith('studyPlans.') || act.startsWith('studySessions.')) {
    return handleStudyAction(store, act, params, bodyObj);
  }

  // Daily tracking actions
  if (act.startsWith('daily.') || act.startsWith('dailyLogs.')) {
    return handleDailyLogsAction(store, act, params, bodyObj);
  }

  // Review actions
  if (act.startsWith('reviews.')) {
    return handleReviewsAction(store, act, params, bodyObj);
  }

  // Analytics actions
  if (act.startsWith('analytics.')) {
    return handleAnalyticsAction(store, act, params, bodyObj);
  }

  // Arcs, ArcGoals, and ArcMilestones actions
  if (act.startsWith('arcs.') || act.startsWith('arcGoals.') || act.startsWith('arcMilestones.')) {
    return handleArcsAction(store, act, params, bodyObj);
  }

  // Dashboard action
  if (act === 'dashboard') {
    return handleDashboardAction(store);
  }

  // Data portability, global search, and audit log actions
  if (act.startsWith('data.') || act.startsWith('search.') || act.startsWith('audit.')) {
    return handleDataAction(store, act, params, bodyObj);
  }

  throw new Error(`Unknown action: "${act}".`);
}
