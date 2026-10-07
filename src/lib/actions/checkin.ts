"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { friendlyError, logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";
import type { ActionState } from "@/lib/actions/result";
import { checkinSchema } from "@/lib/validation/checkin";

/** E4 — el alumno completa (o corrige) su check-in semanal. RLS: solo el propio. */
export async function submitCheckinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("student");
  const studentId = await getMyStudentId();
  if (!studentId) return { ok: false, message: "No encontramos tu perfil de alumno." };

  const parsed = checkinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Respondé las 5 preguntas para enviar." };
  const c = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("checkins").upsert(
    {
      student_id: studentId,
      week_start: c.weekStart,
      energy: c.energy,
      sleep: c.sleep,
      stress: c.stress,
      pain: c.pain,
      motivation: c.motivation,
      workouts_done: c.workoutsDone,
      workouts_planned: c.workoutsPlanned,
      notes: c.notes || null,
    },
    { onConflict: "student_id,week_start" },
  );
  if (error) {
    logError("checkin.submit", error);
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(routes.student.home);
  redirect(`${routes.student.home}?checkin=1`);
}
