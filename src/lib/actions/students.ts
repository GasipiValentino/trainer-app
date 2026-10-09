"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site-url";
import { friendlyError, logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";
import { isUuid } from "@/lib/data/students";
import { fieldErrorsFrom, formValues, type ActionState } from "@/lib/actions/result";
import { measurementSchema, noteSchema, studentSchema } from "@/lib/validation/student";

/**
 * Acciones del profesor sobre sus alumnos. Cada una:
 *  1. exige rol profesor (leído de la base),
 *  2. valida ids y datos con zod,
 *  3. delega la verificación de ownership a RLS / RPCs.
 */

const inviteUrl = async (token: string) => `${await getSiteUrl()}/invite/${token}`;
const FORBIDDEN: ActionState = { ok: false, message: "No tenés permiso para hacer esto." };

// ------------------------------------------------------------- alta
export async function createStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("teacher");
  const values = formValues(formData);
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const d = parsed.data;
  const supabase = await createClient();
  const { data: studentId, error } = await supabase.rpc("create_student", {
    p_first_name: d.firstName,
    p_last_name: d.lastName,
    p_email: d.email,
    p_birth_date: d.birthDate ?? undefined,
    p_phone: d.phone ?? undefined,
    p_goal: d.goal ?? undefined,
    p_level: d.level ?? undefined,
    p_height_cm: d.heightCm ?? undefined,
    p_initial_weight: d.initialWeight ?? undefined,
    p_notes: d.notes ?? undefined,
  });
  if (error || !studentId) {
    logError("students.create", error);
    if (error && /DUPLICATE_STUDENT/.test(error.message)) {
      return { ok: false, fieldErrors: { email: "Ya tenés un alumno con ese email." }, values };
    }
    return { ok: false, message: friendlyError(error), values };
  }

  const { data: token, error: invError } = await supabase.rpc("create_invitation", { p_student_id: studentId });
  revalidatePath(routes.teacher.students);
  if (invError || !token) {
    logError("students.create.invite", invError);
    // El alumno quedó creado: puede generar la invitación desde su perfil.
    return { ok: true, data: { studentId, inviteUrl: "" }, message: "Alumno creado, pero no pudimos generar la invitación." };
  }
  return { ok: true, data: { studentId, inviteUrl: await inviteUrl(token), email: d.email, firstName: d.firstName } };
}

// ----------------------------------------------------------- edición
export async function updateStudentAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  const values = formValues(formData);
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const d = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase.from("student_profiles").select("user_id, email").eq("id", studentId).maybeSingle();
  if (!current) return FORBIDDEN;

  const { error, count } = await supabase
    .from("student_profiles")
    .update(
      {
        first_name: d.firstName,
        last_name: d.lastName,
        // Con cuenta activa, el email es el de login: no se cambia desde acá.
        email: current.user_id ? current.email : d.email,
        birth_date: d.birthDate,
        phone: d.phone,
        goal: d.goal,
        level: d.level,
        height_cm: d.heightCm,
        initial_weight: d.initialWeight,
        notes: d.notes,
      },
      { count: "exact" },
    )
    .eq("id", studentId);
  if (error || count === 0) {
    logError("students.update", error ?? "0 filas");
    return { ok: false, message: error ? friendlyError(error) : FORBIDDEN.message, values };
  }
  revalidatePath(routes.teacher.student(studentId));
  redirect(routes.teacher.student(studentId));
}

// -------------------------------------------------- nueva invitación
export async function regenerateInviteAction(studentId: string): Promise<ActionState> {
  await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", { p_student_id: studentId });
  if (error || !token) {
    logError("students.invite", error);
    return { ok: false, message: friendlyError(error) };
  }
  return { ok: true, data: { inviteUrl: await inviteUrl(token) } };
}

// -------------------------------------------------------- desvincular
export async function unlinkStudentAction(studentId: string) {
  await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  const supabase = await createClient();
  const { error } = await supabase.rpc("unlink_student", { p_student_id: studentId });
  if (error) {
    logError("students.unlink", error);
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(routes.teacher.students);
  redirect(routes.teacher.students);
}

// --------------------------------------------------------- mediciones
export async function addMeasurementAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  const values = formValues(formData);
  const parsed = measurementSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const m = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("measurements").insert({
    student_id: studentId,
    date: m.date,
    weight: m.weight,
    body_fat: m.bodyFat,
    muscle_mass: m.muscleMass,
    chest: m.chest,
    waist: m.waist,
    hips: m.hips,
    arm: m.arm,
    thigh: m.thigh,
    notes: m.notes,
    created_by: user.id,
  });
  if (error) {
    logError("students.measure", error);
    return { ok: false, message: friendlyError(error), values };
  }
  revalidatePath(routes.teacher.student(studentId));
  redirect(`${routes.teacher.student(studentId)}?tab=metricas`);
}

export async function deleteMeasurementAction(studentId: string, measurementId: string) {
  await requireRole("teacher");
  if (!isUuid(studentId) || !isUuid(measurementId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("measurements").delete().eq("id", measurementId).eq("student_id", studentId);
  if (error) logError("students.measure.delete", error);
  revalidatePath(routes.teacher.student(studentId));
}

// -------------------------------------------------------------- notas
export async function addNoteAction(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  const parsed = noteSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .insert({ teacher_id: user.id, student_id: studentId, content: parsed.data.content });
  if (error) {
    logError("students.note", error);
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(routes.teacher.student(studentId));
  return { ok: true, message: "Nota guardada." };
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  await requireRole("teacher");
  if (!isUuid(studentId) || !isUuid(noteId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) logError("students.note.delete", error);
  revalidatePath(routes.teacher.student(studentId));
}

// ------------------------------------------------- revisión de alertas
/** "Marcar como revisado y seguir": saca las alertas de la cola y va al próximo. */
export async function markReviewedAction(studentId: string, keys: string[], nextHref: string) {
  const user = await requireRole("teacher");
  if (!isUuid(studentId)) return;
  const safeKeys = keys.filter((k) => typeof k === "string" && k.length < 200).slice(0, 20);
  if (safeKeys.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("alert_reviews").upsert(
      safeKeys.map((alert_key) => ({ teacher_id: user.id, student_id: studentId, alert_key, reviewed_at: new Date().toISOString() })),
      { onConflict: "teacher_id,student_id,alert_key" },
    );
    if (error) logError("students.review", error);
  }
  revalidatePath(routes.teacher.home);
  redirect(nextHref.startsWith("/teacher") ? nextHref : routes.teacher.home);
}

// ---------------------------------------------------- asignar rutina
export async function assignRoutineAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("teacher");
  const routineId = String(formData.get("routineId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  if (!isUuid(studentId)) return FORBIDDEN;
  if (!isUuid(routineId)) return { ok: false, fieldErrors: { routineId: "Elegí una rutina." } };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, fieldErrors: { startDate: "Fecha inválida." } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_routine", {
    p_student_id: studentId,
    p_routine_id: routineId,
    p_start_date: startDate,
  });
  if (error) {
    logError("students.assign", error);
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(routes.teacher.student(studentId));
  return { ok: true, message: "Rutina asignada." };
}

// -------------------------------------------------------------- fotos
const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}-(front|side|back)\.(jpg|jpeg|png|webp)$/i;

/**
 * Registra una sesión de fotos ya subida a Storage desde el navegador. Las
 * rutas tienen que empezar con el id del alumno (la política de Storage ya
 * impidió subirlas a otra carpeta; acá se revalida igual).
 */
export async function addPhotosAction(
  studentId: string,
  input: { date: string; front?: string; side?: string; back?: string },
): Promise<ActionState> {
  await requireRole("teacher");
  if (!isUuid(studentId)) return FORBIDDEN;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, message: "Fecha inválida." };
  const paths = [input.front, input.side, input.back];
  if (paths.every((p) => !p)) return { ok: false, message: "Subí al menos una foto." };
  for (const p of paths) {
    if (p && (!PHOTO_PATH.test(p) || !p.startsWith(`${studentId}/`))) return FORBIDDEN;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("progress_photos").insert({
    student_id: studentId,
    date: input.date,
    front_path: input.front ?? null,
    side_path: input.side ?? null,
    back_path: input.back ?? null,
  });
  if (error) {
    logError("students.photos", error);
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(routes.teacher.student(studentId));
  return { ok: true, message: "Fotos guardadas." };
}

export async function deletePhotosAction(studentId: string, photoId: string) {
  await requireRole("teacher");
  if (!isUuid(studentId) || !isUuid(photoId)) return;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("progress_photos")
    .select("front_path, side_path, back_path")
    .eq("id", photoId)
    .maybeSingle();
  if (!row) return;
  const paths = [row.front_path, row.side_path, row.back_path].filter((p): p is string => !!p);
  if (paths.length) {
    const { error: sErr } = await supabase.storage.from("progress-photos").remove(paths);
    if (sErr) logError("students.photos.remove", sErr);
  }
  const { error } = await supabase.from("progress_photos").delete().eq("id", photoId);
  if (error) logError("students.photos.delete", error);
  revalidatePath(routes.teacher.student(studentId));
}
