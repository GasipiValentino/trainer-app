"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { friendlyError, logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";
import { isUuid } from "@/lib/data/students";
import { zonedMidnight } from "@/lib/dates";
import { fieldErrorsFrom, formValues, type ActionState } from "@/lib/actions/result";
import { eventSchema } from "@/lib/validation/event";

/** Fecha + hora locales → instante UTC (ISO). */
function toInstant(date: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(zonedMidnight(date).getTime() + (h * 60 + m) * 60_000);
}

/** Crea (eventId vacío) o actualiza un evento de la agenda. */
export async function saveEventAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("teacher");
  if (eventId && !isUuid(eventId)) return { ok: false, message: "No tenés permiso para hacer esto." };
  const values = formValues(formData);
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const e = parsed.data;
  const start = toInstant(e.date, e.time);
  const row = {
    teacher_id: user.id,
    student_id: e.studentId,
    type: e.type,
    title: e.title,
    description: e.description,
    start_at: start.toISOString(),
    end_at: e.duration ? new Date(start.getTime() + e.duration * 60_000).toISOString() : null,
  };

  const supabase = await createClient();
  // RLS: el alumno tiene que ser del profesor (calendar_insert/update).
  const { error } = eventId
    ? await supabase.from("calendar_events").update(row).eq("id", eventId)
    : await supabase.from("calendar_events").insert(row);
  if (error) {
    logError("calendar.save", error);
    return { ok: false, message: friendlyError(error), values };
  }
  revalidatePath(routes.teacher.calendar);
  revalidatePath(routes.teacher.home);
  redirect(`${routes.teacher.calendar}?date=${e.date}`);
}

export async function deleteEventAction(eventId: string, date: string) {
  await requireRole("teacher");
  if (!isUuid(eventId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) logError("calendar.delete", error);
  revalidatePath(routes.teacher.calendar);
  redirect(`${routes.teacher.calendar}${/^\d{4}-\d{2}-\d{2}$/.test(date) ? `?date=${date}` : ""}`);
}
