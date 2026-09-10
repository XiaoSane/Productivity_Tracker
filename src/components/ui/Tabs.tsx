import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs({ tabs, activeTab, onChange, className, size = 'md' }: TabsProps) {
  const isSm = size === 'sm';

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 overflow-x-auto max-w-full shadow-2xs',
        isSm ? 'h-[29.59px] p-0.5 gap-0.5 rounded-lg' : 'p-1 gap-1 rounded-xl',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center transition-all whitespace-nowrap cursor-pointer select-none',
              isSm
                ? 'gap-1.5 px-2.5 rounded-md text-xs font-medium h-[23.59px]'
                : 'gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
              isActive
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            )}
          >
            {tab.icon && (
              <span className={cn('shrink-0 flex items-center', isSm ? 'w-3 h-3' : 'w-3.5 h-3.5')}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full font-bold tabular-nums',
                  isSm
                    ? 'px-1.5 py-0 text-[10px] leading-none'
                    : 'px-1.5 py-0.5 text-[10px]',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
