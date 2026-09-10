'use client';

import React from 'react';
import Link from 'next/link';
import { Arc, ArcStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Target,
  Calendar,
  Flag,
  CheckSquare,
  ArrowRight,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
} from 'lucide-react';

interface ArcCardProps {
  arc: Arc;
  onEdit?: (arc: Arc) => void;
  onStatusChange?: (arcId: string, status: ArcStatus) => void;
}

const ARC_TYPE_LABELS: Record<string, { label: string; badgeVariant: 'info' | 'neutral' | 'warning' | 'success' | 'danger' }> = {
  winter_arc: { label: '❄️ Winter Arc', badgeVariant: 'info' },
  exam_sprint: { label: '🎓 Exam Sprint', badgeVariant: 'warning' },
  fitness: { label: '🏋️ Fitness Arc', badgeVariant: 'success' },
  study: { label: '📚 Study Arc', badgeVariant: 'info' },
  project: { label: '💻 Project Sprint', badgeVariant: 'neutral' },
  semester: { label: '🏫 Semester Arc', badgeVariant: 'warning' },
  challenge: { label: '🔥 Habit Challenge', badgeVariant: 'danger' },
  custom: { label: '🎯 Custom Arc', badgeVariant: 'neutral' },
  other: { label: '✨ Arc', badgeVariant: 'neutral' },
};

const STATUS_CONFIG: Record<
  ArcStatus,
  {
    label: string;
    variant: 'info' | 'success' | 'warning' | 'neutral' | 'danger';
    topBorder: string;
    cardBorder: string;
    selectClass: string;
  }
> = {
  active: {
    label: 'Active Sprint',
    variant: 'success',
    topBorder: 'border-t-4 border-t-emerald-500',
    cardBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
    selectClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  planned: {
    label: 'Planned',
    variant: 'info',
    topBorder: 'border-t-4 border-t-sky-500',
    cardBorder: 'hover:border-sky-300 dark:hover:border-sky-700/60',
    selectClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  completed: {
    label: 'Completed',
    variant: 'neutral',
    topBorder: 'border-t-4 border-t-indigo-500',
    cardBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700/60',
    selectClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'danger',
    topBorder: 'border-t-4 border-t-rose-400',
    cardBorder: 'hover:border-rose-300 dark:hover:border-rose-700/60',
    selectClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
};

export function ArcCard({ arc, onEdit, onStatusChange }: ArcCardProps) {
  const metrics = arc.metrics;
  const typeConfig = ARC_TYPE_LABELS[arc.type] || { label: arc.type, badgeVariant: 'neutral' };
  const currentStatusConfig = STATUS_CONFIG[arc.status] || STATUS_CONFIG.active;

  const rawProgress = Math.round(metrics?.overallProgress ?? 0);
  const overallProgress = arc.status === 'completed' ? Math.max(100, rawProgress) : rawProgress;
  const daysRemaining = metrics?.daysRemaining;
  const isPast = daysRemaining !== null && daysRemaining !== undefined && daysRemaining < 0;

  const getStatusDateInfo = () => {
    if (arc.status === 'completed') {
      return (
        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Completed
        </span>
      );
    }
    if (arc.status === 'cancelled') {
      return (
        <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
          Cancelled
        </span>
      );
    }
    if (arc.status === 'planned') {
      const todayStr = new Date().toISOString().split('T')[0];
      const daysUntilStart = arc.startDate
        ? Math.ceil((new Date(arc.startDate).getTime() - new Date(todayStr).getTime()) / (24 * 3600 * 1000))
        : 0;
      return (
        <span className="flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
          <Calendar className="w-3.5 h-3.5" />
          {daysUntilStart > 0 ? `Starts in ${daysUntilStart}d` : 'Ready to start'}
        </span>
      );
    }
    // active
    if (isPast) {
      return <span className="text-amber-600 dark:text-amber-400 font-medium">Sprint ended</span>;
    }
    if (daysRemaining !== null && daysRemaining !== undefined) {
      return (
        <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          {daysRemaining === 0 ? 'Last day today!' : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`}
        </span>
      );
    }
    return null;
  };

  return (
    <Card
      hoverable
      className={`group relative flex flex-col justify-between overflow-hidden p-5 transition-all ${
        currentStatusConfig.topBorder
      } ${currentStatusConfig.cardBorder} ${arc.status === 'cancelled' ? 'opacity-80' : ''}`}
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              {arc.icon || '🎯'}
            </div>
            <div>
              <Link
                href={`/arc/${arc.id}`}
                className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
              >
                {arc.name}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <Badge variant={typeConfig.badgeVariant} size="sm">
                  {typeConfig.label}
                </Badge>

                {onStatusChange ? (
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={arc.status}
                      onChange={(e) => onStatusChange(arc.id, e.target.value as ArcStatus)}
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer transition-all appearance-none pr-5 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs ${currentStatusConfig.selectClass}`}
                      title="Click to change Arc status"
                    >
                      <option value="active">🟢 Active</option>
                      <option value="planned">🔵 Planned</option>
                      <option value="completed">🟣 Completed</option>
                      <option value="cancelled">🔴 Cancelled</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[8px] opacity-70">
                      ▼
                    </div>
                  </div>
                ) : (
                  <Badge variant={currentStatusConfig.variant} size="sm">
                    {currentStatusConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {arc.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {arc.description}
          </p>
        )}

        {/* Date span & Status-driven countdown/info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {arc.startDate} &rarr; {arc.endDate}
            </span>
          </div>
          <div>{getStatusDateInfo()}</div>
        </div>

        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Overall Progress
            </span>
            <span className={arc.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-indigo-600 dark:text-indigo-400'}>
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                arc.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
            />
          </div>
        </div>

        {/* Sub-metrics breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
              <Target className="w-3 h-3 text-indigo-500" />
              {metrics?.completedGoals ?? 0}/{metrics?.totalGoals ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Goals</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
              <Flag className="w-3 h-3 text-amber-500" />
              {metrics?.completedMilestones ?? 0}/{metrics?.totalMilestones ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Checkpoints</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">
              <CheckSquare className="w-3 h-3 text-emerald-500" />
              {metrics?.completedTasks ?? 0}/{metrics?.totalTasks ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tasks</div>
          </div>
        </div>

        {/* Upcoming milestone preview */}
        {metrics?.upcomingMilestone && (
          <div className="text-xs p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold">Next:</span> {metrics.upcomingMilestone.title}
              <span className="text-[11px] opacity-80 ml-1">({metrics.upcomingMilestone.targetDate})</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={() => onEdit(arc)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Edit
            </button>
          )}
          {onStatusChange && (
            <>
              {arc.status === 'planned' && (
                <button
                  onClick={() => onStatusChange(arc.id, 'active')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1"
                  title="Activate this Arc"
                >
                  <span>🚀 Activate</span>
                </button>
              )}
              {arc.status === 'active' && (
                <button
                  onClick={() => onStatusChange(arc.id, 'completed')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors flex items-center gap-1"
                  title="Mark Arc as completed"
                >
                  <span>🎉 Complete</span>
                </button>
              )}
              {arc.status === 'completed' && (
                <button
                  onClick={() => onStatusChange(arc.id, 'active')}
                  className="text-xs text-amber-600 dark:text-amber-400 font-semibold px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center gap-1"
                  title="Reactivate Arc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reactivate</span>
                </button>
              )}
              {arc.status === 'cancelled' && (
                <button
                  onClick={() => onStatusChange(arc.id, 'active')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1"
                  title="Restore Arc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              )}
            </>
          )}
        </div>

        <Link
          href={`/arc/${arc.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>Command Center</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </Card>
  );
}
