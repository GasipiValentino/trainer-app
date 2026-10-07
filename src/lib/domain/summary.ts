import type { Database } from "@/types/database";

/** Fila cruda de la RPC student_summaries. */
type SummaryRow = Database["public"]["Functions"]["student_summaries"]["Returns"][number];

export type Lift = {
  exerciseId: string;
  name: string;
  first: number;
  firstAt: string;
  best: number;
  bestAt: string;
  prevBest: number | null;
  sessions: number;
};

export type LastCheckin = {
  id: string;
  week_start: string;
  energy: number;
  sleep: number;
  stress: number;
  pain: number;
  motivation: number;
  workouts_done: number | null;
  workouts_planned: number | null;
  notes: string | null;
  created_at: string;
};

export type ActiveRoutine = {
  id: string;
  name: string;
  duration_weeks: number | null;
  sessions_per_week: number | null;
  start_date: string;
  end_date: string | null;
};

/** Resumen tipado de un alumno: insumo de métricas y alertas. */
export type StudentSummary = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  goal: string | null;
  level: string | null;
  birthDate: string | null;
  status: "pending" | "active" | "archived";
  createdAt: string;
  workoutDates: string[];
  lastWorkoutAt: string | null;
  routine: ActiveRoutine | null;
  weights: { d: string; w: number }[];
  lastMeasuredOn: string | null;
  lastCheckin: LastCheckin | null;
  lifts: Lift[];
  reviewed: string[];
};

type RawLift = {
  exercise_id: string;
  name: string;
  first: number;
  first_at: string;
  best: number;
  best_at: string;
  prev_best: number | null;
  sessions: number;
};

export function parseSummary(row: SummaryRow): StudentSummary {
  const lifts = ((row.lifts as RawLift[] | null) ?? []).map((l) => ({
    exerciseId: l.exercise_id,
    name: l.name,
    first: Number(l.first),
    firstAt: l.first_at,
    best: Number(l.best),
    bestAt: l.best_at,
    prevBest: l.prev_best == null ? null : Number(l.prev_best),
    sessions: Number(l.sessions),
  }));
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    goal: row.goal,
    level: row.level,
    birthDate: row.birth_date,
    status: row.status as StudentSummary["status"],
    createdAt: row.created_at,
    workoutDates: row.workout_dates ?? [],
    lastWorkoutAt: row.last_workout_at,
    routine: (row.routine as ActiveRoutine | null) ?? null,
    weights: ((row.weights as { d: string; w: number }[] | null) ?? []).map((p) => ({ d: p.d, w: Number(p.w) })),
    lastMeasuredOn: row.last_measured_on,
    lastCheckin: (row.last_checkin as LastCheckin | null) ?? null,
    lifts,
    reviewed: (row.reviewed as string[] | null) ?? [],
  };
}
