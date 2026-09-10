'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const router = useRouter();

  // Listen for global shortcut keys (e.g. ?, G then key, N)
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // '?' opens shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
        return;
      }

      // 'Escape' closes modal
      if (e.key === 'Escape' && isOpen) {
        onClose();
        return;
      }

      // 'N' for New Task
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        router.push('/tasks?create=true');
        return;
      }

      // Sequence navigation: 'g' followed by a key
      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        const key = e.key.toLowerCase();
        if (key === 'd') {
          e.preventDefault();
          router.push('/dashboard');
        } else if (key === 'r') {
          e.preventDefault();
          router.push('/arc');
        } else if (key === 't') {
          e.preventDefault();
          router.push('/tasks');
        } else if (key === 'c') {
          e.preventDefault();
          router.push('/calendar');
        } else if (key === 'e') {
          e.preventDefault();
          router.push('/exams');
        } else if (key === 'l') {
          e.preventDefault();
          router.push('/daily-log');
        } else if (key === 'v') {
          e.preventDefault();
          router.push('/reviews');
        } else if (key === 'a') {
          e.preventDefault();
          router.push('/analytics');
        } else if (key === 's') {
          e.preventDefault();
          router.push('/settings');
        }
        lastKey = '';
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        lastKey = 'g';
        lastKeyTime = now;
      } else {
        lastKey = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, router]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Global & Search',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Open Command Palette & Global Search' },
        { keys: ['?'], label: 'Show Keyboard Shortcuts' },
        { keys: ['N'], label: 'Create New Task' },
        { keys: ['Esc'], label: 'Close active modal / dialog' },
      ],
    },
    {
      title: 'Quick Navigation (Press G then letter)',
      items: [
        { keys: ['G', 'D'], label: 'Go to Dashboard' },
        { keys: ['G', 'R'], label: 'Go to Arc' },
        { keys: ['G', 'T'], label: 'Go to Tasks' },
        { keys: ['G', 'C'], label: 'Go to Calendar' },
        { keys: ['G', 'E'], label: 'Go to Exams' },
        { keys: ['G', 'L'], label: 'Go to Daily Log' },
        { keys: ['G', 'V'], label: 'Go to Reviews' },
        { keys: ['G', 'A'], label: 'Go to Analytics' },
        { keys: ['G', 'S'], label: 'Go to Settings' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-slate-400">Navigate and command Productivity Tracker rapidly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {shortcutSections.map((sec) => (
            <div key={sec.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {sec.title}
              </h3>
              <div className="rounded-xl border border-slate-800/80 divide-y divide-slate-800/80 bg-slate-950/40">
                {sec.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Shortcuts are paused while typing inside forms</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
