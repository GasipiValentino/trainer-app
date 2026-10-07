import "server-only";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

export type Coach = { id: string; firstName: string; lastName: string };

/** Profesor principal del alumno (RLS: el alumno solo ve su vínculo). */
export async function getMyCoach(studentId: string): Promise<Coach | null> {
  const supabase = await createClient();
  const { data: link, error } = await supabase
    .from("teacher_students")
    .select("teacher_id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .eq("is_primary", true)
    .maybeSingle();
  if (error) logError("data.coach.link", error);
  if (!link) return null;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", link.teacher_id)
    .maybeSingle();
  if (pErr) logError("data.coach.profile", pErr);
  if (!profile) return null;
  return { id: profile.id, firstName: profile.first_name, lastName: profile.last_name };
}
