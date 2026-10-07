import type { RoutineDetail } from "@/lib/data/student-detail";

/**
 * Qué día de rutina toca: el siguiente al último entrenado, en orden
 * circular. Sin historial, el primero.
 */
export function nextRoutineDay(routine: RoutineDetail, lastDayId: string | null) {
  if (routine.days.length === 0) return null;
  const idx = routine.days.findIndex((d) => d.id === lastDayId);
  return routine.days[(idx + 1) % routine.days.length] ?? routine.days[0];
}

export type Badge = { icon: string; title: string; highlight: boolean };

/** Logros del alumno (E3), calculados a partir de métricas reales. */
export function badges(input: {
  recordName: string | null;
  streak: number;
  totalWorkouts: number;
  weeksSinceStart: number;
  firstMonthAdherence: number | null;
}): Badge[] {
  const out: Badge[] = [];
  if (input.recordName) out.push({ icon: "PR", title: `Récord en ${input.recordName.toLowerCase()}`, highlight: true });
  if (input.streak >= 2) out.push({ icon: String(input.streak), title: `${input.streak} semanas sin cortar`, highlight: false });
  if (input.weeksSinceStart >= 4 && (input.firstMonthAdherence ?? 0) >= 0.9) {
    out.push({ icon: "1M", title: "Primer mes completo", highlight: false });
  }
  for (const n of [100, 50, 25, 10]) {
    if (input.totalWorkouts >= n) {
      out.push({ icon: String(n), title: `${n} entrenamientos`, highlight: false });
      break;
    }
  }
  return out;
}
