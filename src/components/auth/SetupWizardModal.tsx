'use client';

import React, { useState, useEffect } from 'react';
import { useConnection } from '@/lib/context/ConnectionContext';
import { getStoredCandidateName, setStoredCandidateName } from '@/lib/api/client';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  Layers,
  User,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const REQUIRED_SHEETS = [
  'Tasks',
  'Exams',
  'DailyLogs',
  'Profile',
  'ExamTopics',
  'StudyPlans',
  'StudySessions',
  'AuditLog',
  'Arcs',
  'ArcGoals',
  'ArcMilestones',
];

export function SetupWizardModal() {
  const {
    isWizardOpen,
    closeWizard,
    isAuthenticated,
    user,
    database,
    isDevMode,
    checkConnection,
  } = useConnection();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [needsReauth, setNeedsReauth] = useState<boolean>(false);
  const [dbResult, setDbResult] = useState<{ spreadsheetId: string; name: string; url?: string } | null>(null);
  const [initializedSheets, setInitializedSheets] = useState<string[]>([]);
  const [candidateName, setCandidateName] = useState<string>('');

  // Determine initial step based on auth and database status
  useEffect(() => {
    if (!isWizardOpen) return;
    setError('');
    setNeedsReauth(false);

    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlErr = p.get('error');
      if (urlErr) {
        setError(urlErr);
        if (urlErr.toLowerCase().includes('permission') || urlErr.toLowerCase().includes('connect')) {
          setNeedsReauth(true);
        }
      }
    }

    if (!isAuthenticated) {
      setCurrentStep(1);
    } else if (!database || database.status === 'setup_required' && !database.spreadsheetId) {
      setCurrentStep(2);
    } else if (database && !database.sheetsReady) {
      setCurrentStep(3);
    } else if (database && !database.profileReady) {
      setCurrentStep(4);
      setCandidateName(getStoredCandidateName() || user?.name || '');
    } else {
      setCurrentStep(5);
    }
  }, [isWizardOpen, isAuthenticated, database, user]);

  if (!isWizardOpen) return null;

  // Re-authenticate and overwrite Google permissions cleanly
  const handleReauth = async () => {
    try {
      setLoading(true);
      await fetch('/api/connection/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'disconnect' }),
      });
    } catch {}
    window.location.href = '/api/auth/google?returnTo=/settings?setup=1';
  };

  // Step 2: Create / Connect Database in Drive
  const handleCreateDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      setNeedsReauth(false);
      const res = await fetch('/api/connection/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'create_database' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsReauth || res.status === 403) {
          setNeedsReauth(true);
        }
        throw new Error(data.error || 'Failed to create database spreadsheet.');
      }
      setDbResult({
        spreadsheetId: data.database.spreadsheetId,
        name: data.database.name,
        url: data.url,
      });
      await checkConnection();
      setCurrentStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating database');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Initialize 11 Sheets
  const handleInitSheets = async () => {
    try {
      setLoading(true);
      setError('');
      setNeedsReauth(false);
      const res = await fetch('/api/connection/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'init_sheets' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsReauth || res.status === 403) {
          setNeedsReauth(true);
        }
        throw new Error(data.error || 'Failed to initialize sheets.');
      }
      setInitializedSheets(data.sheets || REQUIRED_SHEETS);
      await checkConnection();
      setCurrentStep(4);
      if (!candidateName) {
        setCandidateName(getStoredCandidateName() || user?.name || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error initializing sheets');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Save Candidate Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = candidateName.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/connection/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'save_profile',
          candidateName: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save profile name.');
      }
      setStoredCandidateName(trimmed);
      await checkConnection();
      setCurrentStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    closeWizard();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/40 overflow-hidden">
        {/* Header with Progress Steps */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Productivity Tracker Setup
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect your personal Google account & database
                </p>
              </div>
            </div>
            {isAuthenticated && database?.status === 'connected' && (
              <button
                onClick={closeWizard}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {[1, 2, 3, 4, 5].map((stepNum) => {
              const isPast = currentStep > stepNum;
              const isCur = currentStep === stepNum;
              return (
                <div key={stepNum} className="flex-1 flex items-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isPast
                        ? 'bg-emerald-500'
                        : isCur
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 px-0.5">
            <span>1. Account</span>
            <span>2. Database</span>
            <span>3. Sheets</span>
            <span>4. Profile</span>
            <span>5. Ready</span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {(needsReauth || error.toLowerCase().includes('permission') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('failed')) && (
                <div className="pt-3 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs text-rose-600 dark:text-rose-400">
                    Purani permissions overwrite karne ke liye:
                  </span>
                  <button
                    type="button"
                    onClick={handleReauth}
                    disabled={loading}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Re-connect & Overwrite Permissions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              STEP 1: CONNECT GOOGLE
             ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Connect Your Google Account
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your tasks, exams, daily logs, and arcs will be securely stored in a private
                  Google Sheet inside <strong>your own Google Drive</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Only accesses the app’s own database spreadsheet</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Encrypted session tokens protected via HTTP-only cookies</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Zero token leakage to client-side JavaScript</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href="/api/auth/google?returnTo=/settings?setup=1"
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Connect with Google</span>
                </a>

                {/* Dev Mode local database bypass */}
                <div className="pt-2">
                  <a
                    href="/api/auth/google?dev=true&returnTo=/settings?setup=1"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Run Demo / Local Dev Mode (No Google Account Required)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: CONNECT / CREATE DATABASE
             ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isDevMode ? 'Local Dev Database' : 'Connect Google Drive Database'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {isDevMode
                    ? 'Creating a high-performance local database file (.dev-database.json) in your workspace.'
                    : 'We will check your Google Drive for an existing "Productivity Tracker Database" or automatically create a brand new one for you.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-left">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Target Spreadsheet</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Productivity Tracker Database
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Location: {isDevMode ? 'Local file (.dev-database.json)' : 'Your Google Drive root folder'}
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleCreateDatabase}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Configuring Database in Drive...</span>
                    </>
                  ) : (
                    <>
                      <span>Create & Connect Database</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {needsReauth && (
                  <button
                    type="button"
                    onClick={handleReauth}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/50 text-rose-700 dark:text-rose-300 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Reset & Overwrite Google Permissions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: INITIALIZE 11 SHEETS
             ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Initialize Database Sheets
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Configuring the 11 required tracking schemas in your database spreadsheet.
                </p>
              </div>

              {/* Checklist grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {REQUIRED_SHEETS.map((name) => {
                  const isReady = initializedSheets.includes(name) || database?.sheetsReady;
                  return (
                    <div
                      key={name}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        isReady
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isReady ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                      )}
                      <span className="truncate">{name}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleInitSheets}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating & Verifying 11 Sheets...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize 11 Sheets</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ========================================================
              STEP 4: CANDIDATE PROFILE
             ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Personalize Your Tracker
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  What name should appear on your daily schedule and reports?
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md mx-auto text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Prem Patil"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Profile & Complete</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================
              STEP 5: READY
             ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  You&apos;re All Set!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Your Productivity Tracker is connected and ready to organize your days and exams.
                </p>
              </div>

              {/* Status summary box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Account:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {user?.email || 'dev-user@example.com'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Database:</span>
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{database?.name || 'Productivity Tracker Database'}</span>
                    {dbResult?.url && (
                      <a
                        href={dbResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:text-blue-600 inline-flex items-center"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Connected & Synced</span>
                  </span>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
