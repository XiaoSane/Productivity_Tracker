'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getStoredCandidateName,
  setStoredCandidateName,
  apiClient,
  isBackendConfigured,
} from '@/lib/api/client';
import { GraduationCap, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

export function WelcomeOverlay() {
  const [candidateName, setCandidateName] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isWashingAway, setIsWashingAway] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if splash was already dismissed in this browsing session
    const sessionDismissed = sessionStorage.getItem('SELF_TRACKER_WELCOME_DISMISSED');
    if (sessionDismissed === 'true') {
      return;
    }

    const stored = getStoredCandidateName();
    if (stored) {
      setCandidateName(stored);
      setIsFirstTime(false);
      setIsVisible(true);
    } else {
      // Check if backend has a profile name if configured
      if (isBackendConfigured()) {
        apiClient
          .getProfile()
          .then((res) => {
            if (res && res.name && res.name.trim()) {
              setCandidateName(res.name.trim());
              setStoredCandidateName(res.name.trim());
              setIsFirstTime(false);
              setIsVisible(true);
            } else {
              setIsFirstTime(true);
              setIsVisible(true);
            }
          })
          .catch(() => {
            setIsFirstTime(true);
            setIsVisible(true);
          });
      } else {
        setIsFirstTime(true);
        setIsVisible(true);
      }
    }

    // Listen for name changes elsewhere in the app
    const handleNameChange = (e: CustomEvent<string>) => {
      if (e.detail) {
        setCandidateName(e.detail);
      }
    };

    // Listen for manual preview request from Settings
    const handleShowWelcome = () => {
      const stored = getStoredCandidateName();
      setCandidateName(stored);
      setIsFirstTime(!stored);
      setIsWashingAway(false);
      setIsVisible(true);
    };

    // Listen for connection status changes (e.g. user connects/disconnects in wizard or settings)
    const handleConnectionChange = () => {
      if (isBackendConfigured()) {
        apiClient
          .getProfile()
          .then((res) => {
            if (res && res.name && res.name.trim()) {
              setCandidateName(res.name.trim());
              setStoredCandidateName(res.name.trim());
              setIsFirstTime(false);
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener('candidate-name-changed', handleNameChange as EventListener);
    window.addEventListener('show-welcome-overlay', handleShowWelcome);
    window.addEventListener('connection-status-changed', handleConnectionChange as EventListener);

    return () => {
      window.removeEventListener('candidate-name-changed', handleNameChange as EventListener);
      window.removeEventListener('show-welcome-overlay', handleShowWelcome);
      window.removeEventListener('connection-status-changed', handleConnectionChange as EventListener);
    };
  }, []);

  // Autofocus input when first-time state loads
  useEffect(() => {
    if (isFirstTime && isVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isFirstTime, isVisible]);

  const triggerWashAway = () => {
    if (isWashingAway) return;
    setIsWashingAway(true);
    sessionStorage.setItem('SELF_TRACKER_WELCOME_DISMISSED', 'true');
    setTimeout(() => {
      setIsVisible(false);
    }, 700);
  };

  const handleFirstTimeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your name to continue');
      inputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setCandidateName(trimmed);
      setStoredCandidateName(trimmed);

      // Sync with Google Sheets backend if configured
      if (isBackendConfigured()) {
        apiClient.updateProfile(trimmed).catch((err) => {
          console.warn('Backend name sync failed (saved locally):', err);
        });
      }

      // Wash away screen
      triggerWashAway();
    } catch (err) {
      console.error('Error saving candidate name:', err);
      // Still allow entering the app
      triggerWashAway();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Press Escape, Enter, or Spacebar to dismiss returning user screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || isFirstTime || isWashingAway) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        triggerWashAway();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isFirstTime, isWashingAway]);

  if (!isVisible || isFirstTime === null) {
    return null;
  }

  return (
    <div
      onClick={() => {
        // If returning user, clicking ANYWHERE washes the screen away!
        if (!isFirstTime) {
          triggerWashAway();
        }
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden transition-all duration-700 ease-out ${isWashingAway
          ? 'opacity-0 scale-110 blur-xl pointer-events-none'
          : 'opacity-100 scale-100 blur-none cursor-pointer'
        } bg-slate-950/75 backdrop-blur-lg`}
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(30, 58, 138, 0.45), rgba(15, 23, 42, 0.85) 60%, rgba(2, 6, 23, 0.95))',
      }}
    >
      {/* Decorative ambient background rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl" />
      </div>

      {/* Screen Content */}
      <div
        onClick={(e) => {
          // If first-time user, clicks inside the form card should not dismiss prematurely
          if (isFirstTime) {
            e.stopPropagation();
          }
        }}
        className="relative z-10 max-w-lg w-full mx-4 p-6 sm:p-8 text-center flex flex-col items-center cursor-default"
      >
        {isFirstTime ? (
          /* =======================================================
             FIRST-TIME USER ONBOARDING STATE
             ======================================================= */
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mx-auto ring-4 ring-blue-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Productivity Tracker System</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome
              </h1>
              <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                Please enter your candidate name to personalize your daily tasks and exam schedule.
              </p>
            </div>

            <form
              onSubmit={handleFirstTimeSubmit}
              className="w-full max-w-sm mx-auto space-y-3 pt-2 text-left"
            >
              <div>
                <label
                  htmlFor="candidateNameInput"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Candidate Name
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="candidateNameInput"
                    type="text"
                    value={inputName}
                    onChange={(e) => {
                      setInputName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="e.g. Prem Patil"
                    autoComplete="name"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium animate-in fade-in">
                    {errorMsg}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Saving to your tracker...</span>
                ) : (
                  <>
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-slate-400">
              Your name is securely stored in your personal Google Sheet.
            </p>
          </div>
        ) : (
          /* =======================================================
             RETURNING USER WELCOME STATE (Click anywhere to wash away)
             ======================================================= */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mx-auto ring-4 ring-blue-500/20">
              <UserCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <p className="text-base sm:text-lg font-medium text-blue-300 uppercase tracking-widest text-xs">
                Welcome back
              </p>
              <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200 tracking-tight drop-shadow-sm">
                {candidateName}
              </h1>
              <p className="text-sm text-slate-400 max-w-sm mx-auto pt-1">
                Your day & exam system is ready.
              </p>
            </div>

            {/* Click Anywhere Wash-Away Prompt */}
            <div className="pt-6">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-200 text-xs font-medium shadow-xl shadow-black/40 animate-pulse">
                <span>Click anywhere to continue</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
