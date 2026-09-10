'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Task, ArcGoal } from '@/types';
import { apiClient } from '@/lib/api/client';
import { Search, Link as LinkIcon, Unlink, Check, AlertCircle, Loader2 } from 'lucide-react';

interface LinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  arcId: string;
  goals?: ArcGoal[];
  onTaskLinked: () => void;
}

export function LinkTaskModal({
  isOpen,
  onClose,
  arcId,
  goals = [],
  onTaskLinked,
}: LinkTaskModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      apiClient
        .getTasks()
        .then((res) => {
          if (res?.tasks) {
            setTasks(res.tasks);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch tasks.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchQuery =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchQuery;
    });
  }, [tasks, searchQuery]);

  const handleToggleLink = async (task: Task) => {
    const isCurrentlyLinked = task.arcId === arcId;
    setProcessingTaskId(task.id);
    setError(null);

    try {
      if (isCurrentlyLinked) {
        await apiClient.unlinkTaskFromArc(task.id);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, arcId: undefined, arcGoalId: undefined } : t))
        );
      } else {
        await apiClient.linkTaskToArc(task.id, arcId, selectedGoalId || undefined);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, arcId, arcGoalId: selectedGoalId || undefined } : t
          )
        );
      }
      onTaskLinked();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setError(msg);
    } finally {
      setProcessingTaskId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link Tasks to Arc"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title or category..."
              className="pl-9"
            />
          </div>

          {goals.length > 0 && (
            <div className="w-full sm:w-64">
              <Select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                options={[
                  { value: '', label: 'General Arc (No specific goal)' },
                  ...goals.map((g) => ({
                    value: g.id,
                    label: `🎯 ${g.title}`,
                  })),
                ]}
              />
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Link existing tasks to this Arc sprint. Tasks stay in your core Task database and keep all their due dates and history.
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading tasks...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No tasks found. Create tasks in the Tasks section to link them here.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isLinkedToThisArc = task.arcId === arcId;
              const isLinkedToAnotherArc = Boolean(task.arcId && task.arcId !== arcId);
              const isProcessing = processingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-medium ${
                          task.status === 'completed'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {task.title}
                      </span>
                      {isLinkedToThisArc && (
                        <Badge variant="success" size="sm">
                          <Check className="w-3 h-3" /> Linked
                        </Badge>
                      )}
                      {isLinkedToAnotherArc && (
                        <Badge variant="neutral" size="sm">
                          In other Arc
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="capitalize">{task.category}</span>
                      <span>•</span>
                      <span className="capitalize">{task.priority}</span>
                      {task.date && (
                        <>
                          <span>•</span>
                          <span>Due {task.date}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    {isLinkedToThisArc ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleLink(task)}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <Unlink className="w-3.5 h-3.5" /> Unlink
                          </span>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleLink(task)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <LinkIcon className="w-3.5 h-3.5" /> Link
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
