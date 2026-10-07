import { z } from "zod";
import { localDateKey } from "@/lib/dates";

/**
 * Esquemas del profesor sobre alumnos y mediciones. Campos numéricos llegan
 * como texto del formulario: vacío = null (las métricas son opcionales).
 */

/** "" → null; "82,5" → 82.5; valida rango. */
export const optionalNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || Number.isFinite(v), `${label}: ingresá un número.`)
    .refine((v) => v === null || (v > min && v < max), `${label}: tiene que estar entre ${min} y ${max}.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

export const LEVELS = ["principiante", "intermedio", "avanzado"] as const;

export const GOAL_SUGGESTIONS = [
  "Fuerza",
  "Hipertrofia",
  "Bajar grasa",
  "Recomposición",
  "Salud general",
  "Rendimiento deportivo",
  "Rehabilitación",
];

export const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresá el nombre.").max(60, "Máximo 60 caracteres."),
  lastName: z.string().trim().max(60, "Máximo 60 caracteres.").default(""),
  email: z.string().trim().min(1, "Ingresá el email.").email("Ese email no parece válido.").transform((v) => v.toLowerCase()),
  birthDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida.")
    .refine((v) => v === null || (v > "1900-01-01" && v < localDateKey()), "La fecha tiene que ser anterior a hoy."),
  phone: optionalText(30).refine((v) => v === null || /^[+\d\s()-]{6,}$/.test(v), "Teléfono inválido."),
  goal: optionalText(60),
  level: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || (LEVELS as readonly string[]).includes(v), "Elegí un nivel."),
  heightCm: optionalNumber("Altura", 50, 260),
  initialWeight: optionalNumber("Peso", 20, 400),
  notes: optionalText(1000),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const measurementSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
      .refine((v) => v <= localDateKey(), "La fecha no puede ser futura."),
    weight: optionalNumber("Peso", 20, 400),
    bodyFat: optionalNumber("Grasa", 1, 70),
    muscleMass: optionalNumber("Masa muscular", 5, 200),
    chest: optionalNumber("Pecho", 30, 250),
    waist: optionalNumber("Cintura", 30, 250),
    hips: optionalNumber("Cadera", 30, 250),
    arm: optionalNumber("Brazo", 10, 100),
    thigh: optionalNumber("Muslo", 20, 150),
    notes: optionalText(500),
  })
  .refine(
    (m) => [m.weight, m.bodyFat, m.muscleMass, m.chest, m.waist, m.hips, m.arm, m.thigh].some((v) => v !== null),
    { message: "Cargá al menos una medida.", path: ["weight"] },
  );

export const noteSchema = z.object({
  content: z.string().trim().min(1, "Escribí la nota.").max(2000, "Máximo 2000 caracteres."),
});
