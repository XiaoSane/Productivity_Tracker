'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getTodayDateString } from '@/lib/utils/date';
import { Arc, ArcType, ArcStatus, CreateArcInput, UpdateArcInput, Exam } from '@/types';
import { apiClient } from '@/lib/api/client';
import { Target, AlertCircle } from 'lucide-react';

interface ArcFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArcInput | UpdateArcInput) => Promise<void>;
  initialArc?: Arc | null;
}

const ARC_TYPES: { value: ArcType; label: string }[] = [
  { value: 'custom', label: '🎯 Custom Challenge' },
  { value: 'winter_arc', label: '❄️ Winter Arc' },
  { value: 'exam_sprint', label: '🎓 Exam Sprint' },
  { value: 'study', label: '📚 Study Arc' },
  { value: 'fitness', label: '🏋️ Fitness Arc' },
  { value: 'project', label: '💻 Project Sprint' },
  { value: 'semester', label: '🏫 Semester Arc' },
  { value: 'challenge', label: '🔥 Habit Challenge' },
  { value: 'other', label: '🌟 Other' },
];

const TYPE_TO_ICON: Record<ArcType, string> = {
  custom: '🎯',
  winter_arc: '❄️',
  exam_sprint: '🎓',
  study: '📚',
  fitness: '🏋️',
  project: '💻',
  semester: '🏫',
  challenge: '🔥',
  other: '🌟',
};

const ICON_TO_TYPE: Record<string, ArcType> = {
  '🎯': 'custom',
  '❄️': 'winter_arc',
  '🎓': 'exam_sprint',
  '📚': 'study',
  '🏋️': 'fitness',
  '💻': 'project',
  '🏫': 'semester',
  '🔥': 'challenge',
  '⚡': 'challenge',
  '🏆': 'custom',
  '🚀': 'project',
  '🧠': 'study',
  '🌟': 'other',
};

const QUICK_ICONS = ['🎯', '❄️', '⚡', '📚', '🏆', '💻', '🏋️', '🚀', '🔥', '🧠', '🎓', '🏫', '🌟'];

export function ArcFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialArc,
}: ArcFormModalProps) {
  const isEditing = Boolean(initialArc);
  const today = getTodayDateString();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ArcType>('custom');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [status, setStatus] = useState<ArcStatus>('planned');
  const [icon, setIcon] = useState('🎯');
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
      apiClient.listExams()
        .then((res) => {
          if (res && res.exams) {
            setExams(res.exams);
          }
        })
        .catch((err) => console.warn('Failed to load exams for Arc linking:', err))
        .finally(() => setIsLoadingExams(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialArc) {
      setName(initialArc.name || '');
      setDescription(initialArc.description || '');
      setType(initialArc.type || 'custom');
      setStartDate(initialArc.startDate || today);
      setEndDate(initialArc.endDate || today);
      setStatus(initialArc.status || 'planned');
      setIcon(initialArc.icon || '🎯');
      setLinkedExamId(initialArc.linkedExamId || '');
      setNotes(initialArc.notes || '');
    } else {
      setName('');
      setDescription('');
      setType('custom');
      setStartDate(today);
      // Default 90-day horizon for challenge/arc
      const d = new Date();
      d.setDate(d.getDate() + 90);
      const defaultEnd = d.toISOString().split('T')[0];
      setEndDate(defaultEnd);
      setStatus('planned');
      setIcon('🎯');
      setLinkedExamId('');
      setNotes('');
    }
    setError(null);
  }, [initialArc, isOpen, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Arc Name is required.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing && initialArc) {
        await onSubmit({
          id: initialArc.id,
          name: trimmedName,
          description: description.trim(),
          type,
          startDate,
          endDate,
          status,
          icon,
          linkedExamId: linkedExamId || undefined,
          notes: notes.trim(),
        });
      } else {
        await onSubmit({
          name: trimmedName,
          description: description.trim(),
          type,
          startDate,
          endDate,
          status,
          icon,
          linkedExamId: linkedExamId || undefined,
          notes: notes.trim(),
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Arc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (selectedType: ArcType) => {
    setType(selectedType);
    if (TYPE_TO_ICON[selectedType]) {
      setIcon(TYPE_TO_ICON[selectedType]);
    }
  };

  const handleIconChange = (selectedIcon: string) => {
    setIcon(selectedIcon);
    if (ICON_TO_TYPE[selectedIcon]) {
      setType(ICON_TO_TYPE[selectedIcon]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Arc' : 'Create New Arc'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Arc Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Arc Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Winter Arc 2026, DSA Sprint, GATE Preparation"
            autoFocus
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description &amp; Purpose
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What intentional progress or transformation are you committing to?"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Arc Type
            </label>
            <Select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ArcType)}
            >
              {ARC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ArcStatus)}
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Date *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Date *
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Icon / Emblem
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {QUICK_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => handleIconChange(ic)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all cursor-pointer ${
                  icon === ic
                    ? 'bg-blue-600 text-white shadow-sm scale-110'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Linked Exam */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Link to an Existing Exam (Optional)
          </label>
          <Select
            value={linkedExamId}
            onChange={(e) => setLinkedExamId(e.target.value)}
            disabled={isLoadingExams}
          >
            <option value="">-- None (Standalone Arc) --</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.examDate})
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-slate-500 mt-1">
            Linking an exam connects its countdown and prep deadlines to the Arc timeline without duplicating exam records.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Private Notes &amp; Rules
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Wake up at 6 AM, no social media before noon"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Target className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Arc'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
