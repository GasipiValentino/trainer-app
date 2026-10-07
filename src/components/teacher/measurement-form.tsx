"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormMessage, TextAreaField, TextField } from "@/components/ui/field";
import { initialState } from "@/lib/actions/result";
import { addMeasurementAction } from "@/lib/actions/students";
import { useClientValidation } from "@/lib/validation/use-client-validation";
import { measurementSchema } from "@/lib/validation/student";

const FIELDS = [
  { name: "weight", label: "Peso (kg)" },
  { name: "bodyFat", label: "Grasa (%)" },
  { name: "muscleMass", label: "Masa muscular (kg)" },
  { name: "waist", label: "Cintura (cm)" },
  { name: "chest", label: "Pecho (cm)" },
  { name: "hips", label: "Cadera (cm)" },
  { name: "arm", label: "Brazo (cm)" },
  { name: "thigh", label: "Muslo (cm)" },
] as const;

/** Nueva medición: todas las medidas son opcionales, al menos una. */
export function MeasurementForm({
  studentId,
  today,
  cancelHref,
  last,
}: {
  studentId: string;
  today: string;
  cancelHref: string;
  last: Partial<Record<(typeof FIELDS)[number]["name"], string>>;
}) {
  const [state, action, pending] = useActionState(addMeasurementAction.bind(null, studentId), initialState);
  const { onSubmit, errors } = useClientValidation(measurementSchema, state.fieldErrors);
  const v = state.values ?? {};

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-[14px]">
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField name="date" type="date" label="Fecha" max={today} defaultValue={v.date ?? today} error={errors.date} />
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <TextField
            key={f.name}
            name={f.name}
            label={f.label}
            inputMode="decimal"
            placeholder={last[f.name] ? `Antes: ${last[f.name]}` : undefined}
            defaultValue={v[f.name]}
            error={errors[f.name]}
          />
        ))}
      </div>
      <TextAreaField name="notes" label="Notas (opcional)" defaultValue={v.notes} error={errors.notes} />
      <div className="mt-2 flex gap-2">
        <LinkButton href={cancelHref} variant="outline" className="flex-1">
          Cancelar
        </LinkButton>
        <Button type="submit" pending={pending} pendingLabel="Guardando…" className="flex-[1.3]">
          Guardar medición
        </Button>
      </div>
    </form>
  );
}
