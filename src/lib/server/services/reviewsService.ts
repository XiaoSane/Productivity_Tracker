import type { SheetStore } from '../types';
import type { DailyReflectionItem, ArcReviewHighlight, Arc } from '@/types';
import {
  stringValue,
  numValue,
  boolValue,
  formatDate,
  getDayName,
  extractKeywords,
} from '../utils';

export async function handleReviewsAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'reviews.week':
    case 'reviews.weekly': {
      let startDateStr = stringValue(params.weekStartDate || params.date || body.weekStartDate || body.date);
      if (!startDateStr) {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        startDateStr = formatDate(monday);
      }
      const startParts = startDateStr.split('-');
      const startDate = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
      const endDate = new Date(startDate.getTime() + 6 * 24 * 3600 * 1000);
      const endDateStr = formatDate(endDate);

      const logs = (await store.readRecords('DailyLogs')).filter((l) => {
        const d = stringValue(l.date);
        return d >= startDateStr && d <= endDateStr;
      });

      const tasks = (await store.readRecords('Tasks')).filter((t) => {
        const d = stringValue(t.date);
        return d >= startDateStr && d <= endDateStr;
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
      const totalFocusHours = logs.reduce((s, l) => s + numValue(l.focusHours), 0);
      const totalStudyHours = logs.reduce((s, l) => s + numValue(l.studyHours), 0);
      const totalSleepHours = logs.reduce((s, l) => s + numValue(l.sleepHours), 0);
      const avgSleep = logs.length > 0 ? Number((totalSleepHours / logs.length).toFixed(1)) : 0;
      const exerciseDays = logs.filter((l) => boolValue(l.exercise)).length;
      const daysWithReflections = logs.filter((l) => Boolean(l.wentWell || l.difficulties || l.learnings || l.notes)).length;

      const reflectionTexts: string[] = [];
      const descriptiveNotes: string[] = [];
      const reflections: DailyReflectionItem[] = [];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(startDate.getTime() + i * 24 * 3600 * 1000);
        const curStr = formatDate(cur);
        const log = logs.find((l) => stringValue(l.date) === curStr);
        const hasRef = Boolean(log && (log.wentWell || log.difficulties || log.learnings || log.notes));

        if (log) {
          if (log.wentWell) reflectionTexts.push(String(log.wentWell));
          if (log.difficulties) reflectionTexts.push(String(log.difficulties));
          if (log.learnings) reflectionTexts.push(String(log.learnings));
          if (log.notes) {
            reflectionTexts.push(String(log.notes));
            descriptiveNotes.push(String(log.notes));
          }
        }

        reflections.push({
          date: curStr,
          dayName: getDayName(curStr),
          sleepHours: log ? numValue(log.sleepHours) : null,
          studyHours: log ? numValue(log.studyHours) : null,
          focusHours: log ? numValue(log.focusHours) : null,
          exercise: (log?.exercise as string | null) || null,
          mood: (log?.mood as string | null) || null,
          energy: (log?.energy as string | null) || null,
          notes: (log?.notes as string | null) || null,
          wentWell: (log?.wentWell as string | null) || null,
          difficulties: (log?.difficulties as string | null) || null,
          learnings: (log?.learnings as string | null) || null,
          hasReflection: hasRef,
        });
      }

      return {
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
          weekLabel: `Week of ${startDateStr}`,
        },
        metrics: {
          studyHours: Math.round(totalStudyHours * 10) / 10,
          focusHours: Math.round(totalFocusHours * 10) / 10,
          tasksCompleted: completedTasks,
          tasksPlanned: totalTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          exerciseDays,
          avgSleep,
          daysWithReflections,
          totalDays: 7,
        },
        reflections,
        summary: {
          frequentKeywords: extractKeywords(reflectionTexts, 1),
          descriptiveNotes,
        },
        weekStartDate: startDateStr,
        weekEndDate: endDateStr,
      };
    }

    case 'reviews.month':
    case 'reviews.monthly': {
      const ym = stringValue(params.yearMonth || params.month || body.yearMonth || body.month) || formatDate().substring(0, 7);
      const [year, month] = ym.split('-').map(Number);
      const startDateStr = `${ym}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${ym}-${String(lastDay).padStart(2, '0')}`;

      const logs = (await store.readRecords('DailyLogs')).filter((l) => stringValue(l.date).startsWith(ym));
      const tasks = (await store.readRecords('Tasks')).filter((t) => stringValue(t.date).startsWith(ym));

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
      const totalFocusHours = logs.reduce((s, l) => s + numValue(l.focusHours), 0);
      const totalStudyHours = logs.reduce((s, l) => s + numValue(l.studyHours), 0);
      const totalSleepHours = logs.reduce((s, l) => s + numValue(l.sleepHours), 0);
      const avgSleep = logs.length > 0 ? Number((totalSleepHours / logs.length).toFixed(1)) : 0;
      const exerciseDays = logs.filter((l) => boolValue(l.exercise)).length;
      const daysWithReflections = logs.filter((l) => Boolean(l.wentWell || l.difficulties || l.learnings || l.notes)).length;

      const reflectionTexts: string[] = [];
      const reflections: DailyReflectionItem[] = logs.map((l) => {
        if (l.wentWell) reflectionTexts.push(String(l.wentWell));
        if (l.difficulties) reflectionTexts.push(String(l.difficulties));
        if (l.learnings) reflectionTexts.push(String(l.learnings));
        if (l.notes) reflectionTexts.push(String(l.notes));

        return {
          date: stringValue(l.date),
          dayName: getDayName(stringValue(l.date)),
          sleepHours: numValue(l.sleepHours),
          studyHours: numValue(l.studyHours),
          focusHours: numValue(l.focusHours),
          exercise: (l.exercise as string | null) || null,
          mood: (l.mood as string | null) || null,
          energy: (l.energy as string | null) || null,
          notes: (l.notes as string | null) || null,
          wentWell: (l.wentWell as string | null) || null,
          difficulties: (l.difficulties as string | null) || null,
          learnings: (l.learnings as string | null) || null,
          hasReflection: Boolean(l.wentWell || l.difficulties || l.learnings || l.notes),
        };
      });

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthLabel = `${monthNames[month - 1] || 'Month'} ${year}`;
      const keywords = extractKeywords(reflectionTexts, 1);

      return {
        period: {
          yearMonth: ym,
          monthLabel,
          startDate: startDateStr,
          endDate: endDateStr,
        },
        metrics: {
          studyHours: Math.round(totalStudyHours * 10) / 10,
          focusHours: Math.round(totalFocusHours * 10) / 10,
          tasksCompleted: completedTasks,
          tasksPlanned: totalTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          exerciseDays,
          avgSleep,
          daysWithReflections,
          totalDays: lastDay,
        },
        reflections,
        recurringThemes: keywords.map((k) => ({ word: k.word, count: k.count })),
        hasEnoughData: logs.length >= 3,
        yearMonth: ym,
      };
    }

    case 'reviews.arc': {
      const arcId = stringValue(params.arcId || params.id || body.arcId || body.id);
      const arcs = await store.readRecords('Arcs');
      const arc = arcs.find((a) => String(a.id) === arcId);
      if (!arc) throw new Error(`Arc with ID "${arcId}" not found.`);

      const today = formatDate();
      const startDate = stringValue(arc.startDate) || (arc.createdAt ? stringValue(arc.createdAt).substring(0, 10) : today);
      const endDate = stringValue(arc.endDate) || today;
      const logs = (await store.readRecords('DailyLogs')).filter((l) => {
        const d = stringValue(l.date);
        return d >= startDate && d <= endDate;
      });

      const tasks = (await store.readRecords('Tasks')).filter((t) => String(t.arcId) === arcId);
      const milestones = (await store.readRecords('ArcMilestones')).filter((m) => String(m.arcId) === arcId);

      const completedTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter((m) => stringValue(m.status).toLowerCase() === 'completed').length;
      const totalStudyHours = logs.reduce((s, l) => s + numValue(l.studyHours), 0);

      const reflections: DailyReflectionItem[] = logs.map((l) => ({
        date: stringValue(l.date),
        dayName: getDayName(stringValue(l.date)),
        sleepHours: numValue(l.sleepHours),
        studyHours: numValue(l.studyHours),
        focusHours: numValue(l.focusHours),
        exercise: (l.exercise as string | null) || null,
        mood: (l.mood as string | null) || null,
        energy: (l.energy as string | null) || null,
        notes: (l.notes as string | null) || null,
        wentWell: (l.wentWell as string | null) || null,
        difficulties: (l.difficulties as string | null) || null,
        learnings: (l.learnings as string | null) || null,
        hasReflection: Boolean(l.wentWell || l.difficulties || l.learnings || l.notes),
      }));

      let totalDays = 0;
      if (startDate && endDate) {
        const s = new Date(startDate).getTime();
        const e = new Date(endDate).getTime();
        totalDays = Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)));
      }

      const journeyHighlights: ArcReviewHighlight[] = [];
      if (logs.length > 0) {
        const first = logs[0];
        if (first.wentWell || first.learnings || first.notes) {
          journeyHighlights.push({
            phase: 'Beginning',
            date: stringValue(first.date),
            highlight: stringValue(first.wentWell || first.learnings || first.notes),
            field: first.wentWell ? 'wentWell' : 'notes',
          });
        }
        if (logs.length > 2) {
          const mid = logs[Math.floor(logs.length / 2)];
          if (mid.wentWell || mid.learnings || mid.notes) {
            journeyHighlights.push({
              phase: 'Middle',
              date: stringValue(mid.date),
              highlight: stringValue(mid.wentWell || mid.learnings || mid.notes),
              field: mid.wentWell ? 'wentWell' : 'notes',
            });
          }
        }
        if (logs.length > 1) {
          const last = logs[logs.length - 1];
          if (last.wentWell || last.learnings || last.notes) {
            journeyHighlights.push({
              phase: 'Later',
              date: stringValue(last.date),
              highlight: stringValue(last.wentWell || last.learnings || last.notes),
              field: last.wentWell ? 'wentWell' : 'notes',
            });
          }
        }
      }

      return {
        arc: arc as unknown as Arc,
        period: {
          startDate,
          endDate,
          totalDays,
        },
        stats: {
          totalStudyHours: Math.round(totalStudyHours * 10) / 10,
          tasksCompleted: completedTasks,
          milestonesCompleted: completedMilestones,
          totalMilestones,
          reflectionsCount: logs.length,
        },
        journeyHighlights,
        reflections,
      };
    }

    default:
      throw new Error(`Unknown reviews action: "${action}".`);
  }
}
