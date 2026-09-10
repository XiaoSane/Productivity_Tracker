'use client';

import React from 'react';
import { NavSectionConfig } from './sidebar-config';
import { SidebarItem } from './SidebarItem';
import { isRouteActive } from './sidebar-config';
import { cn } from '@/lib/utils/cn';
import { SIDEBAR_TRANSITIONS } from './sidebar-animations';

interface SidebarSectionProps {
  section: NavSectionConfig;
  pathname: string;
  isExpanded: boolean;
  onNavigate?: () => void;
}

export function SidebarSection({
  section,
  pathname,
  isExpanded,
  onNavigate,
}: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      {/* Section Header */}
      {isExpanded ? (
        <div className="px-3 pt-3 pb-1">
          <p
            className={cn(
              'text-[10px] uppercase font-bold tracking-widest text-slate-500',
              SIDEBAR_TRANSITIONS.sectionTitleExpanded
            )}
          >
            {section.title}
          </p>
        </div>
      ) : (
        <div className="py-2 px-3">
          <div className="h-px w-full bg-slate-800" />
        </div>
      )}

      {/* Navigation Items */}
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = isRouteActive(pathname, item.href);
          return (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isActive}
              isExpanded={isExpanded}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </div>
  );
}
