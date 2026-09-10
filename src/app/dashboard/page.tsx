'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  apiClient,
  isBackendConfigured,
  isSetupRequiredError,
  getStoredCandidateName,
  setStoredCandidateName,
} from '@/lib/api/client';

import {
  DashboardData,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  CreateStudyPlanInput,
  StudyPlan,
} from '@/types';
import {
  formatDisplayDate,
  getTodayDateString,
  getUserTimezone,
  daysFromToday,
  formatTimeDisplay,
} from '@/lib/utils/date';
import { getDailyQuote } from '@/lib/utils/quotes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { StudyPlanFormModal } from '@/components/study/StudyPlanFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import {
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  Calendar,
  AlertCircle,
  Timer,
  Target,
  ListTodo,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [candidateName, setCandidateName] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTz, setActiveTz] = useState<string>(getUserTimezone());

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [parentTaskIdForSubtask, setParentTaskIdForSubtask] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const dailyQuote = useMemo(() => getDailyQuote(todayStr), [todayStr]);

  // Live running clock
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const tick = () => {
      if (!isMounted) return;
      const now = new Date();
      const tz = getUserTimezone();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        const isKolkata = tz === 'Asia/Kolkata';
        const label = isKolkata ? 'IST' : tz.split('/').pop()?.replace('_', ' ') || tz;
        setCurrentTime(`${formatter.format(now)} ${label}`);
      } catch {
        setCurrentTime(now.toLocaleTimeString());
      }

      const msUntilNextSecond = 1000 - (Date.now() % 1000) + 15;
      timerId = setTimeout(tick, msUntilNextSecond);
    };

    tick();

    const handleSync = () => {
      clearTimeout(timerId);
      setActiveTz(getUserTimezone());
      tick();
    };

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('timezone-changed', handleSync);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('timezone-changed', handleSync);
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getDashboard();
      setData(res || null);
      if (res?.candidateName) {
        setCandidateName(res.candidateName);
        setStoredCandidateName(res.candidateName);
      }
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load dashboard:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load dashboard data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCandidateName(getStoredCandidateName());

    const handleNameChange = (e: CustomEvent<string>) => {
      setCandidateName(e.detail || '');
    };

    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadDashboard();
      }
    };

    window.addEventListener('candidate-name-changed', handleNameChange as EventListener);
    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);
    loadDashboard();

    return () => {
      window.removeEventListener('candidate-name-changed', handleNameChange as EventListener);
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadDashboard]);


  // Task Handlers
  const handleCompleteTask = async (id: string) => {
    try {
      setCompletingTaskId(id);
      await apiClient.completeTask(id);
      await loadDashboard();
    } catch (err: unknown) {
      console.error('Failed to complete task:', err);
      alert(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSaveTask = async (input: CreateTaskInput | UpdateTaskInput) => {
    if ('id' in input && input.id) {
      await apiClient.updateTask(input);
    } else if (input.recurrenceType && input.recurrenceType !== 'none') {
      await apiClient.createRecurringTask(input as CreateTaskInput);
    } else {
      await apiClient.createTask(input as CreateTaskInput);
    }
    setParentTaskIdForSubtask(undefined);
    await loadDashboard();
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteTask(deletingTaskId);
      setDeletingTaskId(null);
      await loadDashboard();
    } catch (err: unknown) {
      console.error('Failed to delete task:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleSetStudyPlan = async (input: CreateStudyPlanInput) => {
    // 1. Optimistically update local dashboard state immediately
    setData((prev) => {
      if (!prev) return prev;
      const existingPlans = prev.studyPlans || [];
      const updatedPlans = existingPlans.some(
        (p) => p.date === input.date && !p.examId && !p.topicId
      )
        ? existingPlans.map((p) =>
            p.date === input.date && !p.examId && !p.topicId
              ? { ...p, plannedHours: Number(input.plannedHours) || 0, notes: input.notes }
              : p
          )
        : [
            ...existingPlans,
            {
              id: `PLAN_OPT_${Date.now()}`,
              ...input,
              status: input.status || 'planned',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

      const totalPlanned = updatedPlans.reduce(
        (sum, p) => sum + (Number(p.plannedHours) || 0),
        0
      );

      return {
        ...prev,
        studyPlans: updatedPlans,
        studyTarget: {
          plannedHours: totalPlanned,
          completedHours: prev.studyTarget?.completedHours || 0,
          sessionsCount: prev.studyTarget?.sessionsCount || 0,
        },
      };
    });

    try {
      // 2. Persist to database (update if exists, otherwise create)
      const existingPlan = (data?.studyPlans || []).find(
        (p) => p.date === input.date && !p.examId && !p.topicId
      );

      if (existingPlan?.id) {
        await apiClient.updateStudyPlan({
          id: existingPlan.id,
          ...input,
        });
      } else {
        await apiClient.createStudyPlan(input);
      }
    } catch (err) {
      console.error('Failed to save study plan:', err);
    } finally {
      // 3. Resync with database
      await loadDashboard();
    }
  };

  // Unpack Data
  const allTasks = data?.tasks?.tasks || [];
  const pendingTasks = allTasks.filter((t) => t.status === 'pending');
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const upcomingExams = data?.exams?.exams || [];
  const dailyLog = data?.dailyLog?.id ? data.dailyLog : null;
  const analytics = data?.analytics;

  const totalTasksCount = allTasks.length;
  const completedCount = completedTasks.length;
  const taskProgressPercent =
    totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  // Study Target vs Completed Hours
  const todayStudyPlans = (data?.studyPlans || []) as StudyPlan[];
  const plannedFromPlans = todayStudyPlans.reduce(
    (sum, p) => sum + (Number(p.plannedHours) || 0),
    0
  );
  const plannedStudyHours =
    data?.studyTarget?.plannedHours !== undefined && data.studyTarget.plannedHours > 0
      ? data.studyTarget.plannedHours
      : plannedFromPlans;

  const completedStudyHours =
    data?.studyTarget?.completedHours !== undefined && data.studyTarget.completedHours > 0
      ? data.studyTarget.completedHours
      : (dailyLog?.studyHours ? Number(dailyLog.studyHours) : 0);
  const studyProgressPercent =
    plannedStudyHours > 0
      ? Math.min(100, Math.round((completedStudyHours / plannedStudyHours) * 100))
      : completedStudyHours > 0
        ? 100
        : 0;

  // Next Exam Focus
  const nextExam = data?.nextExam || (upcomingExams.length > 0 ? upcomingExams[0] : null);
  const daysToExam = nextExam?.examDate ? daysFromToday(nextExam.examDate) : null;
  const daysToDeadline = nextExam?.deadline ? daysFromToday(nextExam.deadline) : null;

  // Unified Chronological Timeline Items
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      time: string;
      title: string;
      type: 'task' | 'deadline';
      status?: string;
      category?: string;
    }> = [];

    // Tasks with start times
    allTasks.forEach((t) => {
      items.push({
        id: t.id,
        time: t.startTime ? formatTimeDisplay(t.startTime) : 'Flexible',
        title: t.title,
        type: 'task',
        status: t.status,
        category: t.category,
      });
    });

    // Exam deadlines matching today
    upcomingExams.forEach((ex) => {
      if (ex.deadline === todayStr) {
        items.push({
          id: `dl_${ex.id}`,
          time: 'Today Cutoff',
          title: `Prep Deadline: ${ex.name}`,
          type: 'deadline',
          category: ex.subject,
        });
      }
    });

    return items;
  }, [allTasks, upcomingExams, todayStr]);

  const todayReflectionText = useMemo(() => {
    if (!data?.dailyLog) return '';
    return (
      data.dailyLog.notes?.trim() ||
      data.dailyLog.wentWell?.trim() ||
      data.dailyLog.learnings?.trim() ||
      data.dailyLog.difficulties?.trim() ||
      ''
    );
  }, [data]);

  if (isLoading && !data) {
    return <LoadingState message="Loading today's Command Center..." />;
  }

  if (error && !data) {
    const isUnconfigured = !isBackendConfigured() || isSetupRequiredError(error);


    return (
      <div className="space-y-6">
        <PageHeader
          title={candidateName ? `Welcome, ${candidateName}` : "Today's Command Center"}
          description={formatDisplayDate(todayStr, { includeWeekday: true })}
        />
        {isUnconfigured ? (
          <SetupRequiredState featureName="view your daily overview and active tasks" />
        ) : (
          <ErrorState
            title="Dashboard Unavailable"
            message={error}
            onRetry={loadDashboard}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Command Center Hero Banner */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/70 to-slate-900 border border-slate-800 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {candidateName ? `Welcome, ${candidateName}` : 'Welcome Back'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              <span className="text-slate-400 font-medium">{formatDisplayDate(todayStr, { includeWeekday: true })} — </span>
              <span className="italic text-slate-100">“{dailyQuote.quote}”</span>
              <span className="text-blue-300 font-semibold ml-2 not-italic">— {dailyQuote.author}</span>
            </p>
          </div>

          {/* Live Clock & Action Quick Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner text-left sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 justify-start sm:justify-end">
                <Timer className="w-3 h-3 text-blue-400" />
                <span>Live Time</span>
              </p>
              <p className="font-mono text-sm sm:text-base font-bold text-white tabular-nums">
                {currentTime || '--:--:-- IST'}
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingTask(null);
                setParentTaskIdForSubtask(undefined);
                setIsTaskModalOpen(true);
              }}
            >
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* 3 Core Focus Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Today's Tasks Progress */}
        <Card className="p-3.5 sm:p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Today&apos;s Tasks
              </span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {completedCount} / {totalTasksCount}
              </span>
              <span className="text-xs text-slate-500">({taskProgressPercent}%)</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Study Target vs Completed */}
        <Card className="p-3.5 sm:p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Study Target
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {completedStudyHours}h
              </span>
              <span className="text-xs text-slate-500">
                {plannedStudyHours > 0 ? `of ${plannedStudyHours}h target` : 'logged today'}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {plannedStudyHours > 0 && plannedStudyHours > completedStudyHours
                ? `${Math.max(0, Number((plannedStudyHours - completedStudyHours).toFixed(1)))}h left`
                : 'Daily goal'}
            </span>
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer text-[11px]"
            >
              Set Target
            </button>
          </div>
        </Card>

        {/* Next Exam Countdown Focus */}
        <Card className="p-3.5 sm:p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Next Upcoming Exam
              </span>
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </div>

            {nextExam ? (
              <div className="mt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                    {daysToExam !== null ? (daysToExam >= 0 ? `${daysToExam}d` : 'Today') : '--'}
                  </span>
                  <span
                    className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[140px]"
                    title={nextExam.name}
                  >
                    {nextExam.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {nextExam.subject}
                  {daysToDeadline !== null && daysToDeadline >= 0 ? ` • Cutoff: ${daysToDeadline}d` : ''}
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-bold text-slate-400 dark:text-slate-500 tracking-tight">
                  None
                </span>
                <p className="text-[11px] text-slate-400 italic mt-0.5">No upcoming exams</p>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {upcomingExams.length} planned
            </span>
            <Link
              href="/exams"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Active Arc Sprint Widget */}
      {data?.activeArc ? (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-linear-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 text-2xl shadow-xs shrink-0">
                {data.activeArc.arc.icon || '🎯'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Active Sprint
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">
                    {data.activeArc.arc.startDate} &rarr; {data.activeArc.arc.endDate}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {data.activeArc.arc.name}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="w-48">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Composite Progress</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {Math.round(data.activeArc.metrics?.overallProgress || 0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Math.round(data.activeArc.metrics?.overallProgress || 0))
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <Link
                href={`/arc/${data.activeArc.arc.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
            <span className="text-lg">🎯</span>
            <span>
              <strong>Ready for a breakthrough?</strong> Start an <strong>Arc Sprint</strong> (Winter Arc, Exam Sprint, or Custom Horizon) to connect your daily tasks with measurable goals.
            </span>
          </div>
          <Link
            href="/arc"
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
          >
            <span>Explore Arcs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Main Command Split: Tasks (Left) & Timeline / Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Tasks & Subtasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today&apos;s Tasks & Actions</CardTitle>
                <CardDescription>
                  Tasks scheduled for {formatDisplayDate(todayStr)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setEditingTask(null);
                    setParentTaskIdForSubtask(undefined);
                    setIsTaskModalOpen(true);
                  }}
                >
                  Add Task
                </Button>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    All Tasks
                  </Button>
                </Link>
              </div>
            </CardHeader>

            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-6 h-6" />}
                title="No tasks scheduled for today"
                description="Create tasks or select a recurring schedule to begin your day."
                actionLabel="Create Task"
                onAction={() => {
                  setEditingTask(null);
                  setParentTaskIdForSubtask(undefined);
                  setIsTaskModalOpen(true);
                }}
              />
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setParentTaskIdForSubtask(undefined);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={(id) => setDeletingTaskId(id)}
                    onAddSubtask={(pid) => {
                      setEditingTask(null);
                      setParentTaskIdForSubtask(pid);
                      setIsTaskModalOpen(true);
                    }}
                    isCompleting={completingTaskId === task.id}
                  />
                ))}

                {completedTasks.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span>Completed Today ({completedTasks.length})</span>
                      <span className="text-emerald-500 font-bold">{taskProgressPercent}% Done</span>
                    </h5>
                    <div className="space-y-2">
                      {completedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setParentTaskIdForSubtask(undefined);
                            setIsTaskModalOpen(true);
                          }}
                          onDelete={(id) => setDeletingTaskId(id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Unified Today Timeline & Quick Navigation */}
        <div className="space-y-6">
          {/* Today's Reflection Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <span>Today&apos;s Reflection</span>
                </CardTitle>
              </div>
              <Link href="/daily-log">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Daily Log
                </Button>
              </Link>
            </CardHeader>

            <div className="p-4 pt-1 space-y-3">
              {todayReflectionText ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    &ldquo;{todayReflectionText}&rdquo;
                  </p>
                  <Link href="/daily-log" className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View / Edit in Daily Log
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 text-center py-2">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No reflection added yet today.
                  </p>
                  <Link href="/daily-log" className="block">
                    <Button variant="secondary" size="sm" className="w-full text-xs">
                      + Add Today&apos;s Reflection
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Unified Timeline Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Today Timeline</span>
                </CardTitle>
                <CardDescription>Chronological events for today</CardDescription>
              </div>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Calendar
                </Button>
              </Link>
            </CardHeader>

            {timelineItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No items on today&apos;s timeline yet.
              </p>
            ) : (
              <div className="space-y-3">
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0 w-16">
                      {item.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${item.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200'
                          }`}
                      >
                        {item.title}
                      </p>
                      {item.category && (
                        <p className="text-[10px] text-slate-400 capitalize">{item.category}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setParentTaskIdForSubtask(undefined);
        }}
        onSubmit={handleSaveTask}
        task={editingTask}
        parentTaskId={parentTaskIdForSubtask}
        defaultDate={todayStr}
      />

      {/* Study Plan Target Modal */}
      <StudyPlanFormModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSubmit={handleSetStudyPlan}
        defaultDate={todayStr}
        initialHours={plannedStudyHours > 0 ? plannedStudyHours : 3}
        initialNotes={
          (data?.studyPlans || []).find((p) => p.date === todayStr && !p.examId && !p.topicId)?.notes || ''
        }
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete Task"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
