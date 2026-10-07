"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { InviteShare } from "@/components/teacher/invite-share";
import { initialState, type ActionState } from "@/lib/actions/result";
import { useClientValidation } from "@/lib/validation/use-client-validation";
import { GOAL_SUGGESTIONS, studentSchema } from "@/lib/validation/student";
import { localDateKey } from "@/lib/dates";
import { routes } from "@/lib/navigation";

type Defaults = Partial<Record<
  "firstName" | "lastName" | "email" | "birthDate" | "phone" | "goal" | "level" | "heightCm" | "initialWeight" | "notes",
  string
>>;

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  /** Con cuenta activa el email es el de login y no se edita. */
  emailLocked?: boolean;
  submitLabel: string;
  cancelHref: string;
};

const LEVEL_OPTIONS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export function StudentForm({ action, defaults = {}, emailLocked, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const { onSubmit, errors: fe } = useClientValidation(studentSchema, state.fieldErrors);
  const v = { ...defaults, ...(state.values ?? {}) };

  // Alta exitosa → pantalla de invitación lista.
  if (state.ok && state.data?.studentId) {
    return (
      <div className="flex flex-col gap-3">
        <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-[650]">
              {state.data.firstName ? `${state.data.firstName} ya está en tu lista` : "Alumno creado"}
            </span>
            <span className="text-sm text-mute">
              Mandale el link para que cree su contraseña. Cuando entre, queda vinculado a vos.
            </span>
          </div>
          {state.data.inviteUrl ? (
            <InviteShare url={state.data.inviteUrl} firstName={state.data.firstName} />
          ) : (
            <FormMessage kind="error">{state.message ?? "No pudimos generar la invitación."}</FormMessage>
          )}
        </section>
        <LinkButton href={routes.teacher.student(state.data.studentId)} variant="tonal" className="w-full">
          Ver perfil
        </LinkButton>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-[14px]">
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}

      <div className="grid grid-cols-2 gap-2">
        <TextField name="firstName" label="Nombre" required autoComplete="off" defaultValue={v.firstName} error={fe.firstName} />
        <TextField name="lastName" label="Apellido" autoComplete="off" defaultValue={v.lastName} error={fe.lastName} />
      </div>
      <TextField
        name="email"
        type="email"
        label="Email"
        inputMode="email"
        required
        defaultValue={v.email}
        readOnly={emailLocked}
        hint={emailLocked ? "Es su email de ingreso: lo cambia el alumno desde su cuenta." : undefined}
        error={fe.email}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField name="birthDate" type="date" label="Nacimiento" max={localDateKey()} defaultValue={v.birthDate} error={fe.birthDate} />
        <TextField name="phone" type="tel" label="Teléfono" inputMode="tel" defaultValue={v.phone} error={fe.phone} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="goal" label="Objetivo" list="goal-suggestions" defaultValue={v.goal} error={fe.goal} />
        <SelectField name="level" label="Nivel" options={LEVEL_OPTIONS} placeholder="Elegir" defaultValue={v.level ?? ""} error={fe.level} />
      </div>
      <datalist id="goal-suggestions">
        {GOAL_SUGGESTIONS.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="heightCm" label="Altura (cm)" inputMode="decimal" defaultValue={v.heightCm} error={fe.heightCm} />
        <TextField name="initialWeight" label="Peso inicial (kg)" inputMode="decimal" defaultValue={v.initialWeight} error={fe.initialWeight} />
      </div>
      <TextAreaField name="notes" label="Notas iniciales (opcional)" placeholder="Lesiones, preferencias, horarios…" defaultValue={v.notes} error={fe.notes} />

      <div className="mt-2 flex gap-2">
        <LinkButton href={cancelHref} variant="outline" className="flex-1">
          Cancelar
        </LinkButton>
        <Button type="submit" pending={pending} pendingLabel="Guardando…" className="flex-[1.3]">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
