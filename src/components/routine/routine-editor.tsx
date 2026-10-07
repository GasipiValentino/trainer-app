"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import { IconButton, IconLink, Button } from "@/components/ui/button";
import { BackIcon, CopyIcon } from "@/components/ui/icons";
import { initials } from "@/components/ui/avatar";
import { FormMessage } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { ExerciseLibrary } from "@/components/routine/exercise-library";
import { ExerciseItem, SupersetRow } from "@/components/routine/exercise-item";
import { AssignSheet } from "@/components/routine/assign-sheet";
import {
  addDay,
  appendExercises,
  moveExercise,
  fromDetail,
  removeDay,
  removeExercise,
  toPayload,
  updateDay,
  updateExercise,
  type EditorRoutine,
} from "@/components/routine/editor-state";
import { deleteRoutineAction, duplicateRoutineAction, saveRoutineAction } from "@/lib/actions/routines";
import { rest, toBlocks } from "@/lib/domain/routine-format";
import { routes } from "@/lib/navigation";
import type { LibraryExercise } from "@/lib/data/routines";

type Student = { id: string; first_name: string; last_name: string; status: string; goal: string | null };

/** D5 — Editor de rutina. */
export function RoutineEditor({
  initial,
  library,
  students,
  assigned,
  today,
  openAssign = false,
}: {
  initial: EditorRoutine;
  library: LibraryExercise[];
  students: Student[];
  assigned: { id: string; firstName: string; lastName: string }[];
  today: string;
  /** Abrir la hoja de asignación al montar (después de crear con "Guardar y asignar"). */
  openAssign?: boolean;
}) {
  const router = useRouter();
  const [r, setR] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [dayKey, setDayKey] = useState(initial.days[0].key);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(openAssign);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dragKey = useRef<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(r) !== JSON.stringify(baseline), [r, baseline]);
  const day = r.days.find((d) => d.key === dayKey) ?? r.days[0];
  const dayIndex = r.days.findIndex((d) => d.key === day.key);

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(
    (assignAfter = false) => {
      setError(null);
      startSave(async () => {
        const res = await saveRoutineAction(toPayload(r));
        if (!res.ok) return setError(res.message);
        if (!r.id) {
          // Rutina nueva: pasa a su URL definitiva (y abre la asignación si se pidió).
          setBaseline(r);
          router.replace(`${routes.teacher.routine(res.id)}${assignAfter ? "?assign=1" : ""}`);
          return;
        }
        // Resincroniza con lo guardado: los ejercicios nuevos ya tienen id.
        const saved = fromDetail(res.routine);
        const idx = r.days.findIndex((d) => d.key === dayKey);
        setR(saved);
        setBaseline(saved);
        setDayKey(saved.days[Math.max(0, idx)]?.key ?? saved.days[0].key);
        setOpenKey(null);
        router.refresh();
        if (assignAfter) setAssignOpen(true);
      });
    },
    [r, router, dayKey],
  );

  const drag = (exKey: string, index: number) => ({
    onDragStart: (e: DragEvent) => {
      dragKey.current = exKey;
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragKey.current) setR((cur) => moveExercise(cur, day.key, dragKey.current!, index));
      dragKey.current = null;
    },
  });

  const handlers = (exKey: string, index: number) => ({
    onToggle: () => setOpenKey((k) => (k === exKey ? null : exKey)),
    onChange: (patch: Parameters<typeof updateExercise>[3]) => setR((cur) => updateExercise(cur, day.key, exKey, patch)),
    onMove: (dir: -1 | 1) => setR((cur) => moveExercise(cur, day.key, exKey, index + dir)),
    onRemove: () => setR((cur) => removeExercise(cur, day.key, exKey)),
    drag: drag(exKey, index),
  });

  const positions = new Map(day.exercises.map((e, i) => [e.key, i]));
  const blocks = toBlocks(day.exercises);
  const total = day.exercises.length;


  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-4 pb-36 pt-[58px] lg:px-8 lg:pt-8">
      <header className="flex items-center justify-between">
        <IconLink href={routes.teacher.routines} aria-label="Volver">
          <BackIcon />
        </IconLink>
        <div className="flex gap-2">
          {r.id && (
            <form action={duplicateRoutineAction.bind(null, r.id)}>
              <IconButton type="submit" aria-label="Duplicar rutina">
                <CopyIcon size={18} strokeWidth={2} />
              </IconButton>
            </form>
          )}
          <IconButton aria-label="Guardar sin asignar" onClick={() => save()} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={dirty ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d="M6 4h12v16l-6-4-6 4z" />
            </svg>
          </IconButton>
        </div>
      </header>

      <section className="flex flex-col gap-1.5 px-1">
        <input
          value={r.name}
          onChange={(e) => setR({ ...r, name: e.target.value })}
          placeholder="Nombre de la rutina"
          aria-label="Nombre de la rutina"
          className="w-full bg-transparent text-[26px] font-bold tracking-[-0.03em] text-ink placeholder:text-mute outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-mute">
          {assigned.length > 0 && (
            <div className="flex">
              {assigned.slice(0, 3).map((a, i) => (
                <span
                  key={a.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg text-[9px] font-semibold text-ink"
                  style={{ background: ["#3A3C42", "#4A4D54", "#5A5D64"][i], marginLeft: i ? -8 : 0 }}
                >
                  {initials(a.firstName, a.lastName)}
                </span>
              ))}
            </div>
          )}
          <span>{assigned.length ? `Asignada a ${assigned.length} ${assigned.length === 1 ? "alumno" : "alumnos"}` : "Sin asignar"} ·</span>
          <select
            value={r.duration_weeks}
            onChange={(e) => setR({ ...r, duration_weeks: e.target.value })}
            aria-label="Duración en semanas"
            className="rounded-md bg-transparent text-[13px] text-mute underline decoration-dotted underline-offset-4 outline-none hover:text-ink"
          >
            <option value="">Sin duración</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "semana" : "semanas"}
              </option>
            ))}
          </select>
          <span>· {r.days.length} {r.days.length === 1 ? "día" : "días"}</span>
        </div>
      </section>

      {/* Días */}
      <div className="no-scrollbar -mr-4 flex gap-1.5 overflow-x-auto pr-4 lg:mr-0 lg:pr-0">
        {r.days.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onClick={() => {
              setDayKey(d.key);
              setOpenKey(null);
            }}
            className={`flex h-10 shrink-0 items-center rounded-[20px] px-3.5 text-sm font-semibold ${
              d.key === day.key ? "bg-ink text-bg" : "border border-line"
            }`}
          >
            Día {i + 1} · {d.name}
          </button>
        ))}
        {r.days.length < 7 && (
          <button
            type="button"
            aria-label="Agregar día"
            onClick={() => {
              const next = addDay(r);
              setR(next);
              setDayKey(next.days[next.days.length - 1].key);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] border border-line text-lg"
          >
            +
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        <input
          value={day.name}
          onChange={(e) => setR(updateDay(r, day.key, { name: e.target.value }))}
          aria-label={`Nombre del día ${dayIndex + 1}`}
          className="h-9 min-w-0 flex-1 rounded-[18px] bg-surface px-3 text-sm text-ink outline-none"
        />
        {r.days.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const next = removeDay(r, day.key);
              setR(next);
              setDayKey(next.days[Math.max(0, dayIndex - 1)].key);
            }}
            className="h-9 px-2 text-[13px] font-semibold text-mute hover:text-coral"
          >
            Quitar día
          </button>
        )}
      </div>

      {/* Ejercicios */}
      <section className="flex flex-col gap-2">
        {total === 0 && (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-line-soft px-4 py-6 text-center text-sm text-mute">
            Este día todavía no tiene ejercicios. Tocá “+ Ejercicio”.
          </div>
        )}
        {blocks.map((b) =>
          b.kind === "single" ? (
            <ExerciseItem
              key={b.item.key}
              e={b.item}
              index={b.index}
              open={openKey === b.item.key}
              first={positions.get(b.item.key) === 0}
              last={positions.get(b.item.key) === total - 1}
              {...handlers(b.item.key, positions.get(b.item.key)!)}
            />
          ) : (
            <div key={b.items[0].key} className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-lime p-2.5">
              <div className="flex justify-between px-1 py-0.5">
                <span className="text-xs font-bold tracking-[0.04em] text-lime">
                  SUPERSERIE {b.group} · {b.items[0].sets} vueltas
                </span>
                {rest(Number(b.items[b.items.length - 1].rest_seconds) || null) && (
                  <span className="text-xs text-mute">Descanso {rest(Number(b.items[b.items.length - 1].rest_seconds))} al final</span>
                )}
              </div>
              {b.items.map((e, j) => (
                <SupersetRow
                  key={e.key}
                  e={e}
                  label={`${b.index}${String.fromCharCode(97 + j)}`}
                  open={openKey === e.key}
                  first={positions.get(e.key) === 0}
                  last={positions.get(e.key) === total - 1}
                  {...handlers(e.key, positions.get(e.key)!)}
                />
              ))}
            </div>
          ),
        )}

        <label className="flex flex-col gap-1 rounded-2xl bg-surface px-3.5 py-3 text-[13px] leading-[1.4] text-mute">
          <span className="font-semibold text-ink">Nota para el alumno:</span>
          <textarea
            value={r.student_note}
            onChange={(e) => setR({ ...r, student_note: e.target.value })}
            rows={2}
            placeholder="Indicaciones generales del bloque (opcional)"
            className="resize-none bg-transparent text-[13px] text-mute placeholder:text-task outline-none"
          />
        </label>

        {r.id && (
          <button type="button" onClick={() => setDeleteOpen(true)} className="self-center px-3 py-2 text-[13px] font-semibold text-mute hover:text-coral">
            Eliminar rutina
          </button>
        )}
      </section>

      {/* Barra inferior (D5) */}
      <div className="fixed inset-x-4 bottom-7 z-30 mx-auto flex max-w-[696px] flex-col gap-2 bg-bg pt-2.5 shadow-[0_-24px_40px_rgba(17,18,20,0.95)]">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="h-14 flex-1 rounded-[28px] border-[1.5px] border-dashed border-line-soft text-[15px] font-semibold"
          >
            + Ejercicio
          </button>
          <Button type="button" className="flex-[1.3]" pending={saving} pendingLabel="Guardando…" onClick={() => save(true)}>
            Guardar y asignar
          </Button>
        </div>
      </div>

      {libraryOpen && (
        <ExerciseLibrary
          exercises={library}
          dayLabel={`Día ${dayIndex + 1} · ${day.name}`}
          onClose={() => setLibraryOpen(false)}
          onAdd={(items) => {
            setR((cur) => appendExercises(cur, day.key, items));
            setLibraryOpen(false);
          }}
        />
      )}

      <AssignSheet
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        routineId={r.id}
        students={students}
        assignedIds={assigned.map((a) => a.id)}
        today={today}
      />

      {r.id && (
        <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Eliminar rutina">
          <div className="flex flex-col gap-3 px-2 pb-2">
            <p className="px-1 text-sm text-mute">
              {assigned.length
                ? `La tienen asignada ${assigned.length} ${assigned.length === 1 ? "alumno" : "alumnos"}: se quedan sin rutina activa. Los entrenamientos ya registrados no se borran.`
                : "Los entrenamientos ya registrados con esta rutina no se borran."}
            </p>
            <form action={deleteRoutineAction.bind(null, r.id)}>
              <Button type="submit" variant="outline" className="w-full !border-coral !text-coral">
                Eliminar “{r.name}”
              </Button>
            </form>
          </div>
        </Sheet>
      )}
    </main>
  );
}
