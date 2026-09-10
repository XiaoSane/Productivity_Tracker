import type { SheetStore } from '../types';
import type { ExamStatus, DailyTrendItem } from '@/types';
import {
  stringValue,
  numValue,
  formatDate,
  extractKeywords,
} from '../utils';

export async function handleAnalyticsAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {}
): Promise<unknown> {
  switch (action) {
    case 'analytics.summary': {
      const today = formatDate();
      const startDate = stringValue(params.startDate) || today;
      const endDate = stringValue(params.endDate) || today;

      const tasks = (await store.readRecords('Tasks')).filter((t) => {
        const d = stringValue(t.date);
        return d >= startDate && d <= endDate;
      });

      const exams = await store.readRecords('Exams');
      const dailyLogs = (await store.readRecords('DailyLogs')).filter((l) => {
        const d = stringValue(l.date);
        return d >= startDate && d <= endDate;
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
      const pendingTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'pending').length;
      const cancelledTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'cancelled').length;
      const totalStudyHours = dailyLogs.reduce((s, l) => s + numValue(l.studyHours), 0);
      const totalFocusHours = dailyLogs.reduce((s, l) => s + numValue(l.focusHours), 0);
      const upcomingExams = exams.filter(
        (e) => stringValue(e.examDate) >= today && stringValue(e.status).toLowerCase() !== 'cancelled'
      );
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        period: {
          startDate,
          endDate,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          cancelled: cancelledTasks,
          completionPercentage,
        },
        study: {
          studyHours: Math.round(totalStudyHours * 100) / 100,
          focusHours: Math.round(totalFocusHours * 100) / 100,
        },
        exams: {
          upcoming: upcomingExams.length,
        },
        dailyLogs: {
          recordedDays: dailyLogs.length,
        },
        totalTasks,
        completedTasks,
        pendingTasks,
        cancelledTasks,
        completionPercentage,
        totalStudyHours: Math.round(totalStudyHours * 100) / 100,
        totalFocusHours: Math.round(totalFocusHours * 100) / 100,
        upcomingExamsCount: upcomingExams.length,
      };
    }

    case 'analytics.productivity': {
      const today = formatDate();
      const startDate = stringValue(params.startDate) || today;
      const endDate = stringValue(params.endDate) || today;
      const allTasks = await store.readRecords('Tasks');
      const tasks = allTasks.filter((t) => {
        const d = stringValue(t.date);
        return (!params.startDate || d >= startDate) && (!params.endDate || d <= endDate);
      });
      const dailyLogs = await store.readRecords('DailyLogs');
      const byCategory: Record<string, { total: number; completed: number; completionPercentage: number }> = {};
      const byPriority: Record<string, { total: number; completed: number; completionPercentage: number }> = {};

      tasks.forEach((t) => {
        const cat = stringValue(t.category) || 'other';
        const pri = stringValue(t.priority) || 'medium';
        const isComp = stringValue(t.status).toLowerCase() === 'completed';

        if (!byCategory[cat]) byCategory[cat] = { total: 0, completed: 0, completionPercentage: 0 };
        byCategory[cat].total++;
        if (isComp) byCategory[cat].completed++;

        if (!byPriority[pri]) byPriority[pri] = { total: 0, completed: 0, completionPercentage: 0 };
        byPriority[pri].total++;
        if (isComp) byPriority[pri].completed++;
      });

      Object.keys(byCategory).forEach((cat) => {
        const item = byCategory[cat];
        item.completionPercentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      });
      Object.keys(byPriority).forEach((pri) => {
        const item = byPriority[pri];
        item.completionPercentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      });

      const totalSleep = dailyLogs.reduce((s, l) => s + numValue(l.sleepHours), 0);
      const totalFocus = dailyLogs.reduce((s, l) => s + numValue(l.focusHours), 0);
      const totalStudy = dailyLogs.reduce((s, l) => s + numValue(l.studyHours), 0);

      return {
        startDate,
        endDate,
        byCategory,
        byPriority,
        averageSleepHours: dailyLogs.length > 0 ? Number((totalSleep / dailyLogs.length).toFixed(1)) : 0,
        averageFocusHours: dailyLogs.length > 0 ? Number((totalFocus / dailyLogs.length).toFixed(1)) : 0,
        averageStudyHours: dailyLogs.length > 0 ? Number((totalStudy / dailyLogs.length).toFixed(1)) : 0,
      };
    }

    case 'analytics.exams': {
      const exams = await store.readRecords('Exams');
      const topics = await store.readRecords('ExamTopics');
      const sessions = await store.readRecords('StudySessions');
      const todayStr = formatDate();
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const upcoming = exams.filter(
        (e) => stringValue(e.examDate) >= todayStr && stringValue(e.status).toLowerCase() !== 'cancelled'
      );
      const completed = exams.filter(
        (e) => stringValue(e.status).toLowerCase() === 'completed' || stringValue(e.examDate) < todayStr
      );

      const examItems = exams.map((exam) => {
        let daysUntilExam: number | undefined = undefined;
        let daysUntilDeadline: number | null = null;
        let deadlinePassed = false;

        if (exam.examDate) {
          const parts = String(exam.examDate).split('-');
          if (parts.length === 3) {
            const ed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            daysUntilExam = Math.ceil((ed.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        if (exam.deadline) {
          const parts = String(exam.deadline).split('-');
          if (parts.length === 3) {
            const dl = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            daysUntilDeadline = Math.ceil((dl.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
            deadlinePassed = dl < startOfToday;
          }
        }

        return {
          id: String(exam.id || ''),
          name: String(exam.name || ''),
          subject: String(exam.subject || ''),
          examDate: String(exam.examDate || ''),
          deadline: exam.deadline ? String(exam.deadline) : undefined,
          status: exam.status as ExamStatus,
          daysUntilExam,
          daysUntilDeadline,
          deadlinePassed,
        };
      });

      examItems.sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)));

      return {
        count: examItems.length,
        exams: examItems,
        totalExams: exams.length,
        upcomingExams: upcoming.length,
        completedExams: completed.length,
        totalTopics: topics.length,
        completedTopics: topics.filter((t) => t.status === 'completed').length,
        totalStudyHours: Number((sessions.reduce((s, ses) => s + numValue(ses.durationMinutes), 0) / 60).toFixed(1)),
      };
    }

    case 'analytics.trends': {
      const rawRange = stringValue(params.range || body.range || '7D').toUpperCase();
      let numDays = 7;
      if (rawRange === '30D' || rawRange === '30') numDays = 30;
      else if (rawRange === '90D' || rawRange === '90') numDays = 90;
      const effectiveRange: '7D' | '30D' | '90D' = numDays === 90 ? '90D' : numDays === 30 ? '30D' : '7D';

      const today = new Date();
      const endDateStr = formatDate(today);
      const startObj = new Date(today.getTime());
      startObj.setDate(startObj.getDate() - (numDays - 1));
      const startDateStr = formatDate(startObj);

      const allTasks = await store.readRecords('Tasks');
      const tasks = allTasks.filter((t) => {
        const d = stringValue(t.date);
        return d >= startDateStr && d <= endDateStr;
      });

      const allLogs = await store.readRecords('DailyLogs');
      const dailyLogs = allLogs.filter((l) => {
        const d = stringValue(l.date);
        return d >= startDateStr && d <= endDateStr;
      });

      const logsByDate: Record<string, Record<string, unknown>> = {};
      dailyLogs.forEach((l) => {
        logsByDate[stringValue(l.date)] = l;
      });

      const tasksByDate: Record<string, { total: number; completed: number }> = {};
      tasks.forEach((t) => {
        const d = stringValue(t.date);
        if (!tasksByDate[d]) tasksByDate[d] = { total: 0, completed: 0 };
        tasksByDate[d].total++;
        if (stringValue(t.status).toLowerCase() === 'completed') {
          tasksByDate[d].completed++;
        }
      });

      const dailyTrends: DailyTrendItem[] = [];
      const curr = new Date(startObj.getTime());

      let totalTasks = 0;
      let totalCompleted = 0;
      let totalStudyHours = 0;
      let totalFocusHours = 0;
      let totalSleepHours = 0;
      let daysWithSleep = 0;

      for (let i = 0; i < numDays; i++) {
        const dStr = formatDate(curr);
        const tData = tasksByDate[dStr] || { total: 0, completed: 0 };
        const lData = logsByDate[dStr] || {};

        const study = numValue(lData.studyHours);
        const focus = numValue(lData.focusHours);
        const sleep = numValue(lData.sleepHours);

        totalTasks += tData.total;
        totalCompleted += tData.completed;
        totalStudyHours += study;
        totalFocusHours += focus;

        if (sleep > 0) {
          totalSleepHours += sleep;
          daysWithSleep++;
        }

        const rate = tData.total > 0 ? Math.round((tData.completed / tData.total) * 100) : 0;

        dailyTrends.push({
          date: dStr,
          tasksTotal: tData.total,
          tasksCompleted: tData.completed,
          completionRate: rate,
          studyHours: study,
          focusHours: focus,
          sleepHours: sleep,
          mood: lData.mood ? String(lData.mood) : '',
          energy: lData.energy ? String(lData.energy) : '',
        });

        curr.setDate(curr.getDate() + 1);
      }

      const categoryDistribution: Record<string, number> = {};
      tasks.forEach((t) => {
        const cat = stringValue(t.category) || 'other';
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      });

      const priorityDistribution: Record<string, number> = {};
      tasks.forEach((t) => {
        const p = stringValue(t.priority) || 'medium';
        priorityDistribution[p] = (priorityDistribution[p] || 0) + 1;
      });

      return {
        range: effectiveRange,
        numDays,
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
        summary: {
          totalTasks,
          totalCompleted,
          completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
          totalStudyHours: Math.round(totalStudyHours * 10) / 10,
          avgDailyStudyHours: Math.round((totalStudyHours / numDays) * 10) / 10,
          totalFocusHours: Math.round(totalFocusHours * 10) / 10,
          avgDailyFocusHours: Math.round((totalFocusHours / numDays) * 10) / 10,
          avgSleepHours: daysWithSleep > 0 ? Math.round((totalSleepHours / daysWithSleep) * 10) / 10 : 0,
        },
        categoryDistribution,
        priorityDistribution,
        dailyTrends,
        points: dailyTrends,
      };
    }

    case 'analytics.reflections': {
      const rangeStr = stringValue(params.range || body.range || '7D');
      const numDays = rangeStr.startsWith('90') ? 90 : rangeStr.startsWith('30') ? 30 : 7;
      const cutoff = formatDate(new Date(Date.now() - numDays * 24 * 3600 * 1000));
      const logs = (await store.readRecords('DailyLogs')).filter((l) => stringValue(l.date) >= cutoff);
      const texts: string[] = [];
      const wentWellList: string[] = [];
      const diffList: string[] = [];
      const notesList: string[] = [];

      logs.forEach((l) => {
        if (l.wentWell) {
          texts.push(String(l.wentWell));
          wentWellList.push(String(l.wentWell));
        }
        if (l.difficulties) {
          texts.push(String(l.difficulties));
          diffList.push(String(l.difficulties));
        }
        if (l.learnings) texts.push(String(l.learnings));
        if (l.notes) {
          texts.push(String(l.notes));
          notesList.push(String(l.notes));
        }
      });

      const keywords = extractKeywords(texts, 1);

      const posCounts: Record<string, number> = {};
      wentWellList.forEach((w) => {
        const trimmed = w.trim();
        if (trimmed) posCounts[trimmed] = (posCounts[trimmed] || 0) + 1;
      });

      const diffCounts: Record<string, number> = {};
      diffList.forEach((d) => {
        const trimmed = d.trim();
        if (trimmed) diffCounts[trimmed] = (diffCounts[trimmed] || 0) + 1;
      });

      return {
        range: rangeStr,
        numDays,
        reflectionsRecorded: logs.length,
        totalDays: numDays,
        frequentlyMentioned: keywords.map((k) => ({ word: k.word, count: k.count })),
        positiveObservations: Object.entries(posCounts).slice(0, 5).map(([observation, count]) => ({ observation, count })),
        recurringDifficulties: Object.entries(diffCounts).slice(0, 5).map(([difficulty, count]) => ({ difficulty, count })),
        notes: notesList.length > 0 ? notesList : ['Not enough reflection data to identify recurring observations.'],
        totalReflections: logs.length,
        keywords,
      };
    }

    default:
      throw new Error(`Unknown analytics action: "${action}".`);
  }
}
