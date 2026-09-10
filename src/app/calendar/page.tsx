'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import { Task, Exam, CreateTaskInput, UpdateTaskInput, ArcMilestone, DailyLog } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { Plus, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { getTodayDateString } from '@/lib/utils/date';

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [milestones, setMilestones] = useState<ArcMilestone[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal for creating task with prefilled date
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState<string>(getTodayDateString());

  const loadCalendarData = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [tasksRes, examsRes, milestonesRes, logsRes] = await Promise.all([
        apiClient.listTasks().catch(() => ({ count: 0, tasks: [] })),
        apiClient.listExams().catch(() => ({ count: 0, exams: [] })),
        apiClient.listArcMilestones().catch(() => ({ count: 0, milestones: [] })),
        apiClient.listDailyLogs().catch(() => ({ count: 0, logs: [] })),
      ]);

      setTasks(tasksRes && Array.isArray(tasksRes.tasks) ? tasksRes.tasks : []);
      setExams(examsRes && Array.isArray(examsRes.exams) ? examsRes.exams : []);
      setMilestones(milestonesRes && Array.isArray(milestonesRes.milestones) ? milestonesRes.milestones : []);
      setDailyLogs(logsRes && Array.isArray(logsRes.logs) ? logsRes.logs : []);
    } catch (err) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load calendar events:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load schedule.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadCalendarData();
      }
    };

    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);
    loadCalendarData();

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadCalendarData]);

  const handleOpenTaskModal = (dateStr: string) => {
    setTaskModalDate(dateStr);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (data: CreateTaskInput | UpdateTaskInput) => {
    try {
      if ('title' in data && data.title) {
        const newTask = await apiClient.createTask(data as CreateTaskInput);
        setTasks((prev) => [newTask, ...prev]);
      }
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to create task from calendar:', err);
      throw err;
    }
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      if (newStatus === 'completed') {
        await apiClient.completeTask(taskId);
      } else {
        await apiClient.updateTask({ id: taskId, status: 'pending' });
      }
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      // Revert on error
      loadCalendarData();
    }
  };

  const handleViewExam = (examId: string) => {
    router.push(`/exams/${examId}`);
  };

  if (isLoading && tasks.length === 0 && exams.length === 0) {
    return <LoadingState message="Loading your unified schedule..." />;
  }

  if (error && tasks.length === 0 && exams.length === 0) {
    if (!isBackendConfigured() || isSetupRequiredError(error)) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Calendar Schedule"
            description="Unified month, week, and day agenda of tasks, deadlines, and exams"
          />
          <SetupRequiredState featureName="view your unified schedule" />
        </div>
      );
    }
    return <ErrorState message={error} onRetry={loadCalendarData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Calendar Schedule"
        description="Unified month, week, and day agenda of tasks, deadlines, and exams"
        badge={
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Interactive View</span>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadCalendarData}
              disabled={isLoading}
            >
              Sync
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenTaskModal(getTodayDateString())}
            >
              Add Task
            </Button>
          </div>
        }
      />

      {/* Calendar Interactive View */}
      <CalendarView
        tasks={tasks}
        exams={exams}
        arcMilestones={milestones}
        dailyLogs={dailyLogs}
        onOpenTaskModal={handleOpenTaskModal}
        onToggleTaskStatus={handleToggleTaskStatus}
        onViewExam={handleViewExam}
      />

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        defaultDate={taskModalDate}
      />
    </div>
  );
}
