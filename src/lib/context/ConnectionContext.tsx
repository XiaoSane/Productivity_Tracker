'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface ConnectionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface ConnectionDatabase {
  spreadsheetId: string;
  name: string;
  status: 'connected' | 'setup_required' | 'disconnected';
  sheetsReady?: boolean;
  profileReady?: boolean;
}

export interface ConnectionContextType {
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  user: ConnectionUser | null;
  database: ConnectionDatabase | null;
  isDevMode: boolean;
  isWizardOpen: boolean;
  checkConnection: () => Promise<void>;
  openWizard: () => void;
  closeWizard: () => void;
  disconnect: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType>({
  isAuthenticated: false,
  isConfigured: false,
  isLoading: true,
  user: null,
  database: null,
  isDevMode: false,
  isWizardOpen: false,
  checkConnection: async () => {},
  openWizard: () => {},
  closeWizard: () => {},
  disconnect: async () => {},
});

export const useConnection = () => useContext(ConnectionContext);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<ConnectionUser | null>(null);
  const [database, setDatabase] = useState<ConnectionDatabase | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/connection/status', { cache: 'no-store' });
      if (!res.ok) {
        setIsAuthenticated(false);
        setIsConfigured(false);
        setUser(null);
        setDatabase(null);
        return;
      }
      const data = await res.json();
      const authed = !!data.authenticated;
      const db = data.database || null;
      const configured = authed && db && db.status === 'connected';

      setIsAuthenticated(authed);
      setUser(data.user || null);
      setDatabase(db);
      setIsConfigured(configured);
      setIsDevMode(!!data.isDevMode);

      if (typeof window !== 'undefined') {
        if (configured) {
          localStorage.setItem('SELF_TRACKER_CONFIGURED', 'true');
        } else {
          localStorage.removeItem('SELF_TRACKER_CONFIGURED');
        }
        window.dispatchEvent(new CustomEvent('connection-status-changed', { detail: { configured } }));
      }
    } catch (err) {
      console.error('[ConnectionContext] checkConnection failed:', err);
      setIsAuthenticated(false);
      setIsConfigured(false);
      setUser(null);
      setDatabase(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('SELF_TRACKER_CONFIGURED');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);


  const openWizard = useCallback(() => {
    setIsWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    setIsWizardOpen(false);
  }, []);

  const isDisconnectingRef = useRef(false);

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    isDisconnectingRef.current = true;
    try {
      setIsLoading(true);
      await fetch('/api/connection/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'disconnect' }),
      });
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[ConnectionContext] disconnect error:', err);
    } finally {
      setIsAuthenticated(false);
      setIsConfigured(false);
      setUser(null);
      setDatabase(null);
      setIsLoading(false);
      isDisconnectingRef.current = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('SELF_TRACKER_CONFIGURED');
        window.dispatchEvent(new CustomEvent('connection-status-changed', { detail: { configured: false } }));
        if (window.location.pathname !== '/settings') {
          window.location.href = '/settings';
        }
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Check URL searchParams for ?setup=1 on mount (e.g. after Google OAuth redirect)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('setup') === '1') {
        // Only open wizard if not already fully configured
        if (!isConfigured) {
          setIsWizardOpen(true);
        }
        // Clean URL parameter without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('setup');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [isConfigured]);

  return (
    <ConnectionContext.Provider
      value={{
        isAuthenticated,
        isConfigured,
        isLoading,
        user,
        database,
        isDevMode,
        isWizardOpen,
        checkConnection,
        openWizard,
        closeWizard,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}
