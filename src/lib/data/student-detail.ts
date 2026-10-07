import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/students";
import type { Tables } from "@/types/database";

/** Datos de detalle de un alumno. RLS garantiza que solo vuelva lo propio. */

export type Measurement = Tables<"measurements">;

export const getMeasurements = cache(async (studentId: string): Promise<Measurement[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new DataError("data.detail.measurements", error);
  return data ?? [];
});

export async function getNotes(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new DataError("data.detail.notes", error);
  return data ?? [];
}

export async function getCheckins(studentId: string, limit = 26) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(limit);
  if (error) throw new DataError("data.detail.checkins", error);
  return data ?? [];
}

export type WorkoutWithSets = {
  id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  dayName: string | null;
  routineName: string | null;
  exercises: { name: string; sets: number; best: { kg: number | null; reps: number | null } }[];
  totalSets: number;
};

/** Últimos entrenamientos con resumen por ejercicio. */
export async function getRecentWorkouts(studentId: string, limit = 20): Promise<WorkoutWithSets[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, started_at, completed_at, notes, routine_days(name), routines(name), workout_sets(set_number, weight_kg, reps, completed, exercises(name))",
    )
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new DataError("data.detail.workouts", error);

  return (data ?? []).map((w) => {
    const byExercise = new Map<string, { sets: number; best: { kg: number | null; reps: number | null } }>();
    let totalSets = 0;
    for (const s of w.workout_sets ?? []) {
      if (!s.completed) continue;
      totalSets++;
      const name = s.exercises?.name ?? "Ejercicio";
      const cur = byExercise.get(name) ?? { sets: 0, best: { kg: null, reps: null } };
      cur.sets++;
      if ((s.weight_kg ?? -1) > (cur.best.kg ?? -1)) cur.best = { kg: s.weight_kg, reps: s.reps };
      byExercise.set(name, cur);
    }
    return {
      id: w.id,
      started_at: w.started_at,
      completed_at: w.completed_at,
      notes: w.notes,
      dayName: w.routine_days?.name ?? null,
      routineName: w.routines?.name ?? null,
      exercises: [...byExercise.entries()].map(([name, v]) => ({ name, ...v })),
      totalSets,
    };
  });
}

export type Photo = { id: string; date: string; urls: { front?: string; side?: string; back?: string } };

/** Fotos de progreso con URLs firmadas (bucket privado, 1 hora). */
export async function getPhotos(studentId: string): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, date, front_path, side_path, back_path")
    .eq("student_id", studentId)
    .order("date", { ascending: false });
  if (error) throw new DataError("data.detail.photos", error);
  const rows = data ?? [];
  const paths = rows.flatMap((r) => [r.front_path, r.side_path, r.back_path]).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls, error: sErr } = await supabase.storage.from("progress-photos").createSignedUrls(paths, 3600);
    if (sErr) throw new DataError("data.detail.photos.sign", sErr);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    urls: {
      front: r.front_path ? signed.get(r.front_path) : undefined,
      side: r.side_path ? signed.get(r.side_path) : undefined,
      back: r.back_path ? signed.get(r.back_path) : undefined,
    },
  }));
}

export type RoutineDetail = Tables<"routines"> & {
  days: (Tables<"routine_days"> & {
    exercises: (Tables<"routine_exercises"> & { exercise: Pick<Tables<"exercises">, "id" | "name" | "muscle_group" | "equipment" | "video_url"> })[];
  })[];
};

/** Rutina completa con días y ejercicios ordenados. */
export const getRoutineDetail = cache(async (routineId: string): Promise<RoutineDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select(
      "*, routine_days(*, routine_exercises(*, exercises(id, name, muscle_group, equipment, video_url)))",
    )
    .eq("id", routineId)
    .maybeSingle();
  if (error) throw new DataError("data.routine.detail", error);
  if (!data) return null;
  const { routine_days, ...routine } = data;
  return {
    ...routine,
    days: [...(routine_days ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(({ routine_exercises, ...day }) => ({
        ...day,
        exercises: [...(routine_exercises ?? [])]
          .sort((a, b) => a.position - b.position)
          .map(({ exercises, ...re }) => ({ ...re, exercise: exercises! })),
      })),
  };
});

/** Rutinas del profesor (para asignar). */
export async function getTeacherRoutineOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").select("id, name").order("name");
  if (error) throw new DataError("data.routines.options", error);
  return data ?? [];
}

/** Sesiones y volumen por semana desde `from` (semanas sin entrenos no vienen). */
export async function getWeeklyStats(studentId: string, from: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_weekly_stats", { p_student: studentId, p_from: from });
  if (error) throw new DataError("data.progress.weekly", error);
  return (data ?? []).map((r) => ({ week: r.week_start, sessions: Number(r.sessions), volume: Number(r.volume) }));
}

/** Mejor carga por sesión de un ejercicio desde `from`. */
export async function getExerciseSeries(studentId: string, exerciseId: string, from: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_exercise_series", {
    p_student: studentId,
    p_exercise: exerciseId,
    p_from: from,
  });
  if (error) throw new DataError("data.progress.exercise", error);
  return (data ?? []).map((r) => ({ d: r.day, v: Number(r.best_kg) }));
}
