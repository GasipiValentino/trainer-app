"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { fieldErrorsFrom, formValues } from "@/lib/actions/result";

/**
 * Valida en el cliente con el MISMO esquema zod que usa la server action.
 * Si hay errores, cancela el envío y los muestra; si no, deja pasar el submit.
 * La validación del servidor sigue siendo la que manda.
 */
export function useClientValidation(schema: ZodType, serverErrors?: Record<string, string | undefined>) {
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const result = schema.safeParse(formValues(new FormData(e.currentTarget)));
    setSubmitted(true);
    if (!result.success) {
      e.preventDefault();
      setClientErrors(fieldErrorsFrom(result.error));
    } else {
      setClientErrors({});
    }
  }

  // Tras un envío válido, los errores vigentes son los del servidor.
  const errors: Record<string, string | undefined> =
    submitted && Object.keys(clientErrors).length > 0 ? clientErrors : (serverErrors ?? {});

  return { onSubmit, errors };
}
