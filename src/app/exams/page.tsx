'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import { Exam, CreateExamInput, UpdateExamInput, ExamFilters, ExamStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ExamCard } from '@/components/exams/ExamCard';
import { ExamFormModal } from '@/components/exams/ExamFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EXAM_STATUSES } from '@/lib/constants/categories';
import { Plus, GraduationCap, Search, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<ExamFilters>({
    status: 'all',
    subject: 'all',
    search: '',
  });

  // Collapsible filters section (collapsed by default)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Active status tab
  const [activeTab, setActiveTab] = useState<'all' | 'planned' | 'preparing' | 'completed' | 'cancelled'>('all');

  // Modals & Action States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const loadExams = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.listExams(filters);
      setExams(res && Array.isArray(res.exams) ? res.exams : []);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load exams:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load exams.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadExams();

    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadExams();
      }
    };
    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadExams]);


  const handleSave = async (input: CreateExamInput | UpdateExamInput) => {
    if ('id' in input && input.id) {
      await apiClient.updateExam(input);
    } else {
      await apiClient.createExam(input as CreateExamInput);
    }
    await loadExams();
  };

  const handleDelete = async () => {
    if (!deletingExamId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteExam(deletingExamId);
      setDeletingExamId(null);
      await loadExams();
    } catch (err: unknown) {
      console.error('Failed to delete exam:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete exam');
    } finally {
      setIsDeleting(false);
    }
  };

  // Unique subjects for filter dropdown
  const subjects = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.subject) set.add(e.subject);
    });
    return Array.from(set);
  }, [exams]);

  // Client-side filtering
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Tab filter
      if (activeTab !== 'all' && exam.status !== activeTab) {
        return false;
      }
      // Subject filter
      if (filters.subject && filters.subject !== 'all' && exam.subject !== filters.subject) {
        return false;
      }
      // Search filter
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = exam.name.toLowerCase().includes(q);
        const matchesSubject = exam.subject.toLowerCase().includes(q);
        const matchesVenue = exam.venue?.toLowerCase().includes(q);
        if (!matchesName && !matchesSubject && !matchesVenue) {
          return false;
        }
      }
      return true;
    });
  }, [exams, activeTab, filters.subject, filters.search]);

  const counts = useMemo(() => {
    return {
      all: exams.length,
      planned: exams.filter((e) => e.status === 'planned').length,
      preparing: exams.filter((e) => e.status === 'preparing').length,
      completed: exams.filter((e) => e.status === 'completed').length,
    };
  }, [exams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams Management"
        description="Track examination schedules, venues, and maintain explicit separation between actual exam dates and preparation deadlines."
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingExam(null);
              setIsFormModalOpen(true);
            }}
          >
            Add Exam
          </Button>
        }
      />

      {/* Filters Bar (Collapsible by default) */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all shadow-xs">
        {/* Header Bar / Toggle */}
        <div className="p-3 sm:p-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
          <button
            type="button"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
            aria-expanded={isFiltersExpanded}
            aria-label="Toggle search and filters"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              Search & Filter Exams
            </span>
            {(filters.search || filters.subject !== 'all' || filters.status !== 'all' || activeTab !== 'all') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {[
                  Boolean(filters.search),
                  Boolean(filters.subject && filters.subject !== 'all'),
                  Boolean(filters.status && filters.status !== 'all'),
                  Boolean(activeTab !== 'all'),
                ].filter(Boolean).length} active
              </span>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200',
                isFiltersExpanded && 'rotate-180'
              )}
            />
          </button>

          <div className="flex items-center gap-3">
            {(filters.search || filters.subject !== 'all' || filters.status !== 'all' || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setFilters({ status: 'all', subject: 'all', search: '' });
                  setActiveTab('all');
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {isFiltersExpanded && (
          <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <Input
                  placeholder="Search by exam name or venue..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>

              <Select
                value={filters.subject || 'all'}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>

              <Select
                value={filters.status || 'all'}
                onChange={(e) => {
                  const val = e.target.value as ExamStatus | 'all';
                  setFilters({ ...filters, status: val });
                  if (val !== 'all') setActiveTab(val);
                }}
              >
                <option value="all">All Statuses</option>
                {EXAM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Status Tabs - positioned in Header between timezone span and search button on desktop */}
      {headerSlot ? (
        createPortal(
          <Tabs
            size="sm"
            tabs={[
              { id: 'all', label: 'All Exams', count: counts.all, icon: <GraduationCap className="w-3 h-3" /> },
              { id: 'planned', label: 'Planned', count: counts.planned },
              { id: 'preparing', label: 'Preparing', count: counts.preparing },
              { id: 'completed', label: 'Completed', count: counts.completed },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          />,
          headerSlot
        )
      ) : (
        <Tabs
          tabs={[
            { id: 'all', label: 'All Exams', count: counts.all, icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { id: 'planned', label: 'Planned', count: counts.planned },
            { id: 'preparing', label: 'Preparing', count: counts.preparing },
            { id: 'completed', label: 'Completed', count: counts.completed },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        />
      )}

      {/* Content Area */}
      {isLoading ? (
        <LoadingState message="Loading exam records from backend..." />
      ) : error ? (
        !isBackendConfigured() || isSetupRequiredError(error) ? (
          <SetupRequiredState featureName="track your upcoming exams and preparation deadlines" />
        ) : (
          <ErrorState
            title="Failed to load exams"
            message={error}
            onRetry={loadExams}
          />
        )
      ) : filteredExams.length === 0 ? (

        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title={
            activeTab === 'completed'
              ? 'No completed exams'
              : activeTab === 'preparing'
              ? 'No exams currently in preparation'
              : 'No exams found'
          }
          description="Create and organize your upcoming examination dates and syllabus preparation goals."
          actionLabel="Add Exam"
          onAction={() => {
            setEditingExam(null);
            setIsFormModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={(e) => {
                setEditingExam(e);
                setIsFormModalOpen(true);
              }}
              onDelete={(id) => setDeletingExamId(id)}
            />
          ))}
        </div>
      )}

      {/* Exam Form Modal */}
      <ExamFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExam(null);
        }}
        onSubmit={handleSave}
        exam={editingExam}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingExamId)}
        onClose={() => setDeletingExamId(null)}
        onConfirm={handleDelete}
        title="Delete Exam"
        message="Are you sure you want to delete this exam record? This action cannot be undone."
        confirmText="Delete Exam"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
