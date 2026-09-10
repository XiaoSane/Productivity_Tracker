'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import {
  AnalyticsSummary,
  ProductivityAnalytics,
  ExamAnalytics,
  AnalyticsTrends,
  Arc,
  ReflectionInsightsData,
} from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { formatDisplayDate } from '@/lib/utils/date';
import {
  CheckCircle2,
  BookOpen,
  GraduationCap,
  BarChart2,
  Flame,
  PieChart as PieIcon,
  RefreshCw,
  TrendingUp,
  Calendar,
  Clock,
  Moon,
  Target,
  ArrowRight,
  ThumbsUp,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7D' | '30D' | '90D'>('7D');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [productivity, setProductivity] = useState<ProductivityAnalytics | null>(null);
  const [examAnalytics, setExamAnalytics] = useState<ExamAnalytics | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [reflectionInsights, setReflectionInsights] = useState<ReflectionInsightsData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [summaryRes, prodRes, examRes, trendsRes, arcsRes, reflRes] = await Promise.all([
        apiClient.getAnalyticsSummary().catch((err) => {
          console.warn('Analytics summary error:', err);
          return null;
        }),
        apiClient.getProductivityAnalytics().catch((err) => {
          console.warn('Productivity analytics error:', err);
          return null;
        }),
        apiClient.getExamAnalytics().catch((err) => {
          console.warn('Exam analytics error:', err);
          return null;
        }),
        apiClient.getAnalyticsTrends(range).catch((err) => {
          console.warn('Analytics trends error:', err);
          return null;
        }),
        apiClient.listArcs().catch(() => ({ count: 0, arcs: [] })),
        apiClient.getReflectionInsights(range).catch((err) => {
          console.warn('Reflection insights error:', err);
          return null;
        }),
      ]);

      if (!summaryRes && !prodRes && !examRes && !trendsRes) {
        setError(
          'Unable to retrieve analytics data at this time. Please click Retry below.'
        );
        return;
      }

      setSummary(summaryRes);
      setProductivity(prodRes);
      setExamAnalytics(examRes);
      setTrends(trendsRes);
      setReflectionInsights(reflRes);
      if (arcsRes && Array.isArray(arcsRes.arcs)) {
        setArcs(arcsRes.arcs);
      }
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Quota exceeded'));
        if (isRateLimit) {
          console.warn('Analytics rate limited:', err);
        } else {
          console.error('Failed to load analytics:', err);
        }
      }
      const msg =
        err instanceof Error
          ? err.message.includes('Quota exceeded') || err.message.includes('429')
            ? 'Google Sheets rate limit reached. Please wait a few seconds and try again.'
            : err.message
          : 'Failed to load analytics.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadAnalytics();
      }
    };

    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);
    loadAnalytics();

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadAnalytics]);

  // Transform backend byCategory object into array for Recharts
  const categoryData = useMemo(() => {
    if (!productivity?.byCategory) return [];
    return Object.entries(productivity.byCategory).map(([catName, stats]) => ({
      category: catName,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.completionPercentage,
    }));
  }, [productivity]);

  const examItems = examAnalytics?.exams || [];

  // Data for tasks status donut from backend summary.tasks
  const taskStatusData = useMemo(() => {
    if (!summary?.tasks) return [];
    return [
      { name: 'Completed', value: summary.tasks.completed, color: '#10b981' },
      { name: 'Pending', value: summary.tasks.pending, color: '#f59e0b' },
      { name: 'Cancelled', value: summary.tasks.cancelled, color: '#94a3b8' },
    ].filter((item) => item.value > 0);
  }, [summary]);

  // Format trend data for daily charts (short date label like "Sep 5")
  const formattedTrends = useMemo(() => {
    if (!trends?.dailyTrends) return [];
    return trends.dailyTrends.map((d) => {
      const parts = d.date.split('-');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
      return {
        ...d,
        displayDate: label,
      };
    });
  }, [trends]);

  if (isLoading && !summary && !trends) {
    return <LoadingState message="Loading descriptive analytics and trend charts..." />;
  }

  if (error && !summary && !trends) {
    const isUnconfigured =
      !isBackendConfigured() || isSetupRequiredError(error);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Descriptive Analytics"
          description="Summary of tasks, recorded hours, and exam timelines."
        />
        {isUnconfigured ? (
          <SetupRequiredState featureName="visualize your study progress, task completion metrics, and exam countdowns" />
        ) : (
          <ErrorState
            message={error}
            onRetry={loadAnalytics}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Trends"
        description="Factual, transparent metrics on tasks, study hours, and exam preparations without artificial scoring."
        action={
          <div className="flex items-center gap-3">
            {/* Range Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    range === r
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r === '7D' ? '7 Days' : r === '30D' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadAnalytics}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards for Selected Range */}
      {trends?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tasks ({range})
              </span>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {trends.summary.totalTasks}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {trends.summary.totalCompleted} completed ({trends.summary.completionRate}%)
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Study Recorded
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {trends.summary.totalStudyHours} hrs
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Avg {trends.summary.avgDailyStudyHours} hrs/day
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Focus Recorded
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {trends.summary.totalFocusHours} hrs
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Avg {trends.summary.avgDailyFocusHours} hrs/day
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Average Sleep
              </span>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Moon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {trends.summary.avgSleepHours ? `${trends.summary.avgSleepHours} hrs` : 'N/A'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">From recorded daily logs</p>
            </div>
          </Card>
        </div>
      )}

      {/* Arc Sprints Progress Section */}
      {arcs.length > 0 && (
        <Card className="p-5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <span>Arc Sprints & Horizon Progress</span>
              </CardTitle>
              <CardDescription>
                Goal and checkpoint completion metrics across your active and planned sprints
              </CardDescription>
            </div>
            <Link
              href="/arc"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All Arcs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {arcs.map((arc) => {
              const overall = Math.round(arc.metrics?.overallProgress || 0);
              return (
                <div
                  key={arc.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-base">{arc.icon || '🎯'}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {arc.status}
                      </span>
                    </div>
                    <Link
                      href={`/arc/${arc.id}`}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-1"
                    >
                      {arc.name}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {arc.startDate} &rarr; {arc.endDate}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{overall}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-linear-to-r from-indigo-500 to-emerald-500"
                        style={{ width: `${overall}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Multi-Day Trend Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Volume & Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Task Completion Trend ({range})</span>
            </CardTitle>
            <CardDescription>
              Daily comparison of total planned tasks vs completed tasks
            </CardDescription>
          </CardHeader>

          {formattedTrends.length === 0 ? (
            <EmptyState
              title="No trend data recorded"
              description="Record daily tasks to see your historical trend."
            />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedTrends}>
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />
                  <Bar
                    dataKey="tasksTotal"
                    name="Total Tasks"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="tasksCompleted"
                    name="Completed"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Study & Focus Hours Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Daily Study & Focus Hours ({range})</span>
            </CardTitle>
            <CardDescription>
              Recorded hours invested per day across the selected horizon
            </CardDescription>
          </CardHeader>

          {formattedTrends.length === 0 ? (
            <EmptyState
              title="No hours logged"
              description="Record study and focus hours in Daily Log to see trends."
            />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedTrends}>
                  <defs>
                    <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="studyHours"
                    name="Study Hours"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#studyGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="focusHours"
                    name="Focus Hours"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#focusGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Category Productivity & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Productivity Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Category Productivity Breakdown</span>
            </CardTitle>
            <CardDescription>
              Factual distribution of tasks recorded by study, work, health, and custom categories
            </CardDescription>
          </CardHeader>

          {categoryData.length === 0 ? (
            <EmptyState
              title="No category data recorded"
              description="Categorize your tasks to review categorical metrics here."
            />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10b981"
                    stackId="a"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="total"
                    name="Total Created"
                    fill="#3b82f6"
                    stackId="b"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Task Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              <span>Task Status Ratio</span>
            </CardTitle>
            <CardDescription>Overall completion vs pending ratio</CardDescription>
          </CardHeader>

          {taskStatusData.length === 0 ? (
            <EmptyState
              title="No task records"
              description="Add tasks to observe completion status distribution."
            />
          ) : (
            <div className="h-64 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 text-xs mt-2">
                {taskStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.name}: <strong>{item.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Reflection Insights Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-base">🧠</span>
              <span>Reflection Insights ({range})</span>
            </CardTitle>
            <CardDescription>
              Factual, non-punitive keyword and observation frequencies aggregated from your Daily Log
            </CardDescription>
          </div>
          <Link href="/reviews">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Reviews Module
            </Button>
          </Link>
        </CardHeader>

        <div className="p-6 space-y-6">
          {reflectionInsights && (reflectionInsights.reflectionsRecorded || 0) >= 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Frequently Mentioned */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Frequently Mentioned
                  </span>
                  <Badge variant="neutral" size="sm">
                    {(reflectionInsights.frequentlyMentioned || []).length} terms
                  </Badge>
                </div>
                {(reflectionInsights.frequentlyMentioned || []).length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {reflectionInsights.frequentlyMentioned?.map((item) => (
                      <li
                        key={item.word}
                        className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.word}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.count}x</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No recurring terms yet.</p>
                )}
              </div>

              {/* Positive Observations */}
              <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Positive Observations</span>
                  </span>
                  <Badge variant="success" size="sm">
                    Wins
                  </Badge>
                </div>
                {(reflectionInsights.positiveObservations || []).length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {reflectionInsights.positiveObservations?.map((item) => (
                      <li
                        key={item.observation}
                        className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                      >
                        <span className="font-semibold">{item.observation}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.count}x</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-400/60 italic">
                    Add notes under &apos;Went Well&apos; in Daily Log to surface positive patterns.
                  </p>
                )}
              </div>

              {/* Recurring Difficulties */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Recurring Difficulties</span>
                  </span>
                  <Badge variant="warning" size="sm">
                    Challenges
                  </Badge>
                </div>
                {(reflectionInsights.recurringDifficulties || []).length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {reflectionInsights.recurringDifficulties?.map((item) => (
                      <li
                        key={item.difficulty}
                        className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                      >
                        <span className="font-semibold">{item.difficulty}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{item.count}x</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700/70 dark:text-amber-400/60 italic">
                    Add notes under &apos;Difficulties&apos; in Daily Log to surface friction points.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {reflectionInsights?.notes?.[0] || 'Not enough reflection data to identify recurring observations.'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Reflections recorded: {reflectionInsights?.reflectionsRecorded || 0} in this {range} window (requires at least 3 entries to identify recurring patterns).
              </p>
              <div className="pt-2">
                <Link href="/daily-log">
                  <Button variant="secondary" size="sm">
                    Write in Daily Log
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Exam Timeline & Deadline Horizon Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            <span>Upcoming Exam Horizon & Deadlines</span>
          </CardTitle>
          <CardDescription>
            Independent countdowns for actual examination dates versus preparation cutoff deadlines
          </CardDescription>
        </CardHeader>

        {examItems.length === 0 ? (
          <EmptyState
            title="No upcoming exams recorded"
            description="Exams you record will display their target days and deadlines here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4">Prep Deadline</th>
                  <th className="py-3 px-4">Days to Exam</th>
                  <th className="py-3 px-4">Days to Prep Deadline</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {examItems.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {ex.name}
                    </td>
                    <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{ex.subject}</td>
                    <td className="py-3 px-4 font-medium">{formatDisplayDate(ex.examDate)}</td>
                    <td className="py-3 px-4">
                      {ex.deadline ? formatDisplayDate(ex.deadline) : '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {ex.daysUntilExam !== undefined
                        ? ex.daysUntilExam >= 0
                          ? `${ex.daysUntilExam} days`
                          : `${Math.abs(ex.daysUntilExam)} days ago`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {ex.deadlinePassed ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                          Deadline Passed
                        </span>
                      ) : ex.daysUntilDeadline !== undefined && ex.daysUntilDeadline !== null ? (
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {ex.daysUntilDeadline} days left
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ex.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
