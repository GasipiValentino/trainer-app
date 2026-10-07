"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextAreaField } from "@/components/ui/field";
import { initialState } from "@/lib/actions/result";
import { addNoteAction, deleteNoteAction } from "@/lib/actions/students";
import { useClientValidation } from "@/lib/validation/use-client-validation";
import { noteSchema } from "@/lib/validation/student";
import { localDateKey, shortDateUpper } from "@/lib/dates";

type Note = { id: string; content: string; created_at: string };

/** Pestaña Notas: privadas del profesor (el alumno nunca las ve — RLS). */
export function NotesTab({ studentId, notes }: { studentId: string; notes: Note[] }) {
  const [state, action, pending] = useActionState(addNoteAction.bind(null, studentId), initialState);
  const { onSubmit, errors } = useClientValidation(noteSchema, state.fieldErrors);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-2.5 rounded-[24px] bg-surface px-[18px] py-4">
        {state.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
        <TextAreaField name="content" label="Nueva nota (solo la ves vos)" onCard placeholder="Observaciones, ajustes, cosas a recordar…" error={errors.content} />
        <Button type="submit" size="md" pending={pending} pendingLabel="Guardando…" className="self-end">
          Guardar nota
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="px-1 text-sm text-mute">Todavía no hay notas.</p>
      ) : (
        <section className="flex flex-col gap-1.5 rounded-[24px] bg-surface p-2">
          {notes.map((n) => (
            <article key={n.id} className="flex items-start gap-3 rounded-[18px] bg-raised px-3 py-2.5">
              <span className="w-[52px] shrink-0 pt-0.5 text-sm font-semibold text-mute">{shortDateUpper(localDateKey(n.created_at))}</span>
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{n.content}</p>
              <form action={deleteNoteAction.bind(null, studentId, n.id)}>
                <button type="submit" className="text-[13px] font-semibold text-mute hover:text-coral">
                  Borrar
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
