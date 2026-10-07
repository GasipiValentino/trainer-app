"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormMessage, SelectField, TextField } from "@/components/ui/field";
import { initialState } from "@/lib/actions/result";
import { assignRoutineAction } from "@/lib/actions/students";
import { localDateKey } from "@/lib/dates";
import { routes } from "@/lib/navigation";

/** Asignar (o cambiar) la rutina activa de un alumno. */
export function AssignRoutineForm({
  studentId,
  options,
  currentId,
}: {
  studentId: string;
  options: { id: string; name: string }[];
  currentId?: string;
}) {
  const [state, action, pending] = useActionState(assignRoutineAction.bind(null, studentId), initialState);
  const fe = state.fieldErrors ?? {};

  if (options.length === 0) {
    return (
      <section className="flex flex-col gap-3 self-start rounded-[24px] bg-surface px-[18px] py-4">
        <span className="text-base font-[650]">Todavía no tenés rutinas</span>
        <LinkButton href={routes.teacher.newRoutine} size="md">
          Crear rutina
        </LinkButton>
      </section>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 self-start rounded-[24px] bg-surface px-[18px] py-4">
      <span className="text-base font-[650]">{currentId ? "Cambiar rutina" : "Asignar rutina"}</span>
      {state.message && <FormMessage kind={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <SelectField
        name="routineId"
        label="Rutina"
        onCard
        placeholder="Elegir rutina"
        defaultValue=""
        options={options.filter((o) => o.id !== currentId).map((o) => ({ value: o.id, label: o.name }))}
        error={fe.routineId}
      />
      <TextField name="startDate" type="date" label="Empieza" onCard defaultValue={localDateKey()} error={fe.startDate} />
      {currentId && <p className="px-1 text-[13px] text-mute">La rutina actual queda como completada en el historial.</p>}
      <Button type="submit" size="md" pending={pending} pendingLabel="Asignando…">
        {currentId ? "Cambiar rutina" : "Asignar"}
      </Button>
    </form>
  );
}
