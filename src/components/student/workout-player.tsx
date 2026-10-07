"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Button } from "@/components/ui/button";
import { BackIcon, CheckIcon, CloseIcon, PlayIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { FormMessage } from "@/components/ui/field";
import { discardWorkoutAction, finishWorkoutAction, logSetAction, setExerciseRpeAction } from "@/lib/actions/workouts";
import { num } from "@/lib/format";

export type PlayerExercise = {
  routineExerciseId: string;
  exerciseId: string;
  name: string;
  videoUrl: string | null;
  sets: number;
  reps: string;
  targetKg: number | null;
  restSeconds: number | null;
  note: string | null;
  /** Series ya registradas (al retomar). */
  logged: { setNumber: number; kg: number | null; reps: number | null; rpe: number | null; done: boolean }[];
  /** Kilos sugeridos: última carga usada, o el objetivo. */
  suggestedKg: number | null;
};

type SetRow = { kg: string; reps: string; done: boolean; saving: boolean };

const fmtClock = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};
const firstInt = (reps: string) => Number((reps.match(/\d+/) ?? [""])[0]) || null;
/** Instante en que termina un descanso de `secs` segundos (solo en handlers). */
const deadlineIn = (secs: number) => Date.now() + secs * 1000;
const toNum = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
/** 142.5 → "142,5" (coma decimal, como en el resto de la app). */
const kgText = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

/** E2 — Entrenamiento en vivo, ejercicio por ejercicio. */
export function WorkoutPlayer({
  workoutId,
  dayName,
  startedAt,
  coachFirstName,
  exercises,
}: {
  workoutId: string;
  dayName: string;
  startedAt: string;
  coachFirstName: string | null;
  exercises: PlayerExercise[];
}) {
  const [rows, setRows] = useState<Record<string, SetRow[]>>(() =>
    Object.fromEntries(
      exercises.map((e) => [
        e.routineExerciseId,
        Array.from({ length: e.sets }, (_, i) => {
          const l = e.logged.find((x) => x.setNumber === i + 1);
          return {
            kg: l?.kg != null ? kgText(l.kg) : kgText(e.suggestedKg),
            reps: l?.reps != null ? String(l.reps) : "",
            done: !!l?.done,
            saving: false,
          };
        }),
      ]),
    ),
  );
  const [rpes, setRpes] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(exercises.map((e) => [e.exerciseId, e.logged.find((l) => l.rpe != null)?.rpe ?? null])),
  );
  // RPE más reciente por ejercicio (evita closures viejas al guardar series).
  const rpeRef = useRef(rpes);
  useEffect(() => {
    rpeRef.current = rpes;
  }, [rpes]);
  const [rpeSaving, setRpeSaving] = useState(false);
  const [index, setIndex] = useState(() => {
    const i = exercises.findIndex((e) => !rowsComplete(e));
    return i === -1 ? 0 : i;
    function rowsComplete(e: PlayerExercise) {
      return e.logged.filter((l) => l.done).length >= e.sets;
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  // Reloj de 1 s: cronómetro de la sesión y cuenta regresiva del descanso.
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      setRestUntil((r) => {
        if (r && r <= n) {
          navigator.vibrate?.(200);
          return null;
        }
        return r;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const restLeft = restUntil ? Math.max(0, Math.round((restUntil - now) / 1000)) : 0;

  const ex = exercises[index];
  const sets = rows[ex.routineExerciseId];
  const isDone = (e: PlayerExercise) => rows[e.routineExerciseId].every((r) => r.done);
  const totals = useMemo(() => {
    const all = Object.values(rows).flat();
    return { done: all.filter((r) => r.done).length, total: all.length };
  }, [rows]);

  function patch(i: number, p: Partial<SetRow>) {
    setRows((cur) => ({ ...cur, [ex.routineExerciseId]: cur[ex.routineExerciseId].map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  }

  async function save(i: number, row: SetRow) {
    const kg = toNum(row.kg);
    const reps = toNum(row.reps);
    if ((kg != null && (!Number.isFinite(kg) || kg < 0 || kg > 999)) || (reps != null && (!Number.isInteger(reps) || reps < 0 || reps > 500))) {
      setError("Revisá kilos y repeticiones.");
      return false;
    }
    patch(i, { saving: true });
    const res = await logSetAction({
      workoutId,
      exerciseId: ex.exerciseId,
      routineExerciseId: ex.routineExerciseId,
      setNumber: i + 1,
      weightKg: kg,
      reps: reps,
      rpe: rpeRef.current[ex.exerciseId] ?? null,
      completed: row.done,
    });
    patch(i, { saving: false });
    if (!res.ok) setError(res.message ?? "No pudimos guardar la serie.");
    else setError(null);
    return res.ok;
  }

  async function toggle(i: number) {
    const cur = sets[i];
    const next: SetRow = { ...cur, done: !cur.done, reps: !cur.done && cur.reps === "" ? String(firstInt(ex.reps) ?? "") : cur.reps };
    patch(i, next);
    const ok = await save(i, next);
    if (!ok) return patch(i, cur);
    if (next.done && ex.restSeconds && i < sets.length - 1) setRestUntil(deadlineIn(ex.restSeconds));
  }

  async function pickRpe(v: number) {
    const value = rpes[ex.exerciseId] === v ? null : v;
    setRpes((r) => ({ ...r, [ex.exerciseId]: value }));
    setRpeSaving(true);
    try {
      await setExerciseRpeAction(workoutId, ex.exerciseId, value);
    } finally {
      setRpeSaving(false);
    }
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const last = index === exercises.length - 1;
  const target = `${ex.reps} × ${ex.targetKg != null ? `${num(ex.targetKg)} kg` : "—"}`.replace(" × —", "");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-3 px-4 pb-36 pt-[58px] lg:pt-8">
      <header className="flex items-center gap-3">
        <IconButton aria-label="Salir del entrenamiento" onClick={() => setExitOpen(true)}>
          <CloseIcon />
        </IconButton>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] text-mute">
            {dayName} · ejercicio {index + 1} de {exercises.length}
          </span>
          <div className="mt-1.5 grid h-[5px] gap-[3px]" style={{ gridTemplateColumns: `repeat(${exercises.length}, minmax(0, 1fr))` }}>
            {exercises.map((e, i) => (
              <div key={e.routineExerciseId} className="rounded-[3px]" style={{ background: isDone(e) ? "#D4F64A" : i === index ? "#F2F2EE" : "#2E3036" }} />
            ))}
          </div>
        </div>
        <span className="tabular text-[17px] font-[650]" aria-label="Tiempo de entrenamiento">
          {fmtClock(elapsed)}
        </span>
      </header>

      <div className="relative flex h-[188px] items-center justify-center rounded-[26px]" style={{ background: "repeating-linear-gradient(135deg, #1F2125 0 12px, #1A1C1F 12px 24px)" }}>
        {ex.videoUrl ? (
          <a href={ex.videoUrl} target="_blank" rel="noreferrer" aria-label={`Ver video de ${ex.name}`} className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-lime text-bg">
            <PlayIcon size={18} />
          </a>
        ) : (
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-raised text-mute">
            <PlayIcon size={18} />
          </span>
        )}
        <span className="absolute bottom-3 left-3.5 text-xs font-semibold text-[#C9CBD0]">
          {ex.videoUrl ? "Video de técnica" : "Sin video cargado"}
        </span>
      </div>

      <section className="flex flex-col gap-1.5 px-1">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">{ex.name}</h1>
        {ex.note && (
          <span className="text-sm leading-[1.4] text-lime">
            {coachFirstName ? `${coachFirstName}: ` : ""}
            {ex.note}
          </span>
        )}
      </section>

      {error && <FormMessage kind="error">{error}</FormMessage>}

      <section className="flex flex-col gap-1 rounded-[24px] bg-surface p-2">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_64px_56px_44px] gap-1.5 px-2 py-1.5 text-xs font-semibold text-mute">
          <span>Serie</span>
          <span>Objetivo</span>
          <span>Kg</span>
          <span>Reps</span>
          <span />
        </div>
        {sets.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[44px_minmax(0,1fr)_64px_56px_44px] items-center gap-1.5 rounded-2xl px-2 py-1.5"
            style={{ background: r.done ? "rgba(212,246,74,0.06)" : "transparent" }}
          >
            <span className="text-[15px] font-[650]">{i + 1}</span>
            <span className="truncate text-[13px] text-mute">{target}</span>
            <input
              aria-label={`Kilos serie ${i + 1}`}
              inputMode="decimal"
              value={r.kg}
              onChange={(e) => patch(i, { kg: e.target.value })}
              onBlur={() => r.done && save(i, sets[i])}
              className="h-10 w-full rounded-xl bg-raised text-center text-[15px] font-[650] text-ink outline-none focus-visible:outline-2 focus-visible:outline-lime"
            />
            <input
              aria-label={`Repeticiones serie ${i + 1}`}
              inputMode="numeric"
              value={r.reps}
              onChange={(e) => patch(i, { reps: e.target.value })}
              onBlur={() => r.done && save(i, sets[i])}
              className="h-10 w-full rounded-xl bg-raised text-center text-[15px] font-[650] text-ink outline-none focus-visible:outline-2 focus-visible:outline-lime"
            />
            <button
              type="button"
              aria-label={`${r.done ? "Desmarcar" : "Marcar"} serie ${i + 1}`}
              aria-pressed={r.done}
              disabled={r.saving}
              onClick={() => toggle(i)}
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: r.done ? "#D4F64A" : "transparent", border: r.done ? "none" : "1.5px solid #4A4D54", color: r.done ? "#111214" : "#4A4D54" }}
            >
              <CheckIcon size={18} strokeWidth={2.6} />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-2">
          <span className="text-xs font-semibold text-mute">¿Qué tan exigente? (RPE)</span>
          <div className="flex gap-1">
            {[6, 7, 8, 9, 10].map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={rpes[ex.exerciseId] === v}
                aria-busy={rpeSaving || undefined}
                disabled={rpeSaving}
                onClick={() => pickRpe(v)}
                className={`h-8 w-8 rounded-[10px] text-[13px] font-semibold ${rpes[ex.exerciseId] === v ? "bg-lime text-bg" : "bg-raised"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>

      {restUntil && restLeft > 0 && (
        <div className="flex items-center justify-between rounded-[20px] bg-[rgba(212,246,74,0.12)] px-4 py-3 text-lime" role="timer" aria-live="off">
          <span className="text-sm font-[650]">Descanso</span>
          <span className="flex items-center gap-3">
            <span className="tabular text-[22px] font-bold">{fmtClock(restLeft)}</span>
            <button type="button" onClick={() => setRestUntil(null)} className="text-xs font-semibold underline underline-offset-2">
              Saltar
            </button>
          </span>
        </div>
      )}

      <div className="fixed inset-x-4 bottom-7 z-30 mx-auto flex max-w-[608px] gap-2 bg-bg pt-2.5 shadow-[0_-24px_40px_rgba(17,18,20,0.95)]">
        <button
          type="button"
          aria-label="Ejercicio anterior"
          disabled={index === 0}
          onClick={() => {
            setIndex(index - 1);
            setRestUntil(null);
          }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface disabled:opacity-40"
        >
          <BackIcon />
        </button>
        <Button
          type="button"
          className="min-w-0 flex-1 !text-base"
          onClick={() => {
            if (last) setFinishOpen(true);
            else {
              setIndex(index + 1);
              setRestUntil(null);
              window.scrollTo({ top: 0 });
            }
          }}
        >
          <span className="truncate">{last ? "Terminar entrenamiento" : `Siguiente: ${exercises[index + 1].name}`}</span>
        </Button>
      </div>

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Terminar entrenamiento">
        <form action={finishWorkoutAction.bind(null, workoutId)} className="flex flex-col gap-3 px-2 pb-2">
          <p className="px-1 text-sm text-mute">
            Completaste {totals.done} de {totals.total} series en {fmtClock(elapsed)}.
            {totals.done < totals.total ? " Las series sin marcar no se cuentan." : ""}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-sm text-mute">¿Cómo te sentiste? (opcional)</span>
            <textarea
              name="notes"
              maxLength={1000}
              placeholder="Molestias, energía, algo para tu coach…"
              className="min-h-[72px] resize-none rounded-[20px] bg-raised p-3.5 text-[15px] text-ink placeholder:text-mute outline-none"
            />
          </label>
          <Button type="submit" disabled={totals.done === 0}>
            {totals.done === 0 ? "Marcá al menos una serie" : "Finalizar y guardar"}
          </Button>
        </form>
      </Sheet>

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="¿Salir del entrenamiento?">
        <div className="flex flex-col gap-2 px-2 pb-2">
          <p className="px-1 text-sm text-mute">Lo que registraste queda guardado. Podés retomarlo hoy desde el inicio.</p>
          <a href="/student" className="flex h-14 items-center justify-center rounded-[28px] bg-raised text-[15px] font-semibold">
            Salir y seguir después
          </a>
          {totals.done === 0 && (
            <form action={discardWorkoutAction.bind(null, workoutId)}>
              <Button type="submit" variant="outline" className="w-full !border-coral !text-coral">
                Descartar entrenamiento
              </Button>
            </form>
          )}
        </div>
      </Sheet>
    </main>
  );
}
