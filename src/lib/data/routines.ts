import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/students";

export type RoutineListItem = {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number | null;
  days: number;
  updatedAt: string;
  assigned: { id: string; firstName: string; lastName: string }[];
};

/** Rutinas del profesor con días y alumnos que la tienen activa. */
export async function getRoutineList(): Promise<RoutineListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, description, duration_weeks, updated_at, routine_days(id), student_routines(status, student_profiles(id, first_name, last_name))")
    .order("updated_at", { ascending: false });
  if (error) throw new DataError("data.routines.list", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    durationWeeks: r.duration_weeks,
    days: r.routine_days?.length ?? 0,
    updatedAt: r.updated_at,
    assigned: (r.student_routines ?? [])
      .filter((sr) => sr.status === "active" && sr.student_profiles)
      .map((sr) => ({ id: sr.student_profiles!.id, firstName: sr.student_profiles!.first_name, lastName: sr.student_profiles!.last_name })),
  }));
}

export type LibraryExercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  video_url: string | null;
  own: boolean;
};

/** Biblioteca: ejercicios globales + propios del profesor. */
export async function getExerciseLibrary(teacherId: string): Promise<LibraryExercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, video_url, teacher_id")
    .order("name");
  if (error) throw new DataError("data.exercises.library", error);
  return (data ?? []).map((e) => ({ ...e, own: e.teacher_id === teacherId }));
}

/** Alumnos del profesor para el selector de asignación. */
export async function getAssignableStudents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_profiles")
    .select("id, first_name, last_name, status, goal")
    .neq("status", "archived")
    .order("first_name");
  if (error) throw new DataError("data.routines.students", error);
  return data ?? [];
}
