'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getTodayDateString } from '@/lib/utils/date';
import {
  ArcMilestone,
  ArcMilestoneStatus,
  CreateArcMilestoneInput,
  UpdateArcMilestoneInput,
} from '@/types';
import { Flag, AlertCircle } from 'lucide-react';

interface ArcMilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArcMilestoneInput | UpdateArcMilestoneInput) => Promise<void>;
  arcId: string;
  initialMilestone?: ArcMilestone | null;
  arcStartDate?: string;
  arcEndDate?: string;
}

const STATUSES: { value: ArcMilestoneStatus; label: string }[] = [
  { value: 'pending', label: '⏳ Pending Checkpoint' },
  { value: 'in_progress', label: '🚀 In Progress' },
  { value: 'completed', label: '✅ Reached / Completed' },
  { value: 'cancelled', label: '⛔ Cancelled' },
];

export function ArcMilestoneFormModal({
  isOpen,
  onClose,
  onSubmit,
  arcId,
  initialMilestone,
  arcStartDate,
  arcEndDate,
}: ArcMilestoneFormModalProps) {
  const isEditing = Boolean(initialMilestone);
  const today = getTodayDateString();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(today);
  const [status, setStatus] = useState<ArcMilestoneStatus>('pending');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMilestone) {
      setTitle(initialMilestone.title || '');
      setDescription(initialMilestone.description || '');
      setTargetDate(initialMilestone.targetDate || today);
      setStatus(initialMilestone.status || 'pending');
      setNotes(initialMilestone.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setTargetDate(arcEndDate || today);
      setStatus('pending');
      setNotes('');
    }
    setError(null);
  }, [initialMilestone, isOpen, today, arcEndDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Checkpoint title is required.');
      return;
    }
    if (!targetDate) {
      setError('Target date is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const finalStatus: ArcMilestoneStatus =
      initialMilestone?.status === 'completed' ? 'completed' : status;

    try {
      if (isEditing && initialMilestone) {
        await onSubmit({
          id: initialMilestone.id,
          arcId,
          title: title.trim(),
          description: description.trim() || undefined,
          targetDate,
          status: finalStatus,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          arcId,
          title: title.trim(),
          description: description.trim() || undefined,
          targetDate,
          status: finalStatus,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save milestone';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Milestone Checkpoint' : 'Add Milestone Checkpoint'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Milestone / Checkpoint Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Halfway Checkpoint (50% Syllabus), Mock Test 1 Complete"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Deliverables or criteria to mark this checkpoint reached..."
            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={targetDate}
              min={arcStartDate}
              max={arcEndDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
            {arcStartDate && arcEndDate && (
              <p className="text-[11px] text-slate-400 mt-1">
                Arc span: {arcStartDate} to {arcEndDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <Select
              value={initialMilestone?.status === 'completed' ? 'completed' : status}
              onChange={(e) => setStatus(e.target.value as ArcMilestoneStatus)}
              options={
                initialMilestone?.status === 'completed'
                  ? [{ value: 'completed', label: 'Completed (Locked)' }]
                  : STATUSES
              }
              disabled={Boolean(initialMilestone?.status === 'completed')}
            />
            {initialMilestone?.status === 'completed' && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                Completed checkpoints are locked and cannot be reverted.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any retrospective or checkpoint reflections..."
            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              'Saving...'
            ) : isEditing ? (
              'Update Checkpoint'
            ) : (
              <span className="flex items-center gap-1.5">
                <Flag className="w-4 h-4" /> Save Checkpoint
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
