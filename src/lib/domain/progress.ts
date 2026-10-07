import { addDays, mondayOf } from "@/lib/dates";
import { num, signed } from "@/lib/format";
import { plannedPerWeek } from "@/lib/domain/metrics";
import type { StudentSummary } from "@/lib/domain/summary";

/**
 * Comparaciones de progreso (D4). Puras: reciben series ya agregadas y
 * devuelven preguntas, respuestas y puntos listos para graficar.
 */

export const PROGRESS_RANGES = [
  { value: "1m", label: "Último mes", weeks: 4 },
  { value: "3m", label: "Últimos 3 meses", weeks: 13 },
  { value: "6m", label: "Últimos 6 meses", weeks: 26 },
  { value: "1a", label: "Último año", weeks: 52 },
] as const;
export type ProgressRange = (typeof PROGRESS_RANGES)[number]["value"];

export function rangeFrom(range: ProgressRange, today: string) {
  const weeks = PROGRESS_RANGES.find((r) => r.value === range)!.weeks;
  return addDays(mondayOf(today), -(weeks - 1) * 7);
}

export type Comparison = {
  label: string;
  question: string;
  answer: string;
  positive: boolean;
  primary: { label: string; values: number[] };
  secondary: { label: string; values: number[] };
};

type Pt = { d: string; v: number };

/** Peso corporal vs carga del ejercicio principal. */
export function weightVsStrength(weights: Pt[], lift: Pt[], liftName: string): Comparison | null {
  if (lift.length < 2) return null;
  const liftDelta = lift[lift.length - 1].v - lift[0].v;
  const wDelta = weights.length >= 2 ? weights[weights.length - 1].v - weights[0].v : null;
  const losing = wDelta != null && wDelta < 0;
  const question = wDelta == null ? `¿Gana fuerza en ${liftName.toLowerCase()}?` : `¿Gana fuerza mientras ${losing ? "baja" : "sube"} de peso?`;
  const positive = liftDelta > 0;
  const parts = [
    wDelta != null ? `${signed(wDelta)} kg corporales` : null,
    `${signed(liftDelta)} kg en ${liftName.toLowerCase()}`,
  ].filter(Boolean);
  return {
    label: "Peso vs fuerza",
    question,
    answer: `${positive ? "Sí" : "Todavía no"}: ${parts.join(" y ")}`,
    positive,
    primary: { label: `${liftName} (kg)`, values: lift.map((p) => p.v) },
    secondary: { label: "Peso corporal (kg)", values: weights.map((p) => p.v) },
  };
}

/** Volumen semanal vs sesiones por semana. */
export function frequencyVsProgress(
  weekly: { week: string; sessions: number; volume: number }[],
  target: number,
): Comparison | null {
  if (weekly.length < 2) return null;
  const hi = weekly.filter((w) => w.sessions >= target);
  const lo = weekly.filter((w) => w.sessions < target);
  const avg = (xs: typeof weekly) => xs.reduce((a, w) => a + w.volume, 0) / (xs.length || 1);
  let answer: string;
  let positive = true;
  if (lo.length === 0) answer = `Cumplió ${target}+ sesiones todas las semanas`;
  else if (hi.length === 0) {
    answer = `Ninguna semana llegó a ${target} sesiones`;
    positive = false;
  } else {
    const diff = avg(lo) > 0 ? avg(hi) / avg(lo) - 1 : 0;
    positive = diff > 0;
    answer = positive
      ? `Sí: las semanas de ${target}+ sesiones movieron ${Math.round(diff * 100)}% más volumen`
      : "No se ve una diferencia clara por ahora";
  }
  return {
    label: "Frecuencia vs progreso",
    question: "¿Progresa más cuando entrena más?",
    answer,
    positive,
    primary: { label: "Volumen semanal (kg)", values: weekly.map((w) => Math.round(w.volume)) },
    secondary: { label: "Sesiones por semana", values: weekly.map((w) => w.sessions) },
  };
}

/** Sesiones por semana en el rango (incluye semanas en 0), sin la semana actual. */
export function weeklySessions(
  weekly: { week: string; sessions: number }[],
  from: string,
  today: string,
  maxWeeks = 12,
) {
  const byWeek = new Map(weekly.map((w) => [w.week, w.sessions]));
  const out: number[] = [];
  for (let m = from; m < mondayOf(today); m = addDays(m, 7)) out.push(byWeek.get(m) ?? 0);
  return out.slice(-maxWeeks);
}

export function plannedCompliance(s: StudentSummary, sessions: number[]) {
  const target = plannedPerWeek(s);
  const planned = target * sessions.length;
  if (planned === 0) return { target, pct: null as number | null };
  return { target, pct: Math.min(1, sessions.reduce((a, b) => a + b, 0) / planned) };
}

export const fmtKg = (v: number) => `${num(v)} kg`;
