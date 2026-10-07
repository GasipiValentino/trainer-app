import "server-only";
import { createClient } from "@/lib/supabase/server";
import { localDateKey, localDayRange } from "@/lib/dates";
import { logError } from "@/lib/errors";

/** Tipos de evento que cuentan como "sesión" (las tareas no). */
export const SESSION_TYPES = ["presencial", "online", "evaluacion"] as const;

/** Sesiones de hoy del profesor autenticado. */
export async function countTeacherSessionsToday(teacherId: string): Promise<number> {
  const supabase = await createClient();
  const { start, end } = localDayRange();
  const { count, error } = await supabase
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .in("type", [...SESSION_TYPES])
    .gte("start_at", start)
    .lt("start_at", end);
  if (error) {
    logError("data.calendar.today", error);
    return 0;
  }
  return count ?? 0;
}

/** Sesiones agendadas por día local (YYYY-MM-DD) en un rango [from, to). */
export async function sessionsPerDay(teacherId: string, fromIso: string, toIso: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("start_at")
    .eq("teacher_id", teacherId)
    .in("type", [...SESSION_TYPES])
    .gte("start_at", fromIso)
    .lt("start_at", toIso);
  if (error) {
    logError("data.calendar.perDay", error);
    return {};
  }
  const out: Record<string, number> = {};
  for (const e of data ?? []) {
    const k = localDateKey(e.start_at);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export type CalendarEvent = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  student: { id: string; first_name: string; last_name: string } | null;
};

/** Eventos visibles (profesor: los suyos; alumno: los propios) en [from, to). */
export async function getEvents(fromIso: string, toIso: string): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, type, title, description, start_at, end_at, student_profiles(id, first_name, last_name)")
    .gte("start_at", fromIso)
    .lt("start_at", toIso)
    .order("start_at");
  if (error) {
    logError("data.calendar.events", error);
    throw new Error("No se pudieron cargar los eventos");
  }
  return (data ?? []).map(({ student_profiles, ...e }) => ({ ...e, student: student_profiles }));
}

export async function getEvent(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events").select("*").eq("id", id).maybeSingle();
  if (error) logError("data.calendar.event", error);
  return data;
}
