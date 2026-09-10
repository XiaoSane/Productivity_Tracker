'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types';
import { TASK_PRIORITIES } from '@/lib/constants/categories';
import { formatTimeDisplay, formatDisplayDate } from '@/lib/utils/date';
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  Repeat,
  ChevronDown,
  ChevronRight,
  Plus,
  CornerDownRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { apiClient } from '@/lib/api/client';

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentTaskId: string) => void;
  showDate?: boolean;
  isCompleting?: boolean;
}

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onAddSubtask,
  showDate = false,
  isCompleting = false,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const priorityInfo = TASK_PRIORITIES.find((p) => p.value === task.priority) || TASK_PRIORITIES[1];

  const [isExpanded, setIsExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const hasSubtasks = (task.subtaskCount || 0) > 0;
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';

  const hasTime = task.startTime || task.endTime;
  const timeDisplay = hasTime
    ? [formatTimeDisplay(task.startTime), formatTimeDisplay(task.endTime)].filter(Boolean).join(' – ')
    : null;

  // Load subtasks when expanding
  const loadSubtasks = async () => {
    try {
      setIsLoadingSubtasks(true);
      const res = await apiClient.listTasks({ parentTaskId: task.id });
      setSubtasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load subtasks for task:', task.id, err);
    } finally {
      setIsLoadingSubtasks(false);
    }
  };

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next && subtasks.length === 0) {
      loadSubtasks();
    }
  };

  const handleInlineAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      setIsAddingSubtask(true);
      const created = await apiClient.createTask({
        title: newSubtaskTitle.trim(),
        date: task.date,
        parentTaskId: task.id,
        category: task.category,
        priority: 'normal',
      });
      setSubtasks((prev) => [...prev, created]);
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (st: Task) => {
    const newStatus = st.status === 'completed' ? 'pending' : 'completed';
    setSubtasks((prev) =>
      prev.map((item) => (item.id === st.id ? { ...item, status: newStatus } : item))
    );

    try {
      if (newStatus === 'completed') {
        await apiClient.completeTask(st.id);
      } else {
        await apiClient.updateTask({ id: st.id, status: 'pending' });
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      loadSubtasks();
    }
  };

  const handleDeleteSubtask = async (stId: string) => {
    setSubtasks((prev) => prev.filter((item) => item.id !== stId));
    try {
      await apiClient.deleteTask(stId);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      loadSubtasks();
    }
  };

  return (
    <div
      className={cn(
        'group rounded-xl border bg-white dark:bg-slate-900 transition-all overflow-hidden',
        isCompleted
          ? 'border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
      )}
    >
      <div className="flex items-start justify-between gap-3.5 p-3.5 sm:p-4">
        {/* Left Checkbox & Info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {onComplete && (
            <button
              type="button"
              disabled={isCompleted || isCompleting}
              onClick={() => onComplete(task.id)}
              aria-label={isCompleted ? 'Task completed' : `Mark "${task.title}" as complete`}
              className={cn(
                'mt-0.5 shrink-0 rounded-full transition-colors cursor-pointer',
                isCompleted
                  ? 'text-emerald-500 cursor-default'
                  : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950/40" />
              ) : (
                <Circle className={cn('w-5 h-5', isCompleting && 'animate-spin text-blue-500')} />
              )}
            </button>
          )}

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className={cn(
                  'text-sm font-medium leading-snug break-words',
                  isCompleted
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-white'
                )}
              >
                {task.title}
              </h4>

              {/* Priority Badge */}
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md border border-transparent',
                  priorityInfo.badgeClass
                )}
              >
                {priorityInfo.label}
              </span>

              {/* Category */}
              {task.category && (
                <Badge variant="neutral" size="sm">
                  {task.category}
                </Badge>
              )}

              {/* Recurrence Badge */}
              {isRecurring && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
                  <Repeat className="w-2.5 h-2.5" />
                  <span>{task.recurrenceType}</span>
                </span>
              )}

              {/* Subtask Progress Badge */}
              {(hasSubtasks || subtasks.length > 0) && (
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400 cursor-pointer"
                >
                  <span>
                    {task.completedSubtaskCount || 0}/{task.subtaskCount || 0} subtasks
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Metadata Row: Time & Date */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              {showDate && task.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDisplayDate(task.date)}</span>
                </span>
              )}
              {timeDisplay && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{timeDisplay}</span>
                </span>
              )}
              {isCompleted && task.completedAt && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Add Subtask Quick Button */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              if (subtasks.length === 0) loadSubtasks();
            }}
            aria-label="Add subtask"
            title="Add Subtask"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Edit task ${task.title}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label={`Delete task ${task.title}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Subtasks Accordion */}
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-blue-500" />
              <span>Subtasks</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {subtasks.filter((s) => s.status === 'completed').length}/{subtasks.length} Completed
            </span>
          </div>

          {/* Subtasks list */}
          <div className="space-y-1.5">
            {isLoadingSubtasks ? (
              <p className="text-xs text-slate-400 italic py-2">Loading subtasks...</p>
            ) : subtasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">No subtasks yet</p>
            ) : (
              subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st)}
                      className="cursor-pointer text-slate-400 hover:text-blue-500 shrink-0"
                    >
                      {st.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={`truncate ${st.status === 'completed'
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {st.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick inline add subtask */}
          <form onSubmit={handleInlineAddSubtask} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a new subtask..."
              disabled={isAddingSubtask}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAddingSubtask || !newSubtaskTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
