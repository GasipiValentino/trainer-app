import { num } from "@/lib/format";

/** Formato de ejercicios de rutina, idéntico al diseño (D5, E2). */

export type ExerciseSpec = {
  sets: number;
  reps: string;
  weight_kg: number | null;
  rpe_target: number | null;
  rest_seconds: number | null;
  superset_group: string | null;
  equipment?: string | null;
};

const isBodyweight = (equipment?: string | null) => /peso corporal/i.test(equipment ?? "");

/** "4 × 6" */
export const setsReps = (e: Pick<ExerciseSpec, "sets" | "reps">) => `${e.sets} × ${e.reps}`;

/** "80 kg" · con peso corporal: "+10 kg" (lastre). */
export function load(e: Pick<ExerciseSpec, "weight_kg" | "equipment">) {
  if (e.weight_kg == null || Number(e.weight_kg) === 0) return null;
  return `${isBodyweight(e.equipment) ? "+" : ""}${num(Number(e.weight_kg))} kg`;
}

/** "RPE 8" */
export const rpe = (e: Pick<ExerciseSpec, "rpe_target">) => (e.rpe_target == null ? null : `RPE ${num(Number(e.rpe_target))}`);

/** "2 min" / "75 s" */
export function rest(seconds: number | null | undefined) {
  if (seconds == null) return null;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds > 60 && seconds % 30 === 0) return `${num(seconds / 60)} min`;
  return `${seconds} s`;
}

/** "3 × 10 · 32 kg" (fila de superserie) */
export function compactSpec(e: ExerciseSpec) {
  return [setsReps(e), load(e)].filter(Boolean).join(" · ");
}

export type Block<T> =
  | { kind: "single"; index: number; item: T }
  | { kind: "superset"; index: number; group: string; items: T[] };

/**
 * Agrupa ejercicios consecutivos con la misma letra de superserie.
 * index = número que se muestra ("1.", "3a/3b").
 */
export function toBlocks<T extends { superset_group: string | null }>(items: T[]): Block<T>[] {
  const out: Block<T>[] = [];
  let n = 0;
  for (const item of items) {
    const last = out[out.length - 1];
    if (item.superset_group && last?.kind === "superset" && last.group === item.superset_group) {
      last.items.push(item);
      continue;
    }
    n++;
    out.push(item.superset_group ? { kind: "superset", index: n, group: item.superset_group, items: [item] } : { kind: "single", index: n, item });
  }
  return out;
}

/** Duración estimada de una sesión en minutos (series × ~45 s + descansos). */
export function estimateMinutes(items: { sets: number; rest_seconds: number | null }[]) {
  const secs = items.reduce((acc, e) => acc + e.sets * (45 + (e.rest_seconds ?? 60)), 0);
  return Math.max(10, Math.round(secs / 60 / 5) * 5);
}

/** Rango de RPE del día: "RPE 7–8". */
export function rpeRange(items: { rpe_target: number | null }[]) {
  const v = items.map((e) => e.rpe_target).filter((x): x is number => x != null).map(Number);
  if (v.length === 0) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return lo === hi ? `RPE ${num(lo)}` : `RPE ${num(lo)}–${num(hi)}`;
}
