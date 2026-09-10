'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import {
  WeeklyReviewData,
  MonthlyReviewData,
  ArcReviewData,
  Arc,
  DailyReflectionItem,
} from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { formatDisplayDate, getTodayDateString } from '@/lib/utils/date';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Target,
  CheckCircle2,
  Clock,
  Flame,
  Moon,
  ThumbsUp,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  TrendingUp,
  FileText,
  Layers,
} from 'lucide-react';

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'arc'>('weekly');

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

  // Weekly Review State
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyReviewData | null>(null);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  // Monthly Review State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyReviewData | null>(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // Arc Review State
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [selectedArcId, setSelectedArcId] = useState<string>('');
  const [arcData, setArcData] = useState<ArcReviewData | null>(null);
  const [isLoadingArc, setIsLoadingArc] = useState(false);
  const [arcError, setArcError] = useState<string | null>(null);

  // Fetch Weekly Review
  const loadWeeklyReview = useCallback(async (startDate: string) => {
    if (!isBackendConfigured()) {
      setWeeklyError('Database setup required. Please complete the Setup Wizard.');
      return;
    }
    try {
      setIsLoadingWeekly(true);
      setWeeklyError(null);
      const res = await apiClient.getWeeklyReview(startDate);
      setWeeklyData(res);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Quota exceeded'));
        if (isRateLimit) {
          console.warn('Weekly review rate limited:', err);
        } else {
          console.error('Failed to load weekly review:', err);
        }
      }
      setWeeklyError(
        err instanceof Error
          ? err.message.includes('Quota exceeded') || err.message.includes('429')
            ? 'Google Sheets rate limit reached. Please wait a few seconds and try again.'
            : err.message
          : 'Unable to load weekly review.'
      );
    } finally {
      setIsLoadingWeekly(false);
    }
  }, []);

  // Fetch Monthly Review
  const loadMonthlyReview = useCallback(async (yearMonth: string) => {
    if (!isBackendConfigured()) {
      setMonthlyError('Database setup required. Please complete the Setup Wizard.');
      return;
    }
    try {
      setIsLoadingMonthly(true);
      setMonthlyError(null);
      const res = await apiClient.getMonthlyReview(yearMonth);
      setMonthlyData(res);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Quota exceeded'));
        if (isRateLimit) {
          console.warn('Monthly review rate limited:', err);
        } else {
          console.error('Failed to load monthly review:', err);
        }
      }
      setMonthlyError(
        err instanceof Error
          ? err.message.includes('Quota exceeded') || err.message.includes('429')
            ? 'Google Sheets rate limit reached. Please wait a few seconds and try again.'
            : err.message
          : 'Unable to load monthly review.'
      );
    } finally {
      setIsLoadingMonthly(false);
    }
  }, []);

  // Fetch Arcs List
  const loadArcs = useCallback(async () => {
    if (!isBackendConfigured()) {
      setArcError('Database setup required. Please complete the Setup Wizard.');
      return;
    }
    try {
      const res = await apiClient.listArcs();
      setArcs(res.arcs || []);
      if (res.arcs?.length > 0 && !selectedArcId) {
        // Pick active Arc or first one
        const active = res.arcs.find((a) => a.status === 'active') || res.arcs[0];
        setSelectedArcId(active.id);
      }
    } catch (err) {
      if (!isSetupRequiredError(err)) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Quota exceeded'));
        if (isRateLimit) {
          console.warn('List arcs rate limited:', err);
        } else {
          console.error('Failed to list arcs for review:', err);
        }
      }
    }
  }, [selectedArcId]);

  // Fetch Arc Review
  const loadArcReview = useCallback(async (arcId: string) => {
    if (!isBackendConfigured()) {
      setArcError('Database setup required. Please complete the Setup Wizard.');
      return;
    }
    if (!arcId) return;
    try {
      setIsLoadingArc(true);
      setArcError(null);
      const res = await apiClient.getArcReview(arcId);
      setArcData(res);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Quota exceeded'));
        if (isRateLimit) {
          console.warn('Arc review rate limited:', err);
        } else {
          console.error('Failed to load arc review:', err);
        }
      }
      setArcError(
        err instanceof Error
          ? err.message.includes('Quota exceeded') || err.message.includes('429')
            ? 'Google Sheets rate limit reached. Please wait a few seconds and try again.'
            : err.message
          : 'Unable to load arc review.'
      );
    } finally {
      setIsLoadingArc(false);
    }
  }, []);

  // Lifecycle effects - load lazily based on activeTab
  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyReview(weekStartDate);
    }
  }, [activeTab, weekStartDate, loadWeeklyReview]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlyReview(selectedMonth);
    }
  }, [activeTab, selectedMonth, loadMonthlyReview]);

  useEffect(() => {
    if (activeTab === 'arc') {
      loadArcs();
    }
  }, [activeTab, loadArcs]);

  useEffect(() => {
    if (activeTab === 'arc' && selectedArcId) {
      loadArcReview(selectedArcId);
    }
  }, [activeTab, selectedArcId, loadArcReview]);

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        if (activeTab === 'weekly') {
          loadWeeklyReview(weekStartDate);
        } else if (activeTab === 'monthly') {
          loadMonthlyReview(selectedMonth);
        } else if (activeTab === 'arc') {
          loadArcs();
        }
      }
    };

    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [activeTab, loadWeeklyReview, loadMonthlyReview, loadArcs, weekStartDate, selectedMonth]);

  // Date Navigation Helpers
  const shiftWeek = (weeks: number) => {
    const parts = weekStartDate.split('-');
    if (parts.length !== 3) return;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + weeks * 7, 12);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setWeekStartDate(`${y}-${m}-${day}`);
  };

  const shiftMonth = (months: number) => {
    const parts = selectedMonth.split('-');
    if (parts.length !== 2) return;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1 + months, 1, 12);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Sub-module description */}
      <PageHeader
        title="Reviews & Reflection Archive"
        description="Factual, non-punitive reflections and quantitative metric summaries over time. Single source of truth from your Daily Log."
        action={
          <Link href="/daily-log">
            <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-4 h-4" />}>
              Write Today&apos;s Reflection
            </Button>
          </Link>
        }
      />

      {/* Main Tabs: Weekly / Monthly / Arc - positioned in Header between timezone span and search button on desktop */}
      {headerSlot ? (
        createPortal(
          <Tabs
            size="sm"
            tabs={[
              { id: 'weekly', label: '📅 Weekly Review' },
              { id: 'monthly', label: '📊 Monthly Review' },
              { id: 'arc', label: '🎯 Arc Review & Journey' },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'weekly' | 'monthly' | 'arc')}
          />,
          headerSlot
        )
      ) : (
        <div className="border-b border-slate-200 dark:border-slate-800">
          <Tabs
            tabs={[
              { id: 'weekly', label: '📅 Weekly Review' },
              { id: 'monthly', label: '📊 Monthly Review' },
              { id: 'arc', label: '🎯 Arc Review & Journey' },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'weekly' | 'monthly' | 'arc')}
          />
        </div>
      )}

      {/* =========================================================
          TAB 1: WEEKLY REVIEW
          ========================================================= */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {/* Week Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-4 sm:h-[52px] min-h-[52px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shiftWeek(-1)}
                aria-label="Previous week"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shiftWeek(1)}
                aria-label="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span suppressHydrationWarning className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
                Week: {weeklyData?.period?.startDate || weekStartDate} &rarr; {weeklyData?.period?.endDate || '...'}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const today = new Date();
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(today.setDate(diff));
                const y = monday.getFullYear();
                const m = String(monday.getMonth() + 1).padStart(2, '0');
                const d = String(monday.getDate()).padStart(2, '0');
                setWeekStartDate(`${y}-${m}-${d}`);
              }}
            >
              Current Week
            </Button>
          </div>

          {isLoadingWeekly && <LoadingState message="Aggregating weekly reflections and metrics..." />}

          {weeklyError && (
            isSetupRequiredError(weeklyError) ? (
              <SetupRequiredState featureName="review your weekly progress logs" />
            ) : (
              <ErrorState
                message={weeklyError}
                onRetry={() => loadWeeklyReview(weekStartDate)}
              />
            )
          )}

          {!isLoadingWeekly && !weeklyError && weeklyData && (
            <>
              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <Card className="p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Study Hours</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {weeklyData.metrics.studyHours}h
                  </div>
                </Card>

                <Card className="p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deep Focus</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {weeklyData.metrics.focusHours}h
                  </div>
                </Card>

                <Card className="p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasks Done</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {weeklyData.metrics.tasksCompleted} / {weeklyData.metrics.tasksPlanned}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{weeklyData.metrics.completionRate}% rate</div>
                </Card>

                <Card className="p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Exercise Days</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {weeklyData.metrics.exerciseDays} / 7
                  </div>
                </Card>

                <Card className="p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Sleep</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {weeklyData.metrics.avgSleep > 0 ? `${weeklyData.metrics.avgSleep}h` : '—'}
                  </div>
                </Card>

                <Card className="p-3.5 text-center sm:col-span-2 lg:col-span-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reflection Consistency</div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {weeklyData.metrics.daysWithReflections} / 7 days
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Reflections entered in Daily Log</div>
                </Card>
              </div>

              {/* Weekly Descriptive Observation Highlights */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Descriptive Weekly Mentions</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {weeklyData.summary.frequentKeywords.length > 0 ? (
                    weeklyData.summary.frequentKeywords.map((k) => (
                      <span
                        key={k.word}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-700 dark:text-slate-300 font-medium"
                      >
                        &ldquo;{k.word}&rdquo; appeared in {k.count} reflection{k.count > 1 ? 's' : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      {weeklyData?.summary?.descriptiveNotes?.[0] || 'No reflections recorded this week.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Chronological Daily Reflections Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Daily Reflections & Notes</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weeklyData.reflections.map((day) => (
                    <Card
                      key={day.date}
                      className={`p-4 transition-all ${
                        day.hasReflection
                          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {day.dayName}
                          </span>
                          <span className="text-xs text-slate-400 ml-2 font-mono">{day.date}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {day.studyHours ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                              {day.studyHours}h study
                            </span>
                          ) : null}
                          <Link
                            href={`/daily-log?date=${day.date}`}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {day.hasReflection ? (
                        <div className="space-y-3 text-xs">
                          {day.notes && (
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-500 text-[11px]">General Reflection:</p>
                              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                                {day.notes}
                              </p>
                            </div>
                          )}

                          {day.wentWell && (
                            <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-0.5">
                              <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">
                                <ThumbsUp className="w-3 h-3" />
                                <span>Went Well:</span>
                              </div>
                              <p className="text-emerald-900 dark:text-emerald-200 whitespace-pre-line leading-relaxed">
                                {day.wentWell}
                              </p>
                            </div>
                          )}

                          {day.difficulties && (
                            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 space-y-0.5">
                              <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 text-[11px]">
                                <HelpCircle className="w-3 h-3" />
                                <span>Difficulties:</span>
                              </div>
                              <p className="text-amber-900 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                                {day.difficulties}
                              </p>
                            </div>
                          )}

                          {day.learnings && (
                            <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-0.5">
                              <div className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 text-[11px]">
                                <Lightbulb className="w-3 h-3" />
                                <span>Learned:</span>
                              </div>
                              <p className="text-blue-900 dark:text-blue-200 whitespace-pre-line leading-relaxed">
                                {day.learnings}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          <span>No reflection recorded for this day.</span>
                          <div className="mt-2">
                            <Link href={`/daily-log?date=${day.date}`}>
                              <Button variant="ghost" size="sm" className="text-xs">
                                + Add Reflection
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: MONTHLY REVIEW
          ========================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-4 sm:h-[52px] min-h-[52px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span suppressHydrationWarning className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
                {monthlyData?.period?.monthLabel || selectedMonth}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                setSelectedMonth(`${y}-${m}`);
              }}
            >
              Current Month
            </Button>
          </div>

          {isLoadingMonthly && <LoadingState message="Aggregating monthly metrics and reflection archives..." />}

          {monthlyError && (
            isSetupRequiredError(monthlyError) ? (
              <SetupRequiredState featureName="review your monthly progress logs" />
            ) : (
              <ErrorState
                message={monthlyError}
                onRetry={() => loadMonthlyReview(selectedMonth)}
              />
            )
          )}

          {!isLoadingMonthly && !monthlyError && monthlyData && (
            <>
              {/* Monthly Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Study Hours</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {monthlyData.metrics.studyHours}h
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deep Focus</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {monthlyData.metrics.focusHours}h
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks Done</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {monthlyData.metrics.tasksCompleted} / {monthlyData.metrics.tasksPlanned}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{monthlyData.metrics.completionRate}% rate</div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exercise Days</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {monthlyData.metrics.exerciseDays} days
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Sleep</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {monthlyData.metrics.avgSleep > 0 ? `${monthlyData.metrics.avgSleep}h` : '—'}
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reflections</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {monthlyData.metrics.daysWithReflections} / {monthlyData.metrics.totalDays}
                  </div>
                </Card>
              </div>

              {/* What you repeatedly mentioned */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    What You Repeatedly Mentioned This Month
                  </span>
                </div>

                {monthlyData.hasEnoughData && monthlyData.recurringThemes.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {monthlyData.recurringThemes.map((theme) => (
                      <span
                        key={theme.word}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                      >
                        {theme.word} <span className="text-indigo-600 dark:text-indigo-400">({theme.count}x)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Not enough reflection data yet to identify recurring themes (requires at least 3 reflections).
                  </p>
                )}
              </div>

              {/* Monthly Reflections Chronological Archive */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <span>Monthly Reflections ({monthlyData.reflections.length})</span>
                  </h3>
                </div>

                {monthlyData.reflections.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="w-8 h-8 text-slate-400" />}
                    title="No reflections recorded for this month"
                    description="Write daily reflections in the Daily Log and they will automatically compile here."
                    actionLabel="Go to Daily Log"
                    onAction={() => window.location.href = '/daily-log'}
                  />
                ) : (
                  <div className="space-y-3">
                    {monthlyData.reflections.map((r) => (
                      <Card key={r.date} className="p-4 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatDisplayDate(r.date, { includeWeekday: true })}
                          </span>
                          <Link
                            href={`/daily-log?date=${r.date}`}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open Daily Log</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          {r.notes && (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-400 text-[11px]">General Note:</span>
                              <p className="text-slate-700 dark:text-slate-300">{r.notes}</p>
                            </div>
                          )}
                          {r.wentWell && (
                            <div className="space-y-0.5 text-emerald-700 dark:text-emerald-300">
                              <span className="font-semibold text-[11px]">Went Well:</span>
                              <p>{r.wentWell}</p>
                            </div>
                          )}
                          {r.difficulties && (
                            <div className="space-y-0.5 text-amber-700 dark:text-amber-300">
                              <span className="font-semibold text-[11px]">Difficulties:</span>
                              <p>{r.difficulties}</p>
                            </div>
                          )}
                          {r.learnings && (
                            <div className="space-y-0.5 text-blue-700 dark:text-blue-300">
                              <span className="font-semibold text-[11px]">Learned:</span>
                              <p>{r.learnings}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: ARC REVIEW & JOURNEY
          ========================================================= */}
      {activeTab === 'arc' && (
        <div className="space-y-6">
          {/* Arc Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2.5 px-4 min-h-[52px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{arcData?.arc.icon || '🎯'}</span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Arc Journey Review
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological highlights and milestones recorded during your focused Arc sprint.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="arc-select" className="text-xs font-semibold text-slate-500 shrink-0">
                Select Arc:
              </label>
              <select
                id="arc-select"
                aria-label="Select Arc"
                value={selectedArcId}
                onChange={(e) => setSelectedArcId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {arcs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name} ({a.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingArc && <LoadingState message="Compiling Arc journey highlights from Daily Logs..." />}

          {arcError && (
            isSetupRequiredError(arcError) ? (
              <SetupRequiredState featureName="review your Arc progress logs" />
            ) : (
              <ErrorState
                message={arcError}
                onRetry={() => selectedArcId && loadArcReview(selectedArcId)}
              />
            )
          )}

          {!isLoadingArc && !arcError && arcData && (
            <>
              {/* Arc Overview Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Arc Window</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {arcData?.period?.startDate || '—'} &rarr; {arcData?.period?.endDate || '—'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{arcData?.period?.totalDays ?? 0} total days</div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Study Hours</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {arcData.stats.totalStudyHours}h
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks Completed</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {arcData.stats.tasksCompleted}
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checkpoints</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {arcData.stats.milestonesCompleted} / {arcData.stats.totalMilestones}
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reflections</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {arcData.stats.reflectionsCount}
                  </div>
                </Card>
              </div>

              {/* Journey Highlights (Beginning, Middle, Later, Ending) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Chronological Journey Highlights</span>
                </h3>

                {arcData.journeyHighlights.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {arcData.journeyHighlights.map((jh) => (
                      <Card key={jh.phase} className="p-4 space-y-2 border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex items-center justify-between">
                          <Badge variant={jh.phase === 'Ending' ? 'success' : 'info'} size="sm">
                            {jh.phase}
                          </Badge>
                          <span className="text-[11px] font-mono text-slate-400">{jh.date}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-4 leading-relaxed">
                          &ldquo;{jh.highlight}&rdquo;
                        </p>
                        <div className="text-[10px] text-slate-400 font-medium pt-1">
                          Source: {jh.field}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    No reflections recorded within this Arc date range yet.
                  </p>
                )}
              </div>

              {/* Arc Reflections List */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    All Arc Reflections ({arcData.reflections.length})
                  </h3>
                  <Link
                    href={`/arc/${arcData.arc.id}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open Arc Command Center</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {arcData.reflections.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="w-8 h-8 text-slate-400" />}
                    title="No reflections inside this Arc yet"
                    description="Write reflections in Daily Log on days within this Arc's timeframe."
                  />
                ) : (
                  <div className="space-y-3">
                    {arcData.reflections.map((r) => (
                      <Card key={r.date} className="p-4 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatDisplayDate(r.date, { includeWeekday: true })}
                          </span>
                          <Link
                            href={`/daily-log?date=${r.date}`}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open Log</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          {r.notes && (
                            <div>
                              <span className="font-semibold text-slate-400 text-[11px]">General Note: </span>
                              <span className="text-slate-700 dark:text-slate-300">{r.notes}</span>
                            </div>
                          )}
                          {r.wentWell && (
                            <div className="text-emerald-700 dark:text-emerald-300">
                              <span className="font-semibold text-[11px]">Went Well: </span>
                              <span>{r.wentWell}</span>
                            </div>
                          )}
                          {r.difficulties && (
                            <div className="text-amber-700 dark:text-amber-300">
                              <span className="font-semibold text-[11px]">Difficulties: </span>
                              <span>{r.difficulties}</span>
                            </div>
                          )}
                          {r.learnings && (
                            <div className="text-blue-700 dark:text-blue-300">
                              <span className="font-semibold text-[11px]">Learned: </span>
                              <span>{r.learnings}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
