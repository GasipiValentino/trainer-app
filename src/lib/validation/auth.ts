import { z } from "zod";

/** Esquemas de autenticación: los mismos en el cliente y en las server actions. */

const email = z
  .string()
  .trim()
  .min(1, "Ingresá tu email.")
  .max(254, "El email es demasiado largo.")
  .email("Ese email no parece válido.")
  .transform((v) => v.toLowerCase());

export const passwordRules = z
  .string()
  .min(8, "Usá al menos 8 caracteres.")
  .max(72, "Usá como máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Incluí al menos una letra.")
  .regex(/\d/, "Incluí al menos un número.");

const name = (label: string) =>
  z.string().trim().min(1, `Ingresá tu ${label}.`).max(60, `El ${label} es demasiado largo.`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export const registerSchema = z
  .object({
    firstName: name("nombre"),
    lastName: name("apellido"),
    email,
    password: passwordRules,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const inviteRegisterSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/, "Invitación inválida."),
    password: passwordRules,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: passwordRules, confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const deleteAccountSchema = z.object({
  confirmation: z.literal("ELIMINAR", { message: 'Escribí "ELIMINAR" para confirmar.' }),
});
