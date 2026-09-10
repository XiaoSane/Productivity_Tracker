import type { SheetStore } from '../types';
import {
  stringValue,
  numValue,
  formatDate,
  nowIso,
  generateId,
  generateRecurrenceDates,
  logAuditEvent,
} from '../utils';
import {
  clampStr,
  validateEnum,
  filterFields,
  TASK_ALLOWED_UPDATE_FIELDS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  RECURRENCE_TYPES,
} from '../validation';

export async function handleTasksAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'tasks.list': {
      const allTasks = await store.readRecords('Tasks');
      let tasks = [...allTasks];
      const date = stringValue(params.date);
      const startDate = stringValue(params.startDate);
      const endDate = stringValue(params.endDate);
      const status = stringValue(params.status).toLowerCase();
      const category = stringValue(params.category).toLowerCase();
      const priority = stringValue(params.priority).toLowerCase();
      const parentTaskId = params.parentTaskId !== undefined ? stringValue(params.parentTaskId) : null;

      if (date) {
        tasks = tasks.filter((t) => stringValue(t.date) === date);
      } else if (startDate && endDate) {
        tasks = tasks.filter((t) => {
          const td = stringValue(t.date);
          return td >= startDate && td <= endDate;
        });
      }

      if (status && status !== 'all') {
        tasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === status);
      }
      if (category && category !== 'all') {
        tasks = tasks.filter((t) => stringValue(t.category).toLowerCase() === category);
      }
      if (priority && priority !== 'all') {
        tasks = tasks.filter((t) => stringValue(t.priority).toLowerCase() === priority);
      }
      if (parentTaskId !== null) {
        if (parentTaskId === 'root' || parentTaskId === 'none' || parentTaskId === '') {
          tasks = tasks.filter((t) => !t.parentTaskId);
        } else {
          tasks = tasks.filter((t) => stringValue(t.parentTaskId) === parentTaskId);
        }
      }

      // Compute subtask stats
      const subStats: Record<string, { total: number; completed: number }> = {};
      allTasks.forEach((t) => {
        if (t.parentTaskId) {
          const pid = String(t.parentTaskId);
          if (!subStats[pid]) subStats[pid] = { total: 0, completed: 0 };
          subStats[pid].total += 1;
          if (stringValue(t.status).toLowerCase() === 'completed') {
            subStats[pid].completed += 1;
          }
        }
      });

      const enriched = tasks.map((t) => {
        const stats = subStats[String(t.id)] || { total: 0, completed: 0 };
        return {
          ...t,
          subtaskCount: stats.total,
          completedSubtaskCount: stats.completed,
        };
      });

      // Pagination with safe default and max limit cap
      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = enriched.slice(offset, offset + limit);

      return { count: enriched.length, tasks: paginated };
    }

    case 'tasks.get': {
      const id = stringValue(params.id || body.id);
      const tasks = await store.readRecords('Tasks');
      const found = tasks.find((t) => String(t.id) === id);
      if (!found) throw new Error(`Task with ID "${id}" not found.`);
      return found;
    }

    case 'tasks.create': {
      const title = clampStr(body.title, 200);
      if (!title) throw new Error('Task title cannot be empty.');

      // Foreign key validations
      const parentTaskId = stringValue(body.parentTaskId);
      if (parentTaskId) {
        const parentTasks = await store.readRecords('Tasks');
        if (!parentTasks.some((t) => String(t.id) === parentTaskId)) {
          throw new Error(`Referenced parent task "${parentTaskId}" not found.`);
        }
      }

      const arcId = stringValue(body.arcId);
      if (arcId) {
        const arcs = await store.readRecords('Arcs');
        if (!arcs.some((a) => String(a.id) === arcId)) {
          throw new Error(`Referenced Arc "${arcId}" not found.`);
        }
      }

      const arcGoalId = stringValue(body.arcGoalId);
      if (arcGoalId) {
        const goals = await store.readRecords('ArcGoals');
        const goal = goals.find((g) => String(g.id) === arcGoalId);
        if (!goal) {
          throw new Error(`Referenced Arc Goal "${arcGoalId}" not found.`);
        }
        if (arcId && String(goal.arcId) !== arcId) {
          throw new Error(`Referenced Arc Goal "${arcGoalId}" does not belong to Arc "${arcId}".`);
        }
      }

      const newTask = {
        id: generateId('TASK'),
        title,
        description: clampStr(body.description, 2000),
        date: stringValue(body.date) || formatDate(),
        startTime: clampStr(body.startTime, 20),
        endTime: clampStr(body.endTime, 20),
        category: clampStr(body.category || 'other', 50),
        priority: validateEnum(body.priority, TASK_PRIORITIES, 'normal'),
        status: validateEnum(body.status, TASK_STATUSES, 'pending'),
        completedAt: body.status === 'completed' ? nowIso() : '',
        notes: clampStr(body.notes, 2000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        parentTaskId,
        taskType: validateEnum(body.taskType, TASK_TYPES, 'standard'),
        recurrenceType: validateEnum(body.recurrenceType, RECURRENCE_TYPES, ''),
        recurrenceInterval: Math.max(1, Math.min(365, numValue(body.recurrenceInterval, 1))),
        recurrenceDays: clampStr(body.recurrenceDays, 50),
        recurrenceEndDate: clampStr(body.recurrenceEndDate, 20),
        recurrenceSourceId: clampStr(body.recurrenceSourceId, 100),
        arcId,
        arcGoalId,
      };
      await store.appendRecord('Tasks', newTask);
      await logAuditEvent(store, 'CREATE', 'Tasks', newTask.id, { title: newTask.title });
      return newTask;
    }

    case 'tasks.createRecurring': {
      const title = clampStr(body.title, 200);
      if (!title) throw new Error('Task title cannot be empty.');
      const recurrenceType = validateEnum(body.recurrenceType, ['daily', 'weekly', 'monthly'] as const, 'daily');
      const recurrenceInterval = Math.max(1, Math.min(365, numValue(body.recurrenceInterval, 1)));
      const startDate = stringValue(body.startDate || body.date) || formatDate();
      const recurrenceEndDate = clampStr(body.recurrenceEndDate, 20);
      const recurrenceDays = clampStr(body.recurrenceDays, 50);

      const parentTaskId = stringValue(body.parentTaskId);
      if (parentTaskId) {
        const parentTasks = await store.readRecords('Tasks');
        if (!parentTasks.some((t) => String(t.id) === parentTaskId)) {
          throw new Error(`Referenced parent task "${parentTaskId}" not found.`);
        }
      }

      const arcId = stringValue(body.arcId);
      if (arcId) {
        const arcs = await store.readRecords('Arcs');
        if (!arcs.some((a) => String(a.id) === arcId)) {
          throw new Error(`Referenced Arc "${arcId}" not found.`);
        }
      }

      const arcGoalId = stringValue(body.arcGoalId);
      if (arcGoalId) {
        const goals = await store.readRecords('ArcGoals');
        const goal = goals.find((g) => String(g.id) === arcGoalId);
        if (!goal) {
          throw new Error(`Referenced Arc Goal "${arcGoalId}" not found.`);
        }
      }

      const masterTask = {
        id: generateId('TASK'),
        title,
        description: clampStr(body.description, 2000),
        date: startDate,
        startTime: clampStr(body.startTime, 20),
        endTime: clampStr(body.endTime, 20),
        category: clampStr(body.category || 'other', 50),
        priority: validateEnum(body.priority, TASK_PRIORITIES, 'normal'),
        status: 'pending',
        completedAt: '',
        notes: clampStr(body.notes, 2000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        parentTaskId,
        taskType: 'recurring_master',
        recurrenceType,
        recurrenceInterval,
        recurrenceDays,
        recurrenceEndDate,
        recurrenceSourceId: '',
        arcId,
        arcGoalId,
      };
      await store.appendRecord('Tasks', masterTask);
      await logAuditEvent(store, 'CREATE', 'Tasks', masterTask.id, {
        taskType: 'recurring_master',
        title: masterTask.title,
      });

      const horizonDays = body.horizonDays ? numValue(body.horizonDays, 30) : 30;
      const instanceDates = generateRecurrenceDates(
        startDate,
        recurrenceType,
        recurrenceInterval,
        recurrenceDays,
        recurrenceEndDate,
        horizonDays
      );

      const instances: Record<string, unknown>[] = [];
      for (const instDate of instanceDates) {
        const inst = {
          id: generateId('TASK'),
          title: masterTask.title,
          description: masterTask.description,
          date: instDate,
          startTime: masterTask.startTime,
          endTime: masterTask.endTime,
          category: masterTask.category,
          priority: masterTask.priority,
          status: 'pending',
          completedAt: '',
          notes: masterTask.notes,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          parentTaskId: '',
          taskType: 'recurring_instance',
          recurrenceType: '',
          recurrenceInterval: 1,
          recurrenceDays: '',
          recurrenceEndDate: '',
          recurrenceSourceId: masterTask.id,
          arcId: masterTask.arcId,
          arcGoalId: masterTask.arcGoalId,
        };
        await store.appendRecord('Tasks', inst);
        instances.push(inst);
      }

      return {
        master: masterTask,
        instancesCreated: instances.length,
        instances,
      };
    }

    case 'tasks.generateInstances': {
      const masterTaskId = stringValue(body.masterTaskId || body.id || params.id);
      if (!masterTaskId) throw new Error('masterTaskId is required.');
      const allTasks = await store.readRecords('Tasks');
      const master = allTasks.find((t) => String(t.id) === masterTaskId);
      if (!master) throw new Error(`Master task not found: ${masterTaskId}`);
      if (master.taskType !== 'recurring_master') {
        throw new Error('Task is not a recurring master task.');
      }

      const horizonDays = body.horizonDays ? numValue(body.horizonDays, 30) : 30;
      const existingInstances = allTasks.filter((t) => String(t.recurrenceSourceId) === masterTaskId);
      const existingDates = new Set(existingInstances.map((t) => stringValue(t.date)));

      const instanceDates = generateRecurrenceDates(
        stringValue(master.date) || formatDate(),
        stringValue(master.recurrenceType),
        numValue(master.recurrenceInterval, 1),
        stringValue(master.recurrenceDays),
        stringValue(master.recurrenceEndDate),
        horizonDays
      );

      const newDates = instanceDates.filter((d) => !existingDates.has(d));
      const created: Record<string, unknown>[] = [];

      for (const instDate of newDates) {
        const inst = {
          id: generateId('TASK'),
          title: master.title,
          description: master.description,
          date: instDate,
          startTime: master.startTime,
          endTime: master.endTime,
          category: master.category,
          priority: master.priority,
          status: 'pending',
          completedAt: '',
          notes: master.notes,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          parentTaskId: '',
          taskType: 'recurring_instance',
          recurrenceType: '',
          recurrenceInterval: 1,
          recurrenceDays: '',
          recurrenceEndDate: '',
          recurrenceSourceId: master.id,
          arcId: master.arcId,
          arcGoalId: master.arcGoalId,
        };
        await store.appendRecord('Tasks', inst);
        created.push(inst);
      }

      await logAuditEvent(store, 'GENERATE_INSTANCES', 'Tasks', masterTaskId, {
        generatedCount: created.length,
      });

      return {
        generatedCount: created.length,
        instances: created,
      };
    }

    case 'tasks.update': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Task ID is required for update.');

      // Field allowlist to prevent mass assignment
      const allowed = filterFields(body, TASK_ALLOWED_UPDATE_FIELDS);
      const updates: Record<string, unknown> = {};

      if (allowed.title !== undefined) {
        const title = clampStr(allowed.title, 200);
        if (!title) throw new Error('Task title cannot be empty.');
        updates.title = title;
      }
      if (allowed.description !== undefined) updates.description = clampStr(allowed.description, 2000);
      if (allowed.date !== undefined) updates.date = clampStr(allowed.date, 20);
      if (allowed.startTime !== undefined) updates.startTime = clampStr(allowed.startTime, 20);
      if (allowed.endTime !== undefined) updates.endTime = clampStr(allowed.endTime, 20);
      if (allowed.category !== undefined) updates.category = clampStr(allowed.category, 50);
      if (allowed.priority !== undefined) updates.priority = validateEnum(allowed.priority, TASK_PRIORITIES, 'normal');
      if (allowed.status !== undefined) updates.status = validateEnum(allowed.status, TASK_STATUSES, 'pending');
      if (allowed.notes !== undefined) updates.notes = clampStr(allowed.notes, 2000);
      if (allowed.taskType !== undefined) updates.taskType = validateEnum(allowed.taskType, TASK_TYPES, 'standard');
      if (allowed.recurrenceType !== undefined) updates.recurrenceType = validateEnum(allowed.recurrenceType, RECURRENCE_TYPES, '');
      if (allowed.recurrenceInterval !== undefined) updates.recurrenceInterval = Math.max(1, Math.min(365, numValue(allowed.recurrenceInterval, 1)));
      if (allowed.recurrenceDays !== undefined) updates.recurrenceDays = clampStr(allowed.recurrenceDays, 50);
      if (allowed.recurrenceEndDate !== undefined) updates.recurrenceEndDate = clampStr(allowed.recurrenceEndDate, 20);
      if (allowed.recurrenceSourceId !== undefined) updates.recurrenceSourceId = clampStr(allowed.recurrenceSourceId, 100);

      // Foreign key validations on update
      if (allowed.parentTaskId !== undefined) {
        const pid = stringValue(allowed.parentTaskId);
        if (pid) {
          if (pid === id) throw new Error('A task cannot be its own parent.');
          const parentTasks = await store.readRecords('Tasks');
          if (!parentTasks.some((t) => String(t.id) === pid)) {
            throw new Error(`Referenced parent task "${pid}" not found.`);
          }
        }
        updates.parentTaskId = pid;
      }

      if (allowed.arcId !== undefined) {
        const arcId = stringValue(allowed.arcId);
        if (arcId) {
          const arcs = await store.readRecords('Arcs');
          if (!arcs.some((a) => String(a.id) === arcId)) {
            throw new Error(`Referenced Arc "${arcId}" not found.`);
          }
        }
        updates.arcId = arcId;
      }

      if (allowed.arcGoalId !== undefined) {
        const arcGoalId = stringValue(allowed.arcGoalId);
        if (arcGoalId) {
          const goals = await store.readRecords('ArcGoals');
          const goal = goals.find((g) => String(g.id) === arcGoalId);
          if (!goal) {
            throw new Error(`Referenced Arc Goal "${arcGoalId}" not found.`);
          }
        }
        updates.arcGoalId = arcGoalId;
      }

      if (updates.status === 'completed' && !allowed.completedAt) {
        updates.completedAt = nowIso();
      } else if (updates.status && updates.status !== 'completed') {
        updates.completedAt = '';
      } else if (allowed.completedAt !== undefined) {
        updates.completedAt = allowed.completedAt;
      }

      const updated = await store.updateRecord('Tasks', id, updates);
      await logAuditEvent(store, 'UPDATE', 'Tasks', id, updates);
      return updated;
    }

    case 'tasks.complete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Task ID is required.');
      const completed = await store.updateRecord('Tasks', id, {
        status: 'completed',
        completedAt: nowIso(),
      });
      await logAuditEvent(store, 'COMPLETE', 'Tasks', id);
      return completed;
    }

    case 'tasks.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Task ID is required.');
      const success = await store.deleteRecord('Tasks', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'Tasks', id);
      }
      return { id, deleted: success, success };
    }

    default:
      throw new Error(`Unknown task action: "${action}".`);
  }
}
