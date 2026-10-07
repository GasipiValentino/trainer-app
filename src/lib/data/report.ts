import "server-only";
import { getSummary, getStudentProfile } from "@/lib/data/students";
import { getExerciseSeries, getMeasurements, getNotes, getPhotos, getWeeklyStats } from "@/lib/data/student-detail";
import { getWorkoutState } from "@/lib/data/student-home";
import { getMyCoach } from "@/lib/data/coach";
import { adherence, mainLift, topLifts, weekStreak } from "@/lib/domain/metrics";
import { plannedCompliance, rangeFrom, weeklySessions, type ProgressRange } from "@/lib/domain/progress";
import { badges } from "@/lib/domain/student-plan";
import { diffDays, localDateKey, mondayOf } from "@/lib/dates";

/**
 * Datos del reporte de progreso. Mismo origen que las pantallas (RLS:
 * profesor → sus alumnos; alumno → él mismo). `includePrivateNotes` solo
 * para la vista del profesor.
 */
export async function getReportData(studentId: string, range: ProgressRange, includePrivateNotes: boolean) {
  const today = localDateKey();
  const from = rangeFrom(range, today);
  const [summary, profile, measurements, photos, weekly, state, coach, notes] = await Promise.all([
    getSummary(studentId),
    getStudentProfile(studentId),
    getMeasurements(studentId),
    getPhotos(studentId),
    getWeeklyStats(studentId, from),
    getWorkoutState(studentId),
    getMyCoach(studentId),
    includePrivateNotes ? getNotes(studentId) : Promise.resolve([]),
  ]);
  if (!summary || !profile) return null;

  const lift = mainLift(summary);
  const liftSeries = lift ? await getExerciseSeries(studentId, lift.exerciseId, from) : [];

  const joinedMonday = mondayOf(localDateKey(summary.createdAt));
  const sessions = weeklySessions(weekly, from > joinedMonday ? from : joinedMonday, today);
  const compliance = plannedCompliance(summary, sessions);
  const inRange = measurements.filter((m) => m.date >= from);
  const records = summary.lifts.filter((l) => l.best > l.first).sort((a, b) => b.bestAt.localeCompare(a.bestAt));
  const since = localDateKey(summary.createdAt);

  return {
    generatedOn: today,
    from,
    range,
    summary,
    profile,
    coach,
    lift,
    liftSeries,
    weights: inRange.filter((m) => m.weight != null).map((m) => ({ d: m.date, v: Number(m.weight) })),
    measurements: inRange,
    allMeasurements: measurements,
    sessions,
    compliance,
    workoutsInRange: weekly.reduce((a, w) => a + w.sessions, 0),
    totalWorkouts: state.total,
    adherence4w: adherence(summary, 4, today),
    streak: weekStreak(summary, today),
    prs: topLifts(summary, 5),
    badges: badges({
      recordName: records[0]?.name ?? null,
      streak: weekStreak(summary, today),
      totalWorkouts: state.total,
      weeksSinceStart: Math.floor(diffDays(since, today) / 7),
      firstMonthAdherence: null,
    }),
    lastCheckin: summary.lastCheckin,
    photos: photos.filter((p) => p.urls.front || p.urls.side || p.urls.back),
    notes,
  };
}

export type ReportData = NonNullable<Awaited<ReturnType<typeof getReportData>>>;
