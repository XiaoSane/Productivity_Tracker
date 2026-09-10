'use client';

import React from 'react';
import { ConnectionProvider } from '@/lib/context/ConnectionContext';
import { SidebarProvider } from '@/lib/context/SidebarContext';
import { SetupWizardModal } from '@/components/auth/SetupWizardModal';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from './Header';
import { WelcomeOverlay } from './WelcomeOverlay';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
          <SetupWizardModal />
          <WelcomeOverlay />

          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
            <Header />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ConnectionProvider>
  );
}
