'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient, isBackendConfigured, isSetupRequiredError } from '@/lib/api/client';
import { Arc, ArcStatus, ArcType, CreateArcInput, UpdateArcInput } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArcCard } from '@/components/arc/ArcCard';
import { ArcFormModal } from '@/components/arc/ArcFormModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SetupRequiredState } from '@/components/ui/SetupRequiredState';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Target, Search, Flame, Calendar, Award } from 'lucide-react';

const ARC_TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Arc Types' },
  { value: 'winter_arc', label: '❄️ Winter Arc' },
  { value: 'exam_sprint', label: '🎓 Exam Sprint' },
  { value: 'study', label: '📚 Study Arc' },
  { value: 'fitness', label: '🏋️ Fitness Arc' },
  { value: 'project', label: '💻 Project Sprint' },
  { value: 'semester', label: '🏫 Semester Arc' },
  { value: 'challenge', label: '🔥 Habit Challenge' },
  { value: 'custom', label: '🎯 Custom Challenge' },
];

export default function ArcsPage() {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'planned' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingArc, setEditingArc] = useState<Arc | null>(null);

  const loadArcs = useCallback(async () => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setError('Authentication required. Please connect your Google account.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getArcs();
      setArcs(res && Array.isArray(res.arcs) ? res.arcs : []);
    } catch (err: unknown) {
      if (!isSetupRequiredError(err)) {
        console.error('Failed to load Arcs:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unable to load Arcs.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArcs();

    const handleStatusChange = (e: CustomEvent<{ configured: boolean }>) => {
      if (e.detail?.configured) {
        loadArcs();
      }
    };
    window.addEventListener('connection-status-changed', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('connection-status-changed', handleStatusChange as EventListener);
    };
  }, [loadArcs]);

  const handleSaveArc = async (input: CreateArcInput | UpdateArcInput) => {
    if ('id' in input && input.id) {
      await apiClient.updateArc(input as UpdateArcInput);
    } else {
      await apiClient.createArc(input as CreateArcInput);
    }
    await loadArcs();
  };

  const handleStatusChange = async (arcId: string, newStatus: ArcStatus) => {
    try {
      await apiClient.setArcStatus(arcId, newStatus);
      await loadArcs();
    } catch (err: unknown) {
      console.error('Failed to update arc status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update arc status');
    }
  };

  const handleOpenCreate = () => {
    setEditingArc(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (arc: Arc) => {
    setEditingArc(arc);
    setIsFormModalOpen(true);
  };

  // Filtered arcs
  const filteredArcs = useMemo(() => {
    return arcs.filter((arc) => {
      // Tab filter
      if (activeTab !== 'all' && arc.status !== activeTab) {
        return false;
      }
      // Type filter
      if (selectedType !== 'all' && arc.type !== selectedType) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = arc.name.toLowerCase().includes(query);
        const matchesDesc = arc.description?.toLowerCase().includes(query);
        const matchesNotes = arc.notes?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [arcs, activeTab, selectedType, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts = { all: arcs.length, active: 0, planned: 0, completed: 0, cancelled: 0 };
    arcs.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });
    return counts;
  }, [arcs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Arc Sprints"
        description="Structure ambitious seasons, exam sprints, or winter transformations with measurable goals and checkpoints."
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Create Arc
          </Button>
        }
      />

      {/* Quick Arc Presets Banner if no active arcs */}
      {!error && tabCounts.active === 0 && arcs.length === 0 && !isLoading && (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-md">
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-xl font-bold tracking-tight mb-2">
              Transform your focus into an intentional Sprint.
            </h3>
            <p className="text-sm text-indigo-100/80 leading-relaxed mb-4">
              An Arc sits gracefully above your daily tasks, exams, and logs. It never resets your data or acts as a punitive scorekeeper — it simply aggregates your progress toward your defined horizon.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenCreate}
                className="bg-white text-indigo-900 hover:bg-indigo-50 border-0 font-semibold"
              >
                Start Your First Arc &rarr;
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      {!error && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: `All (${tabCounts.all})` },
              { id: 'active', label: `Active (${tabCounts.active})` },
              { id: 'planned', label: `Planned (${tabCounts.planned})` },
              { id: 'completed', label: `Completed (${tabCounts.completed})` },
              { id: 'cancelled', label: `Cancelled (${tabCounts.cancelled})` },
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'all' | 'active' | 'planned' | 'completed' | 'cancelled')}
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search arcs..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={ARC_TYPES}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading your Arcs and calculating progress..." />
      ) : error ? (
        !isBackendConfigured() || isSetupRequiredError(error) ? (
          <SetupRequiredState featureName="structure and track your Arcs" />
        ) : (
          <ErrorState message={error} onRetry={loadArcs} />
        )
      ) : filteredArcs.length === 0 ? (

        <EmptyState
          icon={<Target className="w-8 h-8" />}
          title={searchQuery || selectedType !== 'all' || activeTab !== 'all' ? 'No matching Arcs' : 'No Arcs Created Yet'}
          description={
            searchQuery || selectedType !== 'all' || activeTab !== 'all'
              ? 'Try changing your filters or search query.'
              : 'Create a Winter Arc, Exam Sprint, or Custom Horizon to organize your tasks, goals, and checkpoints.'
          }
          actionLabel="Create Your First Arc"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArcs.map((arc) => (
            <ArcCard
              key={arc.id}
              arc={arc}
              onEdit={handleOpenEdit}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Arc Create/Edit Form Modal */}
      <ArcFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSaveArc}
        initialArc={editingArc}
      />
    </div>
  );
}
