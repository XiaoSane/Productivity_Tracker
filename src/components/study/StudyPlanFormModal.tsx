'use client';

import React, { useState, useEffect } from 'react';
import { CreateStudyPlanInput } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { getTodayDateString } from '@/lib/utils/date';

interface StudyPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStudyPlanInput) => Promise<void>;
  defaultDate?: string;
  initialHours?: number;
  initialNotes?: string;
}

export function StudyPlanFormModal({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  initialHours = 3,
  initialNotes = '',
}: StudyPlanFormModalProps) {
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [plannedHours, setPlannedHours] = useState<number>(initialHours);
  const [notes, setNotes] = useState(initialNotes);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate || getTodayDateString());
      setPlannedHours(initialHours !== undefined && initialHours > 0 ? initialHours : 3);
      setNotes(initialNotes || '');
      setErrors({});
    }
  }, [isOpen, defaultDate, initialHours, initialNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date.trim()) {
      setErrors({ date: 'Date is required' });
      return;
    }

    if (plannedHours <= 0) {
      setErrors({ plannedHours: 'Planned hours must be greater than 0' });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      await onSubmit({
        date,
        plannedHours: Number(plannedHours) || 0,
        notes: notes.trim() || undefined,
        status: 'planned',
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save study plan';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Study Target"
      description="Plan your target study hours for the day."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errors.form}
          </div>
        )}

        <Input
          label="Date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />

        <Input
          label="Target Study Hours"
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          required
          value={plannedHours}
          onChange={(e) => setPlannedHours(parseFloat(e.target.value) || 0)}
          error={errors.plannedHours}
        />

        <Textarea
          label="Notes / Focus Target (Optional)"
          placeholder="e.g. Focus on network protocol labs and flashcards..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Target
          </Button>
        </div>
      </form>
    </Modal>
  );
}
