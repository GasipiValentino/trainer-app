"use client";

import type { DragEvent } from "react";
import { load, rest, rpe, setsReps, compactSpec } from "@/lib/domain/routine-format";
import type { EditorExercise } from "@/components/routine/editor-state";

const toSpec = (e: EditorExercise) => ({
  sets: Number(e.sets) || 0,
  reps: e.reps,
  weight_kg: e.weight_kg === "" ? null : Number(e.weight_kg.replace(",", ".")),
  rpe_target: e.rpe_target === "" ? null : Number(e.rpe_target.replace(",", ".")),
  rest_seconds: e.rest_seconds === "" ? null : Number(e.rest_seconds),
  superset_group: e.superset_group || null,
  equipment: e.equipment,
});

type Handlers = {
  onToggle: () => void;
  onChange: (patch: Partial<EditorExercise>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  drag: {
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
};

/** Asa de 6 puntos de D5. */
function Handle() {
  return (
    <div aria-hidden className="grid cursor-grab grid-cols-[4px_4px] content-start gap-[3px] pt-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-task" />
      ))}
    </div>
  );
}

/** Ejercicio suelto: tarjeta D5 + panel de edición al tocarla. */
export function ExerciseItem({
  e,
  index,
  open,
  first,
  last,
  ...h
}: { e: EditorExercise; index: number; open: boolean; first: boolean; last: boolean } & Handlers) {
  const spec = toSpec(e);
  const chips = [setsReps(spec), load(spec), rpe(spec)].filter(Boolean) as string[];
  return (
    <div draggable onDragStart={h.drag.onDragStart} onDragOver={h.drag.onDragOver} onDrop={h.drag.onDrop} className="rounded-[20px] bg-surface">
      <button type="button" onClick={h.onToggle} aria-expanded={open} className="grid w-full grid-cols-[18px_minmax(0,1fr)] gap-2.5 py-3.5 pl-2.5 pr-3.5 text-left">
        <Handle />
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-3">
            <span className="text-base font-[650]">
              {index}. {e.name}
            </span>
            {rest(spec.rest_seconds) && <span className="shrink-0 text-[13px] text-mute">{rest(spec.rest_seconds)}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="flex h-7 items-center rounded-[14px] bg-raised px-2.5 text-[13px] font-semibold">
                {c}
              </span>
            ))}
          </div>
          {e.progression && <span className="text-[13px] text-lime">↗ {e.progression}</span>}
        </div>
      </button>
      {open && <EditPanel e={e} first={first} last={last} {...h} />}
    </div>
  );
}

/** Fila dentro de una superserie (D5 "3a Remo con mancuerna · 3 × 10 · 32 kg"). */
export function SupersetRow({
  e,
  label,
  open,
  first,
  last,
  ...h
}: { e: EditorExercise; label: string; open: boolean; first: boolean; last: boolean } & Handlers) {
  return (
    <div draggable onDragStart={h.drag.onDragStart} onDragOver={h.drag.onDragOver} onDrop={h.drag.onDrop} className="rounded-[14px] bg-surface">
      <button type="button" onClick={h.onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
        <span className="text-[15px] font-semibold">
          {label} {e.name}
        </span>
        <span className="shrink-0 text-[13px] text-mute">{compactSpec(toSpec(e))}</span>
      </button>
      {open && <EditPanel e={e} first={first} last={last} {...h} />}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode = "decimal",
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? "col-span-full" : ""}`}>
      <span className="px-1 text-xs text-mute">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        className="h-10 w-full min-w-0 rounded-[14px] bg-raised px-3 text-sm text-ink placeholder:text-mute outline-none focus-visible:outline-2 focus-visible:outline-lime"
      />
    </label>
  );
}

function EditPanel({ e, first, last, onChange, onMove, onRemove }: { e: EditorExercise; first: boolean; last: boolean } & Handlers) {
  return (
    <div className="flex flex-col gap-3 border-t border-track px-3.5 pb-3.5 pt-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Field label="Series" value={e.sets} inputMode="numeric" onChange={(v) => onChange({ sets: v })} />
        <Field label="Reps" value={e.reps} inputMode="text" placeholder="8-10" onChange={(v) => onChange({ reps: v })} />
        <Field label="Kg" value={e.weight_kg} placeholder="—" onChange={(v) => onChange({ weight_kg: v })} />
        <Field label="RPE" value={e.rpe_target} placeholder="—" onChange={(v) => onChange({ rpe_target: v })} />
        <Field label="Descanso (s)" value={e.rest_seconds} inputMode="numeric" onChange={(v) => onChange({ rest_seconds: v })} />
        <label className="flex flex-col gap-1">
          <span className="px-1 text-xs text-mute">Superserie</span>
          <select
            value={e.superset_group}
            onChange={(ev) => onChange({ superset_group: ev.target.value })}
            className="h-10 rounded-[14px] bg-raised px-3 text-sm text-ink outline-none"
          >
            <option value="">No</option>
            {["A", "B", "C", "D"].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <Field label="Progresión" value={e.progression} inputMode="text" placeholder="+2,5 kg por semana si RPE ≤ 8" wide onChange={(v) => onChange({ progression: v })} />
        <Field label="Indicación para el alumno" value={e.notes} inputMode="text" placeholder="Bajá en 3 segundos…" wide onChange={(v) => onChange({ notes: v })} />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={first} onClick={() => onMove(-1)} className="h-9 rounded-[18px] border border-line px-3 text-[13px] font-semibold disabled:opacity-40">
          ↑ Subir
        </button>
        <button type="button" disabled={last} onClick={() => onMove(1)} className="h-9 rounded-[18px] border border-line px-3 text-[13px] font-semibold disabled:opacity-40">
          ↓ Bajar
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onRemove} className="h-9 px-2 text-[13px] font-semibold text-coral">
          Quitar
        </button>
      </div>
    </div>
  );
}
