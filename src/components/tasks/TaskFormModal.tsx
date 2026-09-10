'use client';

import React, { useState, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput, TaskPriority, RecurrenceType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { DEFAULT_TASK_CATEGORIES, TASK_PRIORITIES } from '@/lib/constants/categories';
import { getTodayDateString } from '@/lib/utils/date';
import { Repeat, CornerDownRight } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  task?: Task | null; // If present, edit mode
  defaultDate?: string;
  parentTaskId?: string;
}

const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  defaultDate,
  parentTaskId,
}: TaskFormModalProps) {
  const isEditing = Boolean(task);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<string>('Study');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [notes, setNotes] = useState('');

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDate(task.date || defaultDate || getTodayDateString());
      setDescription(task.description || '');
      setStartTime(task.startTime || '');
      setEndTime(task.endTime || '');
      setCategory(task.category || 'Study');
      setPriority(task.priority || 'normal');
      setNotes(task.notes || '');
      setRecurrenceType(task.recurrenceType || 'none');
      setRecurrenceInterval(task.recurrenceInterval || 1);
      setRecurrenceEndDate(task.recurrenceEndDate || '');
      if (task.recurrenceDays) {
        setRecurrenceDays(task.recurrenceDays.split(',').map(Number).filter((n) => !isNaN(n)));
      }
    } else {
      setTitle('');
      setDate(defaultDate || getTodayDateString());
      setDescription('');
      setStartTime('');
      setEndTime('');
      setCategory('Study');
      setPriority('normal');
      setNotes('');
      setRecurrenceType('none');
      setRecurrenceInterval(1);
      setRecurrenceDays([1, 2, 3, 4, 5]);
      setRecurrenceEndDate('');
    }
    setErrors({});
  }, [task, defaultDate, isOpen]);

  const toggleWeekday = (val: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!date.trim()) {
      newErrors.date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const baseData = {
        title: title.trim(),
        date,
        description: description.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        category: category || undefined,
        priority,
        notes: notes.trim() || undefined,
        parentTaskId: parentTaskId || (task ? task.parentTaskId : undefined),
        recurrenceType,
        recurrenceInterval: recurrenceType !== 'none' ? Number(recurrenceInterval) || 1 : undefined,
        recurrenceDays:
          recurrenceType === 'weekly' && recurrenceDays.length > 0
            ? recurrenceDays.join(',')
            : undefined,
        recurrenceEndDate: recurrenceType !== 'none' && recurrenceEndDate ? recurrenceEndDate : undefined,
      };

      if (isEditing && task) {
        await onSubmit({
          ...baseData,
          id: task.id,
        });
      } else {
        await onSubmit(baseData);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save task';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? 'Edit Task'
          : parentTaskId
          ? 'Create Subtask'
          : 'Create New Task'
      }
      description={
        parentTaskId
          ? 'Add a structured subtask under this task.'
          : 'Enter the task details below. Title and Date are required.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errors.form}
          </div>
        )}

        {parentTaskId && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
            <CornerDownRight className="w-4 h-4 shrink-0" />
            <span>This task will be saved as a subtask under parent ID: <strong>{parentTaskId}</strong></span>
          </div>
        )}

        <Input
          label="Task Title"
          required
          placeholder="e.g. Read Chapter 4 Computer Networks"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {DEFAULT_TASK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
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

        {/* Recurrence Settings Section (Only for root tasks) */}
        {!parentTaskId && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Repeat className="w-3.5 h-3.5 text-blue-500" />
              <span>Recurrence (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Repeat"
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>

              {recurrenceType !== 'none' && (
                <Input
                  label={`Every (${recurrenceType === 'daily' ? 'Days' : recurrenceType === 'weekly' ? 'Weeks' : 'Months'})`}
                  type="number"
                  min={1}
                  max={30}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                />
              )}
            </div>

            {/* Weekly day checkboxes */}
            {recurrenceType === 'weekly' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Repeat on Days:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((wd) => {
                    const active = recurrenceDays.includes(wd.value);
                    return (
                      <button
                        key={wd.value}
                        type="button"
                        onClick={() => toggleWeekday(wd.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {wd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrenceType !== 'none' && (
              <Input
                label="End Date (Optional cutoff)"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
              />
            )}
          </div>
        )}

        <Textarea
          label="Description (Optional)"
          placeholder="Specific goals or details for this task..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder="Additional notes or references..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : parentTaskId ? 'Create Subtask' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
