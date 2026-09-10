'use client';

import React, { useState, useEffect } from 'react';
import { Exam, CreateExamInput, UpdateExamInput, ExamStatus } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { EXAM_STATUSES } from '@/lib/constants/categories';
import { isValidExamDeadline, getTodayDateString } from '@/lib/utils/date';
import { Info, Calendar, Target } from 'lucide-react';

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExamInput | UpdateExamInput) => Promise<void>;
  exam?: Exam | null; // Edit mode if set
}

export function ExamFormModal({
  isOpen,
  onClose,
  onSubmit,
  exam,
}: ExamFormModalProps) {
  const isEditing = Boolean(exam);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [status, setStatus] = useState<ExamStatus>('planned');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (exam) {
      setName(exam.name || '');
      setSubject(exam.subject || '');
      setExamDate(exam.examDate || '');
      setDeadline(exam.deadline || '');
      setStartTime(exam.startTime || '');
      setEndTime(exam.endTime || '');
      setVenue(exam.venue || '');
      setSyllabus(exam.syllabus || '');
      setStatus(exam.status || 'planned');
      setNotes(exam.notes || '');
    } else {
      setName('');
      setSubject('');
      setExamDate('');
      setDeadline('');
      setStartTime('');
      setEndTime('');
      setVenue('');
      setSyllabus('');
      setStatus('planned');
      setNotes('');
    }
    setErrors({});
  }, [exam, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Exam Name is required';
    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!examDate.trim()) newErrors.examDate = 'Actual Exam Date is required';

    if (deadline && examDate && !isValidExamDeadline(deadline, examDate)) {
      newErrors.deadline = 'Preparation deadline cannot be after the actual exam date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        examDate,
        deadline: deadline || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        venue: venue.trim() || undefined,
        syllabus: syllabus.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      if (isEditing && exam) {
        await onSubmit({
          id: exam.id,
          ...payload,
        });
      } else {
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save exam';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Exam' : 'Add New Exam'}
      description="Record an upcoming exam with its actual date and preparation target deadline."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errors.form}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Exam Name"
            required
            placeholder="e.g. Mid-Term Assessment 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />

          <Input
            label="Subject"
            required
            placeholder="e.g. Computer Networks"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            error={errors.subject}
          />
        </div>

        {/* Date Distinction Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>Important: Exam Date vs. Preparation Deadline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Actual Exam Date"
              type="date"
              required
              helperText="The official date the exam takes place"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              error={errors.examDate}
            />

            <Input
              label="Preparation Deadline (Optional)"
              type="date"
              helperText="Target date to finish all syllabus prep (must be <= Exam Date)"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              error={errors.deadline}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ExamStatus)}
          >
            {EXAM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <Input
          label="Venue / Classroom (Optional)"
          placeholder="e.g. Hall B-204, Main Campus"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />

        <Textarea
          label="Syllabus / Topics to Cover"
          placeholder="e.g. Chapters 1-4: OSI model, TCP/IP, IP addressing, Routing protocols"
          rows={3}
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder="e.g. Bring scientific calculator and student ID card"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
