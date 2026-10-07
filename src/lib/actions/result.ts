import type { z } from "zod";

/**
 * Forma única de respuesta de las server actions. La UI nunca recibe errores
 * técnicos: solo un mensaje amable y, si aplica, errores por campo.
 */
export type ActionState<TFields extends string = string> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<TFields, string>>;
  /** Valores enviados, para repoblar el formulario si falla. */
  values?: Partial<Record<TFields, string>>;
  /** Datos de salida en caso de éxito (p. ej. el link de invitación). */
  data?: Record<string, string>;
};

export const initialState: ActionState = { ok: false };

/** Primer error de cada campo, listo para mostrar. */
export function fieldErrorsFrom<T>(error: z.ZodError<T>) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData → objeto plano de strings (sin archivos). */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

/** Quita campos sensibles antes de devolverlos al cliente. */
export function safeValues(values: Record<string, string>, omit: string[] = ["password", "confirm"]) {
  const copy = { ...values };
  for (const k of omit) delete copy[k];
  return copy;
}
