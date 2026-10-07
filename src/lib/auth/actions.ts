"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { friendlyError, logError } from "@/lib/errors";
import { homeFor, getSessionUser } from "@/lib/auth/session";
import {
  deleteAccountSchema,
  forgotSchema,
  inviteRegisterSchema,
  loginSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validation/auth";
import { fieldErrorsFrom, formValues, safeValues, type ActionState } from "@/lib/actions/result";
import type { Role } from "@/lib/auth/permissions";

/** Solo rutas internas del área del rol: evita open-redirects y cruces de rol. */
function safeNext(next: string | undefined, role: Role): string {
  const home = homeFor(role);
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  return next === home || next.startsWith(`${home}/`) ? next : home;
}

// ---------------------------------------------------------------- login
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values: safeValues(values) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logError("auth.login", error);
    return { ok: false, message: friendlyError(error), values: safeValues(values) };
  }

  const user = await getSessionUser();
  if (!user) {
    logError("auth.login", "sesión sin perfil");
    await supabase.auth.signOut();
    return { ok: false, message: "Tu cuenta no está completa. Escribinos para ayudarte." };
  }
  redirect(safeNext(values.next, user.role));
}

// ------------------------------------------------- registro de profesor
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values: safeValues(values) };
  }

  const { firstName, lastName, email, password } = parsed.data;
  const supabase = await createClient();
  // Sin invitation_token → el trigger de la base lo crea como profesor.
  // El rol NO se envía: no hay forma de pedir otro desde el cliente.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/teacher`,
    },
  });
  if (error) {
    logError("auth.register", error);
    return { ok: false, message: friendlyError(error), values: safeValues(values) };
  }

  if (!data.session) {
    // Confirmación de email activada en Supabase.
    return {
      ok: true,
      message: `Te enviamos un email a ${email} para confirmar tu cuenta.`,
    };
  }
  redirect("/teacher");
}

// ----------------------------------------- registro de alumno por invitación
export async function inviteRegisterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = inviteRegisterSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { data: rows, error: invError } = await supabase.rpc("get_invitation", {
    p_token: parsed.data.token,
  });
  const invitation = rows?.[0];
  if (invError || !invitation) {
    if (invError) logError("auth.invite.lookup", invError);
    return { ok: false, message: friendlyError({ message: "INVALID_INVITATION" }) };
  }

  // El email sale de la invitación, no del formulario: el alumno no puede
  // usar el link para registrar otra dirección.
  const { data, error } = await supabase.auth.signUp({
    email: invitation.email,
    password: parsed.data.password,
    options: {
      data: { invitation_token: parsed.data.token },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/student`,
    },
  });
  if (error) {
    logError("auth.invite.signup", error);
    const msg = /database error/i.test(error.message)
      ? friendlyError({ message: "INVALID_INVITATION" })
      : friendlyError(error);
    return { ok: false, message: msg };
  }

  if (!data.session) {
    return { ok: true, message: `Te enviamos un email a ${invitation.email} para confirmar tu cuenta.` };
  }
  redirect("/student");
}

// ------------------------------------------------- recuperar contraseña
export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
  });
  if (error) {
    logError("auth.forgot", error);
    // Solo exponemos el rate limit; cualquier otro error responde igual que el
    // éxito para no revelar qué emails tienen cuenta.
    if (error.status === 429) return { ok: false, message: friendlyError(error), values };
  }
  return {
    ok: true,
    message: "Si hay una cuenta con ese email, te llegará un link para crear una contraseña nueva.",
  };
}

// --------------------------------------------- nueva contraseña (con link)
export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "El link venció. Pedí uno nuevo desde “Olvidé mi contraseña”." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logError("auth.reset", error);
    return { ok: false, message: friendlyError(error) };
  }
  redirect(homeFor(user.role));
}

// ---------------------------------------------------------------- logout
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ------------------------------------------------------ eliminar cuenta
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = deleteAccountSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    logError("auth.delete", error);
    return { ok: false, message: friendlyError(error) };
  }
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
