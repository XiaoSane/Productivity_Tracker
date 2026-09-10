'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  GraduationCap,
  AlertCircle,
  Plus,
  Filter,
  Layers,
  Flag,
  Target,
  PenLine,
} from 'lucide-react';
import { Task, Exam, Arc, ArcMilestone, DailyLog } from '@/types';
import {
  getMonthCalendarGrid,
  getWeekDays,
  formatDateToYmd,
  formatDisplayDate,
  getTodayDateString,
  parseDateOnly,
  formatTimeDisplay,
} from '@/lib/utils/date';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type CalendarMode = 'month' | 'week' | 'day';

interface CalendarViewProps {
  tasks: Task[];
  exams: Exam[];
  arcMilestones?: ArcMilestone[];
  arcs?: Arc[];
  dailyLogs?: DailyLog[];
  onSelectDate?: (date: string) => void;
  onOpenTaskModal?: (date: string) => void;
  onToggleTaskStatus?: (taskId: string) => void;
  onViewExam?: (examId: string) => void;
}

export function CalendarView({
  tasks,
  exams,
  arcMilestones = [],
  arcs = [],
  dailyLogs = [],
  onSelectDate,
  onOpenTaskModal,
  onToggleTaskStatus,
  onViewExam,
}: CalendarViewProps) {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => new Date().getMonth());
  const [mode, setMode] = useState<CalendarMode>('month');

  // Sync selected date with parent if needed
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    onSelectDate?.(dateStr);
  };

  // Month navigation
  const prevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonthIndex(11);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonthIndex(0);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
    setSelectedDate(todayStr);
    onSelectDate?.(todayStr);
  };

  // Week navigation
  const prevWeek = () => {
    const d = parseDateOnly(selectedDate) || new Date();
    d.setDate(d.getDate() - 7);
    const newDate = formatDateToYmd(d);
    setSelectedDate(newDate);
    setCurrentYear(d.getFullYear());
    setCurrentMonthIndex(d.getMonth());
  };

  const nextWeek = () => {
    const d = parseDateOnly(selectedDate) || new Date();
    d.setDate(d.getDate() + 7);
    const newDate = formatDateToYmd(d);
    setSelectedDate(newDate);
    setCurrentYear(d.getFullYear());
    setCurrentMonthIndex(d.getMonth());
  };

  // Day navigation
  const prevDay = () => {
    const d = parseDateOnly(selectedDate) || new Date();
    d.setDate(d.getDate() - 1);
    const newDate = formatDateToYmd(d);
    setSelectedDate(newDate);
    setCurrentYear(d.getFullYear());
    setCurrentMonthIndex(d.getMonth());
  };

  const nextDay = () => {
    const d = parseDateOnly(selectedDate) || new Date();
    d.setDate(d.getDate() + 1);
    const newDate = formatDateToYmd(d);
    setSelectedDate(newDate);
    setCurrentYear(d.getFullYear());
    setCurrentMonthIndex(d.getMonth());
  };

  // Build month grid days
  const monthGrid = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  // Build week days
  const weekDays = useMemo(() => {
    return getWeekDays(selectedDate);
  }, [selectedDate]);

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        tasks: Task[];
        exams: Exam[];
        deadlines: Exam[];
        milestones: ArcMilestone[];
        arcs: Arc[];
        dailyLog?: DailyLog;
      }
    > = {};

    const ensure = (d: string) => {
      if (!map[d]) {
        map[d] = { tasks: [], exams: [], deadlines: [], milestones: [], arcs: [] };
      }
      return map[d];
    };

    tasks.forEach((t) => {
      if (t.date) {
        ensure(t.date).tasks.push(t);
      }
    });

    exams.forEach((ex) => {
      if (ex.examDate) {
        ensure(ex.examDate).exams.push(ex);
      }
      if (ex.deadline && ex.deadline !== ex.examDate) {
        ensure(ex.deadline).deadlines.push(ex);
      }
    });

    arcMilestones.forEach((m) => {
      if (m.targetDate) {
        ensure(m.targetDate).milestones.push(m);
      }
    });

    arcs.forEach((a) => {
      if (a.startDate) {
        ensure(a.startDate).arcs.push(a);
      }
      if (a.endDate && a.endDate !== a.startDate) {
        ensure(a.endDate).arcs.push(a);
      }
    });

    dailyLogs.forEach((l) => {
      if (l.date) {
        ensure(l.date).dailyLog = l;
      }
    });

    return map;
  }, [tasks, exams, arcMilestones, arcs, dailyLogs]);

  // Data for currently selected date
  const selectedDateEvents = eventsByDate[selectedDate] || {
    tasks: [],
    exams: [],
    deadlines: [],
    milestones: [],
    arcs: [],
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {mode === 'month' && `${monthNames[currentMonthIndex]} ${currentYear}`}
              {mode === 'week' && `Week of ${formatDisplayDate(weekDays[0]?.date)}`}
              {mode === 'day' && formatDisplayDate(selectedDate, { includeWeekday: true })}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive unified schedule of tasks, deadlines, and exams
            </p>
          </div>
        </div>

        {/* View Mode Switcher and Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: Month / Week / Day */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Today Button */}
          <Button size="sm" variant="outline" onClick={goToToday}>
            Today
          </Button>

          {/* Nav Arrows */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={mode === 'month' ? prevMonth : mode === 'week' ? prevWeek : prevDay}
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={mode === 'month' ? nextMonth : mode === 'week' ? nextWeek : nextDay}
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Color Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Pending Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Completed Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Exam Date</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Prep Deadline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Arc Checkpoint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Daily Reflection</span>
        </div>
      </div>

      {/* ========================================================
          MONTH VIEW
          ======================================================== */}
      {mode === 'month' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* 42-day Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800">
            {monthGrid.map((day) => {
              const dayEvents = eventsByDate[day.date];
              const hasTasks = dayEvents && dayEvents.tasks.length > 0;
              const hasExams = dayEvents && dayEvents.exams.length > 0;
              const hasDeadlines = dayEvents && dayEvents.deadlines.length > 0;

              const isSelected = day.date === selectedDate;

              return (
                <div
                  key={day.date}
                  onClick={() => handleDayClick(day.date)}
                  className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    !day.isCurrentMonth
                      ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  } ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30 dark:bg-blue-950/20' : ''}`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        day.isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isSelected
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                          : ''
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Plus trigger to add task on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskModal?.(day.date);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-opacity"
                      title="Add task on this day"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Badges / Items */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {/* Exams */}
                    {hasExams &&
                      dayEvents.exams.slice(0, 1).map((ex) => (
                        <div
                          key={ex.id}
                          className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold truncate flex items-center gap-1"
                          title={`Exam: ${ex.name}`}
                        >
                          <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{ex.name}</span>
                        </div>
                      ))}

                    {/* Deadlines */}
                    {hasDeadlines &&
                      dayEvents.deadlines.slice(0, 1).map((ex) => (
                        <div
                          key={ex.id}
                          className="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold truncate flex items-center gap-1"
                          title={`Deadline: ${ex.name}`}
                        >
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Cutoff: {ex.name}</span>
                        </div>
                      ))}

                    {/* Arc Milestones */}
                    {dayEvents &&
                      dayEvents.milestones &&
                      dayEvents.milestones.length > 0 &&
                      dayEvents.milestones.slice(0, 1).map((m) => (
                        <div
                          key={m.id}
                          className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-semibold truncate flex items-center gap-1"
                          title={`Arc Checkpoint: ${m.title}`}
                        >
                          <Flag className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">🏁 {m.title}</span>
                        </div>
                      ))}

                    {/* Tasks Summary badge */}
                    {hasTasks && (
                      <div
                        className="px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-medium truncate flex items-center justify-between"
                      >
                        <span className="truncate">
                          {dayEvents.tasks.length} task{dayEvents.tasks.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {dayEvents.tasks.filter((t) => t.status === 'completed').length}/
                          {dayEvents.tasks.length}
                        </span>
                      </div>
                    )}



                    {/* Daily Reflection badge */}
                    {dayEvents?.dailyLog &&
                      (dayEvents.dailyLog.notes ||
                        dayEvents.dailyLog.wentWell ||
                        dayEvents.dailyLog.difficulties ||
                        dayEvents.dailyLog.learnings) && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/daily-log?date=${day.date}`;
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] font-semibold truncate flex items-center gap-1 hover:bg-purple-500/25 transition-colors"
                          title="Daily Reflection logged (click to view)"
                        >
                          <PenLine className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Reflection</span>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          WEEK VIEW
          ======================================================== */}
      {mode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayEvents = eventsByDate[day.date] || {
              tasks: [],
              exams: [],
              deadlines: [],
            };
            const isSelected = day.date === selectedDate;

            return (
              <div
                key={day.date}
                onClick={() => handleDayClick(day.date)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[260px] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/50'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header of the Day */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-400">
                      {day.weekdayName}
                    </p>
                    <p
                      className={`text-base font-bold ${
                        day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {day.dayNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTaskModal?.(day.date);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Add task"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Day events list */}
                <div className="flex-1 py-2 space-y-1.5 overflow-y-auto max-h-56 text-xs">
                  {/* Exams */}
                  {dayEvents.exams.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold"
                    >
                      🎓 {ex.name}
                    </div>
                  ))}

                  {/* Deadlines */}
                  {dayEvents.deadlines.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-semibold"
                    >
                      ⚠️ Cutoff: {ex.name}
                    </div>
                  ))}

                  {/* Tasks */}
                  {dayEvents.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskStatus?.(task.id);
                      }}
                      className={`p-1.5 rounded-lg border text-[11px] transition-all flex items-start gap-1.5 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 line-through'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                          task.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}

                  {/* Daily Reflection */}
                  {dayEvents.dailyLog &&
                    (dayEvents.dailyLog.notes ||
                      dayEvents.dailyLog.wentWell ||
                      dayEvents.dailyLog.difficulties ||
                      dayEvents.dailyLog.learnings) && (
                      <a
                        href={`/daily-log?date=${day.date}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-purple-500/25 transition-colors"
                        title="View Daily Reflection"
                      >
                        <PenLine className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Reflection Logged</span>
                      </a>
                    )}

                  {dayEvents.tasks.length === 0 &&
                    dayEvents.exams.length === 0 &&
                    dayEvents.deadlines.length === 0 &&
                    !(dayEvents.dailyLog &&
                      (dayEvents.dailyLog.notes ||
                        dayEvents.dailyLog.wentWell ||
                        dayEvents.dailyLog.difficulties ||
                        dayEvents.dailyLog.learnings)) && (
                      <p className="text-[11px] text-slate-400 italic py-4 text-center">
                        No events
                      </p>
                    )}
                </div>

                {/* Footer status */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex justify-between">
                  <span>{dayEvents.tasks.length} tasks</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          DAY VIEW / AGENDA FOR SELECTED DATE
          ======================================================== */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Agenda: {formatDisplayDate(selectedDate, { includeWeekday: true })}</span>
              {selectedDate === todayStr && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500">
                  Today
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDateEvents.tasks.length} Tasks • {selectedDateEvents.exams.length} Exams •{' '}
              {selectedDateEvents.deadlines.length} Cutoffs
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onOpenTaskModal?.(selectedDate)}
          >
            Add Task for This Day
          </Button>
        </div>

        {/* Daily Reflection & Notes Banner */}
        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <PenLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                  Daily Log &amp; Reflection
                </h4>
                {selectedDateEvents.dailyLog &&
                  (selectedDateEvents.dailyLog.notes ||
                    selectedDateEvents.dailyLog.wentWell ||
                    selectedDateEvents.dailyLog.difficulties ||
                    selectedDateEvents.dailyLog.learnings) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-300">
                      Logged
                    </span>
                  )}
              </div>
              {selectedDateEvents.dailyLog &&
              (selectedDateEvents.dailyLog.notes ||
                selectedDateEvents.dailyLog.wentWell ||
                selectedDateEvents.dailyLog.difficulties ||
                selectedDateEvents.dailyLog.learnings) ? (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                  {selectedDateEvents.dailyLog.wentWell && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Wins: {selectedDateEvents.dailyLog.wentWell} &bull;{' '}
                    </span>
                  )}
                  {selectedDateEvents.dailyLog.notes || selectedDateEvents.dailyLog.learnings}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">
                  No reflection logged for this date yet.
                </p>
              )}
            </div>
          </div>
          <a
            href={`/daily-log?date=${selectedDate}`}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-white/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shrink-0"
          >
            {selectedDateEvents.dailyLog &&
            (selectedDateEvents.dailyLog.notes ||
              selectedDateEvents.dailyLog.wentWell ||
              selectedDateEvents.dailyLog.difficulties ||
              selectedDateEvents.dailyLog.learnings)
              ? 'View / Edit Reflection'
              : 'Write Reflection'}
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Day Tasks List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Tasks on this Day</span>
            </h4>
            {selectedDateEvents.tasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No tasks scheduled for this day
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleTaskStatus?.(task.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-400 hover:border-blue-500 text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="truncate">
                        <p
                          className={`text-xs font-semibold text-slate-800 dark:text-slate-200 truncate ${
                            task.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {task.startTime && task.endTime
                            ? `${formatTimeDisplay(task.startTime)} - ${formatTimeDisplay(task.endTime)}`
                            : task.category || 'General'}
                          {task.subtaskCount ? ` • ${task.completedSubtaskCount}/${task.subtaskCount} subtasks` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exams & Study Sessions on this Day */}
          <div className="space-y-4">
            {/* Arc Checkpoints on Day */}
            {selectedDateEvents.milestones && selectedDateEvents.milestones.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" />
                  <span>Arc Checkpoints & Milestones</span>
                </h4>
                <div className="space-y-2">
                  {selectedDateEvents.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          Arc Target Checkpoint
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</p>
                        {m.description && <p className="text-[11px] text-slate-500">{m.description}</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-500 capitalize">
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exams on Day */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Exams & Deadlines</span>
              </h4>
              {selectedDateEvents.exams.length === 0 && selectedDateEvents.deadlines.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No exams or deadlines on this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.exams.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => onViewExam?.(ex.id)}
                      className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          Examination Day
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{ex.name}</p>
                        <p className="text-[11px] text-slate-500">{ex.subject} • Venue: {ex.venue || 'TBA'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 capitalize">
                        {ex.status}
                      </span>
                    </div>
                  ))}

                  {selectedDateEvents.deadlines.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => onViewExam?.(ex.id)}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Preparation Cutoff Deadline
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{ex.name}</p>
                        <p className="text-[11px] text-slate-500">Exam date: {ex.examDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
