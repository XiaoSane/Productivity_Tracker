import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SheetStore } from '../types';
import { ALL_SHEET_NAMES, formatDate, nowIso } from '../utils';

const DEV_DB_PATH = path.join(process.cwd(), '.dev-database.json');

export function getInitialDevData(): Record<string, Record<string, unknown>[]> {
  const today = formatDate();
  return {
    Tasks: [
      {
        id: 'TASK_SAMPLE_1',
        title: 'Review Physics chapter formulas',
        description: 'Focus on electromagnetism and optics equations',
        date: today,
        startTime: '09:00',
        endTime: '10:30',
        category: 'study',
        priority: 'high',
        status: 'completed',
        completedAt: nowIso(),
        notes: 'Good focus session in the morning',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        parentTaskId: '',
        taskType: 'standard',
        arcId: '',
        arcGoalId: '',
      },
      {
        id: 'TASK_SAMPLE_2',
        title: 'Practice 20 Calculus problems',
        description: 'Integration by parts and series convergence',
        date: today,
        startTime: '14:00',
        endTime: '15:30',
        category: 'study',
        priority: 'medium',
        status: 'pending',
        completedAt: '',
        notes: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        parentTaskId: '',
        taskType: 'standard',
        arcId: '',
        arcGoalId: '',
      },
    ],
    Exams: [
      {
        id: 'EXAM_SAMPLE_1',
        name: 'Advanced Calculus Midterm',
        subject: 'Mathematics',
        examDate: formatDate(new Date(Date.now() + 14 * 24 * 3600 * 1000)),
        deadline: formatDate(new Date(Date.now() + 13 * 24 * 3600 * 1000)),
        startTime: '10:00',
        endTime: '12:00',
        venue: 'Hall B',
        syllabus: 'Chapters 1 through 6',
        status: 'upcoming',
        notes: 'Formula sheet allowed',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    DailyLogs: [
      {
        id: `LOG_${today}`,
        date: today,
        sleepHours: 7.5,
        wakeTime: '06:30',
        focusHours: 4.5,
        studyHours: 4.0,
        exercise: true,
        mood: 4,
        energy: 4,
        notes: 'Productive morning, cleared hard physics formulas.',
        wentWell: 'Completed calculus review ahead of schedule',
        difficulties: 'Slight fatigue in the afternoon',
        learnings: 'Taking 5 min breaks every 45 mins sustained focus much better',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    Profile: [
      { key: 'candidateName', value: 'Prem Patil', updatedAt: nowIso() },
      { key: 'initializedAt', value: nowIso(), updatedAt: nowIso() },
    ],
    ExamTopics: [
      {
        id: 'TOPIC_SAMPLE_1',
        examId: 'EXAM_SAMPLE_1',
        name: 'Taylor & Maclaurin Series',
        description: 'Convergence tests and remainder formulas',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 6,
        completedAt: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    StudyPlans: [],
    StudySessions: [
      {
        id: 'SESSION_SAMPLE_1',
        date: today,
        startTime: '09:00',
        endTime: '10:30',
        durationMinutes: 90,
        examId: 'EXAM_SAMPLE_1',
        topicId: 'TOPIC_SAMPLE_1',
        subject: 'Mathematics',
        sessionType: 'deep_work',
        focusRating: 4,
        notes: 'Taylor polynomials solved',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    AuditLog: [
      {
        id: 'AUDIT_INIT',
        timestamp: nowIso(),
        action: 'SETUP_SHEETS',
        entityType: 'SYSTEM',
        entityId: 'all',
        source: 'dev_mode',
        details: 'Dev database initialized with sample records',
      },
    ],
    Arcs: [
      {
        id: 'ARC_SAMPLE_1',
        name: 'Fall Exam Sprint',
        description: 'Comprehensive preparation for upcoming semester finals',
        type: 'exam_sprint',
        startDate: today,
        endDate: formatDate(new Date(Date.now() + 30 * 24 * 3600 * 1000)),
        status: 'active',
        icon: '🎯',
        linkedExamId: 'EXAM_SAMPLE_1',
        notes: 'Consistent daily 4-hour study target',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    ArcGoals: [
      {
        id: 'GOAL_SAMPLE_1',
        arcId: 'ARC_SAMPLE_1',
        title: 'Complete 100 Practice Problems',
        description: 'Calculus and Physics problem sets',
        metricType: 'count',
        targetValue: 100,
        currentValue: 35,
        unit: 'problems',
        frequency: 'weekly',
        startDate: today,
        endDate: formatDate(new Date(Date.now() + 30 * 24 * 3600 * 1000)),
        status: 'active',
        priority: 'high',
        linkedExamId: 'EXAM_SAMPLE_1',
        notes: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    ArcMilestones: [
      {
        id: 'MILESTONE_SAMPLE_1',
        arcId: 'ARC_SAMPLE_1',
        title: 'Complete Syllabus First Pass',
        description: 'All 6 chapters reviewed once',
        targetDate: formatDate(new Date(Date.now() + 10 * 24 * 3600 * 1000)),
        status: 'in_progress',
        completedAt: '',
        notes: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
  };
}

export class DevFileStore implements SheetStore {
  private readData(): Record<string, Record<string, unknown>[]> {
    try {
      if (!fs.existsSync(DEV_DB_PATH)) {
        const initial = getInitialDevData();
        fs.writeFileSync(DEV_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
        return initial;
      }
      const raw = fs.readFileSync(DEV_DB_PATH, 'utf8');
      return JSON.parse(raw);
    } catch {
      return getInitialDevData();
    }
  }

  private writeData(data: Record<string, Record<string, unknown>[]>): void {
    const tempPath = `${DEV_DB_PATH}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.renameSync(tempPath, DEV_DB_PATH);
    } catch {
      // Fallback if rename fails or file is locked on Windows
      fs.writeFileSync(DEV_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
  }

  async readRecords(sheetName: string): Promise<Record<string, unknown>[]> {
    const data = this.readData();
    return data[sheetName] ? [...data[sheetName]] : [];
  }

  async appendRecord(sheetName: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
    const data = this.readData();
    if (!data[sheetName]) data[sheetName] = [];
    const newRecord = { ...record };
    data[sheetName].push(newRecord);
    this.writeData(data);
    return newRecord;
  }

  async updateRecord(
    sheetName: string,
    id: string,
    updates: Record<string, unknown>,
    idKey = 'id'
  ): Promise<Record<string, unknown>> {
    const data = this.readData();
    if (!data[sheetName]) data[sheetName] = [];
    const list = data[sheetName];
    const index = list.findIndex((item) => String(item[idKey]) === String(id));
    if (index === -1) {
      throw new Error(`Record with ${idKey}="${id}" not found in sheet "${sheetName}".`);
    }
    const updated = { ...list[index], ...updates, updatedAt: nowIso() };
    list[index] = updated;
    this.writeData(data);
    return updated;
  }

  async deleteRecord(sheetName: string, id: string, idKey = 'id'): Promise<boolean> {
    const data = this.readData();
    if (!data[sheetName]) return false;
    const initialLen = data[sheetName].length;
    data[sheetName] = data[sheetName].filter((item) => String(item[idKey]) !== String(id));
    this.writeData(data);
    return data[sheetName].length < initialLen;
  }

  async batchAppendRecords(sheetName: string, records: Record<string, unknown>[]): Promise<void> {
    const data = this.readData();
    if (!data[sheetName]) data[sheetName] = [];
    data[sheetName].push(...records);
    this.writeData(data);
  }

  async initializeAllSheets(): Promise<{ created: string[]; existing: string[] }> {
    const data = this.readData();
    const created: string[] = [];
    const existing: string[] = [];
    ALL_SHEET_NAMES.forEach((name) => {
      if (!data[name]) {
        data[name] = [];
        created.push(name);
      } else {
        existing.push(name);
      }
    });
    this.writeData(data);
    return { created, existing };
  }
}
