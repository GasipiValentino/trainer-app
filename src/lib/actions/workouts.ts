"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { friendlyError, logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";
import { isUuid } from "@/lib/data/students";
import { localDayRange } from "@/lib/dates";

/**
 * Entrenamientos del alumno (E2). RLS: workouts/workout_sets solo aceptan
 * filas del propio alumno, y la rutina tiene que estar asignada a él.
 */

/** Empieza (o retoma) el entrenamiento de hoy para un día de rutina. */
export async function startWorkoutAction(routineDayId: string) {
  await requireRole("student");
  const studentId = await getMyStudentId();
  if (!studentId || !isUuid(routineDayId)) redirect(routes.student.home);

  const supabase = await createClient();
  const { data: day } = await supabase.from("routine_days").select("id, routine_id").eq("id", routineDayId).maybeSingle();
  if (!day) redirect(routes.student.home);

  // Si hay uno sin terminar hoy, se retoma en lugar de duplicar.
  const { start, end } = localDayRange();
  const { data: open } = await supabase
    .from("workouts")
    .select("id")
    .eq("student_id", studentId!)
    .is("completed_at", null)
    .gte("started_at", start)
    .lt("started_at", end)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) redirect(`${routes.student.workout}/${open.id}`);

  const { data, error } = await supabase
    .from("workouts")
    .insert({ student_id: studentId!, routine_id: day.routine_id, routine_day_id: day.id })
    .select("id")
    .single();
  if (error || !data) {
    logError("workouts.start", error);
    redirect(`${routes.student.home}?error=workout`);
  }
  redirect(`${routes.student.workout}/${data.id}`);
}

const setSchema = z.object({
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  routineExerciseId: z.string().uuid().nullable(),
  setNumber: z.number().int().min(1).max(50),
  weightKg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(500).nullable(),
  rpe: z.number().min(1).max(10).nullable(),
  completed: z.boolean(),
});

/** Guarda una serie (crea o actualiza por ejercicio + número de serie). */
export async function logSetAction(input: z.input<typeof setSchema>): Promise<{ ok: boolean; message?: string }> {
  await requireRole("student");
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisá kilos y repeticiones." };
  const s = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").upsert(
    {
      workout_id: s.workoutId,
      exercise_id: s.exerciseId,
      routine_exercise_id: s.routineExerciseId,
      set_number: s.setNumber,
      weight_kg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe,
      completed: s.completed,
    },
    { onConflict: "workout_id,exercise_id,set_number" },
  );
  if (error) {
    logError("workouts.set", error);
    return { ok: false, message: friendlyError(error, "No pudimos guardar la serie. Revisá tu conexión.") };
  }
  return { ok: true };
}

/** RPE del ejercicio: se aplica a todas sus series registradas. */
export async function setExerciseRpeAction(workoutId: string, exerciseId: string, rpe: number | null) {
  await requireRole("student");
  if (!isUuid(workoutId) || !isUuid(exerciseId)) return;
  if (rpe != null && (rpe < 1 || rpe > 10)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").update({ rpe }).eq("workout_id", workoutId).eq("exercise_id", exerciseId);
  if (error) logError("workouts.rpe", error);
}

/** Termina el entrenamiento con una nota opcional. */
export async function finishWorkoutAction(workoutId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "");
  await requireRole("student");
  if (!isUuid(workoutId)) redirect(routes.student.home);
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ completed_at: new Date().toISOString(), notes: notes.trim().slice(0, 1000) || null })
    .eq("id", workoutId);
  if (error) {
    logError("workouts.finish", error);
    redirect(`${routes.student.workout}/${workoutId}?error=finish`);
  }
  revalidatePath(routes.student.home);
  revalidatePath(routes.student.progress);
  redirect(`${routes.student.home}?done=1`);
}

/** Descarta un entrenamiento empezado por error (borra sus series). */
export async function discardWorkoutAction(workoutId: string) {
  await requireRole("student");
  if (!isUuid(workoutId)) redirect(routes.student.home);
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId).is("completed_at", null);
  if (error) logError("workouts.discard", error);
  revalidatePath(routes.student.home);
  redirect(routes.student.home);
}
