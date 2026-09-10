'use client';

import React from 'react';
import Link from 'next/link';
import { Exam } from '@/types';
import { ExamStatusBadge } from './ExamStatusBadge';
import { ExamDeadlineBadge } from './ExamDeadlineBadge';
import { formatTimeDisplay } from '@/lib/utils/date';
import { MapPin, Clock, Edit3, Trash2, ArrowUpRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExamCardProps {
  exam: Exam;
  onEdit?: (exam: Exam) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function ExamCard({
  exam,
  onEdit,
  onDelete,
  compact = false,
}: ExamCardProps) {
  const hasTime = exam.startTime || exam.endTime;
  const timeDisplay = hasTime
    ? [formatTimeDisplay(exam.startTime), formatTimeDisplay(exam.endTime)].filter(Boolean).join(' – ')
    : null;

  if (compact) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              {exam.subject}
            </span>
            <Link
              href={`/exams/${exam.id}`}
              className="text-sm font-semibold text-slate-900 dark:text-white hover:underline flex items-center gap-1"
            >
              <span>{exam.name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
          <ExamStatusBadge status={exam.status} />
        </div>

        <ExamDeadlineBadge
          examDate={exam.examDate}
          deadline={exam.deadline}
          compact
        />
      </div>
    );
  }

  return (
    <div className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4">
      {/* Header: Subject & Title & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            {exam.subject}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <Link
              href={`/exams/${exam.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {exam.name}
            </Link>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <ExamStatusBadge status={exam.status} />
        </div>
      </div>

      {/* Critical: Separate Exam Date and Preparation Deadline Display */}
      <ExamDeadlineBadge examDate={exam.examDate} deadline={exam.deadline} />

      {/* Venue & Time Row */}
      {(exam.venue || timeDisplay) && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          {timeDisplay && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeDisplay}</span>
            </div>
          )}
          {exam.venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{exam.venue}</span>
            </div>
          )}
        </div>
      )}

      {/* Syllabus snippet if available */}
      {exam.syllabus && (
        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Syllabus: </span>
          {exam.syllabus}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <Link href={`/exams/${exam.id}`}>
          <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
            View Details
          </Button>
        </Link>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(exam)}
              aria-label={`Edit ${exam.name}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(exam.id)}
              aria-label={`Delete ${exam.name}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
