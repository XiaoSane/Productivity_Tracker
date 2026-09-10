import React from 'react';
import { ExamStatus } from '@/types';
import { EXAM_STATUSES } from '@/lib/constants/categories';
import { cn } from '@/lib/utils/cn';

interface ExamStatusBadgeProps {
  status: ExamStatus;
  className?: string;
}

export function ExamStatusBadge({ status, className }: ExamStatusBadgeProps) {
  const info = EXAM_STATUSES.find((s) => s.value === status) || EXAM_STATUSES[0];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        info.badgeClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {info.label}
    </span>
  );
}
