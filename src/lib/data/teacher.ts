import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/students";

/** Estado de onboarding del profesor y si ya dio cada primer paso. */
export async function getOnboarding(teacherId: string) {
  const supabase = await createClient();
  const [profile, routines, events] = await Promise.all([
    supabase.from("teacher_profiles").select("onboarding_done").eq("user_id", teacherId).maybeSingle(),
    supabase.from("routines").select("id", { count: "exact", head: true }),
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
  ]);
  if (profile.error) throw new DataError("data.teacher.onboarding", profile.error);
  return {
    done: profile.data?.onboarding_done ?? false,
    hasRoutine: (routines.count ?? 0) > 0,
    hasEvent: (events.count ?? 0) > 0,
  };
}
