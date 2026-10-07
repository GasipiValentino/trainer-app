/**
 * Traducción de errores técnicos (Supabase/Postgres/red) a mensajes para el
 * usuario. El detalle técnico se loguea en el servidor; nunca se muestra.
 */

export const GENERIC_ERROR = "No pudimos completar la acción. Intentá nuevamente.";
export const LOAD_ERROR = "No pudimos cargar la información. Intentá nuevamente.";

type ErrorLike = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

// Códigos/mensajes conocidos → mensaje amable. Orden: el primero que matchea.
const RULES: { test: (e: NonNullable<ErrorLike>) => boolean; message: string }[] = [
  { test: (e) => e.code === "invalid_credentials" || /invalid login credentials/i.test(e.message ?? ""),
    message: "Email o contraseña incorrectos." },
  { test: (e) => e.code === "email_not_confirmed",
    message: "Tenés que confirmar tu email antes de ingresar. Revisá tu bandeja de entrada." },
  { test: (e) => e.code === "user_already_exists" || e.code === "email_exists" || /already registered/i.test(e.message ?? ""),
    message: "Ya existe una cuenta con ese email. Probá ingresar o recuperar tu contraseña." },
  { test: (e) => e.code === "weak_password",
    message: "La contraseña es demasiado débil. Probá con una más larga." },
  { test: (e) => e.code === "over_email_send_rate_limit" || e.code === "over_request_rate_limit" || e.status === 429,
    message: "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar." },
  { test: (e) => e.code === "same_password",
    message: "La nueva contraseña tiene que ser distinta de la anterior." },
  { test: (e) => /INVALID_INVITATION/.test(e.message ?? ""),
    message: "La invitación no es válida o ya venció. Pedile a tu profesor un link nuevo." },
  { test: (e) => /INVITATION_ALREADY_USED|ALREADY_ACTIVE/.test(e.message ?? ""),
    message: "Esta invitación ya fue usada. Ingresá con tu email y contraseña." },
  { test: (e) => /DUPLICATE_STUDENT/.test(e.message ?? ""),
    message: "Ya tenés un alumno con ese email." },
  { test: (e) => /FORBIDDEN/.test(e.message ?? "") || e.code === "42501" || /row-level security/i.test(e.message ?? ""),
    message: "No tenés permiso para hacer esto." },
  { test: (e) => e.code === "23505",
    message: "Ese registro ya existe." },
  { test: (e) => e.code === "23514" || e.code === "22P02" || e.code === "22007",
    message: "Algunos datos no son válidos. Revisalos e intentá nuevamente." },
];

export function friendlyError(error: ErrorLike, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  return RULES.find((r) => r.test(error))?.message ?? fallback;
}

/** Log técnico centralizado (server). Reemplazable por un servicio de logging. */
export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
