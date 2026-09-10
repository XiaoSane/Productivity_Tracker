import type { SheetStore } from '../types';
import {
  stringValue,
  numValue,
  nowIso,
  logAuditEvent,
  ALL_SHEET_NAMES,
} from '../utils';

export async function handleDataAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'audit.list': {
      const logs = await store.readRecords('AuditLog');
      const limit = Math.min(Math.max(numValue(params.limit || body.limit, 100), 1), 1000);
      logs.sort((a, b) => stringValue(b.timestamp).localeCompare(stringValue(a.timestamp)));
      return { count: logs.length, logs: logs.slice(0, limit) };
    }

    case 'data.export': {
      const includeAudit = String(params.includeAudit || body.includeAudit).toLowerCase() === 'true';
      const exportData: Record<string, Record<string, unknown>[]> = {};
      for (const sheet of ALL_SHEET_NAMES) {
        if (sheet === 'AuditLog' && !includeAudit) {
          continue;
        }
        exportData[sheet] = await store.readRecords(sheet);
      }
      return {
        version: '1.0.0',
        exportedAt: nowIso(),
        data: exportData,
      };
    }

    case 'data.validateImport': {
      const importPayload =
        body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : body;
      if (!importPayload || typeof importPayload !== 'object') {
        throw new Error('Invalid import payload: missing data records.');
      }
      let totalRecords = 0;
      let isValid = true;
      const summary: Record<string, { toAdd: number; toUpdate: number; skipped: number; errors: string[] }> = {};

      for (const sheet of ALL_SHEET_NAMES) {
        const records = importPayload[sheet];
        if (Array.isArray(records)) {
          let toAdd = 0;
          let toUpdate = 0;
          let skipped = 0;
          const errors: string[] = [];

          let existingRecords: Record<string, unknown>[] = [];
          try {
            existingRecords = await store.readRecords(sheet);
          } catch {
            existingRecords = [];
          }
          const existingIds = new Set(existingRecords.map((r) => String(r.id || '')));

          for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            if (!rec || typeof rec !== 'object') {
              errors.push(`Row ${i + 1}: Invalid non-object record`);
              skipped++;
              isValid = false;
              continue;
            }
            const recordObj = rec as Record<string, unknown>;
            if (recordObj.id && existingIds.has(String(recordObj.id))) {
              toUpdate++;
            } else {
              toAdd++;
            }
          }

          totalRecords += records.length;
          summary[sheet] = { toAdd, toUpdate, skipped, errors };
        }
      }

      return {
        isValid,
        totalRecords,
        summary,
        valid: isValid,
      };
    }

    case 'data.import': {
      const importPayload =
        body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : body;
      if (!importPayload || typeof importPayload !== 'object' || Array.isArray(importPayload)) {
        throw new Error('Invalid import payload: missing data records.');
      }

      // Pre-validation: verify sheets, total record count, and record structure before any writes
      let totalToImport = 0;
      for (const key of Object.keys(importPayload)) {
        if (key === 'AuditLog') {
          // Prevent tampering with AuditLog via import
          continue;
        }
        if (!(ALL_SHEET_NAMES as readonly string[]).includes(key)) {
          continue;
        }
        const records = importPayload[key];
        if (!Array.isArray(records)) {
          throw new Error(`Invalid data format for sheet "${key}": expected array of records.`);
        }
        totalToImport += records.length;
        for (let i = 0; i < records.length; i++) {
          const rec = records[i];
          if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
            throw new Error(`Record ${i + 1} in sheet "${key}" is invalid (must be an object).`);
          }
        }
      }

      if (totalToImport > 10000) {
        throw new Error(`Import payload exceeds the maximum safety limit of 10,000 records (received ${totalToImport}).`);
      }

      let totalAdded = 0;
      let totalUpdated = 0;
      const importedCounts: Record<string, number> = {};

      for (const sheet of ALL_SHEET_NAMES) {
        if (sheet === 'AuditLog') continue;
        const records = importPayload[sheet];
        if (Array.isArray(records) && records.length > 0) {
          let sheetAdded = 0;
          let sheetUpdated = 0;

          let existingRecords: Record<string, unknown>[] = [];
          try {
            existingRecords = await store.readRecords(sheet);
          } catch {
            existingRecords = [];
          }
          const existingIds = new Set(existingRecords.map((r) => String(r.id || '')));

          for (const rec of records) {
            if (!rec || typeof rec !== 'object') continue;
            const recordObj = rec as Record<string, unknown>;
            if (recordObj.id && existingIds.has(String(recordObj.id))) {
              await store.updateRecord(sheet, String(recordObj.id), recordObj);
              sheetUpdated++;
            } else {
              await store.appendRecord(sheet, recordObj);
              sheetAdded++;
            }
          }

          totalAdded += sheetAdded;
          totalUpdated += sheetUpdated;
          importedCounts[sheet] = sheetAdded + sheetUpdated;
        }
      }

      await logAuditEvent(store, 'IMPORT', 'System', 'ALL', {
        added: totalAdded,
        updated: totalUpdated,
      });

      return {
        success: true,
        message: 'Data imported successfully.',
        added: totalAdded,
        updated: totalUpdated,
        total: totalAdded + totalUpdated,
        importedCounts,
      };
    }

    case 'search.global': {
      const q = stringValue(params.q || body.q).toLowerCase();
      if (!q) {
        return {
          query: '',
          totalMatches: 0,
          results: { tasks: [], exams: [], topics: [], sessions: [], plans: [], logs: [], arcs: [], goals: [], milestones: [] },
        };
      }
      const tasks = (await store.readRecords('Tasks'))
        .filter((t) => stringValue(t.title).toLowerCase().includes(q) || stringValue(t.notes).toLowerCase().includes(q))
        .slice(0, 10);
      const exams = (await store.readRecords('Exams'))
        .filter((e) => stringValue(e.name).toLowerCase().includes(q) || stringValue(e.subject).toLowerCase().includes(q))
        .slice(0, 10);
      const topics = (await store.readRecords('ExamTopics'))
        .filter((tp) => stringValue(tp.name).toLowerCase().includes(q))
        .slice(0, 10);
      const sessions = (await store.readRecords('StudySessions'))
        .filter((s) => stringValue(s.subject).toLowerCase().includes(q) || stringValue(s.notes).toLowerCase().includes(q))
        .slice(0, 10);
      const plans = (await store.readRecords('StudyPlans'))
        .filter((p) => stringValue(p.notes).toLowerCase().includes(q))
        .slice(0, 10);
      const logs = (await store.readRecords('DailyLogs'))
        .filter(
          (l) =>
            stringValue(l.notes).toLowerCase().includes(q) ||
            stringValue(l.wentWell).toLowerCase().includes(q) ||
            stringValue(l.difficulties).toLowerCase().includes(q)
        )
        .slice(0, 10);
      const arcs = (await store.readRecords('Arcs'))
        .filter((a) => stringValue(a.name).toLowerCase().includes(q) || stringValue(a.description).toLowerCase().includes(q))
        .slice(0, 10);
      const goals = (await store.readRecords('ArcGoals'))
        .filter((g) => stringValue(g.title).toLowerCase().includes(q))
        .slice(0, 10);
      const milestones = (await store.readRecords('ArcMilestones'))
        .filter((m) => stringValue(m.title).toLowerCase().includes(q))
        .slice(0, 10);

      const totalMatches =
        tasks.length + exams.length + topics.length + sessions.length + plans.length + logs.length + arcs.length + goals.length + milestones.length;

      return {
        query: q,
        totalMatches,
        results: { tasks, exams, topics, sessions, plans, logs, arcs, goals, milestones },
      };
    }

    default:
      throw new Error(`Unknown data action: "${action}".`);
  }
}
