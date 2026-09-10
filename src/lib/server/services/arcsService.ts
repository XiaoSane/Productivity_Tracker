import type { SheetStore } from '../types';
import type { ArcMetrics, ArcTimelineEvent } from '@/types';
import {
  stringValue,
  numValue,
  formatDate,
  nowIso,
  generateId,
  logAuditEvent,
} from '../utils';
import {
  clampStr,
  validateEnum,
  filterFields,
  ARC_ALLOWED_UPDATE_FIELDS,
  ARC_GOAL_ALLOWED_UPDATE_FIELDS,
  ARC_MILESTONE_ALLOWED_UPDATE_FIELDS,
  ARC_TYPES,
  ARC_STATUSES,
  ARC_GOAL_STATUSES,
  ARC_METRIC_TYPES,
  ARC_FREQUENCIES,
  ARC_MILESTONE_STATUSES,
  TASK_PRIORITIES,
} from '../validation';

export async function handleArcsAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'arcs.list': {
      let arcs = await store.readRecords('Arcs');
      const status = stringValue(params.status).toLowerCase();
      const type = stringValue(params.type).toLowerCase();
      if (status && status !== 'all') {
        arcs = arcs.filter((a) => stringValue(a.status).toLowerCase() === status);
      }
      if (type && type !== 'all') {
        arcs = arcs.filter((a) => stringValue(a.type).toLowerCase() === type);
      }

      const totalCount = arcs.length;
      const limit = Math.min(Math.max(numValue(params.limit || body.limit, 500), 1), 500);
      const offset = Math.max(numValue(params.offset || body.offset, 0), 0);
      arcs = arcs.slice(offset, offset + limit);

      const allGoals = await store.readRecords('ArcGoals');
      const allMilestones = await store.readRecords('ArcMilestones');
      const allTasks = await store.readRecords('Tasks');
      const today = formatDate();

      const enriched = arcs.map((arc) => {
        const arcId = String(arc.id);
        const goals = allGoals.filter((g) => String(g.arcId) === arcId);
        const milestones = allMilestones.filter((m) => String(m.arcId) === arcId);
        const tasks = allTasks.filter((t) => String(t.arcId) === arcId);

        let goalSum = 0;
        let compGoals = 0;
        goals.forEach((g) => {
          const target = numValue(g.targetValue, 1);
          const cur = numValue(g.currentValue, 0);
          const pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
          goalSum += pct;
          if (pct >= 100 || stringValue(g.status).toLowerCase() === 'completed') compGoals++;
        });

        const compMilestones = milestones.filter((m) => stringValue(m.status).toLowerCase() === 'completed').length;
        const compTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;

        const avgGoalPct = goals.length > 0 ? Math.round(goalSum / goals.length) : 0;
        const milestonePct = milestones.length > 0 ? Math.round((compMilestones / milestones.length) * 100) : 0;
        const taskPct = tasks.length > 0 ? Math.round((compTasks / tasks.length) * 100) : 0;

        let activeDims = 0;
        let totalProg = 0;
        if (goals.length > 0) { activeDims++; totalProg += avgGoalPct; }
        if (milestones.length > 0) { activeDims++; totalProg += milestonePct; }
        if (tasks.length > 0) { activeDims++; totalProg += taskPct; }
        const overallProgress = activeDims > 0 ? Math.round(totalProg / activeDims) : 0;

        const startStr = stringValue(arc.startDate);
        const endStr = stringValue(arc.endDate);
        const daysRemaining = endStr ? Math.round((new Date(endStr).getTime() - new Date(today).getTime()) / (24 * 3600 * 1000)) : null;
        const daysElapsed = startStr ? Math.max(0, Math.round((new Date(today).getTime() - new Date(startStr).getTime()) / (24 * 3600 * 1000))) : 0;
        const totalDays = startStr && endStr ? Math.max(1, Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / (24 * 3600 * 1000))) : 1;

        const metrics: ArcMetrics = {
          totalGoals: goals.length,
          completedGoals: compGoals,
          goalProgress: avgGoalPct,
          totalMilestones: milestones.length,
          completedMilestones: compMilestones,
          milestoneProgress: milestonePct,
          totalTasks: tasks.length,
          completedTasks: compTasks,
          taskProgress: taskPct,
          overallProgress,
          daysRemaining,
          daysElapsed,
          totalDays,
        };

        return {
          ...arc,
          goalsCount: goals.length,
          completedGoalsCount: compGoals,
          milestonesCount: milestones.length,
          completedMilestonesCount: compMilestones,
          tasksCount: tasks.length,
          completedTasksCount: compTasks,
          calculatedProgress: overallProgress,
          metrics,
        };
      });

      return { count: totalCount, arcs: enriched };
    }

    case 'arcs.get': {
      const id = stringValue(params.id || body.id).trim();
      const arcs = await store.readRecords('Arcs');
      const arc = arcs.find((a) => String(a.id).trim() === id);
      if (!arc) throw new Error(`Arc with ID "${id}" not found.`);

      const arcId = String(arc.id);
      const allGoals = await store.readRecords('ArcGoals');
      const goals: Array<Record<string, unknown>> = allGoals
        .filter((g) => String(g.arcId) === arcId)
        .map((g) => {
          const target = numValue(g.targetValue, 1);
          const cur = numValue(g.currentValue, 0);
          const isCompleted = stringValue(g.status).toLowerCase() === 'completed' || cur >= target;
          return {
            ...g,
            status: isCompleted ? 'completed' : g.status,
            currentValue: isCompleted && cur < target ? target : cur,
          };
        });

      const allMilestones = await store.readRecords('ArcMilestones');
      const milestones: Array<Record<string, unknown>> = allMilestones
        .filter((m) => String(m.arcId) === arcId)
        .sort((a, b) => stringValue(a.targetDate).localeCompare(stringValue(b.targetDate)))
        .map((m) => ({
          ...m,
          status: stringValue(m.status).toLowerCase() === 'completed' ? 'completed' : m.status,
        }));

      const allTasks = await store.readRecords('Tasks');
      const linkedTasks = allTasks.filter((t) => String(t.arcId) === arcId);

      let linkedExam = null;
      if (arc.linkedExamId) {
        const exams = await store.readRecords('Exams');
        linkedExam = exams.find((e) => String(e.id) === String(arc.linkedExamId)) || null;
      }

      let goalSum = 0;
      let compGoals = 0;
      goals.forEach((g) => {
        const target = numValue(g.targetValue, 1);
        const cur = numValue(g.currentValue, 0);
        const pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
        goalSum += pct;
        if (pct >= 100 || stringValue(g.status).toLowerCase() === 'completed') compGoals++;
      });

      const compMilestones = milestones.filter((m) => stringValue(m.status).toLowerCase() === 'completed').length;
      const compTasks = linkedTasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;

      const avgGoalPct = goals.length > 0 ? Math.round(goalSum / goals.length) : 0;
      const milestonePct = milestones.length > 0 ? Math.round((compMilestones / milestones.length) * 100) : 0;
      const taskPct = linkedTasks.length > 0 ? Math.round((compTasks / linkedTasks.length) * 100) : 0;

      let activeDims = 0;
      let totalProg = 0;
      if (goals.length > 0) { activeDims++; totalProg += avgGoalPct; }
      if (milestones.length > 0) { activeDims++; totalProg += milestonePct; }
      if (linkedTasks.length > 0) { activeDims++; totalProg += taskPct; }
      const overallProgress = activeDims > 0 ? Math.round(totalProg / activeDims) : 0;

      const today = formatDate();
      const startStr = stringValue(arc.startDate);
      const endStr = stringValue(arc.endDate);
      const daysRemaining = endStr ? Math.round((new Date(endStr).getTime() - new Date(today).getTime()) / (24 * 3600 * 1000)) : null;
      const daysElapsed = startStr ? Math.max(0, Math.round((new Date(today).getTime() - new Date(startStr).getTime()) / (24 * 3600 * 1000))) : 0;
      const totalDays = startStr && endStr ? Math.max(1, Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / (24 * 3600 * 1000))) : 1;

      const upcomingMilestone = milestones.find(
        (m) => stringValue(m.status).toLowerCase() !== 'completed' && stringValue(m.targetDate) >= today
      ) || null;

      const metrics: ArcMetrics = {
        totalGoals: goals.length,
        completedGoals: compGoals,
        goalProgress: avgGoalPct,
        totalMilestones: milestones.length,
        completedMilestones: compMilestones,
        milestoneProgress: milestonePct,
        totalTasks: linkedTasks.length,
        completedTasks: compTasks,
        taskProgress: taskPct,
        overallProgress,
        daysRemaining,
        daysElapsed,
        totalDays,
        upcomingMilestone: upcomingMilestone as unknown as ArcMetrics['upcomingMilestone'],
      };

      const arcWithMetrics = {
        ...arc,
        metrics,
      };

      return {
        ...arcWithMetrics,
        arc: arcWithMetrics,
        goals,
        milestones,
        linkedTasks,
        tasks: linkedTasks,
        linkedExam,
        metrics,
      };
    }

    case 'arcs.analytics': {
      const id = stringValue(params.id || params.arcId || body.id || body.arcId).trim();
      const arcs = await store.readRecords('Arcs');
      const arc = arcs.find((a) => String(a.id).trim() === id);
      if (!arc) throw new Error(`Arc with ID "${id}" not found.`);

      const arcId = String(arc.id);
      const allGoals = await store.readRecords('ArcGoals');
      const goals = allGoals.filter((g) => String(g.arcId) === arcId);

      const allMilestones = await store.readRecords('ArcMilestones');
      const milestones = allMilestones
        .filter((m) => String(m.arcId) === arcId)
        .sort((a, b) => stringValue(a.targetDate).localeCompare(stringValue(b.targetDate)));

      const allTasks = await store.readRecords('Tasks');
      const linkedTasks = allTasks.filter((t) => String(t.arcId) === arcId);

      let linkedExam = null;
      if (arc.linkedExamId) {
        const exams = await store.readRecords('Exams');
        linkedExam = exams.find((e) => String(e.id) === String(arc.linkedExamId)) || null;
      }

      const today = formatDate();
      const startDate = stringValue(arc.startDate);
      const endDate = stringValue(arc.endDate);

      // Study sessions within arc window
      const allSessions = await store.readRecords('StudySessions');
      const arcSessions = allSessions.filter((s) => {
        const sDate = stringValue(s.date);
        return (!startDate || sDate >= startDate) && (!endDate || sDate <= endDate);
      });
      const totalSessionMinutes = arcSessions.reduce((sum, s) => sum + numValue(s.durationMinutes, 0), 0);
      const totalStudyHours = Math.round((totalSessionMinutes / 60) * 10) / 10;

      // Daily logs within arc window
      const allLogs = await store.readRecords('DailyLogs');
      const arcLogs = allLogs.filter((l) => {
        const lDate = stringValue(l.date);
        return (!startDate || lDate >= startDate) && (!endDate || lDate <= endDate);
      });
      const totalFocusHours = Math.round(arcLogs.reduce((sum, l) => sum + numValue(l.focusHours, 0), 0) * 10) / 10;
      const logStudyHours = Math.round(arcLogs.reduce((sum, l) => sum + numValue(l.studyHours, 0), 0) * 10) / 10;
      const finalStudyHours = totalStudyHours > 0 ? totalStudyHours : logStudyHours;

      let goalSum = 0;
      let compGoals = 0;
      goals.forEach((g) => {
        const target = numValue(g.targetValue, 1);
        const cur = numValue(g.currentValue, 0);
        const pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
        goalSum += pct;
        if (pct >= 100 || stringValue(g.status).toLowerCase() === 'completed') compGoals++;
      });
      const compMilestones = milestones.filter((m) => stringValue(m.status).toLowerCase() === 'completed').length;
      const compTasks = linkedTasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
      const avgGoalPct = goals.length > 0 ? Math.round(goalSum / goals.length) : 0;
      const milestonePct = milestones.length > 0 ? Math.round((compMilestones / milestones.length) * 100) : 0;
      const taskPct = linkedTasks.length > 0 ? Math.round((compTasks / linkedTasks.length) * 100) : 0;

      let activeDims = 0;
      let totalProg = 0;
      if (goals.length > 0) { activeDims++; totalProg += avgGoalPct; }
      if (milestones.length > 0) { activeDims++; totalProg += milestonePct; }
      if (linkedTasks.length > 0) { activeDims++; totalProg += taskPct; }
      const overallProgress = activeDims > 0 ? Math.round(totalProg / activeDims) : 0;

      const daysRemaining = endDate ? Math.round((new Date(endDate).getTime() - new Date(today).getTime()) / (24 * 3600 * 1000)) : null;
      const daysElapsed = startDate ? Math.max(0, Math.round((new Date(today).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000))) : 0;
      const totalDays = startDate && endDate ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000))) : 1;
      const upcomingMilestone = milestones.find(
        (m) => stringValue(m.status).toLowerCase() !== 'completed' && stringValue(m.targetDate) >= today
      ) || null;

      const metrics: ArcMetrics = {
        totalGoals: goals.length,
        completedGoals: compGoals,
        goalProgress: avgGoalPct,
        totalMilestones: milestones.length,
        completedMilestones: compMilestones,
        milestoneProgress: milestonePct,
        totalTasks: linkedTasks.length,
        completedTasks: compTasks,
        taskProgress: taskPct,
        overallProgress,
        daysRemaining,
        daysElapsed,
        totalDays,
        upcomingMilestone: upcomingMilestone as unknown as ArcMetrics['upcomingMilestone'],
      };

      const timeline: ArcTimelineEvent[] = [];
      if (startDate) {
        timeline.push({
          date: startDate,
          type: 'arc_start',
          title: `${arc.name} Started`,
          status: 'completed',
        });
      }
      milestones.forEach((m) => {
        timeline.push({
          id: String(m.id),
          date: stringValue(m.targetDate),
          type: 'milestone',
          title: stringValue(m.title),
          description: stringValue(m.description),
          status: stringValue(m.status),
        });
      });
      if (linkedExam) {
        if (linkedExam.deadline) {
          timeline.push({
            date: stringValue(linkedExam.deadline),
            type: 'exam_deadline',
            title: `${linkedExam.name} Prep Deadline`,
            status: stringValue(linkedExam.deadline) < today ? 'completed' : 'pending',
          });
        }
        if (linkedExam.examDate) {
          timeline.push({
            date: stringValue(linkedExam.examDate),
            type: 'exam_date',
            title: `${linkedExam.name} Exam Day`,
            status: stringValue(linkedExam.examDate) < today ? 'completed' : 'pending',
          });
        }
      }
      if (endDate) {
        timeline.push({
          date: endDate,
          type: 'arc_end',
          title: `${arc.name} Target Completion`,
          status: endDate < today ? 'completed' : 'pending',
        });
      }
      timeline.sort((a, b) => stringValue(a.date).localeCompare(stringValue(b.date)));

      return {
        arc: { ...arc, metrics },
        metrics,
        goals,
        milestones,
        linkedTasks,
        linkedExam,
        studyStats: {
          totalSessionsCount: arcSessions.length,
          totalStudyHours: finalStudyHours,
          totalFocusHours,
          activeDaysCount: arcLogs.length,
        },
        timeline,
      };
    }

    case 'arcs.create': {
      const name = clampStr(body.name || body.title, 150);
      if (!name) throw new Error('Arc name is required.');

      const linkedExamId = clampStr(body.linkedExamId, 50);
      if (linkedExamId) {
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === linkedExamId)) {
          throw new Error(`Referenced exam "${linkedExamId}" does not exist.`);
        }
      }

      const newArc = {
        id: generateId('ARC'),
        name,
        description: clampStr(body.description, 2000),
        type: validateEnum(body.type, ARC_TYPES, 'custom'),
        startDate: clampStr(body.startDate, 30) || formatDate(),
        endDate: clampStr(body.endDate, 30),
        status: validateEnum(body.status, ARC_STATUSES, 'active'),
        icon: clampStr(body.icon, 30, '🎯') || '🎯',
        linkedExamId,
        notes: clampStr(body.notes, 5000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('Arcs', newArc);
      await logAuditEvent(store, 'CREATE', 'Arcs', newArc.id, { name: newArc.name });
      return newArc;
    }

    case 'arcs.update': {
      const id = stringValue(body.id).trim();
      if (!id) throw new Error('Arc ID is required.');
      const updates = filterFields(body, ARC_ALLOWED_UPDATE_FIELDS);

      if (updates.name !== undefined) {
        updates.name = clampStr(updates.name, 150);
        if (!updates.name) throw new Error('Arc name cannot be empty.');
      }
      if (updates.description !== undefined) updates.description = clampStr(updates.description, 2000);
      if (updates.notes !== undefined) updates.notes = clampStr(updates.notes, 5000);
      if (updates.icon !== undefined) updates.icon = clampStr(updates.icon, 30, '🎯') || '🎯';
      if (updates.startDate !== undefined) updates.startDate = clampStr(updates.startDate, 30);
      if (updates.endDate !== undefined) updates.endDate = clampStr(updates.endDate, 30);
      if (updates.type !== undefined) updates.type = validateEnum(updates.type, ARC_TYPES, 'custom');
      if (updates.status !== undefined) updates.status = validateEnum(updates.status, ARC_STATUSES, 'active');

      if (updates.linkedExamId) {
        const linkedExamId = clampStr(updates.linkedExamId, 50);
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === linkedExamId)) {
          throw new Error(`Referenced exam "${linkedExamId}" does not exist.`);
        }
        updates.linkedExamId = linkedExamId;
      }

      updates.updatedAt = nowIso();
      const updated = await store.updateRecord('Arcs', id, updates);
      await logAuditEvent(store, 'UPDATE', 'Arcs', id, updates);
      return updated;
    }

    case 'arcs.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Arc ID is required.');
      try {
        const goals = await store.readRecords('ArcGoals');
        for (const g of goals) {
          if (String(g.arcId) === id) {
            try {
              await store.deleteRecord('ArcGoals', String(g.id));
            } catch (err) {
              console.warn(`[arcs.delete] Failed to delete goal ${g.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[arcs.delete] Failed to query goals:', err);
      }

      try {
        const milestones = await store.readRecords('ArcMilestones');
        for (const m of milestones) {
          if (String(m.arcId) === id) {
            try {
              await store.deleteRecord('ArcMilestones', String(m.id));
            } catch (err) {
              console.warn(`[arcs.delete] Failed to delete milestone ${m.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[arcs.delete] Failed to query milestones:', err);
      }

      try {
        const tasks = await store.readRecords('Tasks');
        for (const t of tasks) {
          if (String(t.arcId) === id) {
            try {
              await store.updateRecord('Tasks', String(t.id), { arcId: '', arcGoalId: '' });
            } catch (err) {
              console.warn(`[arcs.delete] Failed to unlink task ${t.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn('[arcs.delete] Failed to unlink tasks:', err);
      }

      const success = await store.deleteRecord('Arcs', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'Arcs', id);
      }
      return { id, deleted: success, success };
    }

    case 'arcs.status': {
      const id = stringValue(body.id || params.id).trim();
      if (!id) throw new Error('Arc ID is required.');
      const rawStatus = body.status || params.status;
      const status = validateEnum(rawStatus, ARC_STATUSES, 'active');
      const updated = await store.updateRecord('Arcs', id, { status, updatedAt: nowIso() });
      await logAuditEvent(store, 'STATUS_CHANGE', 'Arcs', id, { status });
      return updated;
    }

    case 'arcs.linkTask': {
      const taskId = stringValue(body.taskId).trim();
      if (!taskId) throw new Error('Task ID is required.');
      const arcId = stringValue(body.arcId).trim();
      const arcGoalId = stringValue(body.arcGoalId).trim();

      const tasks = await store.readRecords('Tasks');
      if (!tasks.some((t) => String(t.id) === taskId)) {
        throw new Error(`Task "${taskId}" not found.`);
      }

      if (arcId) {
        const arcs = await store.readRecords('Arcs');
        if (!arcs.some((a) => String(a.id) === arcId)) {
          throw new Error(`Arc "${arcId}" not found.`);
        }
      }

      if (arcGoalId) {
        const goals = await store.readRecords('ArcGoals');
        const goal = goals.find((g) => String(g.id) === arcGoalId);
        if (!goal) {
          throw new Error(`Arc goal "${arcGoalId}" not found.`);
        }
        if (arcId && String(goal.arcId) !== arcId) {
          throw new Error(`Arc goal "${arcGoalId}" does not belong to Arc "${arcId}".`);
        }
      }

      const updated = await store.updateRecord('Tasks', taskId, { arcId, arcGoalId, updatedAt: nowIso() });
      await logAuditEvent(store, 'LINK_TASK', 'Arcs', arcId, { taskId, arcGoalId });
      return updated;
    }

    case 'arcs.unlinkTask': {
      const taskId = stringValue(body.taskId || params.taskId);
      if (!taskId) throw new Error('Task ID is required.');
      const updated = await store.updateRecord('Tasks', taskId, { arcId: '', arcGoalId: '' });
      await logAuditEvent(store, 'UNLINK_TASK', 'Tasks', taskId);
      return updated;
    }

    case 'arcGoals.list': {
      const arcId = stringValue(params.arcId || body.arcId).trim();
      let goals = await store.readRecords('ArcGoals');
      if (arcId) goals = goals.filter((g) => String(g.arcId) === arcId);

      const totalCount = goals.length;
      const limit = Math.min(Math.max(numValue(params.limit || body.limit, 500), 1), 500);
      const offset = Math.max(numValue(params.offset || body.offset, 0), 0);
      goals = goals.slice(offset, offset + limit);

      goals = goals.map((g) => {
        const target = numValue(g.targetValue, 1);
        const cur = numValue(g.currentValue, 0);
        const isCompleted = stringValue(g.status).toLowerCase() === 'completed' || cur >= target;
        return {
          ...g,
          status: isCompleted ? 'completed' : g.status,
          currentValue: isCompleted && cur < target ? target : cur,
        };
      });
      return { count: totalCount, goals };
    }

    case 'arcGoals.get': {
      const id = stringValue(params.id || body.id);
      const goals = await store.readRecords('ArcGoals');
      const found = goals.find((g) => String(g.id) === id);
      if (!found) throw new Error(`ArcGoal with ID "${id}" not found.`);
      const target = numValue(found.targetValue, 1);
      const cur = numValue(found.currentValue, 0);
      const isCompleted = stringValue(found.status).toLowerCase() === 'completed' || cur >= target;
      return {
        ...found,
        status: isCompleted ? 'completed' : found.status,
        currentValue: isCompleted && cur < target ? target : cur,
      };
    }

    case 'arcGoals.create': {
      const title = clampStr(body.title, 200);
      if (!title) throw new Error('Goal title is required.');

      const arcId = clampStr(body.arcId, 50);
      if (arcId) {
        const arcs = await store.readRecords('Arcs');
        if (!arcs.some((a) => String(a.id) === arcId)) {
          throw new Error(`Referenced arc "${arcId}" does not exist.`);
        }
      }

      const linkedExamId = clampStr(body.linkedExamId, 50);
      if (linkedExamId) {
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === linkedExamId)) {
          throw new Error(`Referenced exam "${linkedExamId}" does not exist.`);
        }
      }

      const newGoal = {
        id: generateId('GOAL'),
        arcId,
        title,
        description: clampStr(body.description, 2000),
        metricType: validateEnum(body.metricType, ARC_METRIC_TYPES, 'count'),
        targetValue: Math.max(numValue(body.targetValue, 1), 0.01),
        currentValue: Math.max(numValue(body.currentValue, 0), 0),
        unit: clampStr(body.unit, 50),
        frequency: validateEnum(body.frequency, ARC_FREQUENCIES, 'overall'),
        startDate: clampStr(body.startDate, 30),
        endDate: clampStr(body.endDate, 30),
        status: validateEnum(body.status, ARC_GOAL_STATUSES, 'active'),
        priority: validateEnum(body.priority, TASK_PRIORITIES, 'medium'),
        linkedExamId,
        notes: clampStr(body.notes, 5000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('ArcGoals', newGoal);
      await logAuditEvent(store, 'CREATE', 'ArcGoals', newGoal.id, { title: newGoal.title });
      return newGoal;
    }

    case 'arcGoals.update': {
      const id = stringValue(body.id).trim();
      if (!id) throw new Error('Goal ID is required for update.');
      const updates = filterFields(body, ARC_GOAL_ALLOWED_UPDATE_FIELDS);

      const goals = await store.readRecords('ArcGoals');
      const existing = goals.find((g) => String(g.id) === id);
      if (!existing) throw new Error(`ArcGoal with ID "${id}" not found.`);

      if (updates.title !== undefined) {
        updates.title = clampStr(updates.title, 200);
        if (!updates.title) throw new Error('Goal title cannot be empty.');
      }
      if (updates.description !== undefined) updates.description = clampStr(updates.description, 2000);
      if (updates.notes !== undefined) updates.notes = clampStr(updates.notes, 5000);
      if (updates.unit !== undefined) updates.unit = clampStr(updates.unit, 50);
      if (updates.startDate !== undefined) updates.startDate = clampStr(updates.startDate, 30);
      if (updates.endDate !== undefined) updates.endDate = clampStr(updates.endDate, 30);

      if (updates.metricType !== undefined) updates.metricType = validateEnum(updates.metricType, ARC_METRIC_TYPES, 'count');
      if (updates.frequency !== undefined) updates.frequency = validateEnum(updates.frequency, ARC_FREQUENCIES, 'overall');
      if (updates.status !== undefined) updates.status = validateEnum(updates.status, ARC_GOAL_STATUSES, 'active');
      if (updates.priority !== undefined) updates.priority = validateEnum(updates.priority, TASK_PRIORITIES, 'medium');

      if (updates.targetValue !== undefined) updates.targetValue = Math.max(numValue(updates.targetValue, 1), 0.01);
      if (updates.currentValue !== undefined) updates.currentValue = Math.max(numValue(updates.currentValue, 0), 0);

      if (updates.linkedExamId) {
        const linkedExamId = clampStr(updates.linkedExamId, 50);
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === linkedExamId)) {
          throw new Error(`Referenced exam "${linkedExamId}" does not exist.`);
        }
        updates.linkedExamId = linkedExamId;
      }

      if (updates.status && String(updates.status).toLowerCase() === 'completed') {
        const target = updates.targetValue !== undefined ? numValue(updates.targetValue, 1) : numValue(existing.targetValue, 1);
        if (updates.currentValue === undefined || numValue(updates.currentValue, 0) < target) {
          updates.currentValue = target;
        }
      }

      updates.updatedAt = nowIso();
      const updated = await store.updateRecord('ArcGoals', id, updates);
      await logAuditEvent(store, 'UPDATE', 'ArcGoals', id, updates);
      return updated;
    }

    case 'arcGoals.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Goal ID is required.');
      const success = await store.deleteRecord('ArcGoals', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'ArcGoals', id);
      }
      return { id, deleted: success, success };
    }

    case 'arcGoals.updateProgress': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Goal ID is required.');
      const goals = await store.readRecords('ArcGoals');
      const goal = goals.find((g) => String(g.id) === id);
      if (!goal) throw new Error(`Arc goal not found: ${id}`);

      const target = numValue(goal.targetValue, 1);
      let currentValue: number;
      if (body.incrementBy !== undefined) {
        currentValue = numValue(goal.currentValue, 0) + numValue(body.incrementBy, 0);
      } else {
        currentValue = numValue(body.currentValue, numValue(goal.currentValue, 0));
      }

      let status = goal.status || 'active';
      if (currentValue >= target) {
        status = 'completed';
      } else if (body.status) {
        status = stringValue(body.status);
      }

      const updated = await store.updateRecord('ArcGoals', id, { currentValue, status });
      await logAuditEvent(store, 'UPDATE_PROGRESS', 'ArcGoals', id, { currentValue, status });
      return updated;
    }

    case 'arcMilestones.list': {
      const arcId = stringValue(params.arcId || body.arcId).trim();
      let milestones = await store.readRecords('ArcMilestones');
      if (arcId) milestones = milestones.filter((m) => String(m.arcId) === arcId);

      const totalCount = milestones.length;
      const limit = Math.min(Math.max(numValue(params.limit || body.limit, 500), 1), 500);
      const offset = Math.max(numValue(params.offset || body.offset, 0), 0);
      milestones = milestones.slice(offset, offset + limit);

      milestones = milestones.map((m) => ({
        ...m,
        status: stringValue(m.status).toLowerCase() === 'completed' ? 'completed' : m.status,
      }));
      return { count: totalCount, milestones };
    }

    case 'arcMilestones.get': {
      const id = stringValue(params.id || body.id);
      const milestones = await store.readRecords('ArcMilestones');
      const found = milestones.find((m) => String(m.id) === id);
      if (!found) throw new Error(`ArcMilestone with ID "${id}" not found.`);
      return {
        ...found,
        status: stringValue(found.status).toLowerCase() === 'completed' ? 'completed' : found.status,
      };
    }

    case 'arcMilestones.create': {
      const title = clampStr(body.title, 200);
      if (!title) throw new Error('Milestone title is required.');

      const arcId = clampStr(body.arcId, 50);
      if (arcId) {
        const arcs = await store.readRecords('Arcs');
        if (!arcs.some((a) => String(a.id) === arcId)) {
          throw new Error(`Referenced arc "${arcId}" does not exist.`);
        }
      }

      const status = validateEnum(body.status, ARC_MILESTONE_STATUSES, 'pending');
      const newMilestone = {
        id: generateId('MILESTONE'),
        arcId,
        title,
        description: clampStr(body.description, 2000),
        targetDate: clampStr(body.targetDate, 30) || formatDate(),
        status,
        completedAt: status === 'completed' ? nowIso() : '',
        notes: clampStr(body.notes, 5000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('ArcMilestones', newMilestone);
      await logAuditEvent(store, 'CREATE', 'ArcMilestones', newMilestone.id, { title: newMilestone.title });
      return newMilestone;
    }

    case 'arcMilestones.update': {
      const id = stringValue(body.id).trim();
      if (!id) throw new Error('Milestone ID is required for update.');
      const updates = filterFields(body, ARC_MILESTONE_ALLOWED_UPDATE_FIELDS);

      if (updates.title !== undefined) {
        updates.title = clampStr(updates.title, 200);
        if (!updates.title) throw new Error('Milestone title cannot be empty.');
      }
      if (updates.description !== undefined) updates.description = clampStr(updates.description, 2000);
      if (updates.notes !== undefined) updates.notes = clampStr(updates.notes, 5000);
      if (updates.targetDate !== undefined) updates.targetDate = clampStr(updates.targetDate, 30);

      if (updates.status !== undefined) {
        updates.status = validateEnum(updates.status, ARC_MILESTONE_STATUSES, 'pending');
        if (updates.status === 'completed' && !updates.completedAt) {
          updates.completedAt = nowIso();
        } else if (updates.status !== 'completed') {
          updates.completedAt = '';
        }
      }

      updates.updatedAt = nowIso();
      const updated = await store.updateRecord('ArcMilestones', id, updates);
      await logAuditEvent(store, 'UPDATE', 'ArcMilestones', id, updates);
      return updated;
    }

    case 'arcMilestones.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Milestone ID is required.');
      const success = await store.deleteRecord('ArcMilestones', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'ArcMilestones', id);
      }
      return { id, deleted: success, success };
    }

    case 'arcMilestones.status': {
      const id = stringValue(body.id || params.id).trim();
      if (!id) throw new Error('Milestone ID is required.');
      const rawStatus = body.status || params.status;
      const status = validateEnum(rawStatus, ARC_MILESTONE_STATUSES, 'pending');

      const completedAt = status === 'completed' ? nowIso() : '';
      const updated = await store.updateRecord('ArcMilestones', id, { status, completedAt, updatedAt: nowIso() });
      await logAuditEvent(store, 'STATUS_CHANGE', 'ArcMilestones', id, { status });
      return updated;
    }

    default:
      throw new Error(`Unknown arcs action: "${action}".`);
  }
}
