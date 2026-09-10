'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  QrCode,
  Smartphone,
  X,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDisplayDate, getTodayDateString } from '@/lib/utils/date';
import { useSidebar } from '@/lib/context/SidebarContext';
import { NAVIGATION_SECTIONS } from './sidebar-config';
import { SidebarLogo } from './SidebarLogo';
import { SidebarSection } from './SidebarSection';
import { SIDEBAR_TRANSITIONS } from './sidebar-animations';
import { AppDownloadModal } from '@/components/layout/AppDownloadModal';
import { usePwaInstall } from '@/lib/hooks/usePwaInstall';

export function Sidebar() {
  const { isExpanded, toggleExpanded, isMobileOpen, closeMobile } = useSidebar();
  const { isStandalone } = usePwaInstall();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const pathname = usePathname();
  const todayStr = getTodayDateString();

  return (
    <>
      {/* =========================================================
          DESKTOP SIDEBAR (Collapsible & Animated)
          ========================================================= */}
      <aside
        aria-label="Sidebar Navigation"
        className={cn(
          'relative hidden lg:flex flex-col h-screen sticky top-0 shrink-0 select-none z-30',
          'bg-slate-900 text-slate-200',
          SIDEBAR_TRANSITIONS.sidebarContainer,
          isExpanded ? 'w-[256px]' : 'w-[72px]'
        )}
      >

        {/* Brand Header */}
        <SidebarLogo isExpanded={isExpanded} onToggle={toggleExpanded} />

        {/* Date Indicator Widget */}
        <div className={cn('my-3 transition-all duration-300', isExpanded ? 'px-3' : 'px-2')}>
          {isExpanded ? (
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                  Today
                </p>
                <p className="font-semibold text-xs text-white truncate">
                  {formatDisplayDate(todayStr, { includeWeekday: true })}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-blue-400 hover:border-blue-500/50 transition-all cursor-default"
              title={`Today: ${formatDisplayDate(todayStr, { includeWeekday: true })}`}
            >
              <Calendar className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav
          className={cn(
            'flex-1 space-y-3 py-2 overflow-visible',
            isExpanded ? 'pl-3 pr-0' : 'px-2'
          )}
        >
          {NAVIGATION_SECTIONS.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              pathname={pathname}
              isExpanded={isExpanded}
            />
          ))}
        </nav>

        {/* Footer Area: Mobile Companion Promo (Hidden when running inside standalone app) */}
        {!isStandalone && (
          <div
            className={cn(
              'hide-in-app p-2.5 border-t border-slate-800 space-y-2 bg-slate-900/60',
              isExpanded ? 'px-3' : 'px-2'
            )}
          >
            {/* QR Code / App Download Button */}
            {isExpanded ? (
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-2.5 text-left group cursor-pointer shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-all shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="truncate flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      Mobile Companion
                    </span>
                    <Smartphone className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Scan QR to install</p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-10 h-10 mx-auto rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-blue-400 hover:scale-105 transition-all cursor-pointer"
                title="Get Mobile Companion App"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* =========================================================
          MOBILE NAVIGATION DRAWER
          ========================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <nav
            aria-label="Mobile Navigation Drawer"
            className="fixed top-0 bottom-0 left-0 w-[280px] bg-slate-900 border-r border-slate-800 text-slate-100 p-4 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block leading-tight">
                    Productivity Tracker
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 space-y-4 overflow-y-auto py-2">
              {NAVIGATION_SECTIONS.map((section) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  pathname={pathname}
                  isExpanded={true}
                  onNavigate={closeMobile}
                />
              ))}
            </div>

            {/* Drawer Footer (Hidden when running inside standalone app) */}
            {!isStandalone && (
              <div className="hide-in-app pt-3 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    setIsQrModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>Get Mobile App</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* QR Code Download Modal */}
      <AppDownloadModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </>
  );
}
