'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Smartphone, Download, Copy, Check, Share2, MoreVertical, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '@/lib/hooks/usePwaInstall';

export interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppDownloadModal({ isOpen, onClose }: AppDownloadModalProps) {
  const { isInstallable, isInstalled, triggerInstall } = usePwaInstall();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin;
      setCurrentUrl(url);

      QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setQrCodeUrl(dataUrl))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (currentUrl) {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInstallClick = async () => {
    const installed = await triggerInstall();
    if (installed) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install Self Tracker App"
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center space-y-5 py-2">
        {/* Header Icon & Title */}
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs">
          <Smartphone className="w-7 h-7" />
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Install on your Phone or PC
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Run Self Tracker as a standalone app with full-screen experience, zero lag, and instant home screen access.
          </p>
        </div>

        {/* Direct Install Button (If browser supports BeforeInstallPrompt) */}
        {isInstallable && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full max-w-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App on this Device</span>
          </button>
        )}

        {isInstalled && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>App is already installed on this device</span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200/80 mb-3">
            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="Scan to open app on phone"
                className="w-44 h-44 rounded-lg object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                Loading QR code...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <code className="text-[11px] font-mono bg-white dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
              {currentUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy URL"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step-by-Step Device Instructions */}
        <div className="w-full max-w-sm text-left">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              iPhone / iOS (Safari)
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'android' ? (
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Open this link in <strong>Google Chrome</strong> on your phone.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tap the menu icon <MoreVertical className="w-3.5 h-3.5 inline text-slate-700 dark:text-slate-200" /> in the top right.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Open this link in <strong>Safari</strong> on your iPhone/iPad.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-500" /> at the bottom.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 dark:text-slate-200" />.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
