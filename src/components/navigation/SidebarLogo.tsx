'use client';

import React from 'react';
import { GraduationCap, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SidebarLogoProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function SidebarLogo({ isExpanded, onToggle, className }: SidebarLogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-slate-800 h-16 shrink-0 transition-all duration-300',
        isExpanded ? 'px-3.5' : 'px-3 justify-center',
        className
      )}
    >
      {/* Brand Emblem & Text */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30 shrink-0 transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </button>

        {isExpanded && (
          <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-[13px] font-bold text-white tracking-tight leading-none whitespace-nowrap">
              Productivity Tracker
            </h1>
          </div>
        )}
      </div>

      {/* Collapse / Expand Toggle Button */}
      {isExpanded && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          aria-expanded={isExpanded}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
