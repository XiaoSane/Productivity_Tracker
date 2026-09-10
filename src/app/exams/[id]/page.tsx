'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import { Exam, ExamStatus, CreateExamInput, UpdateExamInput } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExamStatusBadge } from '@/components/exams/ExamStatusBadge';
import { ExamDeadlineBadge } from '@/components/exams/ExamDeadlineBadge';
import { ExamFormModal } from '@/components/exams/ExamFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { EXAM_STATUSES } from '@/lib/constants/categories';
import { formatTimeDisplay, formatDisplayDate } from '@/lib/utils/date';
import { ExamTopicsList } from '@/components/exams/ExamTopicsList';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface ExamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ExamDetailPage({ params }: ExamDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const examId = resolvedParams.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadExam = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getExam(examId);
      setExam(res);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load exam detail:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load exam details.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadExam();
      }
    };

    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);
    loadExam();

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadExam]);

  const handleUpdate = async (data: CreateExamInput | UpdateExamInput) => {
    await apiClient.updateExam({ id: examId, ...data });
    await loadExam();
  };

  const handleStatusChange = async (newStatus: ExamStatus) => {
    try {
      setIsUpdatingStatus(true);
      await apiClient.updateExamStatus(examId, newStatus);
      await loadExam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.deleteExam(examId);
      router.push('/exams');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete exam');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading exam details..." />;
  }

  if (error || !exam) {
    if (!isBackendConfigured() || isSetupRequiredError(error)) {
      return (
        <div className="space-y-6">
          <Link href="/exams">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Exams
            </Button>
          </Link>
          <SetupRequiredState featureName="view this exam and its syllabus topics" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Link href="/exams">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Exams
          </Button>
        </Link>
        <ErrorState
          title="Exam Not Found"
          message={error || 'The requested exam could not be loaded.'}
          onRetry={loadExam}
        />
      </div>
    );
  }

  const hasTime = exam.startTime || exam.endTime;
  const timeDisplay = hasTime
    ? [formatTimeDisplay(exam.startTime), formatTimeDisplay(exam.endTime)].filter(Boolean).join(' – ')
    : 'No specific time recorded';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <Link href="/exams">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Exams
        </Button>
      </Link>

      {/* Header with Title and Actions */}
      <PageHeader
        title={exam.name}
        description={`Subject: ${exam.subject}`}
        badge={<ExamStatusBadge status={exam.status} />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Exam
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Critical Section: Separate Exam Date and Preparation Deadline */}
      <Card>
        <CardHeader>
          <CardTitle>Examination & Preparation Schedule</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <ExamDeadlineBadge examDate={exam.examDate} deadline={exam.deadline} />

          {/* Time & Session */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              <strong>Exam Time:</strong> {timeDisplay}
            </span>
          </div>
        </div>
      </Card>

      {/* Status Transition Control */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {EXAM_STATUSES.map((s) => {
            const isCurrent = exam.status === s.value;
            return (
              <Button
                key={s.value}
                size="sm"
                variant={isCurrent ? 'primary' : 'outline'}
                disabled={isCurrent || isUpdatingStatus}
                onClick={() => handleStatusChange(s.value)}
                className="capitalize text-xs"
              >
                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />}
                <span>{s.label}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Location / Venue */}
      <Card>
        <CardHeader>
          <CardTitle>Venue & Location</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{exam.venue || 'No venue recorded for this exam.'}</span>
        </div>
      </Card>

      {/* Syllabus */}
      <Card>
        <CardHeader>
          <CardTitle>Syllabus & Topics</CardTitle>
        </CardHeader>
        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
          {exam.syllabus ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 font-mono text-xs">
              {exam.syllabus}
            </div>
          ) : (
            <p className="text-slate-400 italic">No syllabus recorded yet.</p>
          )}
        </div>
      </Card>

      {/* Syllabus Topics Breakdown */}
      <ExamTopicsList examId={examId} />

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Notes & Instructions</CardTitle>
        </CardHeader>
        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
          {exam.notes ? (
            <p className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              {exam.notes}
            </p>
          ) : (
            <p className="text-slate-400 italic">No additional notes.</p>
          )}
        </div>
      </Card>

      {/* Metadata info */}
      <div className="text-xs text-slate-400 flex flex-wrap gap-4 pt-2">
        {exam.createdAt && <span>Created: {formatDisplayDate(exam.createdAt)}</span>}
        {exam.updatedAt && <span>Last updated: {formatDisplayDate(exam.updatedAt)}</span>}
      </div>

      {/* Edit Modal */}
      <ExamFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdate}
        exam={exam}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Exam"
        message={`Are you sure you want to delete "${exam.name}"? This action cannot be undone.`}
        confirmText="Delete Exam"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
