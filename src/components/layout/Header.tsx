'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  GraduationCap,
  Clock,
  Search,
  Keyboard,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDisplayDate, getTodayDateString, getUserTimezone } from '@/lib/utils/date';
import { CommandPalette } from '@/components/search/CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useConnection } from '@/lib/context/ConnectionContext';
import { useSidebar } from '@/lib/context/SidebarContext';

export function Header() {
  const { isMobileOpen, toggleMobile } = useSidebar();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>(getTodayDateString());
  const [activeTz, setActiveTz] = useState<string>(getUserTimezone());
  const { isConfigured, user, openWizard } = useConnection();

  useEffect(() => {
    const handleOpenCommand = () => setIsCommandPaletteOpen(true);
    const handleOpenShortcuts = () => setIsShortcutsOpen(true);

    window.addEventListener('open-command-palette', handleOpenCommand);
    window.addEventListener('open-shortcuts-modal', handleOpenShortcuts);

    return () => {
      window.removeEventListener('open-command-palette', handleOpenCommand);
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcuts);
    };
  }, []);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const tick = () => {
      if (!isMounted) return;
      const now = new Date();
      const tz = getUserTimezone();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        const isKolkata = tz === 'Asia/Kolkata';
        const label = isKolkata ? 'IST' : tz.split('/').pop()?.replace('_', ' ') || tz;
        setCurrentTime(`${formatter.format(now)} ${label}`);
        setCurrentDateStr(getTodayDateString(tz));
      } catch {
        setCurrentTime(`${now.toLocaleTimeString()}`);
      }

      const msUntilNextSecond = 1000 - (Date.now() % 1000) + 15;
      timerId = setTimeout(tick, msUntilNextSecond);
    };

    tick();

    const handleSync = () => {
      clearTimeout(timerId);
      setActiveTz(getUserTimezone());
      tick();
    };

    const handleTzChange = () => {
      handleSync();
    };

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('timezone-changed', handleTzChange);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('timezone-changed', handleTzChange);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Mobile brand & toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMobile}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              Productivity Tracker
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              Timezone: <strong className="text-blue-600 dark:text-blue-400 font-semibold">{activeTz}</strong>
            </span>
          </div>
        </div>

        {/* Center Slot for page-level tabs (Exams tabs) */}
        <div id="header-center-slot" className="hidden lg:flex items-center justify-center flex-1 mx-2" />

        {/* Right side info */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
          {/* Global Search Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
            title="Search tracker"
          >
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline font-medium text-xs">Search</span>
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Date & Time Widget */}
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              {formatDisplayDate(currentDateStr, { includeWeekday: true })}
            </p>
            <p
              className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums"
              title="Time in configured timezone"
            >
              {currentTime || '--:--:-- IST'}
            </p>
          </div>

          {/* Google Connection Status / Wizard Trigger */}
          {!isConfigured ? (
            <button
              type="button"
              onClick={openWizard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              <span className="hidden sm:inline">Connect Google</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div
                className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"
                title="Connected to Google Drive"
              />
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                {user?.name || user?.email?.split('@')[0] || 'Connected'}
              </span>
            </div>
          )}

          {/* Settings Link */}
          <Link
            href="/settings"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Settings & Connection"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </>
  );
}
