'use client';

import React, { useState, useEffect } from 'react';
import {
  ExamTopic,
  CreateExamTopicInput,
  UpdateExamTopicInput,
  TopicStatus,
  TopicPriority,
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface ExamTopicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExamTopicInput | UpdateExamTopicInput) => Promise<void>;
  topic?: ExamTopic | null;
  examId: string;
}

export function ExamTopicFormModal({
  isOpen,
  onClose,
  onSubmit,
  topic,
  examId,
}: ExamTopicFormModalProps) {
  const isEditing = Boolean(topic);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TopicStatus>('pending');
  const [priority, setPriority] = useState<TopicPriority>('normal');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (topic) {
      setName(topic.name || '');
      setDescription(topic.description || '');
      setStatus(topic.status || 'pending');
      setPriority(topic.priority || 'normal');
      setEstimatedHours(topic.estimatedHours || 0);
    } else {
      setName('');
      setDescription('');
      setStatus('pending');
      setPriority('normal');
      setEstimatedHours(2);
    }
    setErrors({});
  }, [topic, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrors({ name: 'Topic name is required' });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      if (isEditing && topic) {
        await onSubmit({
          id: topic.id,
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          estimatedHours: Number(estimatedHours) || 0,
        });
      } else {
        await onSubmit({
          examId,
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          estimatedHours: Number(estimatedHours) || 0,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save topic';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Exam Topic' : 'Add Exam Topic'}
      description="Break down the exam syllabus into measurable study units."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errors.form}
          </div>
        )}

        <Input
          label="Topic Name"
          required
          placeholder="e.g. Web Application Security & OWASP Top 10"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TopicStatus)}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TopicPriority)}
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
          </Select>

          <Input
            label="Estimated Hours"
            type="number"
            min={0}
            step={0.5}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
          />
        </div>

        <Textarea
          label="Notes & Scope (Optional)"
          placeholder="Key concepts, textbook pages, or lab references..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Topic'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
