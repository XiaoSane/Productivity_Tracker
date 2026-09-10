'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  ArcGoal,
  ArcMetricType,
  ArcGoalStatus,
  CreateArcGoalInput,
  UpdateArcGoalInput,
  Exam,
} from '@/types';
import { apiClient } from '@/lib/api/client';
import { Target, AlertCircle } from 'lucide-react';

interface ArcGoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArcGoalInput | UpdateArcGoalInput) => Promise<void>;
  arcId: string;
  initialGoal?: ArcGoal | null;
  isWinterArc?: boolean;
}

const METRIC_TYPES: { value: ArcMetricType; label: string; defaultUnit: string }[] = [
  { value: 'count', label: '🔢 Numeric Count (e.g., questions, pages, workouts)', defaultUnit: 'items' },
  { value: 'hours', label: '⏱️ Study / Focus Hours', defaultUnit: 'hrs' },
  { value: 'percentage', label: '📊 Percentage (0-100%)', defaultUnit: '%' },
  { value: 'boolean', label: '✅ Yes/No Milestone (0 or 1)', defaultUnit: '' },
  { value: 'custom', label: '✨ Custom Metric', defaultUnit: '' },
];

const FREQUENCIES = [
  { value: 'total', label: 'Total for Arc Duration' },
  { value: 'daily', label: 'Daily Target' },
  { value: 'weekly', label: 'Weekly Target' },
];

const PRIORITIES = [
  { value: 'normal', label: 'Normal Priority' },
  { value: 'high', label: '🔥 High Priority' },
  { value: 'low', label: 'Low Priority' },
];

const STATUSES: { value: ArcGoalStatus; label: string }[] = [
  { value: 'active', label: 'In Progress / Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ArcGoalFormModal({
  isOpen,
  onClose,
  onSubmit,
  arcId,
  initialGoal,
  isWinterArc,
}: ArcGoalFormModalProps) {
  const isEditing = Boolean(initialGoal);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<ArcMetricType>('count');
  const [targetValue, setTargetValue] = useState('10');
  const [currentValue, setCurrentValue] = useState('0');
  const [unit, setUnit] = useState('items');
  const [frequency, setFrequency] = useState<'total' | 'daily' | 'weekly'>('total');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [status, setStatus] = useState<ArcGoalStatus>('active');
  const [linkedExamId, setLinkedExamId] = useState('');
  const [notes, setNotes] = useState('');

  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available exams for optional linking
  useEffect(() => {
    if (isOpen) {
      setIsLoadingExams(true);
      apiClient
        .getExams()
        .then((res) => {
          if (res?.exams) {
            setExams(res.exams);
          }
        })
        .catch(() => {
          // Non-blocking
        })
        .finally(() => {
          setIsLoadingExams(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title || '');
      setDescription(initialGoal.description || '');
      setMetricType(initialGoal.metricType || 'count');
      setTargetValue(String(initialGoal.targetValue ?? 10));
      setCurrentValue(String(initialGoal.currentValue ?? 0));
      setUnit(initialGoal.unit || '');
      setFrequency(initialGoal.frequency || 'total');
      setPriority(initialGoal.priority || 'normal');
      setStatus(initialGoal.status || 'active');
      setLinkedExamId(initialGoal.linkedExamId || '');
      setNotes(initialGoal.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setMetricType('count');
      setTargetValue('10');
      setCurrentValue('0');
      setUnit('items');
      setFrequency('total');
      setPriority('normal');
      setStatus('active');
      setLinkedExamId('');
      setNotes('');
    }
    setError(null);
  }, [initialGoal, isOpen]);

  const handleMetricTypeChange = (newType: ArcMetricType) => {
    setMetricType(newType);
    const found = METRIC_TYPES.find((m) => m.value === newType);
    if (found && !unit) {
      setUnit(found.defaultUnit);
    }
    if (newType === 'boolean') {
      setTargetValue('1');
      setUnit('');
    } else if (newType === 'percentage') {
      setTargetValue('100');
      setUnit('%');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }

    const numTarget = parseFloat(targetValue);
    if (isNaN(numTarget) || numTarget <= 0) {
      setError('Target value must be a positive number greater than 0.');
      return;
    }

    const numCurrent = parseFloat(currentValue) || 0;
    const finalStatus: ArcGoalStatus =
      initialGoal?.status === 'completed'
        ? 'completed'
        : (numCurrent >= numTarget ? 'completed' : status);

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && initialGoal) {
        await onSubmit({
          id: initialGoal.id,
          arcId,
          title: title.trim(),
          description: description.trim() || undefined,
          metricType,
          targetValue: numTarget,
          currentValue: numCurrent,
          unit: unit.trim() || undefined,
          frequency,
          priority,
          status: finalStatus,
          linkedExamId: linkedExamId || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          arcId,
          title: title.trim(),
          description: description.trim() || undefined,
          metricType,
          targetValue: numTarget,
          currentValue: numCurrent,
          unit: unit.trim() || undefined,
          frequency,
          priority,
          status: finalStatus,
          linkedExamId: linkedExamId || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save goal';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Arc Goal' : 'Add Measurable Goal'}
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
            Goal Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Solve 200 DSA Problems, Complete 50 Focus Hours"
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
            placeholder="Brief details or target criteria..."
            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Metric Type
            </label>
            <Select
              value={metricType}
              onChange={(e) => handleMetricTypeChange(e.target.value as ArcMetricType)}
              options={METRIC_TYPES.map((m) => ({ value: m.value, label: m.label }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cadence / Frequency
            </label>
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'total' | 'daily' | 'weekly')}
              options={FREQUENCIES}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Value <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Value
            </label>
            <Input
              type="number"
              step="any"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit
            </label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., hrs, probs, %"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
              options={PRIORITIES}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <Select
              value={initialGoal?.status === 'completed' ? 'completed' : status}
              onChange={(e) => setStatus(e.target.value as ArcGoalStatus)}
              options={
                initialGoal?.status === 'completed'
                  ? [{ value: 'completed', label: 'Completed (Locked)' }]
                  : STATUSES
              }
              disabled={Boolean(initialGoal?.status === 'completed')}
            />
            {initialGoal?.status === 'completed' && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                Completed goals are locked and cannot be reverted back to active.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Linked Exam (Optional)
          </label>
          <Select
            value={linkedExamId}
            onChange={(e) => setLinkedExamId(e.target.value)}
            options={[
              { value: '', label: isLoadingExams ? 'Loading exams...' : 'None / Not tied to specific exam' },
              ...exams.map((ex) => ({
                value: ex.id,
                label: `🎓 ${ex.name} (${ex.subject}) — ${ex.examDate}`,
              })),
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Milestones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Key resources, book chapters, or pacing remarks..."
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
              'Update Goal'
            ) : (
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Add Goal
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
