'use client';

import React, { useState } from 'react';
import { TaskFilters, TaskPriority, TaskStatus } from '@/types';
import { DEFAULT_TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants/categories';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RotateCcw, Search, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  onReset: () => void;
  defaultExpanded?: boolean;
}

export function TaskFiltersBar({
  filters,
  onChange,
  onReset,
  defaultExpanded = false,
}: TaskFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const activeCount = [
    Boolean(filters.search),
    Boolean(filters.date),
    Boolean(filters.status && filters.status !== 'all'),
    Boolean(filters.category && filters.category !== 'all'),
    Boolean(filters.priority && filters.priority !== 'all'),
  ].filter(Boolean).length;

  const hasActiveFilters = activeCount > 0;

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all shadow-xs">
      {/* Header bar / Toggle */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
          aria-expanded={isExpanded}
          aria-label="Toggle search and filters"
        >
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            Filters & Search
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {activeCount} active
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filters Content */}
      {isExpanded && (
        <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                className="pl-8"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Date */}
            <div>
              <Input
                type="date"
                placeholder="Filter by date"
                value={filters.date || ''}
                onChange={(e) => onChange({ ...filters, date: e.target.value || undefined })}
              />
            </div>

            {/* Status */}
            <div>
              <Select
                value={filters.status || 'all'}
                onChange={(e) =>
                  onChange({ ...filters, status: e.target.value as TaskStatus | 'all' })
                }
              >
                <option value="all">All Statuses</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Category */}
            <div>
              <Select
                value={filters.category || 'all'}
                onChange={(e) => onChange({ ...filters, category: e.target.value })}
              >
                <option value="all">All Categories</option>
                {DEFAULT_TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Select
                value={filters.priority || 'all'}
                onChange={(e) =>
                  onChange({ ...filters, priority: e.target.value as TaskPriority | 'all' })
                }
              >
                <option value="all">All Priorities</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
