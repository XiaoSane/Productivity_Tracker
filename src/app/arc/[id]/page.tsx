'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import {
  Arc,
  ArcDetail,
  ArcAnalytics,
  ArcMetrics,
  ArcGoal,
  ArcMilestone,
  Exam,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  ArcStatus,
  ArcGoalStatus,
  ArcMilestoneStatus,
  CreateArcInput,
  UpdateArcInput,
  CreateArcGoalInput,
  UpdateArcGoalInput,
  CreateArcMilestoneInput,
  UpdateArcMilestoneInput,
  ArcReviewData,
  DailyReflectionItem,
} from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ArcFormModal } from '@/components/arc/ArcFormModal';
import { ArcGoalFormModal } from '@/components/arc/ArcGoalFormModal';
import { ArcMilestoneFormModal } from '@/components/arc/ArcMilestoneFormModal';
import { LinkTaskModal } from '@/components/arc/LinkTaskModal';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { formatDisplayDate, getTodayDateString } from '@/lib/utils/date';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Target,
  Flag,
  CheckSquare,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Check,
  Lock,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  GraduationCap,
  Flame,
  TrendingUp,
  Award,
  ChevronRight,
  ListTodo,
} from 'lucide-react';

const ARC_TYPE_LABELS: Record<string, { label: string; variant: 'info' | 'neutral' | 'warning' | 'success' | 'danger' }> = {
  winter_arc: { label: '❄️ Winter Arc', variant: 'info' },
  exam_sprint: { label: '🎓 Exam Sprint', variant: 'warning' },
  fitness: { label: '🏋️ Fitness Arc', variant: 'success' },
  study: { label: '📚 Study Arc', variant: 'info' },
  project: { label: '💻 Project Sprint', variant: 'neutral' },
  semester: { label: '🏫 Semester Arc', variant: 'warning' },
  challenge: { label: '🔥 Habit Challenge', variant: 'danger' },
  custom: { label: '🎯 Custom Arc', variant: 'neutral' },
  other: { label: '✨ Arc', variant: 'neutral' },
};

const STATUS_BADGE_VARIANTS: Record<ArcStatus, { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' | 'danger' }> = {
  active: { label: 'Active Sprint', variant: 'success' },
  planned: { label: 'Planned', variant: 'info' },
  completed: { label: 'Completed', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export default function ArcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const arcId = decodeURIComponent(rawId || '');

  const [arcDetail, setArcDetail] = useState<ArcDetail | null>(null);
  const [analytics, setAnalytics] = useState<ArcAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sub-tab in command center
  const [activeTab, setActiveTab] = useState<'goals' | 'milestones' | 'tasks' | 'timeline' | 'journal'>('goals');
  const [arcReview, setArcReview] = useState<ArcReviewData | null>(null);
  const [journalFilter, setJournalFilter] = useState<'all' | 'wentWell' | 'difficulties' | 'learnings' | 'notes'>('all');

  // Modals
  const [isEditArcOpen, setIsEditArcOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ArcGoal | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ArcMilestone | null>(null);
  const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Confirm delete dialogs
  const [deleteType, setDeleteType] = useState<'arc' | 'goal' | 'milestone' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredJournalReflections = useMemo(() => {
    if (!arcReview?.reflections) return [];
    if (journalFilter === 'all') return arcReview.reflections;
    return arcReview.reflections.filter((r) => {
      if (journalFilter === 'wentWell') return Boolean(r.wentWell);
      if (journalFilter === 'difficulties') return Boolean(r.difficulties);
      if (journalFilter === 'learnings') return Boolean(r.learnings);
      if (journalFilter === 'notes') return Boolean(r.notes);
      return true;
    });
  }, [arcReview, journalFilter]);

  // Persistent state to guarantee non-reversibility across fast clicks and background refetches
  const [completedGoalIds, setCompletedGoalIds] = useState<Set<string>>(new Set());
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<Set<string>>(new Set());

  const getStorageKey = useCallback(
    (type: 'goals' | 'milestones') => `SELF_TRACKER_COMPLETED_${type.toUpperCase()}_${arcId}`,
    [arcId]
  );

  const loadLockedIds = useCallback(() => {
    if (typeof window === 'undefined' || !arcId) return;
    try {
      const savedGoals = localStorage.getItem(getStorageKey('goals'));
      if (savedGoals) {
        const ids: string[] = JSON.parse(savedGoals);
        setCompletedGoalIds(new Set(ids));
      }
      const savedMilestones = localStorage.getItem(getStorageKey('milestones'));
      if (savedMilestones) {
        const ids: string[] = JSON.parse(savedMilestones);
        setCompletedMilestoneIds(new Set(ids));
      }
    } catch {}
  }, [arcId, getStorageKey]);

  const lockGoalCompleted = useCallback(
    (goalId: string) => {
      setCompletedGoalIds((prev) => {
        const updated = new Set(prev);
        updated.add(goalId);
        if (typeof window !== 'undefined' && arcId) {
          try {
            localStorage.setItem(
              getStorageKey('goals'),
              JSON.stringify(Array.from(updated))
            );
          } catch {}
        }
        return updated;
      });
    },
    [arcId, getStorageKey]
  );

  const lockMilestoneCompleted = useCallback(
    (milestoneId: string) => {
      setCompletedMilestoneIds((prev) => {
        const updated = new Set(prev);
        updated.add(milestoneId);
        if (typeof window !== 'undefined' && arcId) {
          try {
            localStorage.setItem(
              getStorageKey('milestones'),
              JSON.stringify(Array.from(updated))
            );
          } catch {}
        }
        return updated;
      });
    },
    [arcId, getStorageKey]
  );

  const loadArcData = useCallback(async (showLoading = true) => {
    if (!arcId) return;

    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    loadLockedIds();

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const [detailRes, analyticsRes, reviewRes] = await Promise.all([
        apiClient.getArcById(arcId),
        apiClient.getArcAnalytics(arcId).catch(() => null),
        apiClient.getArcReview(arcId).catch(() => null),
      ]);

      if (detailRes && (detailRes.arc || (detailRes as unknown as Record<string, unknown>).id)) {
        const raw = detailRes as unknown as Record<string, unknown>;
        const normalizedDetail: ArcDetail = detailRes.arc
          ? detailRes
          : {
              arc: (raw.arc || raw) as unknown as Arc,
              goals: (raw.goals as ArcGoal[]) || [],
              milestones: (raw.milestones as ArcMilestone[]) || [],
              linkedTasks: ((raw.linkedTasks || raw.tasks) as Task[]) || [],
              linkedExam: (raw.linkedExam as unknown as Exam) || null,
              metrics: (raw.metrics as ArcMetrics) || {
                totalGoals: 0,
                completedGoals: 0,
                goalProgress: 0,
                totalMilestones: 0,
                completedMilestones: 0,
                milestoneProgress: 0,
                totalTasks: 0,
                completedTasks: 0,
                taskProgress: 0,
                overallProgress: 0,
                daysRemaining: null,
                daysElapsed: 0,
                totalDays: 1,
              },
            };

        // Merge incoming data with previously completed items to guarantee non-reversibility
        setArcDetail((prev) => {
          const lockedGoalIds = new Set<string>(completedGoalIds);
          if (prev?.goals) {
            prev.goals.forEach((g) => {
              const t = g.targetValue || 1;
              const c = g.currentValue || 0;
              if (g.status === 'completed' || c >= t) {
                lockedGoalIds.add(g.id);
              }
            });
          }

          const safeGoals = (normalizedDetail.goals || []).map((g) => {
            const tVal = g.targetValue || 1;
            const cVal = g.currentValue || 0;
            const isLocked = lockedGoalIds.has(g.id) || g.status === 'completed' || cVal >= tVal;
            if (isLocked) {
              lockGoalCompleted(g.id);
              return {
                ...g,
                status: 'completed' as const,
                currentValue: cVal < tVal ? tVal : cVal,
              };
            }
            return g;
          });

          const lockedMilestoneIds = new Set<string>(completedMilestoneIds);
          if (prev?.milestones) {
            prev.milestones.forEach((m) => {
              if (m.status === 'completed') {
                lockedMilestoneIds.add(m.id);
              }
            });
          }

          const safeMilestones = (normalizedDetail.milestones || []).map((m) => {
            const isLocked = lockedMilestoneIds.has(m.id) || m.status === 'completed';
            if (isLocked) {
              lockMilestoneCompleted(m.id);
              return {
                ...m,
                status: 'completed' as const,
              };
            }
            return m;
          });

          const compGoals = safeGoals.filter((g) => g.status === 'completed').length;
          const goalSum = safeGoals.reduce((sum, g) => {
            const t = g.targetValue || 1;
            const c = g.currentValue || 0;
            return sum + Math.min(100, Math.max(0, Math.round((c / t) * 100)));
          }, 0);
          const avgGoalProg = safeGoals.length > 0 ? Math.round(goalSum / safeGoals.length) : 0;

          const compMilestones = safeMilestones.filter((m) => m.status === 'completed').length;
          const avgMilestoneProg =
            safeMilestones.length > 0
              ? Math.round((compMilestones / safeMilestones.length) * 100)
              : 0;

          return {
            ...normalizedDetail,
            goals: safeGoals,
            milestones: safeMilestones,
            metrics: {
              ...(normalizedDetail.metrics || {}),
              completedGoals: compGoals,
              goalProgress: avgGoalProg,
              completedMilestones: compMilestones,
              milestoneProgress: avgMilestoneProg,
            },
          };
        });
      } else {
        setError('Arc not found.');
      }

      if (analyticsRes) {
        setAnalytics(analyticsRes);
      }

      if (reviewRes) {
        setArcReview(reviewRes);
      }
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load arc data:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to load arc data');
    } finally {
      setIsLoading(false);
    }
  }, [arcId, loadLockedIds, lockGoalCompleted, lockMilestoneCompleted]);

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadArcData(false);
      }
    };

    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);
    loadArcData();

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadArcData]);

  // Arc updates
  const handleUpdateArc = async (input: CreateArcInput | UpdateArcInput) => {
    await apiClient.updateArc(input as UpdateArcInput);
    await loadArcData(false);
  };

  const handleStatusChange = async (newStatus: ArcStatus) => {
    if (!arcDetail) return;
    try {
      await apiClient.setArcStatus(arcDetail.arc.id, newStatus);
      await loadArcData(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArc = async () => {
    if (!arcDetail) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteArc(arcDetail.arc.id);
      router.push('/arc');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete arc');
      setIsDeleting(false);
    }
  };

  // Goal operations
  const handleSaveGoal = async (input: CreateArcGoalInput | UpdateArcGoalInput) => {
    if ('id' in input && input.id) {
      if (completedGoalIds.has(input.id)) {
        (input as UpdateArcGoalInput).status = 'completed';
      }
      await apiClient.updateArcGoal(input as UpdateArcGoalInput);
    } else {
      await apiClient.createArcGoal(input as CreateArcGoalInput);
    }
    await loadArcData(false);
  };

  const handleQuickIncrementGoal = async (goal: ArcGoal, amount: number) => {
    try {
      const targetVal = goal.targetValue || 1;
      const currVal = goal.currentValue || 0;
      const isComplete =
        goal.status === 'completed' ||
        currVal >= targetVal ||
        completedGoalIds.has(goal.id);

      // Completed goals cannot have their progress reduced backwards
      if (isComplete && amount < 0) {
        return;
      }

      const nextVal = Math.max(0, (goal.currentValue || 0) + amount);
      const willBeCompleted = isComplete || nextVal >= targetVal;

      if (willBeCompleted) {
        lockGoalCompleted(goal.id);
      }

      // Optimistic update
      setArcDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  currentValue: nextVal,
                  status: willBeCompleted ? ('completed' as const) : g.status,
                }
              : g
          ),
        };
      });

      await apiClient.updateArcGoalProgress(goal.id, nextVal);
      await loadArcData(false);
    } catch (err) {
      console.error(err);
      await loadArcData(false);
    }
  };

  const handleToggleGoalStatus = async (goal: ArcGoal) => {
    try {
      const targetVal = goal.targetValue || 1;
      const currVal = goal.currentValue || 0;
      const isComplete =
        goal.status === 'completed' ||
        currVal >= targetVal ||
        completedGoalIds.has(goal.id);

      // Once completed, clicking the checkbox cannot reverse it back to active
      if (isComplete) {
        return;
      }

      // Lock synchronously to prevent rapid multi-clicks
      lockGoalCompleted(goal.id);

      // Optimistic update so UI immediately flips to completed and locks
      const finalVal = currVal < targetVal ? targetVal : currVal;
      setArcDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  status: 'completed' as const,
                  currentValue: finalVal,
                }
              : g
          ),
        };
      });

      await apiClient.updateArcGoal({
        id: goal.id,
        arcId: goal.arcId,
        status: 'completed',
        currentValue: finalVal,
      });
      await loadArcData(false);
    } catch (err) {
      console.error(err);
      await loadArcData(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteArcGoal(deletingId);
      setDeleteType(null);
      setDeletingId(null);
      await loadArcData(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  // Milestone operations
  const handleSaveMilestone = async (input: CreateArcMilestoneInput | UpdateArcMilestoneInput) => {
    if ('id' in input && input.id) {
      if (completedMilestoneIds.has(input.id)) {
        (input as UpdateArcMilestoneInput).status = 'completed';
      }
      await apiClient.updateArcMilestone(input as UpdateArcMilestoneInput);
    } else {
      await apiClient.createArcMilestone(input as CreateArcMilestoneInput);
    }
    await loadArcData(false);
  };

  const handleToggleMilestoneStatus = async (milestone: ArcMilestone) => {
    try {
      const isReached =
        milestone.status === 'completed' ||
        completedMilestoneIds.has(milestone.id);

      // Once reached, clicking the checkbox cannot reverse it back to pending
      if (isReached) {
        return;
      }

      lockMilestoneCompleted(milestone.id);

      // Optimistic update
      setArcDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map((m) =>
            m.id === milestone.id ? { ...m, status: 'completed' as const } : m
          ),
        };
      });

      await apiClient.setArcMilestoneStatus(milestone.id, 'completed');
      await loadArcData(false);
    } catch (err) {
      console.error(err);
      await loadArcData(false);
    }
  };

  const handleDeleteMilestone = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteArcMilestone(deletingId);
      setDeleteType(null);
      setDeletingId(null);
      await loadArcData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete milestone');
    } finally {
      setIsDeleting(false);
    }
  };

  // Task operations
  const handleToggleTask = async (task: Task) => {
    try {
      await apiClient.toggleTask(task.id, task.status);
      await loadArcData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    try {
      await apiClient.unlinkTaskFromArc(taskId);
      await loadArcData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTaskForArc = async (input: CreateTaskInput | UpdateTaskInput) => {
    try {
      const newTask = await apiClient.createTask(input as CreateTaskInput);
      if (newTask && newTask.id && arcId) {
        await apiClient.linkTaskToArc(newTask.id, arcId);
      }
      await loadArcData();
    } catch (err: unknown) {
      console.error('Failed to create task for arc:', err);
      alert(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading Arc Command Center..." />;
  }

  if (error || !arcDetail) {
    if (!isBackendConfigured() || isSetupRequiredError(error)) {
      return (
        <div className="space-y-6">
          <Link
            href="/arc"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Arcs
          </Link>
          <SetupRequiredState featureName="view this Arc and its milestones" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Link
          href="/arc"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Arcs
        </Link>
        <ErrorState message={error || 'Arc not found'} onRetry={loadArcData} />
      </div>
    );
  }

  const { arc, goals, milestones, linkedTasks, linkedExam, metrics } = arcDetail;
  const isWinterArc =
    arc.type === 'winter_arc' ||
    Boolean(arc.name?.toLowerCase().includes('winter arc'));
  const typeConfig = ARC_TYPE_LABELS[arc.type] || { label: arc.type, variant: 'neutral' };
  const statusConfig = STATUS_BADGE_VARIANTS[arc.status] || { label: arc.status, variant: 'neutral' };

  const overallProgress = Math.round(metrics.overallProgress || 0);
  const goalProgress = Math.round(metrics.goalProgress || 0);
  const milestoneProgress = Math.round(metrics.milestoneProgress || 0);
  const taskProgress = Math.round(metrics.taskProgress || 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/arc"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Arcs</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {arc.status === 'planned' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('active')}
              className="text-emerald-700 dark:text-emerald-300 font-semibold h-[29.59px] whitespace-nowrap"
            >
              🚀 Launch Arc
            </Button>
          )}
          {arc.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('completed')}
              className="text-indigo-700 dark:text-indigo-300 font-semibold h-[29.59px] whitespace-nowrap"
            >
              🎉 Complete Arc
            </Button>
          )}
          {arc.status === 'completed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('active')}
              className="text-amber-700 dark:text-amber-300 font-semibold h-[29.59px] whitespace-nowrap"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reopen Arc
            </Button>
          )}
          {arc.status === 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange('active')}
              className="text-emerald-700 dark:text-emerald-300 font-semibold h-[29.59px] whitespace-nowrap"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Restore Arc
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditArcOpen(true)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            className="h-[29.59px] whitespace-nowrap"
          >
            Edit Arc
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDeleteType('arc');
              setDeletingId(arc.id);
            }}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 h-[29.59px]"
            title="Delete Arc"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Hero Command Banner with Status Top Border */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs ${
          arc.status === 'active'
            ? 'border-t-4 border-t-emerald-500'
            : arc.status === 'planned'
            ? 'border-t-4 border-t-sky-500'
            : arc.status === 'completed'
            ? 'border-t-4 border-t-indigo-500'
            : 'border-t-4 border-t-rose-400'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Info */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 text-3xl shadow-xs shrink-0">
              {arc.icon || '🎯'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant={typeConfig.variant} size="sm">
                  {typeConfig.label}
                </Badge>

                {/* Interactive Status Selector */}
                <div className="relative inline-block">
                  <select
                    value={arc.status}
                    onChange={(e) => handleStatusChange(e.target.value as ArcStatus)}
                    className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer transition-all appearance-none pr-5 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs ${
                      arc.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : arc.status === 'planned'
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                        : arc.status === 'completed'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                    title="Click to update Arc status"
                  >
                    <option value="active">🟢 Active Sprint</option>
                    <option value="planned">🔵 Planned</option>
                    <option value="completed">🟣 Completed</option>
                    <option value="cancelled">🔴 Cancelled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[9px] opacity-70">
                    ▼
                  </div>
                </div>

                {/* Status-specific countdown or state */}
                {arc.status === 'completed' ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Completed
                  </span>
                ) : arc.status === 'cancelled' ? (
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Cancelled
                  </span>
                ) : arc.status === 'planned' ? (
                  (() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const daysUntilStart = arc.startDate
                      ? Math.ceil((new Date(arc.startDate).getTime() - new Date(todayStr).getTime()) / (24 * 3600 * 1000))
                      : 0;
                    return (
                      <span className="text-xs font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {daysUntilStart > 0 ? `Starts in ${daysUntilStart}d` : 'Ready to launch'}
                      </span>
                    );
                  })()
                ) : (
                  metrics.daysRemaining !== null && metrics.daysRemaining !== undefined && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {metrics.daysRemaining >= 0
                        ? `${metrics.daysRemaining} days left`
                        : `Sprint ended`}
                    </span>
                  )
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {arc.name}
              </h1>
              {arc.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                  {arc.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {arc.startDate} &rarr; {arc.endDate} ({metrics.totalDays} days total)
                </span>
                {linkedExam && (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Target Exam: {linkedExam.name} ({linkedExam.examDate})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Composite Progress Card */}
          <div className="w-full lg:w-80 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Composite Progress
              </span>
              <span
                className={`text-sm font-extrabold ${
                  arc.status === 'completed'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {arc.status === 'completed' ? Math.max(100, overallProgress) : overallProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  arc.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, arc.status === 'completed' ? 100 : overallProgress))}%`,
                }}
              />
            </div>
            {/* Breakdown */}
            <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>🎯 Measurable Goals</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{goalProgress}% ({metrics.completedGoals}/{metrics.totalGoals})</span>
              </div>
              <div className="flex justify-between">
                <span>🚩 Checkpoints</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{milestoneProgress}% ({metrics.completedMilestones}/{metrics.totalMilestones})</span>
              </div>
              <div className="flex justify-between">
                <span>✅ Linked Tasks</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{taskProgress}% ({metrics.completedTasks}/{metrics.totalTasks})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Highlights Banner (if available) */}
      {analytics?.studyStats && (analytics.studyStats.totalStudyHours > 0 || analytics.studyStats.totalFocusHours > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3.5 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Arc Study Hours</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {analytics.studyStats.totalStudyHours}h
            </div>
          </Card>
          <Card className="p-3.5 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Focus Hours</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              {analytics.studyStats.totalFocusHours}h
            </div>
          </Card>
          <Card className="p-3.5 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Study Days</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {analytics.studyStats.activeDaysCount} days
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Sub-tabs & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Tabs
          tabs={[
            { id: 'goals', label: `Goals (${goals.length})` },
            { id: 'milestones', label: `Checkpoints (${milestones.length})` },
            { id: 'tasks', label: `Linked Tasks (${linkedTasks.length})` },
            { id: 'timeline', label: 'Timeline & Events' },
            { id: 'journal', label: `📔 Arc Journal (${arcReview?.reflections.length || 0})` },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'goals' | 'milestones' | 'tasks' | 'timeline' | 'journal')}
        />

        <div className="flex items-center gap-2">
          {activeTab === 'goals' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingGoal(null);
                setIsGoalModalOpen(true);
              }}
            >
              Add Goal
            </Button>
          )}

          {activeTab === 'milestones' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingMilestone(null);
                setIsMilestoneModalOpen(true);
              }}
            >
              Add Checkpoint
            </Button>
          )}

          {activeTab === 'tasks' && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateTaskModalOpen(true)}
              >
                Create Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                onClick={() => setIsLinkTaskModalOpen(true)}
              >
                Link Tasks
              </Button>
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="flex items-center gap-2">
              <Link href="/reviews">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Full Reviews
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/daily-log')}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Today&apos;s Reflection</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. GOALS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <EmptyState
              icon={<Target className="w-8 h-8" />}
              title="No Measurable Goals Yet"
              description="Define target metrics like focus hours, questions solved, syllabus chapters, or workouts."
              actionLabel="Add Your First Goal"
              onAction={() => {
                setEditingGoal(null);
                setIsGoalModalOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const targetVal = goal.targetValue || 1;
                const currVal = goal.currentValue || 0;
                const pct = Math.min(100, Math.max(0, Math.round((currVal / targetVal) * 100)));
                const isComplete =
                  goal.status === 'completed' ||
                  currVal >= targetVal ||
                  completedGoalIds.has(goal.id);

                return (
                  <Card key={goal.id} className="p-4 flex flex-col justify-between">
                    <div>
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleGoalStatus(goal)}
                            disabled={isComplete}
                            className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                              isComplete
                                ? 'bg-emerald-500 border-emerald-500 text-white cursor-default opacity-95 shadow-2xs pointer-events-none'
                                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 cursor-pointer'
                            }`}
                            title={isComplete ? 'Goal completed (Locked)' : 'Mark completed'}
                            aria-label={isComplete ? 'Goal completed (Locked)' : 'Mark completed'}
                          >
                            {isComplete && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <h4
                            className={`text-sm font-bold ${
                              isComplete
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {goal.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {goal.priority === 'high' && (
                            <Badge variant="warning" size="sm">
                              High
                            </Badge>
                          )}
                          <Badge
                            variant={isComplete ? 'success' : goal.status === 'cancelled' ? 'danger' : 'info'}
                            size="sm"
                          >
                            {isComplete ? 'completed' : goal.status}
                          </Badge>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                          {goal.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-600 dark:text-slate-400">
                            {currVal} / {targetVal} {goal.unit || ''}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick increment buttons & options */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickIncrementGoal(goal, 1)}
                          className="text-xs py-1 px-2.5 h-auto"
                        >
                          +1 {goal.unit || ''}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickIncrementGoal(goal, 5)}
                          className="text-xs py-1 px-2.5 h-auto"
                        >
                          +5
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickIncrementGoal(goal, -1)}
                          disabled={isComplete}
                          className={`text-xs py-1 px-2 h-auto ${
                            isComplete
                              ? 'opacity-40 cursor-not-allowed text-slate-300 dark:text-slate-600'
                              : 'text-slate-400'
                          }`}
                          title={
                            isComplete
                              ? 'Completed goals cannot be reduced backwards'
                              : undefined
                          }
                        >
                          -1
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingGoal(goal);
                            setIsGoalModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteType('goal');
                            setDeletingId(goal.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MILESTONES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <EmptyState
              icon={<Flag className="w-8 h-8" />}
              title="No Milestones Checkpoints"
              description="Add key target checkpoints and dates to pace yourself through this Arc."
              actionLabel="Add First Checkpoint"
              onAction={() => {
                setEditingMilestone(null);
                setIsMilestoneModalOpen(true);
              }}
            />
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => {
                const isReached =
                  m.status === 'completed' ||
                  completedMilestoneIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1 pr-4">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestoneStatus(m)}
                        disabled={isReached}
                        className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          isReached
                            ? 'bg-amber-500 border-amber-500 text-white cursor-default opacity-95 shadow-2xs pointer-events-none'
                            : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 cursor-pointer'
                        }`}
                        title={isReached ? 'Checkpoint reached (Locked)' : 'Mark checkpoint reached'}
                        aria-label={isReached ? 'Checkpoint reached (Locked)' : 'Mark checkpoint reached'}
                      >
                        {isReached && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-bold ${
                              isReached
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {m.title}
                          </h4>
                          <Badge
                            variant={isReached ? 'success' : m.status === 'cancelled' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {isReached ? 'Reached' : m.status}
                          </Badge>
                        </div>
                        {m.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Target Date: {m.targetDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingMilestone(m);
                          setIsMilestoneModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteType('milestone');
                          setDeletingId(m.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LINKED TASKS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {linkedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="p-3 mb-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Tasks Linked
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                Connect existing tasks or create new ones for this Arc to count them toward sprint completion.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateTaskModalOpen(true)}
                >
                  Create Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                  onClick={() => setIsLinkTaskModalOpen(true)}
                >
                  Link Existing Tasks
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {linkedTasks.map((task) => {
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <div className="min-w-0">
                        <span
                          className={`text-sm font-medium ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
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
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUnlinkTask(task.id)}
                        className="text-xs py-1 px-2 h-auto text-slate-400 hover:text-red-600"
                        title="Unlink from Arc (task is preserved)"
                      >
                        <Unlink className="w-3.5 h-3.5 mr-1" /> Unlink
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TIMELINE & EVENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Arc Chronological Roadmap</CardTitle>
          </CardHeader>
          <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-6 ml-2 mt-4">
            {/* Start Event */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900" />
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {arc.startDate}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                🚀 Arc Begins: {arc.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target duration: {metrics.totalDays} days
              </div>
            </div>

            {/* Milestones in chronological order */}
            {milestones
              .slice()
              .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
              .map((m) => (
                <div key={m.id} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                      m.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {m.targetDate}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🚩 {m.title}</span>
                    <Badge variant={m.status === 'completed' ? 'success' : 'warning'} size="sm">
                      {m.status === 'completed' ? 'Reached' : 'Upcoming'}
                    </Badge>
                  </div>
                  {m.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.description}
                    </div>
                  )}
                </div>
              ))}

            {/* Linked Exam Event if any */}
            {linkedExam && (
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-purple-600 border-4 border-white dark:border-slate-900" />
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  {linkedExam.examDate}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  🎓 Linked Exam: {linkedExam.name} ({linkedExam.subject})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Preparation status: {linkedExam.status}
                </div>
              </div>
            )}

            {/* End Event */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-400 border-4 border-white dark:border-slate-900" />
              <div className="text-xs font-bold text-slate-500">
                {arc.endDate}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                🏁 Arc Horizon Target End
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluation and sprint wrap-up
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Arc Journal */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📔</span>
                <span>{arc.name} Journal & Reflections</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily Log reflections recorded within this Arc timeframe ({arc.startDate} &rarr; {arc.endDate}).
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'wentWell', label: '👍 Wins' },
                  { id: 'difficulties', label: '⚠️ Difficulties' },
                  { id: 'learnings', label: '💡 Learnings' },
                  { id: 'notes', label: '📝 General' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setJournalFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    journalFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredJournalReflections.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8 text-slate-400" />}
              title="No reflections inside this Arc yet"
              description="Write reflections in your Daily Log during the Arc date range and entries will appear here automatically."
              actionLabel="Write Today's Reflection"
              onAction={() => router.push('/daily-log')}
            />
          ) : (
            <div className="space-y-3">
              {filteredJournalReflections.map((item) => (
                <Card key={item.date} className="p-4 space-y-2.5 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatDisplayDate(item.date, { includeWeekday: true })}
                      </span>
                      {item.studyHours ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                          {item.studyHours}h study
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/daily-log?date=${item.date}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Daily Log</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-2 text-xs">
                    {item.notes && (journalFilter === 'all' || journalFilter === 'notes') && (
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {item.notes}
                      </p>
                    )}

                    {item.wentWell && (journalFilter === 'all' || journalFilter === 'wentWell') && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        <span className="font-bold mr-1">Went Well:</span>
                        {item.wentWell}
                      </div>
                    )}

                    {item.difficulties && (journalFilter === 'all' || journalFilter === 'difficulties') && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 leading-relaxed">
                        <span className="font-bold mr-1">Difficulties:</span>
                        {item.difficulties}
                      </div>
                    )}

                    {item.learnings && (journalFilter === 'all' || journalFilter === 'learnings') && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 leading-relaxed">
                        <span className="font-bold mr-1">Learned:</span>
                        {item.learnings}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ArcFormModal
        isOpen={isEditArcOpen}
        onClose={() => setIsEditArcOpen(false)}
        onSubmit={handleUpdateArc}
        initialArc={arc}
      />

      <ArcGoalFormModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={handleSaveGoal}
        arcId={arc.id}
        initialGoal={editingGoal}
        isWinterArc={isWinterArc}
      />

      <ArcMilestoneFormModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        onSubmit={handleSaveMilestone}
        arcId={arc.id}
        arcStartDate={arc.startDate}
        arcEndDate={arc.endDate}
        initialMilestone={editingMilestone}
      />

      <LinkTaskModal
        isOpen={isLinkTaskModalOpen}
        onClose={() => setIsLinkTaskModalOpen(false)}
        arcId={arc.id}
        goals={goals}
        onTaskLinked={loadArcData}
      />

      <TaskFormModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={handleCreateTaskForArc}
        defaultDate={getTodayDateString()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteType)}
        onClose={() => {
          setDeleteType(null);
          setDeletingId(null);
        }}
        onConfirm={
          deleteType === 'arc'
            ? handleDeleteArc
            : deleteType === 'goal'
            ? handleDeleteGoal
            : handleDeleteMilestone
        }
        title={
          deleteType === 'arc'
            ? 'Delete Arc Sprint'
            : deleteType === 'goal'
            ? 'Delete Goal'
            : 'Delete Milestone'
        }
        message={
          deleteType === 'arc'
            ? 'Are you sure you want to delete this Arc? All underlying tasks and exams will remain safe in your database, but goal definitions and checkpoint links will be removed.'
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
