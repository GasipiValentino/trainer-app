import type { RoutineDetail } from "@/lib/data/student-detail";
import { compactSpec, load, rest, rpe, setsReps, toBlocks } from "@/lib/domain/routine-format";

type DayExercise = RoutineDetail["days"][number]["exercises"][number];

/** Tarjeta de ejercicio de D5 en modo lectura (sin asa de arrastre). */
export function ExerciseCard({ index, e }: { index: number | string; e: DayExercise }) {
  const chips = [setsReps(e), load({ ...e, equipment: e.exercise.equipment }), rpe(e)].filter(Boolean) as string[];
  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-surface px-3.5 py-3.5">
      <div className="flex justify-between gap-3">
        <span className="text-base font-[650]">
          {index}. {e.exercise.name}
        </span>
        {rest(e.rest_seconds) && <span className="shrink-0 text-[13px] text-mute">{rest(e.rest_seconds)}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="flex h-7 items-center rounded-[14px] bg-raised px-2.5 text-[13px] font-semibold">
            {c}
          </span>
        ))}
      </div>
      {e.progression && <span className="text-[13px] text-lime">↗ {e.progression}</span>}
      {e.notes && <span className="text-[13px] text-mute">{e.notes}</span>}
    </div>
  );
}

/** Bloque de superserie de D5: borde lima, encabezado y filas compactas. */
export function SupersetBlock({ index, group, items }: { index: number; group: string; items: DayExercise[] }) {
  const rounds = items[0]?.sets ?? 0;
  const lastRest = rest(items[items.length - 1]?.rest_seconds);
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-lime p-2.5">
      <div className="flex justify-between px-1 py-0.5">
        <span className="text-xs font-bold tracking-[0.04em] text-lime">
          SUPERSERIE {group} · {rounds} vueltas
        </span>
        {lastRest && <span className="text-xs text-mute">Descanso {lastRest} al final</span>}
      </div>
      {items.map((e, i) => (
        <div key={e.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-3 py-2.5">
          <span className="text-[15px] font-semibold">
            {index}
            {String.fromCharCode(97 + i)} {e.exercise.name}
          </span>
          <span className="shrink-0 text-[13px] text-mute">{compactSpec({ ...e, equipment: e.exercise.equipment })}</span>
        </div>
      ))}
    </div>
  );
}

/** Un día de rutina renderizado como en D5. */
export function RoutineDayView({ exercises }: { exercises: DayExercise[] }) {
  if (exercises.length === 0) return <p className="px-1 text-sm text-mute">Este día no tiene ejercicios.</p>;
  return (
    <div className="flex flex-col gap-2">
      {toBlocks(exercises).map((b) =>
        b.kind === "single" ? (
          <ExerciseCard key={b.item.id} index={b.index} e={b.item} />
        ) : (
          <SupersetBlock key={b.items[0].id} index={b.index} group={b.group} items={b.items} />
        ),
      )}
    </div>
  );
}

/** "Nota para el alumno" de D5. */
export function StudentNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3.5 py-3 text-[13px] leading-[1.4] text-mute">
      <span className="font-semibold text-ink">Nota para el alumno:</span> {text}
    </div>
  );
}
