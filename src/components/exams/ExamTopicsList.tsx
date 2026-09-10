'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExamTopic,
  CreateExamTopicInput,
  UpdateExamTopicInput,
  TopicStatus,
  ExamPreparationProgress,
} from '@/types';
import { apiClient } from '@/lib/api/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExamTopicFormModal } from './ExamTopicFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit3,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ExamTopicsListProps {
  examId: string;
}

export function ExamTopicsList({ examId }: ExamTopicsListProps) {
  const [topics, setTopics] = useState<ExamTopic[]>([]);
  const [progress, setProgress] = useState<ExamPreparationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ExamTopic | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTopics = useCallback(async () => {
    try {
      setIsLoading(true);
      const [topicsRes, progressRes] = await Promise.all([
        apiClient.listExamTopics({ examId }),
        apiClient.getExamPreparationProgress(examId).catch(() => null),
      ]);
      setTopics(topicsRes.topics || []);
      if (progressRes) {
        setProgress(progressRes);
      }
    } catch (err) {
      console.error('Failed to load exam topics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleSaveTopic = async (data: CreateExamTopicInput | UpdateExamTopicInput) => {
    if ('id' in data && data.id) {
      await apiClient.updateExamTopic(data);
    } else {
      await apiClient.createExamTopic(data as CreateExamTopicInput);
    }
    await loadTopics();
  };

  const handleToggleStatus = async (topic: ExamTopic) => {
    const nextStatus: TopicStatus =
      topic.status === 'completed'
        ? 'pending'
        : topic.status === 'pending'
        ? 'in_progress'
        : 'completed';

    // Optimistic update
    setTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await apiClient.updateExamTopic({ id: topic.id, status: nextStatus });
      await loadTopics();
    } catch (err) {
      console.error('Failed to update topic status:', err);
      loadTopics();
    }
  };

  const handleDelete = async () => {
    if (!deletingTopicId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteExamTopic(deletingTopicId);
      setDeletingTopicId(null);
      await loadTopics();
    } catch (err) {
      console.error('Failed to delete topic:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered topics
  const filteredTopics = useMemo(() => {
    if (filterStatus === 'all') return topics;
    return topics.filter((t) => t.status === filterStatus);
  }, [topics, filterStatus]);

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed').length;
  const progressPercent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const totalHours = topics.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const completedHours = topics
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span>Syllabus Breakdown & Topics</span>
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track completion across individual syllabus modules and estimated hours
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditingTopic(null);
            setIsFormModalOpen(true);
          }}
        >
          Add Topic
        </Button>
      </CardHeader>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Progress Summary Banner */}
        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-slate-900 dark:text-white">
                Exam Preparation Progress: {progressPercent}%
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <span>
                <strong>{completedTopics}</strong> of <strong>{totalTopics}</strong> topics ready
              </span>
              <span>•</span>
              <span>
                <strong>{completedHours}h</strong> / {totalHours}h estimated
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          {['all', 'pending', 'in_progress', 'completed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Topics List */}
        {isLoading && topics.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">Loading syllabus topics...</p>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No topics in this view
            </p>
            <p className="text-xs text-slate-500">
              Add your first syllabus unit to begin tracking prep progress
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {filteredTopics.map((topic) => {
              const isDone = topic.status === 'completed';
              const inProgress = topic.status === 'in_progress';

              return (
                <div
                  key={topic.id}
                  className="flex items-start justify-between gap-3 p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(topic)}
                      className="mt-0.5 shrink-0 cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors"
                      title={`Status: ${topic.status}. Click to advance.`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />
                      ) : inProgress ? (
                        <Circle className="w-5 h-5 text-amber-500 fill-amber-100 dark:fill-amber-950/40" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {topic.name}
                        </p>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            isDone
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : inProgress
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {topic.status.replace('_', ' ')}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider ${
                            topic.priority === 'high'
                              ? 'bg-rose-500/15 text-rose-500'
                              : topic.priority === 'low'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              : 'bg-blue-500/15 text-blue-500'
                          }`}
                        >
                          {topic.priority}
                        </span>
                      </div>

                      {topic.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {topic.description}
                        </p>
                      )}

                      {/* Estimated hours & timestamps */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        {topic.estimatedHours ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{topic.estimatedHours} hrs est.</span>
                          </span>
                        ) : null}
                        {isDone && topic.completedAt && (
                          <span className="text-emerald-500">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTopic(topic);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Topic"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTopicId(topic.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Topic"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Topic Edit / Create Modal */}
      <ExamTopicFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTopic(null);
        }}
        onSubmit={handleSaveTopic}
        topic={editingTopic}
        examId={examId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTopicId)}
        onClose={() => setDeletingTopicId(null)}
        onConfirm={handleDelete}
        title="Delete Topic"
        message="Are you sure you want to delete this syllabus topic? This action cannot be undone."
        confirmText="Delete Topic"
        variant="danger"
        isLoading={isDeleting}
      />
    </Card>
  );
}
