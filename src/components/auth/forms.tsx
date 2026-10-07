"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { initialState } from "@/lib/actions/result";
import { useClientValidation } from "@/lib/validation/use-client-validation";
import {
  deleteAccountSchema,
  forgotSchema,
  inviteRegisterSchema,
  loginSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validation/auth";
import {
  deleteAccountAction,
  forgotPasswordAction,
  inviteRegisterAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/lib/auth/actions";

const PASSWORD_HINT = "Mínimo 8 caracteres, con letras y números.";

// ------------------------------------------------------------------ login
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(loginSchema, state.fieldErrors);
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={fe.email}
      />
      <TextField
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        error={fe.password}
      />
      <Link href="/forgot-password" className="self-end px-1 text-[13px] font-semibold text-lime">
        Olvidé mi contraseña
      </Link>
      <Button type="submit" pending={pending} pendingLabel="Ingresando…" className="mt-2 w-full">
        Ingresar
      </Button>
    </form>
  );
}

// ------------------------------------------------------ registro profesor
export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(registerSchema, state.fieldErrors);
  if (state.ok && state.message) {
    return (
      <div className="flex flex-col gap-[14px]">
        <FormMessage kind="success">{state.message}</FormMessage>
        <Link href="/login" className="px-1 text-sm font-semibold text-lime">
          Volver a ingresar
        </Link>
      </div>
    );
  }
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <div className="grid grid-cols-2 gap-2">
        <TextField name="firstName" label="Nombre" autoComplete="given-name" required defaultValue={state.values?.firstName} error={fe.firstName} />
        <TextField name="lastName" label="Apellido" autoComplete="family-name" required defaultValue={state.values?.lastName} error={fe.lastName} />
      </div>
      <TextField name="email" type="email" label="Email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={fe.email} />
      <TextField name="password" type="password" label="Contraseña" autoComplete="new-password" required hint={PASSWORD_HINT} error={fe.password} />
      <TextField name="confirm" type="password" label="Repetí la contraseña" autoComplete="new-password" required error={fe.confirm} />
      <Button type="submit" pending={pending} pendingLabel="Creando cuenta…" className="mt-2 w-full">
        Crear cuenta
      </Button>
    </form>
  );
}

// ------------------------------------------------- registro por invitación
export function InviteRegisterForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(inviteRegisterAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(inviteRegisterSchema, state.fieldErrors);
  if (state.ok && state.message) {
    return <FormMessage kind="success">{state.message}</FormMessage>;
  }
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField name="email" type="email" label="Email" value={email} readOnly disabled />
      <TextField name="password" type="password" label="Creá tu contraseña" autoComplete="new-password" required hint={PASSWORD_HINT} error={fe.password} />
      <TextField name="confirm" type="password" label="Repetí la contraseña" autoComplete="new-password" required error={fe.confirm ?? fe.token} />
      <Button type="submit" pending={pending} pendingLabel="Activando…" className="mt-2 w-full">
        Activar mi cuenta
      </Button>
    </form>
  );
}

// ------------------------------------------------------ olvidé contraseña
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(forgotSchema, state.fieldErrors);
  if (state.ok && state.message) {
    return (
      <div className="flex flex-col gap-[14px]">
        <FormMessage kind="success">{state.message}</FormMessage>
        <Link href="/login" className="px-1 text-sm font-semibold text-lime">
          Volver a ingresar
        </Link>
      </div>
    );
  }
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField name="email" type="email" label="Email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={fe.email} />
      <Button type="submit" pending={pending} pendingLabel="Enviando…" className="mt-2 w-full">
        Enviar link
      </Button>
    </form>
  );
}

// -------------------------------------------------------- nueva contraseña
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(resetSchema, state.fieldErrors);
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField name="password" type="password" label="Nueva contraseña" autoComplete="new-password" required hint={PASSWORD_HINT} error={fe.password} />
      <TextField name="confirm" type="password" label="Repetí la contraseña" autoComplete="new-password" required error={fe.confirm} />
      <Button type="submit" pending={pending} pendingLabel="Guardando…" className="mt-2 w-full">
        Guardar contraseña
      </Button>
    </form>
  );
}

// --------------------------------------------------------- eliminar cuenta
export function DeleteAccountForm({ consequence }: { consequence: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, initialState);
  const { onSubmit, errors: fe } = useClientValidation(deleteAccountSchema, state.fieldErrors);
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      <p className="px-1 text-sm text-mute">{consequence}</p>
      {state.message && <FormMessage kind="error">{state.message}</FormMessage>}
      <TextField
        name="confirmation"
        label='Escribí "ELIMINAR" para confirmar'
        autoComplete="off"
        autoCapitalize="characters"
        onCard
        error={fe.confirmation}
      />
      <Button
        type="submit"
        variant="outline"
        pending={pending}
        pendingLabel="Eliminando…"
        className="w-full !border-coral !text-coral"
      >
        Eliminar mi cuenta definitivamente
      </Button>
    </form>
  );
}
