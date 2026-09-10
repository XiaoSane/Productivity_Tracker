import React from 'react';
import { formatDisplayDate, daysFromToday } from '@/lib/utils/date';
import { Calendar, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ExamDeadlineBadgeProps {
  examDate: string;
  deadline?: string;
  className?: string;
  compact?: boolean;
}

export function ExamDeadlineBadge({
  examDate,
  deadline,
  className,
  compact = false,
}: ExamDeadlineBadgeProps) {
  const daysToExam = daysFromToday(examDate);
  const daysToDeadline = deadline ? daysFromToday(deadline) : null;
  const isDeadlinePassed = daysToDeadline !== null && daysToDeadline < 0;

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1 text-xs', className)}>
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Exam: {formatDisplayDate(examDate)}</span>
          {daysToExam !== null && (
            <span className="text-[10px] text-slate-500 font-normal">
              ({daysToExam >= 0 ? `${daysToExam}d left` : `${Math.abs(daysToExam)}d ago`})
            </span>
          )}
        </div>

        {deadline ? (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[11px]',
              isDeadlinePassed
                ? 'text-amber-600 dark:text-amber-400 font-medium'
                : 'text-indigo-600 dark:text-indigo-400'
            )}
          >
            <Target className="w-3 h-3 shrink-0" />
            <span>Prep Deadline: {formatDisplayDate(deadline)}</span>
            {isDeadlinePassed ? (
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 font-semibold">
                Passed
              </span>
            ) : daysToDeadline !== null ? (
              <span className="text-[10px] text-slate-500">
                ({daysToDeadline}d left)
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">No prep deadline set</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800', className)}>
      {/* Actual Exam Date */}
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Actual Exam Date
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatDisplayDate(examDate)}
          </span>
          {daysToExam !== null && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              {daysToExam > 0
                ? `${daysToExam} days remaining`
                : daysToExam === 0
                ? 'Exam is Today!'
                : `${Math.abs(daysToExam)} days ago`}
            </span>
          )}
        </div>
      </div>

      {/* Preparation Deadline */}
      <div className="flex items-start gap-2.5 sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-3">
        <div
          className={cn(
            'p-2 rounded-lg shrink-0',
            isDeadlinePassed
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
          )}
        >
          {isDeadlinePassed ? <AlertCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
            Preparation Deadline
          </span>
          {deadline ? (
            <>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatDisplayDate(deadline)}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isDeadlinePassed ? (
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.2 rounded">
                    Prep Deadline Passed
                  </span>
                ) : daysToDeadline !== null ? (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-300 font-medium">
                    {daysToDeadline > 0
                      ? `${daysToDeadline} days to complete prep`
                      : 'Prep deadline is Today'}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic block mt-0.5">
              Not specified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
