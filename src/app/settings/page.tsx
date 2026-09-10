'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  apiClient,
  getStoredCandidateName,
  setStoredCandidateName,
} from '@/lib/api/client';
import {
  getUserTimezone,
  setUserTimezone,
  SUPPORTED_TIMEZONES,
  getTodayDateString,
} from '@/lib/utils/date';
import { useConnection } from '@/lib/context/ConnectionContext';
import {
  HealthCheckResponse,
  AuditLogEntry,
  ImportValidationResult,
  ImportExecutionResult,
  DataExportPayload,
} from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  ExternalLink,
  ShieldCheck,
  User,
  RefreshCw,
  Sparkles,
  Download,
  Upload,
  History,
  Clock,
  Filter,
  Smartphone,
  QrCode,
  Zap,
  Unlink,
  Loader2,
} from 'lucide-react';
import { AppDownloadModal } from '@/components/layout/AppDownloadModal';
import { usePwaInstall } from '@/lib/hooks/usePwaInstall';

export default function SettingsPage() {
  const { isStandalone } = usePwaInstall();
  const {
    isAuthenticated,
    isConfigured,
    user,
    database,
    isDevMode,
    openWizard,
    disconnect,
    checkConnection,
  } = useConnection();

  // Timezone state
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => getUserTimezone());
  const [previewTime, setPreviewTime] = useState<string>('');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: HealthCheckResponse;
  } | null>(null);

  // Disconnect confirmation dialog
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Mobile QR Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Candidate Name state
  const [candidateName, setCandidateName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [candidateNameInput, setCandidateNameInput] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaveMsg, setNameSaveMsg] = useState('');
  const [nameSaveStatus, setNameSaveStatus] = useState<'success' | 'error' | null>(null);

  // Data Portability (Export / Import) state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importPayload, setImportPayload] = useState<DataExportPayload | null>(null);
  const [isValidatingImport, setIsValidatingImport] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isExecutingImport, setIsExecutingImport] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audit History state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  const loadAuditLogs = async () => {
    try {
      setIsLoadingAudit(true);
      const res = await apiClient.listAuditLogs({ limit: 50 });
      if (res && res.logs) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    const tz = getUserTimezone();
    setSelectedTimezone(tz);

    const name = getStoredCandidateName();
    setCandidateName(name);
    setCandidateNameInput(name);

    if (isAuthenticated) {
      loadAuditLogs();
    }
  }, [isAuthenticated]);

  // Live timezone preview clock
  useEffect(() => {
    const updatePreview = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: selectedTimezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setPreviewTime(formatter.format(now));
      } catch {
        setPreviewTime('--:--:--');
      }
    };
    updatePreview();
    const interval = setInterval(updatePreview, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const handleTimezoneChange = (newTz: string) => {
    setSelectedTimezone(newTz);
    setUserTimezone(newTz);
  };

  const handleSaveCandidateName = async () => {
    const trimmed = candidateNameInput.trim();
    if (!trimmed) {
      setNameSaveStatus('error');
      setNameSaveMsg('Candidate name cannot be blank.');
      return;
    }
    setIsSavingName(true);
    setNameSaveMsg('');
    setNameSaveStatus(null);
    try {
      setStoredCandidateName(trimmed);
      setCandidateName(trimmed);

      if (isConfigured) {
        await apiClient.updateProfile(trimmed);
        setNameSaveStatus('success');
        setNameSaveMsg('Successfully updated candidate name in your database & local tracker!');
      } else {
        setNameSaveStatus('success');
        setNameSaveMsg('Name saved locally! (Connect Google to sync across devices)');
      }
      setIsEditingName(false);
      setTimeout(() => {
        setNameSaveMsg('');
        setNameSaveStatus(null);
      }, 4000);
    } catch (err: unknown) {
      console.warn('Profile sync warning:', err);
      setNameSaveStatus('error');
      setNameSaveMsg(err instanceof Error ? err.message : 'Saved locally, but cloud sync failed.');
      setIsEditingName(false);
      setTimeout(() => {
        setNameSaveMsg('');
        setNameSaveStatus(null);
      }, 6000);
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePreviewWelcome = () => {
    window.dispatchEvent(new CustomEvent('show-welcome-overlay'));
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await apiClient.healthCheck();
      setTestResult({
        tested: true,
        success: true,
        message: 'Successfully connected and verified database engine!',
        details: res,
      });
    } catch (err: unknown) {
      console.error('Health check failed:', err);
      setTestResult({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : 'Unable to reach backend database.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setIsDisconnecting(false);
      setIsDisconnectDialogOpen(false);
    }
  };

  /* Data Export */
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setExportMsg(null);
      const exportPayload = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productivity-tracker-backup-${getTodayDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportMsg({
        type: 'success',
        text: 'Backup successfully exported and downloaded.',
      });
      setTimeout(() => setExportMsg(null), 5000);
    } catch (err: unknown) {
      setExportMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export backup.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  /* Data Import */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setImportPayload(parsed);
        setImportError(null);
        setValidationResult(null);
        setImportResult(null);

        setIsValidatingImport(true);
        setIsImportModalOpen(true);
        const valRes = await apiClient.validateImportData(parsed);
        setValidationResult(valRes);
      } catch (parseErr: unknown) {
        setImportError(`Invalid JSON file: ${parseErr instanceof Error ? parseErr.message : 'Unknown parse error'}`);
        setIsImportModalOpen(true);
      } finally {
        setIsValidatingImport(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!importPayload) return;
    try {
      setIsExecutingImport(true);
      setImportError(null);
      const res = await apiClient.importConfirmedData(importPayload);
      setImportResult(res);
      await loadAuditLogs();

    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Failed to import data.');
    } finally {
      setIsExecutingImport(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (auditActionFilter === 'ALL') return true;
    return String(log.action).toUpperCase().includes(auditActionFilter);
  });

  const driveSpreadsheetUrl = database?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${database.spreadsheetId}/edit`
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Settings & System Status"
        description="Manage your Google connection, database sync, regional preferences, and backups"
      />

      {/* ========================================================
          CARD 1: GOOGLE CONNECTION & DATABASE STATUS
         ======================================================== */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Google Account &amp; Database
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Cloud storage inside your personal Google Drive
                </CardDescription>
              </div>
            </div>

            <div>
              {isConfigured ? (
                <Badge variant="success" className="gap-1.5 py-1 px-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected &amp; Synced</span>
                </Badge>
              ) : isAuthenticated ? (
                <Badge variant="warning" className="gap-1.5 py-1 px-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Setup Incomplete</span>
                </Badge>
              ) : (
                <Badge variant="neutral" className="gap-1.5 py-1 px-3">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Not Connected</span>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="p-6 space-y-6">
          {/* Status Display Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Google Account
                </span>
                {isDevMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    Dev Mode
                  </span>
                )}
              </div>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {user.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                  No Google account connected. Connect to enable cloud backup and live sync.
                </div>
              )}
            </div>

            {/* Database Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Database Spreadsheet
                </span>
                {database?.sheetsReady && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    11 Sheets Ready
                  </span>
                )}
              </div>

              {database?.spreadsheetId ? (
                <div className="pt-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <Database className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{database.name || 'Productivity Tracker Database'}</span>
                  </p>
                  <div className="mt-1">
                    {isDevMode ? (
                      <span className="text-xs font-mono text-slate-500">
                        Local JSON (.dev-database.json)
                      </span>
                    ) : driveSpreadsheetUrl ? (
                      <a
                        href={driveSpreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Open Sheet in Google Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                  Database not created yet. Run Setup Wizard to create your spreadsheet.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isConfigured ? (
              <Button
                variant="primary"
                onClick={openWizard}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {isAuthenticated ? 'Complete Setup Wizard' : 'Connect with Google'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  leftIcon={
                    isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )
                  }
                >
                  {isTesting ? 'Testing Connection...' : 'Test Connection'}
                </Button>

                <Button
                  variant="outline"
                  onClick={openWizard}
                  leftIcon={<Sparkles className="w-4 h-4 text-blue-500" />}
                >
                  Re-run Setup Wizard
                </Button>

                <Button
                  variant="danger"
                  onClick={() => setIsDisconnectDialogOpen(true)}
                  leftIcon={<Unlink className="w-4 h-4" />}
                >
                  Disconnect Account
                </Button>
              </>
            )}
          </div>

          {/* Test connection results banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.details && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Mode: {testResult.details.mode || 'standard'} | Timestamp:{' '}
                    {testResult.details.timestamp}
                  </p>
                )}

              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================
          CARD 2: CANDIDATE PROFILE
         ======================================================== */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Candidate Profile
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                The name displayed on your schedules, welcome splash, and reports
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              {isEditingName ? (
                <Input
                  type="text"
                  value={candidateNameInput}
                  onChange={(e) => setCandidateNameInput(e.target.value)}
                  placeholder="e.g. Prem Patil"
                  autoFocus
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white">
                  {candidateName || <span className="text-slate-400">No name set</span>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditingName ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCandidateName}
                    disabled={isSavingName}
                  >
                    {isSavingName ? 'Saving...' : 'Save Name'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(false);
                      setCandidateNameInput(candidateName);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(true);
                    setCandidateNameInput(candidateName);
                  }}
                >
                  Edit Name
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewWelcome}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-500" />}
              >
                Preview Splash
              </Button>
            </div>
          </div>

          {nameSaveMsg && (
            <p
              className={`text-xs font-medium animate-in fade-in ${
                nameSaveStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {nameSaveMsg}
            </p>
          )}
        </div>
      </Card>

      {/* ========================================================
          CARD 3: TIMEZONE SETTINGS
         ======================================================== */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Timezone &amp; Regional Formatting
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                All daily task instances, exams, and logs calculate against your configured timezone
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Active Timezone
              </label>
              <Select
                value={selectedTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}

              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Live Clock Preview
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-mono text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{previewTime || '--:--:--'}</span>
                </div>
                <span className="text-xs text-slate-500">{selectedTimezone}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================
          CARD 4: DATA PORTABILITY (EXPORT & IMPORT)
         ======================================================== */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Data Portability &amp; Backups
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Export full JSON snapshots of your tracker or import existing backups
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {isExporting ? 'Exporting...' : 'Export JSON Backup'}
            </Button>

            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Import JSON Backup</span>
              </span>
            </label>

            {!isStandalone && (
              <div className="hide-in-app inline-block">
                <Button
                  variant="outline"
                  onClick={() => setIsQrModalOpen(true)}
                  leftIcon={<QrCode className="w-4 h-4 text-blue-500" />}
                >
                  Mobile Companion App
                </Button>
              </div>
            )}
          </div>

          {exportMsg && (
            <p
              className={`text-xs font-medium animate-in fade-in ${
                exportMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {exportMsg.text}
            </p>
          )}
        </div>
      </Card>

      {/* ========================================================
          CARD 5: AUDIT HISTORY
         ======================================================== */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <History className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  System Audit Trail
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Recent actions and synchronizations
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Actions</option>
                <option value="TASK">Tasks</option>
                <option value="EXAM">Exams</option>
                <option value="SETUP">Setup</option>
                <option value="DATA">Data</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <div className="p-0 overflow-x-auto">
          {isLoadingAudit ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading audit history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit records recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3 pl-6">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3 pr-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.slice(0, 15).map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 pl-6 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '--'}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {log.entityType} {log.entityId ? `(${log.entityId})` : ''}
                    </td>
                    <td className="p-3 pr-6 text-slate-500 truncate max-w-xs">
                      {typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : String(log.details || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDisconnectDialogOpen}
        onClose={() => setIsDisconnectDialogOpen(false)}
        onConfirm={handleConfirmDisconnect}
        title="Disconnect Google Account?"
        message="Disconnecting will end your active session on this device. Your tracking data and database spreadsheet in Google Drive will NEVER be deleted and will remain completely intact."
        confirmText="Confirm Disconnect"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDisconnecting}
      />

      {/* Import Validation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Data Backup"
      >
        <div className="space-y-4">
          {importError ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {importError}
            </div>
          ) : isValidatingImport ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
              Validating backup structure...
            </div>
          ) : importResult ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                Import completed successfully!
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setIsImportModalOpen(false);
                  window.location.reload();
                }}
              >
                Reload Application
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                The selected backup file is valid. Click import to append these records to your
                database.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExecuteImport}
                  disabled={isExecutingImport}
                >
                  {isExecutingImport ? 'Importing...' : 'Proceed with Import'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Mobile App Download Modal */}
      <AppDownloadModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
