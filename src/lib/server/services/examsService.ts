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
  EXAM_ALLOWED_UPDATE_FIELDS,
  EXAM_TOPIC_ALLOWED_UPDATE_FIELDS,
  EXAM_STATUSES,
  TOPIC_STATUSES,
  TOPIC_PRIORITIES,
} from '../validation';

export async function handleExamsAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'exams.list': {
      const allExams = await store.readRecords('Exams');
      let exams = [...allExams];
      const upcoming = stringValue(params.upcoming) === 'true';
      const status = stringValue(params.status).toLowerCase();
      const subject = stringValue(params.subject).toLowerCase();
      const today = formatDate();

      if (upcoming) {
        exams = exams.filter(
          (e) => stringValue(e.examDate) >= today && stringValue(e.status).toLowerCase() !== 'cancelled'
        );
      }
      if (status && status !== 'all') {
        exams = exams.filter((e) => stringValue(e.status).toLowerCase() === status);
      }
      if (subject && subject !== 'all') {
        exams = exams.filter((e) => stringValue(e.subject).toLowerCase() === subject);
      }
      exams.sort((a, b) => stringValue(a.examDate).localeCompare(stringValue(b.examDate)));
      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = exams.slice(offset, offset + limit);

      return { count: exams.length, exams: paginated };
    }

    case 'exams.get': {
      const id = stringValue(params.id || body.id);
      const exams = await store.readRecords('Exams');
      const found = exams.find((e) => String(e.id) === id);
      if (!found) throw new Error(`Exam with ID "${id}" not found.`);
      return found;
    }

    case 'exams.create': {
      const name = clampStr(body.name, 200);
      if (!name) throw new Error('Exam name is required.');
      const newExam = {
        id: generateId('EXAM'),
        name,
        subject: clampStr(body.subject, 200),
        examDate: stringValue(body.examDate) || formatDate(),
        deadline: clampStr(body.deadline, 20),
        startTime: clampStr(body.startTime, 20),
        endTime: clampStr(body.endTime, 20),
        venue: clampStr(body.venue, 200),
        syllabus: clampStr(body.syllabus, 5000),
        status: validateEnum(body.status, EXAM_STATUSES, 'planned'),
        notes: clampStr(body.notes, 2000),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('Exams', newExam);
      await logAuditEvent(store, 'CREATE', 'Exams', newExam.id, { name: newExam.name });
      return newExam;
    }

    case 'exams.update': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Exam ID is required.');

      const allowed = filterFields(body, EXAM_ALLOWED_UPDATE_FIELDS);
      const updates: Record<string, unknown> = {};

      if (allowed.name !== undefined) {
        const name = clampStr(allowed.name, 200);
        if (!name) throw new Error('Exam name cannot be empty.');
        updates.name = name;
      }
      if (allowed.subject !== undefined) updates.subject = clampStr(allowed.subject, 200);
      if (allowed.examDate !== undefined) updates.examDate = clampStr(allowed.examDate, 20);
      if (allowed.deadline !== undefined) updates.deadline = clampStr(allowed.deadline, 20);
      if (allowed.startTime !== undefined) updates.startTime = clampStr(allowed.startTime, 20);
      if (allowed.endTime !== undefined) updates.endTime = clampStr(allowed.endTime, 20);
      if (allowed.venue !== undefined) updates.venue = clampStr(allowed.venue, 200);
      if (allowed.syllabus !== undefined) updates.syllabus = clampStr(allowed.syllabus, 5000);
      if (allowed.status !== undefined) updates.status = validateEnum(allowed.status, EXAM_STATUSES, 'planned');
      if (allowed.notes !== undefined) updates.notes = clampStr(allowed.notes, 2000);

      const updated = await store.updateRecord('Exams', id, updates);
      await logAuditEvent(store, 'UPDATE', 'Exams', id, updates);
      return updated;
    }

    case 'exams.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Exam ID is required.');
      const success = await store.deleteRecord('Exams', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'Exams', id);
      }
      return { id, deleted: success, success };
    }

    case 'exams.status': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Exam ID is required.');
      const status = validateEnum(body.status || params.status, EXAM_STATUSES, 'planned');
      const updated = await store.updateRecord('Exams', id, { status });
      await logAuditEvent(store, 'STATUS_CHANGE', 'Exams', id, { status });
      return updated;
    }

    case 'examTopics.list': {
      const examId = stringValue(params.examId || body.examId);
      let topics = await store.readRecords('ExamTopics');
      if (examId) {
        topics = topics.filter((t) => String(t.examId) === examId);
      }
      const limit = Math.min(Math.max(numValue(params.limit, 500), 1), 500);
      const page = Math.max(numValue(params.page, 1), 1);
      const offset = (page - 1) * limit;
      const paginated = topics.slice(offset, offset + limit);

      return { count: topics.length, topics: paginated };
    }

    case 'examTopics.get': {
      const id = stringValue(params.id || body.id);
      const topics = await store.readRecords('ExamTopics');
      const found = topics.find((t) => String(t.id) === id);
      if (!found) throw new Error(`Topic with ID "${id}" not found.`);
      return found;
    }

    case 'examTopics.create': {
      const name = clampStr(body.name, 200);
      if (!name) throw new Error('Topic name is required.');
      const examId = stringValue(body.examId);
      if (!examId) throw new Error('examId is required.');

      const exams = await store.readRecords('Exams');
      if (!exams.some((e) => String(e.id) === examId)) {
        throw new Error(`Referenced Exam "${examId}" not found.`);
      }

      const newTopic = {
        id: generateId('TOPIC'),
        examId,
        name,
        description: clampStr(body.description, 2000),
        status: validateEnum(body.status, TOPIC_STATUSES, 'pending'),
        priority: validateEnum(body.priority, TOPIC_PRIORITIES, 'normal'),
        estimatedHours: Math.max(0, Math.min(1000, numValue(body.estimatedHours, 0))),
        completedAt: body.status === 'completed' ? nowIso() : '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await store.appendRecord('ExamTopics', newTopic);
      await logAuditEvent(store, 'CREATE', 'ExamTopics', newTopic.id, { name: newTopic.name, examId });
      return newTopic;
    }

    case 'examTopics.update': {
      const id = stringValue(body.id);
      if (!id) throw new Error('Topic ID is required for update.');

      const allowed = filterFields(body, EXAM_TOPIC_ALLOWED_UPDATE_FIELDS);
      const updates: Record<string, unknown> = {};

      if (allowed.name !== undefined) {
        const name = clampStr(allowed.name, 200);
        if (!name) throw new Error('Topic name cannot be empty.');
        updates.name = name;
      }
      if (allowed.description !== undefined) updates.description = clampStr(allowed.description, 2000);
      if (allowed.status !== undefined) {
        updates.status = validateEnum(allowed.status, TOPIC_STATUSES, 'pending');
        if (updates.status === 'completed' && !allowed.completedAt) {
          updates.completedAt = nowIso();
        } else if (updates.status !== 'completed') {
          updates.completedAt = '';
        }
      }
      if (allowed.priority !== undefined) updates.priority = validateEnum(allowed.priority, TOPIC_PRIORITIES, 'normal');
      if (allowed.estimatedHours !== undefined) updates.estimatedHours = Math.max(0, Math.min(1000, numValue(allowed.estimatedHours, 0)));
      if (allowed.completedAt !== undefined) updates.completedAt = allowed.completedAt;

      const updated = await store.updateRecord('ExamTopics', id, updates);
      await logAuditEvent(store, 'UPDATE', 'ExamTopics', id, updates);
      return updated;
    }

    case 'examTopics.delete': {
      const id = stringValue(body.id || params.id);
      if (!id) throw new Error('Topic ID is required.');
      const success = await store.deleteRecord('ExamTopics', id);
      if (success) {
        await logAuditEvent(store, 'DELETE', 'ExamTopics', id);
      }
      return { id, deleted: success, success };
    }

    case 'examTopics.progress': {
      const examId = stringValue(params.examId || body.examId);
      const topics = (await store.readRecords('ExamTopics')).filter(
        (t) => String(t.examId) === examId
      );
      const total = topics.length;
      const completed = topics.filter((t) => t.status === 'completed').length;
      const inProgress = topics.filter((t) => t.status === 'in_progress').length;
      const notStartedTopics = topics.filter((t) => !t.status || t.status === 'pending' || t.status === 'not_started').length;
      const totalEstimatedHours = topics.reduce((s, t) => s + numValue(t.estimatedHours), 0);
      const completedEstimatedHours = topics
        .filter((t) => t.status === 'completed')
        .reduce((s, t) => s + numValue(t.estimatedHours), 0);
      const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        examId,
        totalTopics: total,
        completedTopics: completed,
        inProgressTopics: inProgress,
        notStartedTopics,
        progressPercentage,
        completionPercentage: progressPercentage,
        totalEstimatedHours,
        completedEstimatedHours,
      };
    }

    default:
      throw new Error(`Unknown exams action: "${action}".`);
  }
}
