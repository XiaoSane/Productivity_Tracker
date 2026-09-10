'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextValue {
  isExpanded: boolean;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  isMobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

const STORAGE_KEY = 'SELF_TRACKER_SIDEBAR_EXPANDED';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Default to expanded for desktop clarity; will be updated from localStorage on mount
  const [isExpanded, setIsExpandedState] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const pathname = usePathname();

  // Load persisted preference after mount (hydration safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsExpandedState(saved === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpandedState(expanded);
    try {
      localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      // Ignore
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpandedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        toggleExpanded,
        setExpanded,
        isMobileOpen,
        openMobile,
        closeMobile,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
