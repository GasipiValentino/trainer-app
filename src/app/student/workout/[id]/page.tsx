import { notFound, redirect } from "next/navigation";
import { WorkoutPlayer, type PlayerExercise } from "@/components/student/workout-player";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMyCoach } from "@/lib/data/coach";
import { getRoutineDetail } from "@/lib/data/student-detail";
import { getLastWeights, getWorkoutSession } from "@/lib/data/student-home";
import { isUuid } from "@/lib/data/students";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Entrenando · Trainer" };

/** E2 — Sesión de entrenamiento en curso. */
export default async function WorkoutPage({ params }: PageProps<"/student/workout/[id]">) {
  await requireRole("student");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const studentId = await getMyStudentId();
  const session = await getWorkoutSession(id);
  // De otro alumno → RLS no lo devuelve → 404.
  if (!session || session.student_id !== studentId) notFound();
  if (session.completed_at) redirect(routes.student.home);
  if (!session.routine_id || !session.routine_day_id) notFound();

  const [routine, coach] = await Promise.all([getRoutineDetail(session.routine_id), getMyCoach(studentId!)]);
  const day = routine?.days.find((d) => d.id === session.routine_day_id);
  if (!routine || !day) notFound();

  const lastWeights = await getLastWeights(studentId!, day.exercises.map((e) => e.exercise_id));
  const exercises: PlayerExercise[] = day.exercises.map((e) => ({
    routineExerciseId: e.id,
    exerciseId: e.exercise_id,
    name: e.exercise.name,
    videoUrl: e.exercise.video_url,
    sets: e.sets,
    reps: e.reps,
    targetKg: e.weight_kg != null ? Number(e.weight_kg) : null,
    restSeconds: e.rest_seconds,
    note: e.notes,
    suggestedKg: lastWeights[e.exercise_id] ?? (e.weight_kg != null ? Number(e.weight_kg) : null),
    logged: (session.workout_sets ?? [])
      .filter((s) => s.exercise_id === e.exercise_id)
      .map((s) => ({
        setNumber: s.set_number,
        kg: s.weight_kg != null ? Number(s.weight_kg) : null,
        reps: s.reps,
        rpe: s.rpe != null ? Number(s.rpe) : null,
        done: s.completed,
      })),
  }));

  if (exercises.length === 0) redirect(routes.student.home);

  return (
    <WorkoutPlayer
      workoutId={id}
      dayName={day.name}
      startedAt={session.started_at}
      coachFirstName={coach?.firstName ?? null}
      exercises={exercises}
    />
  );
}
