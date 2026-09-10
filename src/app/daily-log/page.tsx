'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';


import { DailyLog, SaveDailyLogInput } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { MOOD_OPTIONS, ENERGY_OPTIONS } from '@/lib/constants/categories';
import { getTodayDateString, formatDisplayDate } from '@/lib/utils/date';
import Link from 'next/link';
import {
  Calendar,
  Save,
  Moon,
  Sun,
  Flame,
  BookOpen,
  Dumbbell,
  Smile,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ThumbsUp,
  HelpCircle,
  Lightbulb,
  FileText,
  ArrowRight,
} from 'lucide-react';

export default function DailyLogPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [log, setLog] = useState<DailyLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form fields
  const [sleepHours, setSleepHours] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [focusHours, setFocusHours] = useState<string>('');
  const [studyHours, setStudyHours] = useState<string>('');
  const [exercise, setExercise] = useState<string>('');
  const [mood, setMood] = useState<string>('good');
  const [energy, setEnergy] = useState<string>('moderate');
  const [notes, setNotes] = useState<string>('');
  const [wentWell, setWentWell] = useState<string>('');
  const [difficulties, setDifficulties] = useState<string>('');
  const [learnings, setLearnings] = useState<string>('');

  // Check URL date parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get('date');
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        setSelectedDate(urlDate);
      }
    }
  }, []);

  const loadLog = useCallback(async (date: string) => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setLoadError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      setSaveSuccess(false);
      setSaveError(null);
      const res = await apiClient.getDailyLog(date);
      setLog(res);

      if (res) {
        setSleepHours(res.sleepHours !== null && res.sleepHours !== undefined ? String(res.sleepHours) : '');
        setWakeTime(res.wakeTime || '');
        setFocusHours(res.focusHours !== null && res.focusHours !== undefined ? String(res.focusHours) : '');
        setStudyHours(res.studyHours !== null && res.studyHours !== undefined ? String(res.studyHours) : '');
        setExercise(res.exercise || '');
        setMood(res.mood || 'good');
        setEnergy(res.energy || 'moderate');
        setNotes(res.notes || '');
        setWentWell(res.wentWell || '');
        setDifficulties(res.difficulties || '');
        setLearnings(res.learnings || '');
      } else {
        // Reset form for a fresh date entry
        setSleepHours('');
        setWakeTime('');
        setFocusHours('');
        setStudyHours('');
        setExercise('');
        setMood('good');
        setEnergy('moderate');
        setNotes('');
        setWentWell('');
        setDifficulties('');
        setLearnings('');
      }
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load daily log:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load daily log.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLog(selectedDate);

    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadLog(selectedDate);
      }
    };
    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [selectedDate, loadLog]);


  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days, 12);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const payload: SaveDailyLogInput = {
        date: selectedDate,
        sleepHours: sleepHours !== '' ? parseFloat(sleepHours) : null,
        wakeTime: wakeTime || null,
        focusHours: focusHours !== '' ? parseFloat(focusHours) : null,
        studyHours: studyHours !== '' ? parseFloat(studyHours) : null,
        exercise: exercise.trim() || null,
        mood: mood || null,
        energy: energy || null,
        notes: notes.trim() || null,
        wentWell: wentWell.trim() || null,
        difficulties: difficulties.trim() || null,
        learnings: learnings.trim() || null,
      };

      const updated = await apiClient.saveDailyLog(payload);
      setLog(updated || payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error('Failed to save daily log:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save daily log.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const isExisting = Boolean(log);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Daily Life Log"
        description="Record sleep, study hours, focus time, and personal wellness with explicit user saving."
      />

      {/* Date Selector Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-4 sm:h-[52px] min-h-[52px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shiftDate(1)}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(getTodayDateString())}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 cursor-pointer"
          />
          <span className="text-xs text-slate-500 hidden sm:inline">
            ({formatDisplayDate(selectedDate, { includeWeekday: true })})
          </span>
        </div>

        <div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isExisting
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {isExisting ? 'Existing Log' : 'New Entry'}
          </span>
        </div>
      </div>

      {loadError ? (
        !isBackendConfigured() || isSetupRequiredError(loadError) ? (
          <SetupRequiredState featureName="record and track your daily wellness, sleep, and study logs" />

        ) : (
          <ErrorState
            title="Could not load log"
            message={loadError}
            onRetry={() => loadLog(selectedDate)}
          />
        )
      ) : isLoading ? (
        <LoadingState message="Loading daily log entry..." />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 text-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Daily log saved successfully for {formatDisplayDate(selectedDate)}!</span>
            </div>
          )}

          {saveError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
              {saveError}
            </div>
          )}

          {/* Top Metrics Grid: Sleep & Routine + Productivity & Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Sleep & Wake */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span>Sleep & Routine</span>
                  </CardTitle>
                  <CardDescription>Rest duration and morning start time</CardDescription>
                </div>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Sleep Hours"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  placeholder="e.g. 7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  helperText="Total hours of sleep last night"
                />

                <Input
                  label="Wake-up Time"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  helperText="Time you got out of bed"
                />
              </div>
            </Card>

            {/* Section 2: Study & Focus Time */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Productivity & Focus</span>
                  </CardTitle>
                  <CardDescription>Time invested in learning and deep work</CardDescription>
                </div>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Study Hours"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  placeholder="e.g. 4.0"
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                  helperText="Hours spent reading, revising, or solving problems"
                />

                <Input
                  label="Focus Hours"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  placeholder="e.g. 3.5"
                  value={focusHours}
                  onChange={(e) => setFocusHours(e.target.value)}
                  helperText="Deep work uninterrupted focus sessions"
                />
              </div>
            </Card>
          </div>

          {/* Section 3: Wellness & Energy */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Physical & Mental State</span>
                </CardTitle>
                <CardDescription>Exercise, energy level, and mood</CardDescription>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Energy Level"
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
              >
                {ENERGY_OPTIONS.map((en) => (
                  <option key={en.value} value={en.value}>
                    {en.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Exercise / Physical Activity"
                placeholder="e.g. 30 min jog, Gym, Walking"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                helperText="Short description of activity"
              />
            </div>
          </Card>

          {/* Section 4: Daily Reflection & Notes */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Daily Reflection</span>
                  </CardTitle>
                  <CardDescription>
                    Write once here. Reflections automatically surface in Weekly Review, Monthly Review, Arc Journal, and Analytics. All fields are optional.
                  </CardDescription>
                </div>
                <Link
                  href="/reviews"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  <span>Go to Reviews</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>

            <div className="space-y-4 pt-2">
              {/* General Reflection */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>What happened today?</span>
                  <span className="text-[10px] font-normal text-slate-400">(General reflection / notes)</span>
                </label>
                <Textarea
                  rows={3}
                  placeholder="How was your day? What did you work on or experience?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Complementary Dual Reflection Grid: Wins & Challenges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What Went Well */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>What went well?</span>
                    <span className="text-[10px] font-normal text-slate-400">(Wins, positive outcomes, good focus)</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Morning study session was super locked-in; solved 4 dynamic programming problems..."
                    value={wentWell}
                    onChange={(e) => setWentWell(e.target.value)}
                  />
                </div>

                {/* What Was Difficult */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>What was difficult?</span>
                    <span className="text-[10px] font-normal text-slate-400">(Challenges, blockers, fatigue, distractions)</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Felt distracted around 3 PM; tree traversal logic was confusing..."
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                  />
                </div>
              </div>

              {/* What Did I Learn */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>What did I learn?</span>
                  <span className="text-[10px] font-normal text-slate-400">(Key takeaway, principle, or formula)</span>
                </label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Pre-order traversal visits root first; breaking study into 25-min Pomodoros prevents afternoon slump..."
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Save Action */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs text-slate-500">
              <span>Selected Date: <strong>{formatDisplayDate(selectedDate)}</strong></span>
            </div>

            <Button
              type="submit"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isExisting ? 'Update Daily Log' : 'Save Daily Log'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
