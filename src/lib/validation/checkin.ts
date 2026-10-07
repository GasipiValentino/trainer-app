import { z } from "zod";

/** Check-in semanal (E4): 5 escalas 1–5, entrenos hechos/planificados y nota. */
const scale = z.coerce.number().int().min(1, "Elegí un valor.").max(5, "Elegí un valor.");

export const checkinSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: scale,
  sleep: scale,
  stress: scale,
  pain: scale,
  motivation: scale,
  workoutsDone: z.coerce.number().int().min(0).max(14),
  workoutsPlanned: z.coerce.number().int().min(0).max(14),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres."),
});
