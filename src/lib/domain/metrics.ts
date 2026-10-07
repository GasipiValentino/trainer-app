import { addDays, diffDays, localDateKey, mondayOf } from "@/lib/dates";
import type { Lift, StudentSummary } from "@/lib/domain/summary";

/**
 * Métricas puras sobre el resumen de un alumno. Sin acceso a datos ni UI:
 * se pueden testear y reutilizar en profesor, alumno y reportes.
 */

export const DEFAULT_SESSIONS_PER_WEEK = 3;

export function plannedPerWeek(s: StudentSummary) {
  return s.routine?.sessions_per_week ?? DEFAULT_SESSIONS_PER_WEEK;
}

/** Días desde el último entreno (null si nunca entrenó). */
export function daysSinceLastWorkout(s: StudentSummary, today = localDateKey()) {
  return s.lastWorkoutAt ? diffDays(localDateKey(s.lastWorkoutAt), today) : null;
}

/** Celdas de actividad de los últimos `days` días (la última es hoy). */
export function activityCells(s: StudentSummary, days = 14, today = localDateKey()) {
  const set = new Set(s.workoutDates);
  return Array.from({ length: days }, (_, i) => set.has(addDays(today, i - days + 1)));
}

/** Entrenos en el rango [from, to] (fechas locales, inclusive). */
export function workoutsBetween(s: StudentSummary, from: string, to: string) {
  return s.workoutDates.filter((d) => d >= from && d <= to).length;
}

/** Entrenos por semana (lunes a domingo), las últimas `weeks` semanas, la última es la actual. */
export function weeklyCounts(s: StudentSummary, weeks = 12, today = localDateKey()) {
  const thisMonday = mondayOf(today);
  return Array.from({ length: weeks }, (_, i) => {
    const monday = addDays(thisMonday, (i - weeks + 1) * 7);
    return { monday, count: workoutsBetween(s, monday, addDays(monday, 6)) };
  });
}

/**
 * Constancia: entrenos hechos / planificados en las últimas `weeks` semanas
 * completas (no cuenta la semana en curso), tope 100%.
 */
export function adherence(s: StudentSummary, weeks = 4, today = localDateKey(), offsetWeeks = 0) {
  const end = addDays(mondayOf(today), -1 - offsetWeeks * 7);
  const start = addDays(end, -(weeks * 7) + 1);
  // Si el alumno se sumó dentro del período, se planifica desde su alta.
  const joined = localDateKey(s.createdAt);
  const from = joined > start ? joined : start;
  const days = diffDays(from, end) + 1;
  if (days <= 0) return null;
  const planned = (plannedPerWeek(s) * days) / 7;
  if (planned <= 0) return null;
  return Math.min(1, workoutsBetween(s, from, end) / planned);
}

/** Peso más reciente y cambio desde la primera medición. */
export function weightStats(s: StudentSummary) {
  const w = s.weights;
  if (w.length === 0) return null;
  const last = w[w.length - 1];
  return { current: last.w, date: last.d, sinceStart: last.w - w[0].w };
}

/** Semanas con peso estable (|Δ| < tolerancia) contando hacia atrás. */
export function stableWeightWeeks(s: StudentSummary, toleranceKg = 0.3) {
  const w = s.weights;
  if (w.length < 2) return 0;
  const last = w[w.length - 1];
  let earliest = last.d;
  for (let i = w.length - 2; i >= 0; i--) {
    if (Math.abs(w[i].w - last.w) >= toleranceKg) break;
    earliest = w[i].d;
  }
  return Math.floor(diffDays(earliest, last.d) / 7);
}

/** Ejercicio principal: el más entrenado con carga. */
export function mainLift(s: StudentSummary): Lift | null {
  return s.lifts[0] ?? null;
}

/** Progreso relativo de un ejercicio (primera marca → mejor marca). */
export function liftProgress(l: Lift) {
  return l.first > 0 ? l.best / l.first - 1 : 0;
}

/** Ejercicios principales (más frecuentes y con más carga), para "mejores marcas". */
export function topLifts(s: StudentSummary, n = 3) {
  return [...s.lifts]
    .filter((l) => l.sessions >= 2)
    .sort((a, b) => b.sessions - a.sessions || b.best - a.best)
    .slice(0, n);
}

/** Récord en los últimos `days` días (supera la mejor marca previa). */
export function recentRecord(s: StudentSummary, days = 7, now = new Date()) {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  return (
    s.lifts
      .filter((l) => l.prevBest != null && l.best > l.prevBest && new Date(l.bestAt).getTime() >= since)
      .sort((a, b) => liftProgress(b) - liftProgress(a))[0] ?? null
  );
}

/** Racha de semanas completas cumpliendo lo planificado (hacia atrás). */
export function weekStreak(s: StudentSummary, today = localDateKey()) {
  const target = plannedPerWeek(s);
  const weeks = weeklyCounts(s, 14, today).slice(0, -1).reverse(); // sin la semana actual
  let streak = 0;
  for (const w of weeks) {
    if (w.count >= target) streak++;
    else break;
  }
  return streak;
}

/** Semana N de M del bloque activo (null si no hay rutina con duración). */
export function routineWeek(s: StudentSummary, today = localDateKey()) {
  const r = s.routine;
  if (!r) return null;
  const n = Math.max(1, Math.floor(diffDays(r.start_date, today) / 7) + 1);
  const of = r.duration_weeks ?? null;
  const finished = (r.end_date != null && r.end_date < today) || (of != null && n > of);
  return { n: of != null ? Math.min(n, of) : n, of, finished };
}

/** Respuestas de check-in fuera de lo habitual (bajo en lo bueno, alto en lo malo). */
export const CHECKIN_LIMITS = { lowMax: 2, highMin: 4 } as const;

export function checkinFlags(c: { energy: number; sleep: number; motivation: number; stress: number; pain: number }) {
  return {
    energy: c.energy <= CHECKIN_LIMITS.lowMax,
    sleep: c.sleep <= CHECKIN_LIMITS.lowMax,
    motivation: c.motivation <= CHECKIN_LIMITS.lowMax,
    stress: c.stress >= CHECKIN_LIMITS.highMin,
    pain: c.pain >= CHECKIN_LIMITS.highMin,
  };
}

export function countFlags(c: Parameters<typeof checkinFlags>[0]) {
  return Object.values(checkinFlags(c)).filter(Boolean).length;
}
