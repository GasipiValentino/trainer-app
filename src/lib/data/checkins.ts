import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/students";
import type { Tables } from "@/types/database";

/** Check-ins de una semana para los alumnos visibles (RLS). */
export async function getWeekCheckins(weekStart: string): Promise<Tables<"checkins">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });
  if (error) throw new DataError("data.checkins.week", error);
  return data ?? [];
}
