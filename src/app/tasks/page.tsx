'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { Plus, CheckSquare, ListTodo, CheckCircle2, Clock } from 'lucide-react';
import { getTodayDateString } from '@/lib/utils/date';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    category: 'all',
    priority: 'all',
    date: undefined,
    search: '',
  });

  // Active status tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Modals & Action States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Header center slot for positioning tabs in Header
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updateSlot = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setHeaderSlot(document.getElementById('header-center-slot'));
      } else {
        setHeaderSlot(null);
      }
    };
    updateSlot();
    window.addEventListener('resize', updateSlot);
    return () => window.removeEventListener('resize', updateSlot);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.listTasks(filters);
      setTasks(res && Array.isArray(res.tasks) ? res.tasks : []);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load tasks:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load tasks.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();

    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadTasks();
      }
    };
    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadTasks]);


  const [parentTaskIdForNewSubtask, setParentTaskIdForNewSubtask] = useState<string | undefined>(undefined);

  // Complete action
  const handleComplete = async (id: string) => {
    try {
      setCompletingTaskId(id);
      await apiClient.completeTask(id);
      await loadTasks();
    } catch (err: unknown) {
      console.error('Failed to complete task:', err);
      alert(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Save (create or edit)
  const handleSave = async (input: CreateTaskInput | UpdateTaskInput) => {
    if ('id' in input && input.id) {
      await apiClient.updateTask(input);
    } else if (input.recurrenceType && input.recurrenceType !== 'none') {
      await apiClient.createRecurringTask(input as CreateTaskInput);
    } else {
      await apiClient.createTask(input as CreateTaskInput);
    }
    setParentTaskIdForNewSubtask(undefined);
    await loadTasks();
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingTaskId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteTask(deletingTaskId);
      setDeletingTaskId(null);
      await loadTasks();
    } catch (err: unknown) {
      console.error('Failed to delete task:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  // Client-side filtering when search or tab is active
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab !== 'all' && task.status !== activeTab) {
        return false;
      }
      // Search filter
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesCategory = task.category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, activeTab, filters.search]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Management"
        description="Organize, schedule, and complete your tasks with full manual control."
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingTask(null);
              setIsFormModalOpen(true);
            }}
          >
            Create Task
          </Button>
        }
      />

      {/* Filters Bar */}
      <TaskFiltersBar
        filters={filters}
        onChange={(newFilters) => setFilters(newFilters)}
        onReset={() =>
          setFilters({
            status: 'all',
            category: 'all',
            priority: 'all',
            date: undefined,
            search: '',
          })
        }
      />

      {/* Status Tabs - positioned in Header between timezone span and search button on desktop */}
      {headerSlot ? (
        createPortal(
          <Tabs
            size="sm"
            tabs={[
              { id: 'all', label: 'All Tasks', count: counts.all, icon: <ListTodo className="w-3 h-3" /> },
              { id: 'pending', label: 'Pending', count: counts.pending, icon: <Clock className="w-3 h-3" /> },
              { id: 'completed', label: 'Completed', count: counts.completed, icon: <CheckCircle2 className="w-3 h-3" /> },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          />,
          headerSlot
        )
      ) : (
        <div className="flex items-center justify-between gap-4 overflow-x-auto">
          <Tabs
            tabs={[
              { id: 'all', label: 'All Tasks', count: counts.all, icon: <ListTodo className="w-3.5 h-3.5" /> },
              { id: 'pending', label: 'Pending', count: counts.pending, icon: <Clock className="w-3.5 h-3.5" /> },
              { id: 'completed', label: 'Completed', count: counts.completed, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          />
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <LoadingState message="Loading tasks from backend..." />
      ) : error ? (
        !isBackendConfigured() || isSetupRequiredError(error) ? (
          <SetupRequiredState featureName="manage and schedule your tasks" />
        ) : (
          <ErrorState
            title="Failed to load tasks"
            message={error}
            onRetry={loadTasks}
          />
        )
      ) : filteredTasks.length === 0 ? (

        <EmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          title={
            activeTab === 'completed'
              ? 'No completed tasks'
              : activeTab === 'pending'
              ? 'No pending tasks'
              : 'No tasks found'
          }
          description={
            filters.date || filters.search || filters.category !== 'all'
              ? 'Try adjusting your search or filters to see more tasks.'
              : 'Add your first task to start organizing your schedule.'
          }
          actionLabel="Create Task"
          onAction={() => {
            setEditingTask(null);
            setIsFormModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showDate
              onComplete={handleComplete}
              onEdit={(t) => {
                setEditingTask(t);
                setIsFormModalOpen(true);
              }}
              onDelete={(id) => setDeletingTaskId(id)}
              onAddSubtask={(pid) => {
                setParentTaskIdForNewSubtask(pid);
                setIsFormModalOpen(true);
              }}
              isCompleting={completingTaskId === task.id}
            />
          ))}
        </div>
      )}

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTask(null);
          setParentTaskIdForNewSubtask(undefined);
        }}
        onSubmit={handleSave}
        task={editingTask}
        parentTaskId={parentTaskIdForNewSubtask}
        defaultDate={filters.date || getTodayDateString()}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete Task"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
