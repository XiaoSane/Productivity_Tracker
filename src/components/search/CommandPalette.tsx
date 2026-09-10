'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  CheckSquare,
  GraduationCap,
  Calendar,
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Target,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { GlobalSearchResultsGroup } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResultsGroup>({
    tasks: [],
    exams: [],
    topics: [],
    sessions: [],
    plans: [],
    logs: [],
    arcs: [],
    goals: [],
    milestones: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults({
        tasks: [],
        exams: [],
        topics: [],
        sessions: [],
        plans: [],
        logs: [],
        arcs: [],
        goals: [],
        milestones: [],
      });
    }
  }, [isOpen]);

  // Handle Ctrl+K global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        tasks: [],
        exams: [],
        topics: [],
        sessions: [],
        plans: [],
        logs: [],
        arcs: [],
        goals: [],
        milestones: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.search(query.trim());
        if (res && res.results) {
          setResults(res.results);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResultsCount =
    results.tasks.length +
    results.exams.length +
    results.topics.length +
    results.sessions.length +
    results.plans.length +
    results.logs.length +
    (results.arcs?.length || 0) +
    (results.goals?.length || 0) +
    (results.milestones?.length || 0);

  const quickNav = [
    { label: 'Dashboard', path: '/dashboard', icon: Sparkles },
    { label: 'Arc Sprints', path: '/arc', icon: Target },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Exams', path: '/exams', icon: GraduationCap },
    { label: 'Daily Log', path: '/daily-log', icon: FileText },
    { label: 'Reviews', path: '/reviews', icon: BookOpen },
    { label: 'Analytics', path: '/analytics', icon: Layers },
  ];

  const navigateTo = (path: string) => {
    onClose();
    startTransition(() => {
      router.push(path);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[80vh] z-10 animate-in zoom-in-95 duration-200">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, exams, topics, study plans, logs..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-slate-400 focus:outline-hidden"
          />
          {isLoading ? (
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Results / Navigation Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {!query.trim() && (
            <div className="space-y-2">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigateTo(item.path)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-200 transition-all text-left group cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query.trim() && totalResultsCount === 0 && !isLoading && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for a different keyword or view</p>
            </div>
          )}

          {/* Arcs Results */}
          {results.arcs && results.arcs.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                <span>Arcs &amp; Sprints ({results.arcs.length})</span>
                <span className="text-slate-500 font-normal">Press to open Arc</span>
              </p>
              {results.arcs.map((arc) => (
                <div
                  key={arc.id}
                  onClick={() => navigateTo(`/arc/${arc.id}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-purple-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Target className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">
                        {arc.icon || '🎯'} {arc.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {arc.startDate} &rarr; {arc.endDate} {arc.description ? `• ${arc.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20 capitalize">
                      {arc.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Arc Goals Results */}
          {results.goals && results.goals.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Arc Goals ({results.goals.length})
              </p>
              {results.goals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => navigateTo(`/arc/${goal.arcId}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-blue-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Target className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{goal.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Target: {goal.targetValue} {goal.unit || ''} ({goal.metricType})
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 capitalize shrink-0">
                    {goal.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Arc Milestones Results */}
          {results.milestones && results.milestones.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Arc Milestones ({results.milestones.length})
              </p>
              {results.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  onClick={() => navigateTo(`/arc/${milestone.arcId}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-amber-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Target className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{milestone.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">Target: {milestone.targetDate}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 capitalize shrink-0">
                    {milestone.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                <span>Tasks ({results.tasks.length})</span>
                <span className="text-slate-500 font-normal">Press to view in Tasks</span>
              </p>
              {results.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigateTo(`/tasks?date=${task.date}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-blue-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-blue-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{task.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {task.date} {task.category ? `• ${task.category}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {task.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Exams Results */}
          {results.exams.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Exams ({results.exams.length})
              </p>
              {results.exams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => navigateTo(`/exams/${exam.id}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GraduationCap className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{exam.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {exam.subject} • Exam Date: {exam.examDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 capitalize">
                      {exam.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Topics Results */}
          {results.topics.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Exam Topics ({results.topics.length})
              </p>
              {results.topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => navigateTo(`/exams/${topic.examId}`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-cyan-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{topic.name}</p>
                      {topic.description && (
                        <p className="text-[11px] text-slate-400 truncate">{topic.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 capitalize shrink-0">
                    {topic.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Study Sessions Results */}
          {results.sessions.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Study Sessions ({results.sessions.length})
              </p>
              {results.sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => navigateTo(`/calendar`)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-amber-500/40 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">
                        {sess.subject || 'Study Session'} ({sess.durationMinutes} mins)
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sess.date} {sess.notes ? `• ${sess.notes}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
