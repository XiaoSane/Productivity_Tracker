import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'p-6 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="p-2.5 mb-2.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</h4>
      <p className="text-xs text-red-700 dark:text-red-300 mt-1 max-w-md leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="border-red-300 hover:bg-red-100/50 text-red-700 dark:border-red-800 dark:text-red-300"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
