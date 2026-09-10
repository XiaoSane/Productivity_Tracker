import type { SheetStore } from '../types';
import {
  stringValue,
  numValue,
  boolValue,
  formatDate,
  nowIso,
  generateId,
  logAuditEvent,
} from '../utils';
import { clampStr } from '../validation';

export async function handleDailyLogsAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'daily.get':
    case 'dailyLogs.get': {
      const date = stringValue(params.date || body.date) || formatDate();
      const logs = await store.readRecords('DailyLogs');
      const found = logs.find((l) => stringValue(l.date) === date);
      return found || null;
    }

    case 'daily.save':
    case 'dailyLogs.save': {
      const date = stringValue(body.date) || formatDate();
      const logs = await store.readRecords('DailyLogs');
      const existing = logs.find((l) => stringValue(l.date) === date);
      const logPayload = {
        date,
        sleepHours: Math.max(0, Math.min(24, numValue(body.sleepHours, 0))),
        wakeTime: clampStr(body.wakeTime, 20),
        focusHours: Math.max(0, Math.min(24, numValue(body.focusHours !== undefined ? body.focusHours : body.deepWorkHours, 0))),
        studyHours: Math.max(0, Math.min(24, numValue(body.studyHours, 0))),
        exercise: boolValue(body.exercise),
        mood: Math.max(1, Math.min(5, Math.round(numValue(body.mood, 3)))),
        energy: Math.max(1, Math.min(5, Math.round(numValue(body.energy, 3)))),
        notes: clampStr(body.notes, 5000),
        wentWell: clampStr(body.wentWell, 5000),
        difficulties: clampStr(body.difficulties, 5000),
        learnings: clampStr(body.learnings, 5000),
        updatedAt: nowIso(),
      };
      if (existing) {
        const updated = await store.updateRecord('DailyLogs', String(existing.id), logPayload);
        await logAuditEvent(store, 'UPDATE', 'DailyLogs', String(existing.id), { date });
        return updated;
      } else {
        const newLog = {
          id: generateId('LOG'),
          ...logPayload,
          createdAt: nowIso(),
        };
        await store.appendRecord('DailyLogs', newLog);
        await logAuditEvent(store, 'CREATE', 'DailyLogs', newLog.id, { date });
        return newLog;
      }
    }

    case 'daily.list':
    case 'dailyLogs.list': {
      const startDate = stringValue(params.startDate || body.startDate);
      const endDate = stringValue(params.endDate || body.endDate);
      let logs = await store.readRecords('DailyLogs');
      if (startDate && endDate) {
        logs = logs.filter((l) => {
          const ld = stringValue(l.date);
          return ld >= startDate && ld <= endDate;
        });
      }
      logs.sort((a, b) => stringValue(b.date).localeCompare(stringValue(a.date)));

      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = logs.slice(offset, offset + limit);

      return { count: logs.length, logs: paginated };
    }

    default:
      throw new Error(`Unknown daily log action: "${action}".`);
  }
}
