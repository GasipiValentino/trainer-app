"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { friendlyError, logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";
import { isUuid } from "@/lib/data/students";
import { assignManySchema, routineSchema, type RoutineInput } from "@/lib/validation/routine";
import { getRoutineDetail, type RoutineDetail } from "@/lib/data/student-detail";
import type { Json } from "@/types/database";

export type SaveResult = { ok: true; id: string; routine: RoutineDetail } | { ok: false; message: string };

/** Guarda la rutina entera (crea o actualiza) en una sola transacción. */
export async function saveRoutineAction(input: RoutineInput): Promise<SaveResult> {
  await requireRole("teacher");
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos de la rutina." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_routine", { p: parsed.data as unknown as Json });
  if (error || !data) {
    logError("routines.save", error);
    return { ok: false, message: friendlyError(error, "No pudimos guardar la rutina. Intentá nuevamente.") };
  }
  revalidatePath(routes.teacher.routines);
  revalidatePath(routes.teacher.routine(data));
  // Se devuelve la versión guardada (con los ids nuevos) para resincronizar el editor.
  const routine = await getRoutineDetail(data);
  if (!routine) return { ok: false, message: "No pudimos guardar la rutina. Intentá nuevamente." };
  return { ok: true, id: data, routine };
}

export async function duplicateRoutineAction(routineId: string) {
  await requireRole("teacher");
  if (!isUuid(routineId)) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_routine", { p_routine_id: routineId });
  if (error || !data) {
    logError("routines.duplicate", error);
    return;
  }
  revalidatePath(routes.teacher.routines);
  redirect(routes.teacher.routine(data));
}

export async function deleteRoutineAction(routineId: string) {
  await requireRole("teacher");
  if (!isUuid(routineId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) {
    logError("routines.delete", error);
    return;
  }
  revalidatePath(routes.teacher.routines);
  redirect(routes.teacher.routines);
}

/** Asigna una rutina a varios alumnos (cada uno cierra su rutina anterior). */
export async function assignToStudentsAction(input: {
  routineId: string;
  studentIds: string[];
  startDate: string;
}): Promise<{ ok: boolean; message: string }> {
  await requireRole("teacher");
  const parsed = assignManySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const supabase = await createClient();
  let failed = 0;
  for (const sid of parsed.data.studentIds) {
    const { error } = await supabase.rpc("assign_routine", {
      p_student_id: sid,
      p_routine_id: parsed.data.routineId,
      p_start_date: parsed.data.startDate,
    });
    if (error) {
      failed++;
      logError("routines.assign", error);
    }
  }
  revalidatePath(routes.teacher.routine(parsed.data.routineId));
  revalidatePath(routes.teacher.students);
  const n = parsed.data.studentIds.length - failed;
  if (failed > 0) return { ok: n > 0, message: `Asignada a ${n}. No pudimos asignarla a ${failed}.` };
  return { ok: true, message: n === 1 ? "Rutina asignada." : `Rutina asignada a ${n} alumnos.` };
}
