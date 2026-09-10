'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { NavItemConfig } from './sidebar-config';
import { SIDEBAR_TRANSITIONS } from './sidebar-animations';

interface SidebarItemProps {
  item: NavItemConfig;
  isActive: boolean;
  isExpanded: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({ item, isActive, isExpanded, onNavigate }: SidebarItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  return (
    <div
      className={cn('relative', isActive ? 'z-20' : 'z-0')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isExpanded ? (
        /* =========================================================
           EXPANDED STATE: White tab with smooth concave curves
           ========================================================= */
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'group relative flex items-center gap-3.5 h-11 select-none cursor-pointer outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            isActive
              ? 'w-[calc(100%+2px)] pl-3.5 pr-4 -mr-[2px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold rounded-l-[22px] rounded-r-none z-20'
              : 'mr-10 px-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 text-xs font-medium'
          )}
        >
          {/* Top concave curve (36px sweeping smooth liquid curve) */}
          <svg
            className={cn(
              'absolute -top-[36px] right-0 w-[36px] h-[36px] text-white dark:text-slate-950 fill-current pointer-events-none z-20',
              'transition-opacity duration-300 ease-out',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
            viewBox="0 0 36 36"
            aria-hidden="true"
          >
            <path d="M0 36 C18 36 36 18 36 0 L36 36 Z" />
          </svg>

          {/* Bottom concave curve (36px sweeping smooth liquid curve) */}
          <svg
            className={cn(
              'absolute -bottom-[36px] right-0 w-[36px] h-[36px] text-white dark:text-slate-950 fill-current pointer-events-none z-20',
              'transition-opacity duration-300 ease-out',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
            viewBox="0 0 36 36"
            aria-hidden="true"
          >
            <path d="M0 0 C18 0 36 18 36 36 L36 0 Z" />
          </svg>

          {/* Icon */}
          <div
            className={cn(
              'w-6 h-6 flex items-center justify-center shrink-0 transition-all duration-300',
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 group-hover:text-white'
            )}
          >
            <Icon
              className="w-4 h-4 transition-transform duration-300 group-hover:scale-105"
              strokeWidth={isActive ? 2.4 : 1.8}
            />
          </div>

          {/* Animated Label */}
          <span
            className={cn(
              'text-xs tracking-wide truncate transition-all duration-300',
              isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-400 group-hover:text-white'
            )}
          >
            {item.name}
          </span>
        </Link>
      ) : (
        /* =========================================================
           COLLAPSED STATE: Circular white pill button
           ========================================================= */
        <div className="flex justify-center py-0.5">
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-center justify-center select-none cursor-pointer outline-none transition-all duration-300 ease-out',
              isActive
                ? 'w-11 h-11 rounded-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-md shadow-black/25 ring-2 ring-white/10 scale-105'
                : 'w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80'
            )}
          >
            <Icon
              className={cn(
                'transition-transform duration-200 group-hover:scale-110',
                isActive
                  ? 'w-5 h-5 text-slate-900 dark:text-white'
                  : 'w-4 h-4 text-slate-400 group-hover:text-white'
              )}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
          </Link>
        </div>
      )}

      {/* Floating Tooltip in Collapsed Mode */}
      {!isExpanded && isHovered && (
        <div
          role="tooltip"
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1.5 rounded-lg bg-slate-950 text-white border border-slate-700 shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
        >
          <p className="text-xs font-semibold text-white">{item.name}</p>
          {item.description && (
            <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
          )}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-950 border-l border-b border-slate-700 rotate-45" />
        </div>
      )}
    </div>
  );
}
