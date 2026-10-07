import { diffDays, localDateKey, relativeDay } from "@/lib/dates";
import { signedPct } from "@/lib/format";
import type { ChipTone } from "@/components/ui/chip";
import { ALERT_RULES, pendingAttention, type Alert, type StudentState } from "@/lib/domain/alerts";
import { activityCells, liftProgress, mainLift } from "@/lib/domain/metrics";
import type { EnrichedStudent } from "@/lib/data/students";

/**
 * Reglas de presentación compartidas por D1, D2 y D3: traducen métricas y
 * alertas a los colores/etiquetas exactos del diseño.
 */

export const COLORS = {
  lime: "#D4F64A",
  coral: "#FF8F6B",
  mute: "#9A9DA5",
  inactive: "#4A4D54",
} as const;

export function ringColor(state: StudentState): string {
  if (state === "attention") return COLORS.coral;
  if (state === "progressing") return COLORS.lime;
  return COLORS.inactive;
}

/** Última actividad (D2: "hace 8 d" coral / "hoy" lima / "ayer" mute). */
export function lastActivity(s: EnrichedStudent, today = localDateKey()) {
  if (!s.userId) return { label: "Invitado", color: COLORS.mute };
  if (!s.lastWorkoutAt) return { label: "Sin entrenos", color: COLORS.mute };
  const key = localDateKey(s.lastWorkoutAt);
  const days = diffDays(key, today);
  const color = days >= ALERT_RULES.noWorkoutDays ? COLORS.coral : days === 0 ? COLORS.lime : COLORS.mute;
  return { label: relativeDay(key, today), color };
}

/**
 * Chip de tendencia de la lista (D2):
 *  - alerta de frecuencia o estancamiento → su chip en coral ("4→2", "±0")
 *  - sin entrenar / inactivo / invitado → "—"
 *  - si no, progreso del ejercicio principal ("+12%")
 */
export function listChip(s: EnrichedStudent): { label: string; tone: ChipTone } {
  const pending = pendingAttention(s, s.alerts);
  const drop = pending.find((a) => a.type === "adherence_drop");
  if (drop) return { label: drop.chip, tone: "warn" };
  if (pending.some((a) => a.type === "stalled")) return { label: "±0", tone: "warn" };
  if (s.state === "inactive" || s.state === "pending" || pending.some((a) => a.type === "no_workout")) {
    return { label: "—", tone: "flat" };
  }
  const lift = mainLift(s);
  if (!lift) return { label: "—", tone: "flat" };
  const p = liftProgress(lift);
  return { label: signedPct(p), tone: p > 0 ? "up" : "flat" };
}

export function activity14(s: EnrichedStudent) {
  return activityCells(s, 14);
}

/** Chip de una fila de Novedades (D1): coral suave para atención, lima sólido para logros. */
export function feedChipTone(a: Alert): ChipTone {
  if (a.severity === "positive") return "solid";
  if (a.severity === "attention") return "warn";
  return "flat";
}

/** Orden "necesita atención": primero alertas pendientes por peso, luego inactividad. */
export function attentionScore(s: EnrichedStudent) {
  const top = pendingAttention(s, s.alerts)[0];
  if (top) return 1000 + top.weight;
  if (s.state === "inactive") return 500;
  if (s.state === "pending") return 400;
  return 0;
}
