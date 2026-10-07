import { z } from "zod";

/** Tipos de evento: los del diseño (D6) + "Otro". */
export const EVENT_TYPES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "tarea", label: "Tarea" },
  { value: "otro", label: "Otro" },
] as const;
export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const eventSchema = z.object({
  type: z.enum(["presencial", "online", "evaluacion", "tarea", "otro"], { message: "Elegí un tipo." }),
  studentId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), "Alumno inválido."),
  title: z.string().trim().min(1, "Escribí un título.").max(80, "Máximo 80 caracteres."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
  duration: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 600), "Duración: entre 1 y 600 minutos."),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .transform((v) => (v === "" ? null : v)),
});
