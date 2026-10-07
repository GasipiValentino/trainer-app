import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/students";
import { localDayRange } from "@/lib/dates";
import type { Tables } from "@/types/database";

/** Datos de la experiencia del alumno. RLS limita todo a él mismo. */

export type WorkoutRef = { id: string; routine_day_id: string | null; started_at: string; completed_at: string | null };

/** Último entreno terminado + entreno abierto/terminado hoy. */
export async function getWorkoutState(studentId: string) {
  const supabase = await createClient();
  const { start, end } = localDayRange();
  const [last, today, total] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, routine_day_id, started_at, completed_at")
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("id, routine_day_id, started_at, completed_at")
      .eq("student_id", studentId)
      .gte("started_at", start)
      .lt("started_at", end)
      .order("started_at", { ascending: false }),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("student_id", studentId).not("completed_at", "is", null),
  ]);
  if (last.error || today.error) throw new DataError("data.student.workouts", last.error ?? today.error);
  const todays = (today.data ?? []) as WorkoutRef[];
  return {
    last: (last.data as WorkoutRef | null) ?? null,
    openToday: todays.find((w) => !w.completed_at) ?? null,
    doneToday: todays.find((w) => w.completed_at) ?? null,
    total: total.count ?? 0,
  };
}

/** Último mensaje recibido del coach. */
export async function getLastCoachMessage(me: string, coachId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, created_at")
    .eq("sender_id", coachId)
    .eq("receiver_id", me)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DataError("data.student.message", error);
  return data;
}

export async function getMyCheckin(studentId: string, weekStart: string): Promise<Tables<"checkins"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new DataError("data.student.checkin", error);
  return data;
}

/** Entreno con su día de rutina y las series ya registradas (para E2). */
export async function getWorkoutSession(workoutId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, student_id, routine_id, routine_day_id, started_at, completed_at, notes, workout_sets(exercise_id, routine_exercise_id, set_number, weight_kg, reps, rpe, completed)")
    .eq("id", workoutId)
    .maybeSingle();
  if (error) throw new DataError("data.student.session", error);
  return data;
}

/**
 * Última carga usada por ejercicio (para precargar los kilos). Una consulta
 * acotada a los últimos 30 entrenos del alumno.
 */
export async function getLastWeights(studentId: string, exerciseIds: string[]): Promise<Record<string, number>> {
  if (exerciseIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("started_at, workout_sets(exercise_id, weight_kg, completed)")
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(30);
  if (error) throw new DataError("data.student.lastWeights", error);
  const out: Record<string, number> = {};
  for (const w of data ?? []) {
    for (const s of w.workout_sets ?? []) {
      if (s.completed && s.weight_kg != null && exerciseIds.includes(s.exercise_id) && out[s.exercise_id] == null) {
        out[s.exercise_id] = Number(s.weight_kg);
      }
    }
  }
  return out;
}
