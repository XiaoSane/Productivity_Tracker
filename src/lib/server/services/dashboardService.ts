import type { SheetStore } from '../types';
import { stringValue, numValue, formatDate } from '../utils';

export async function handleDashboardAction(
  store: SheetStore
): Promise<unknown> {
  const today = formatDate();
  const tasks = (await store.readRecords('Tasks')).filter((t) => stringValue(t.date) === today);
  const exams = (await store.readRecords('Exams')).filter(
    (e) => stringValue(e.examDate) >= today && stringValue(e.status).toLowerCase() !== 'cancelled'
  );
  const dailyLog = (await store.readRecords('DailyLogs')).find((l) => stringValue(l.date) === today) || null;
  const plans = (await store.readRecords('StudyPlans')).filter((p) => stringValue(p.date) === today);
  const sessions = (await store.readRecords('StudySessions')).filter((s) => stringValue(s.date) === today);
  const arcs = (await store.readRecords('Arcs')).filter((a) => stringValue(a.status).toLowerCase() === 'active');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'completed').length;
  const pendingTasks = tasks.filter((t) => stringValue(t.status).toLowerCase() === 'pending').length;

  // Calculate planned study hours from plans
  let plannedStudyHours = 0;
  for (const p of plans) {
    plannedStudyHours += numValue(p.plannedHours, 0);
  }

  // Calculate completed study hours from daily log or study sessions
  let completedStudyHours = dailyLog ? numValue(dailyLog.studyHours, 0) : 0;
  if (!completedStudyHours && sessions.length > 0) {
    let totalMinutes = 0;
    for (const s of sessions) {
      totalMinutes += numValue(s.durationMinutes, 0);
    }
    completedStudyHours = Math.round((totalMinutes / 60) * 10) / 10;
  }

  const profileRecords = await store.readRecords('Profile');
  const candidateName = (profileRecords.find((p) => p.key === 'candidateName')?.value as string) || '';

  const nextExam = exams.length > 0 ? exams[0] : null;

  // Active arc detail
  let activeArcDetail = null;
  if (arcs.length > 0) {
    const primaryArc = arcs[0];
    const allGoals = await store.readRecords('ArcGoals');
    const arcGoals = allGoals.filter((g) => stringValue(g.arcId) === stringValue(primaryArc.id));
    const allMilestones = await store.readRecords('ArcMilestones');
    const arcMilestones = allMilestones.filter((m) => stringValue(m.arcId) === stringValue(primaryArc.id));

    let overallProgress = 0;
    if (arcGoals.length > 0) {
      const totalGoalProg = arcGoals.reduce((sum, g) => {
        const target = numValue(g.targetValue, 1);
        const current = numValue(g.currentValue, 0);
        return sum + Math.min(100, Math.round((current / target) * 100));
      }, 0);
      overallProgress = Math.round(totalGoalProg / arcGoals.length);
    }

    activeArcDetail = {
      arc: primaryArc,
      goals: arcGoals,
      milestones: arcMilestones,
      metrics: {
        overallProgress,
        goalsCount: arcGoals.length,
        completedGoalsCount: arcGoals.filter((g) => stringValue(g.status).toLowerCase() === 'completed').length,
        milestonesCount: arcMilestones.length,
        completedMilestonesCount: arcMilestones.filter((m) => stringValue(m.status).toLowerCase() === 'completed').length,
      },
    };
  }

  return {
    date: today,
    today,
    candidateName,
    tasks: { count: totalTasks, tasks },
    exams: { count: exams.length, exams },
    nextExam,
    dailyLog,
    studyPlans: plans,
    studySessions: sessions,
    activeArcs: arcs,
    activeArc: activeArcDetail,
    studyTarget: {
      plannedHours: plannedStudyHours,
      completedHours: completedStudyHours,
      sessionsCount: sessions.length,
    },
    analytics: {
      totalTasks,
      completedTasks,
      pendingTasks,
      cancelledTasks: 0,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalStudyHours: completedStudyHours,
      totalFocusHours: dailyLog ? numValue(dailyLog.focusHours) : 0,
      upcomingExamsCount: exams.length,
    },
  };
}
