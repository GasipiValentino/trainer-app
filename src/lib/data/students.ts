import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { parseSummary, type StudentSummary } from "@/lib/domain/summary";
import { alertsFor, studentState, type Alert, type StudentState } from "@/lib/domain/alerts";

/** Error de carga: lo atrapa el error boundary con un mensaje amable. */
export class DataError extends Error {
  constructor(context: string, cause: unknown) {
    super(`No se pudo cargar: ${context}`);
    logError(context, cause);
  }
}

/** Resúmenes de todos los alumnos visibles (RLS: los del profesor / uno mismo). */
export const getSummaries = cache(async (): Promise<StudentSummary[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_summaries", {});
  if (error) throw new DataError("data.students.summaries", error);
  return (data ?? []).map(parseSummary);
});

export const getSummary = cache(async (studentId: string): Promise<StudentSummary | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_summaries", { p_student: studentId });
  if (error) throw new DataError("data.students.summary", error);
  return data?.[0] ? parseSummary(data[0]) : null;
});

export type EnrichedStudent = StudentSummary & { alerts: Alert[]; state: StudentState };

/** Resúmenes + alertas + estado, calculados una vez por request. */
export const getEnrichedStudents = cache(async (): Promise<EnrichedStudent[]> => {
  const summaries = await getSummaries();
  return summaries.map((s) => {
    const alerts = alertsFor(s);
    return { ...s, alerts, state: studentState(s, alerts) };
  });
});

/** Ficha completa de un alumno (datos editables). null si no existe o no es tuyo. */
export const getStudentProfile = cache(async (studentId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("id", studentId)
    .neq("status", "archived")
    .maybeSingle();
  if (error) throw new DataError("data.students.profile", error);
  return data;
});

/** UUID válido: evita consultas con ids basura (y errores 22P02). */
export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
