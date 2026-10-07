"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/field";
import { initialState } from "@/lib/actions/result";
import { submitCheckinAction } from "@/lib/actions/checkin";

const QUESTIONS = [
  { key: "energy", label: "Energía" },
  { key: "sleep", label: "Sueño" },
  { key: "stress", label: "Estrés" },
  { key: "pain", label: "Dolor" },
  { key: "motivation", label: "Motivación" },
] as const;
type Key = (typeof QUESTIONS)[number]["key"];

/** E4 — "¿Cómo fue tu semana?": 5 escalas, entrenos y comentario. */
export function CheckinForm({
  weekStart,
  coachFirstName,
  planned,
  doneDefault,
  initial,
}: {
  weekStart: string;
  coachFirstName: string;
  planned: number;
  doneDefault: number;
  initial?: Partial<Record<Key, number>> & { notes?: string | null; done?: number | null };
}) {
  const [state, action, pending] = useActionState(submitCheckinAction, initialState);
  const [answers, setAnswers] = useState<Partial<Record<Key, number>>>(() => {
    const out: Partial<Record<Key, number>> = {};
    for (const q of QUESTIONS) if (initial?.[q.key]) out[q.key] = initial[q.key];
    return out;
  });
  const [done, setDone] = useState(initial?.done ?? doneDefault);
  const missing = QUESTIONS.filter((q) => !answers[q.key]).length;

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="workoutsDone" value={done} />
      <input type="hidden" name="workoutsPlanned" value={planned} />
      {QUESTIONS.map((q) => (
        <input key={q.key} type="hidden" name={q.key} value={answers[q.key] ?? ""} />
      ))}
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}

      <section className="flex flex-col rounded-[24px] bg-surface px-3.5 py-2">
        {QUESTIONS.map((q, qi) => (
          <div key={q.key} role="radiogroup" aria-label={q.label} className={`flex items-center justify-between gap-2 py-2.5 ${qi < QUESTIONS.length - 1 ? "border-b border-track" : ""}`}>
            <span className="w-[92px] shrink-0 text-base font-semibold">{q.label}</span>
            <div className="grid max-w-[284px] flex-1 grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = answers[q.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${q.label} ${n}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: n }))}
                    className={`h-[46px] w-full rounded-2xl text-base font-semibold ${on ? "bg-lime text-bg" : "bg-raised"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="flex items-center justify-between gap-3 rounded-[24px] bg-surface px-[18px] py-4">
        <div className="flex flex-col">
          <span className="text-base font-semibold">Entrenamientos</span>
          <span className="text-xs text-mute">Tenías {planned} planificados</span>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Uno menos"
            disabled={done <= 0}
            onClick={() => setDone((d) => Math.max(0, d - 1))}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[1.5px] border-line text-xl disabled:opacity-40"
          >
            −
          </button>
          <span className="tabular w-6 text-center text-2xl font-bold" aria-live="polite">
            {done}
          </span>
          <button
            type="button"
            aria-label="Uno más"
            disabled={done >= 14}
            onClick={() => setDone((d) => Math.min(14, d + 1))}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-lime text-xl text-bg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </section>

      <label className="flex flex-col gap-2">
        <span className="px-1 text-sm text-mute">¿Algo que {coachFirstName} deba saber? (opcional)</span>
        <textarea
          name="notes"
          maxLength={1000}
          defaultValue={initial?.notes ?? ""}
          placeholder="Molestias, cambios de horario, cómo te sentiste…"
          className="h-[72px] resize-none rounded-[20px] bg-surface p-3.5 text-[15px] text-ink placeholder:text-mute outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={missing > 0 || pending}
        className="mt-2 h-14 rounded-[28px] bg-lime text-[15px] font-bold text-bg disabled:bg-raised disabled:text-mute"
      >
        {pending ? "Enviando…" : missing > 0 ? `Faltan ${missing} ${missing === 1 ? "respuesta" : "respuestas"}` : `Enviar a ${coachFirstName}`}
      </button>
    </form>
  );
}
