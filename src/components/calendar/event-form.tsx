"use client";

import { useActionState, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { PillButton, PillRow } from "@/components/ui/pills";
import { initialState } from "@/lib/actions/result";
import { saveEventAction } from "@/lib/actions/calendar";
import { useClientValidation } from "@/lib/validation/use-client-validation";
import { EVENT_TYPES, eventSchema, type EventType } from "@/lib/validation/event";
import { routes } from "@/lib/navigation";

type Defaults = {
  type: EventType;
  studentId: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  description: string;
};

/** Alta/edición de evento con las piezas del diseño (pastillas de D2/D8, campos de E4). */
export function EventForm({
  eventId,
  defaults,
  students,
}: {
  eventId?: string;
  defaults: Defaults;
  students: { id: string; first_name: string; last_name: string }[];
}) {
  const [state, action, pending] = useActionState(saveEventAction.bind(null, eventId ?? ""), initialState);
  const { onSubmit, errors } = useClientValidation(eventSchema, state.fieldErrors);
  const v = { ...defaults, ...(state.values ?? {}) } as Defaults;
  const [type, setType] = useState<EventType>(v.type);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-[14px]">
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-sm text-mute">Tipo</span>
        <PillRow>
          {EVENT_TYPES.map((t) => (
            <PillButton key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
              {t.label}
            </PillButton>
          ))}
        </PillRow>
      </div>
      {type !== "tarea" && (
        <SelectField
          name="studentId"
          label="Alumno (opcional)"
          placeholder="Sin alumno · grupo o personal"
          defaultValue={v.studentId}
          options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}`.trim() }))}
          error={errors.studentId}
        />
      )}
      {type === "tarea" && <input type="hidden" name="studentId" value="" />}
      <TextField
        name="title"
        label={type === "tarea" ? "Tarea" : "Título"}
        placeholder={type === "tarea" ? "Ajustar rutina de…" : "Tren inferior, Evaluación y mediciones…"}
        defaultValue={v.title}
        error={errors.title}
      />
      <div className="grid grid-cols-3 gap-2">
        <TextField name="date" type="date" label="Fecha" defaultValue={v.date} error={errors.date} className="col-span-2" />
        <TextField name="time" type="time" label="Hora" defaultValue={v.time} error={errors.time} />
      </div>
      {type !== "tarea" && (
        <TextField name="duration" label="Duración (min)" inputMode="numeric" defaultValue={v.duration} error={errors.duration} />
      )}
      {type === "tarea" && <input type="hidden" name="duration" value="" />}
      <TextAreaField name="description" label="Notas (opcional)" defaultValue={v.description} error={errors.description} />
      <div className="mt-2 flex gap-2">
        <LinkButton href={`${routes.teacher.calendar}?date=${defaults.date}`} variant="outline" className="flex-1">
          Cancelar
        </LinkButton>
        <Button type="submit" pending={pending} pendingLabel="Guardando…" className="flex-[1.3]">
          {eventId ? "Guardar cambios" : "Agendar"}
        </Button>
      </div>
    </form>
  );
}
