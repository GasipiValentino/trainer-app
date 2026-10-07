import type { RoutineDetail } from "@/lib/data/student-detail";
import type { LibraryExercise } from "@/lib/data/routines";
import type { RoutineInput } from "@/lib/validation/routine";

/** Estado del editor de rutinas (D5) y operaciones puras sobre él. */

export type EditorExercise = {
  key: string;
  id?: string;
  exercise_id: string;
  name: string;
  equipment: string | null;
  sets: string;
  reps: string;
  weight_kg: string;
  rpe_target: string;
  rest_seconds: string;
  superset_group: string;
  progression: string;
  notes: string;
};

export type EditorDay = { key: string; id?: string; name: string; exercises: EditorExercise[] };

export type EditorRoutine = {
  id?: string;
  name: string;
  description: string;
  duration_weeks: string;
  student_note: string;
  days: EditorDay[];
};

let seq = 0;
const k = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;
const s = (v: number | string | null | undefined) => (v == null ? "" : String(v));

export function fromDetail(r: RoutineDetail): EditorRoutine {
  return {
    id: r.id,
    name: r.name,
    description: s(r.description),
    duration_weeks: s(r.duration_weeks),
    student_note: s(r.student_note),
    days: r.days.map((d) => ({
      key: d.id,
      id: d.id,
      name: d.name,
      exercises: d.exercises.map((e) => ({
        key: e.id,
        id: e.id,
        exercise_id: e.exercise_id,
        name: e.exercise.name,
        equipment: e.exercise.equipment,
        sets: s(e.sets),
        reps: e.reps,
        weight_kg: s(e.weight_kg),
        rpe_target: s(e.rpe_target),
        rest_seconds: s(e.rest_seconds),
        superset_group: s(e.superset_group),
        progression: s(e.progression),
        notes: s(e.notes),
      })),
    })),
  };
}

export function emptyRoutine(): EditorRoutine {
  return { name: "", description: "", duration_weeks: "4", student_note: "", days: [{ key: k(), name: "Día 1", exercises: [] }] };
}

export function newExercise(e: LibraryExercise): EditorExercise {
  return {
    key: k(),
    exercise_id: e.id,
    name: e.name,
    equipment: e.equipment,
    sets: "3",
    reps: "10",
    weight_kg: "",
    rpe_target: "",
    rest_seconds: "90",
    superset_group: "",
    progression: "",
    notes: "",
  };
}

export function addDay(r: EditorRoutine): EditorRoutine {
  return { ...r, days: [...r.days, { key: k(), name: `Día ${r.days.length + 1}`, exercises: [] }] };
}

export function updateDay(r: EditorRoutine, dayKey: string, patch: Partial<EditorDay>): EditorRoutine {
  return { ...r, days: r.days.map((d) => (d.key === dayKey ? { ...d, ...patch } : d)) };
}

export function removeDay(r: EditorRoutine, dayKey: string): EditorRoutine {
  return r.days.length <= 1 ? r : { ...r, days: r.days.filter((d) => d.key !== dayKey) };
}

export function updateExercise(r: EditorRoutine, dayKey: string, exKey: string, patch: Partial<EditorExercise>): EditorRoutine {
  return updateDay(r, dayKey, {
    exercises: r.days.find((d) => d.key === dayKey)!.exercises.map((e) => (e.key === exKey ? { ...e, ...patch } : e)),
  });
}

export function removeExercise(r: EditorRoutine, dayKey: string, exKey: string): EditorRoutine {
  return updateDay(r, dayKey, { exercises: r.days.find((d) => d.key === dayKey)!.exercises.filter((e) => e.key !== exKey) });
}

/** Mueve un ejercicio a la posición `to` dentro del día. */
export function moveExercise(r: EditorRoutine, dayKey: string, exKey: string, to: number): EditorRoutine {
  const list = [...r.days.find((d) => d.key === dayKey)!.exercises];
  const from = list.findIndex((e) => e.key === exKey);
  if (from < 0 || to < 0 || to >= list.length || from === to) return r;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return updateDay(r, dayKey, { exercises: list });
}

export function appendExercises(r: EditorRoutine, dayKey: string, items: LibraryExercise[]): EditorRoutine {
  const day = r.days.find((d) => d.key === dayKey)!;
  return updateDay(r, dayKey, { exercises: [...day.exercises, ...items.map(newExercise)] });
}

/** Payload para la server action (sin claves de UI). */
export function toPayload(r: EditorRoutine): RoutineInput {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    duration_weeks: r.duration_weeks,
    student_note: r.student_note,
    days: r.days.map((d) => ({
      id: d.id,
      name: d.name,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        sets: e.sets as unknown as number,
        reps: e.reps,
        weight_kg: e.weight_kg,
        rpe_target: e.rpe_target,
        rest_seconds: e.rest_seconds,
        superset_group: e.superset_group,
        progression: e.progression,
        notes: e.notes,
      })),
    })),
  };
}
