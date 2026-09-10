'use client';

import React from 'react';
import { useConnection } from '@/lib/context/ConnectionContext';
import { Card } from './Card';
import { Button } from './Button';
import {
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

export interface SetupRequiredStateProps {
  featureName?: string;
}

export function SetupRequiredState({ featureName }: SetupRequiredStateProps) {
  const { openWizard } = useConnection();

  return (
    <Card className="max-w-2xl mx-auto my-8 p-8 text-center border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col items-center space-y-6">
        {/* Header Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-blue-600 text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Connect Your Google Account to Begin
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {featureName ? (
              <>To {featureName} and use Productivity Tracker, connect your personal Google database.</>
            ) : (
              <>
                Productivity Tracker is designed with 100% personal data privacy. Your tasks, exams, and daily logs are stored directly in your own Google Drive.
              </>
            )}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">100% Private</span>
              <span className="text-[11px] text-slate-500">Stored in your personal Google Drive</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">1-Click OAuth</span>
              <span className="text-[11px] text-slate-500">Fast Setup Wizard, no manual coding</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
            <Database className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">Google Sheets</span>
              <span className="text-[11px] text-slate-500">Automatic schema setup &amp; sync</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col items-center gap-2.5">
          <Button
            size="md"
            onClick={openWizard}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Launch Setup Wizard
          </Button>

          <a
            href="/api/auth/google?dev=true&returnTo=/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Or try instant Demo Mode (Local Database)</span>
          </a>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            No Apps Script deployment or URL copy-pasting required.
          </p>
        </div>

      </div>
    </Card>
  );
}
