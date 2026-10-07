import { z } from "zod";

/**
 * Rutina completa tal como la envía el editor. Mismos límites que los CHECK
 * de la base; los números llegan como texto ("" = sin valor).
 */
const optNum = (label: string, min: number, max: number, int = false) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || v === "" ? null : Number(String(v).replace(",", "."))))
    .refine((v) => v === null || Number.isFinite(v), `${label}: ingresá un número.`)
    .refine((v) => v === null || (v >= min && v <= max), `${label}: entre ${min} y ${max}.`)
    .refine((v) => v === null || !int || Number.isInteger(v), `${label}: tiene que ser entero.`);

const uuid = z.string().uuid();

export const routineExerciseSchema = z.object({
  id: uuid.optional(),
  exercise_id: uuid,
  sets: z.coerce.number().int("Series: entero.").min(1, "Mínimo 1 serie.").max(20, "Máximo 20 series."),
  reps: z.string().trim().min(1, "Indicá repeticiones.").max(20, "Máximo 20 caracteres."),
  weight_kg: optNum("Peso", 0, 999),
  rpe_target: optNum("RPE", 1, 10),
  rest_seconds: optNum("Descanso", 0, 900, true),
  superset_group: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v.toUpperCase()))
    .refine((v) => v === null || /^[A-F]$/.test(v), "Superserie: A a F."),
  progression: z.string().trim().max(120, "Progresión: máximo 120 caracteres."),
  notes: z.string().trim().max(300, "Nota: máximo 300 caracteres."),
});

export const routineSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Poné un nombre a la rutina.").max(80, "Nombre: máximo 80 caracteres."),
  description: z.string().trim().max(500).default(""),
  duration_weeks: optNum("Semanas", 1, 52, true),
  student_note: z.string().trim().max(500, "Nota: máximo 500 caracteres.").default(""),
  days: z
    .array(
      z.object({
        id: uuid.optional(),
        name: z.string().trim().min(1, "Cada día necesita un nombre.").max(40, "Nombre del día: máximo 40 caracteres."),
        exercises: z.array(routineExerciseSchema).max(30, "Máximo 30 ejercicios por día."),
      }),
    )
    .min(1, "La rutina necesita al menos un día.")
    .max(7, "Máximo 7 días."),
});

export type RoutineInput = z.input<typeof routineSchema>;
export type RoutinePayload = z.output<typeof routineSchema>;

export const assignManySchema = z.object({
  routineId: uuid,
  studentIds: z.array(uuid).min(1, "Elegí al menos un alumno.").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
});
