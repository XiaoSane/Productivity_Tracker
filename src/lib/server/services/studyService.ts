import type { SheetStore } from '../types';
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
  STUDY_PLAN_ALLOWED_UPDATE_FIELDS,
  STUDY_SESSION_ALLOWED_UPDATE_FIELDS,
  STUDY_PLAN_STATUSES,
  STUDY_SESSION_TYPES,
} from '../validation';

export async function handleStudyAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'studyPlans.list': {
      const examId = stringValue(params.examId || body.examId);
      const date = stringValue(params.date || body.date);
      let plans = await store.readRecords('StudyPlans');
      if (examId) plans = plans.filter((p) => String(p.examId) === examId);
      if (date) plans = plans.filter((p) => String(p.date) === date);

      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = plans.slice(offset, offset + limit);

      return { count: plans.length, plans: paginated };
    }

    case 'studyPlans.get': {
      const id = stringValue(params.id || body.id);
      const plans = await store.readRecords('StudyPlans');
      const found = plans.find((p) => String(p.id) === id);
      if (!found) throw new Error(`StudyPlan with ID "${id}" not found.`);
      return found;
    }

    case 'studyPlans.create': {
      const date = stringValue(body.date) || formatDate();
      const examId = stringValue(body.examId);
      const topicId = stringValue(body.topicId);

      if (examId) {
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === examId)) {
          throw new Error(`Referenced Exam "${examId}" not found.`);
        }
      }
      if (topicId) {
        const topics = await store.readRecords('ExamTopics');
        if (!topics.some((tp) => String(tp.id) === topicId)) {
          throw new Error(`Referenced Exam Topic "${topicId}" not found.`);
        }
      }

      // If general daily study target (no exam or topic), update existing entry for this date
      if (!examId && !topicId) {
        const existingPlans = await store.readRecords('StudyPlans');
        const existing = existingPlans.find(
          (p) => stringValue(p.date) === date && !stringValue(p.examId) && !stringValue(p.topicId)
        );
        if (existing) {
          const updated = await store.updateRecord('StudyPlans', String(existing.id), {
            plannedHours: Math.max(0.1, Math.min(24, numValue(body.plannedHours, 1))),
            notes: body.notes !== undefined ? clampStr(body.notes, 2000) : stringValue(existing.notes),
            status: validateEnum(body.status, STUDY_PLAN_STATUSES, 'planned'),
            updatedAt: nowIso(),
          });
          await logAuditEvent(store, 'UPDATE', 'StudyPlans', String(existing.id), { date, plannedHours: body.plannedHours });
          return updated;
        }
      }

      const newPlan = {
        id: generateId('PLAN'),
        examId,
        topicId,
        date,
        plannedHours: Math.max(0.1, Math.min(24, numValue(body.plannedHours, 1))),
        notes: clampStr(body.notes, 2000),
        status: validateEnum(body.status, STUDY_PLAN_STATUSES, 'planned'),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('StudyPlans', newPlan);
      await logAuditEvent(store, 'CREATE', 'StudyPlans', newPlan.id, { date, plannedHours: newPlan.plannedHours });
      return newPlan;
    }

    case 'studyPlans.update': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Study plan ID is required for update.');

      const allowed = filterFields(body, STUDY_PLAN_ALLOWED_UPDATE_FIELDS);
      const updates: Record<string, unknown> = {};

      if (allowed.date !== undefined) updates.date = clampStr(allowed.date, 20);
      if (allowed.plannedHours !== undefined) updates.plannedHours = Math.max(0.1, Math.min(24, numValue(allowed.plannedHours, 1)));
      if (allowed.notes !== undefined) updates.notes = clampStr(allowed.notes, 2000);
      if (allowed.status !== undefined) updates.status = validateEnum(allowed.status, STUDY_PLAN_STATUSES, 'planned');

      const updated = await store.updateRecord('StudyPlans', id, updates);
      await logAuditEvent(store, 'UPDATE', 'StudyPlans', id, updates);
      return updated;
    }

    case 'studyPlans.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Study plan ID is required.');
      const success = await store.deleteRecord('StudyPlans', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'StudyPlans', id);
      }
      return { id, deleted: success, success };
    }

    case 'studySessions.list': {
      const examId = stringValue(params.examId || body.examId);
      const date = stringValue(params.date || body.date);
      let sessions = await store.readRecords('StudySessions');
      if (examId) sessions = sessions.filter((s) => String(s.examId) === examId);
      if (date) sessions = sessions.filter((s) => String(s.date) === date);
      sessions.sort((a, b) => stringValue(b.date).localeCompare(stringValue(a.date)));

      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = sessions.slice(offset, offset + limit);

      return { count: sessions.length, sessions: paginated };
    }

    case 'studySessions.get': {
      const id = stringValue(params.id || body.id);
      const sessions = await store.readRecords('StudySessions');
      const found = sessions.find((s) => String(s.id) === id);
      if (!found) throw new Error(`StudySession with ID "${id}" not found.`);
      return found;
    }

    case 'studySessions.create': {
      const examId = stringValue(body.examId);
      const topicId = stringValue(body.topicId);

      if (examId) {
        const exams = await store.readRecords('Exams');
        if (!exams.some((e) => String(e.id) === examId)) {
          throw new Error(`Referenced Exam "${examId}" not found.`);
        }
      }
      if (topicId) {
        const topics = await store.readRecords('ExamTopics');
        if (!topics.some((tp) => String(tp.id) === topicId)) {
          throw new Error(`Referenced Exam Topic "${topicId}" not found.`);
        }
      }

      const newSession = {
        id: generateId('SESSION'),
        date: stringValue(body.date) || formatDate(),
        startTime: clampStr(body.startTime, 20),
        endTime: clampStr(body.endTime, 20),
        durationMinutes: Math.max(1, Math.min(1440, numValue(body.durationMinutes, 60))),
        examId,
        topicId,
        subject: clampStr(body.subject, 200),
        sessionType: validateEnum(body.sessionType, STUDY_SESSION_TYPES, 'study'),
        focusRating: Math.max(1, Math.min(5, Math.round(numValue(body.focusRating, 3)))),
        notes: clampStr(body.notes, 2000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('StudySessions', newSession);
      await logAuditEvent(store, 'CREATE', 'StudySessions', newSession.id, {
        durationMinutes: newSession.durationMinutes,
        subject: newSession.subject,
      });
      return newSession;
    }

    case 'studySessions.update': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Study session ID is required for update.');

      const allowed = filterFields(body, STUDY_SESSION_ALLOWED_UPDATE_FIELDS);
      const updates: Record<string, unknown> = {};

      if (allowed.date !== undefined) updates.date = clampStr(allowed.date, 20);
      if (allowed.startTime !== undefined) updates.startTime = clampStr(allowed.startTime, 20);
      if (allowed.endTime !== undefined) updates.endTime = clampStr(allowed.endTime, 20);
      if (allowed.durationMinutes !== undefined) updates.durationMinutes = Math.max(1, Math.min(1440, numValue(allowed.durationMinutes, 60)));
      if (allowed.subject !== undefined) updates.subject = clampStr(allowed.subject, 200);
      if (allowed.sessionType !== undefined) updates.sessionType = validateEnum(allowed.sessionType, STUDY_SESSION_TYPES, 'study');
      if (allowed.focusRating !== undefined) updates.focusRating = Math.max(1, Math.min(5, Math.round(numValue(allowed.focusRating, 3))));
      if (allowed.notes !== undefined) updates.notes = clampStr(allowed.notes, 2000);

      if (allowed.examId !== undefined) {
        const examId = stringValue(allowed.examId);
        if (examId) {
          const exams = await store.readRecords('Exams');
          if (!exams.some((e) => String(e.id) === examId)) {
            throw new Error(`Referenced Exam "${examId}" not found.`);
          }
        }
        updates.examId = examId;
      }

      if (allowed.topicId !== undefined) {
        const topicId = stringValue(allowed.topicId);
        if (topicId) {
          const topics = await store.readRecords('ExamTopics');
          if (!topics.some((tp) => String(tp.id) === topicId)) {
            throw new Error(`Referenced Exam Topic "${topicId}" not found.`);
          }
        }
        updates.topicId = topicId;
      }

      const updated = await store.updateRecord('StudySessions', id, updates);
      await logAuditEvent(store, 'UPDATE', 'StudySessions', id, updates);
      return updated;
    }

    case 'studySessions.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Study session ID is required.');
      const success = await store.deleteRecord('StudySessions', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'StudySessions', id);
      }
      return { id, deleted: success, success };
    }

    default:
      throw new Error(`Unknown study action: "${action}".`);
  }
}
