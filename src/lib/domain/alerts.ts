import { addDays, diffDays, localDateKey, mondayOf } from "@/lib/dates";
import { num, signedPct } from "@/lib/format";
import type { StudentSummary } from "@/lib/domain/summary";
import {
  adherence,
  countFlags,
  daysSinceLastWorkout,
  liftProgress,
  plannedPerWeek,
  recentRecord,
  routineWeek,
  stableWeightWeeks,
  weekStreak,
  workoutsBetween,
} from "@/lib/domain/metrics";

/**
 * REGLAS DE ALERTAS — único lugar donde se decide qué merece la atención
 * del profesor. Cambiar umbrales acá impacta dashboard, lista, perfil y
 * check-ins por igual.
 *
 * Severidad:
 *  - attention: entra en "Atención hoy" y en el filtro "Revisar".
 *  - info:      se muestra en Novedades, no suma a la cola.
 *  - positive:  logros (récords, constancia).
 *
 * `key` identifica la ocurrencia concreta (incluye fecha/valor): si el
 * profesor la marca como revisada y la situación cambia, vuelve a aparecer.
 */
export const ALERT_RULES = {
  noWorkoutDays: 7,              // sin entrenar ≥ N días (con rutina activa)
  inactiveDays: 14,              // ≥ N días sin entrenar = inactivo
  adherenceDropRatio: 0.6,       // últimas 2 sem < 60% de las 2 previas
  adherenceMinBaseline: 2,       // y antes entrenaba ≥ 2 por semana
  stalledWeeks: 3,               // peso estable ≥ N semanas…
  stalledToleranceKg: 0.3,       // …con variación < X kg
  stalledGoals: ["bajar grasa", "bajar de peso", "recomposición", "perder peso", "definición"],
  checkinFlagsMin: 2,            // ≥ N respuestas fuera de lo habitual
  checkinMissingWeeks: 2,        // sin check-in hace ≥ N semanas
  measurementStaleDays: 30,      // última medición hace > N días
  recordWindowDays: 7,           // récord en los últimos N días
  streakWeeksMin: 4,             // N semanas seguidas cumpliendo
} as const;

export type AlertSeverity = "attention" | "info" | "positive";

export type AlertType =
  | "no_workout"
  | "adherence_drop"
  | "stalled"
  | "checkin_flags"
  | "checkin_missing"
  | "no_routine"
  | "routine_ended"
  | "measurements_stale"
  | "invite_pending"
  | "new_record"
  | "streak";

export type Alert = {
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  studentId: string;
  /** Texto de la fila (D1 "Sin registrar entrenamiento"). */
  text: string;
  /** Chip de la derecha (D1 "8 días", "+12%"). */
  chip: string;
  /** Texto corto para el perfil (D3 "8 días sin entrenar"). */
  status: string;
  /** Mayor = más urgente; ordena la cola. */
  weight: number;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { attention: 0, info: 1, positive: 2 };

function isWeightGoal(goal: string | null) {
  const g = (goal ?? "").toLowerCase();
  return ALERT_RULES.stalledGoals.some((x) => g.includes(x));
}

/** Todas las alertas vigentes de un alumno, ordenadas por urgencia. */
export function alertsFor(s: StudentSummary, today = localDateKey(), now = new Date()): Alert[] {
  const out: Alert[] = [];
  const add = (a: Omit<Alert, "studentId">) => out.push({ ...a, studentId: s.id });

  // Alumno que todavía no activó su cuenta: no tiene sentido evaluar el resto.
  if (!s.userId) {
    add({
      key: "invite_pending",
      type: "invite_pending",
      severity: "info",
      text: "Todavía no activó su cuenta",
      chip: "Invitado",
      status: "Invitación pendiente",
      weight: 10,
    });
    return out;
  }

  const since = daysSinceLastWorkout(s, today);

  // --- Sin entrenar
  if (s.routine && since != null && since >= ALERT_RULES.noWorkoutDays) {
    add({
      key: `no_workout:${localDateKey(s.lastWorkoutAt!)}`,
      type: "no_workout",
      severity: "attention",
      text: "Sin registrar entrenamiento",
      chip: `${since} días`,
      status: `${since} días sin entrenar`,
      weight: 100 + since,
    });
  } else if (s.routine && since == null && diffDays(localDateKey(s.createdAt), today) >= ALERT_RULES.noWorkoutDays) {
    add({
      key: "no_workout:never",
      type: "no_workout",
      severity: "attention",
      text: "Todavía no registró entrenamientos",
      chip: "Nunca",
      status: "Sin entrenamientos",
      weight: 100,
    });
  }

  // --- Sin rutina activa
  if (!s.routine) {
    add({
      key: "no_routine",
      type: "no_routine",
      severity: "attention",
      text: "Sin rutina activa",
      chip: "Rutina",
      status: "Sin rutina activa",
      weight: 90,
    });
  }

  // --- Bloque terminado: hay que asignar el siguiente
  const block = routineWeek(s, today);
  if (s.routine && block?.finished) {
    add({
      key: `routine_ended:${s.routine.id}`,
      type: "routine_ended",
      severity: "attention",
      text: `Terminó ${s.routine.name}`,
      chip: "Rutina",
      status: "Rutina terminada",
      weight: 85,
    });
  }

  // --- Check-in con respuestas fuera de lo habitual (de la semana pasada o esta)
  const lastWeek = addDays(mondayOf(today), -7);
  if (s.lastCheckin && s.lastCheckin.week_start >= lastWeek) {
    const flags = countFlags(s.lastCheckin);
    if (flags >= ALERT_RULES.checkinFlagsMin) {
      add({
        key: `checkin_flags:${s.lastCheckin.week_start}`,
        type: "checkin_flags",
        severity: "attention",
        text: `${flags} respuestas fuera de lo habitual`,
        chip: "Check-in",
        status: "Check-in para revisar",
        weight: 80 + flags,
      });
    }
  }

  // --- Bajó la frecuencia (últimas 2 semanas completas vs las 2 anteriores)
  const end = addDays(mondayOf(today), -1);
  const recent = workoutsBetween(s, addDays(end, -13), end) / 2;
  const before = workoutsBetween(s, addDays(end, -27), addDays(end, -14)) / 2;
  if (
    before >= ALERT_RULES.adherenceMinBaseline &&
    recent < before * ALERT_RULES.adherenceDropRatio &&
    !(since != null && since >= ALERT_RULES.noWorkoutDays)
  ) {
    add({
      key: `adherence_drop:${end}`,
      type: "adherence_drop",
      severity: "attention",
      text: `Bajó de ${num(before, 0)} a ${num(recent, 0)} entrenos por semana`,
      chip: `${Math.round(before)}→${Math.round(recent)}`,
      status: "Bajó la frecuencia",
      weight: 70,
    });
  }

  // --- Progreso estancado (peso) en objetivos de composición corporal
  const stableWeeks = stableWeightWeeks(s, ALERT_RULES.stalledToleranceKg);
  if (isWeightGoal(s.goal) && stableWeeks >= ALERT_RULES.stalledWeeks) {
    const adh = adherence(s, 4, today);
    add({
      key: `stalled:${s.weights[s.weights.length - 1].d}`,
      type: "stalled",
      severity: "attention",
      text: adh != null ? `Peso estable con ${Math.round(adh * 100)}% de cumplimiento` : "Peso estable",
      chip: `${stableWeeks} sem`,
      status: `Peso estable hace ${stableWeeks} semanas`,
      weight: 60,
    });
  }

  // --- Check-in pendiente varias semanas
  const missingWeeks = s.lastCheckin
    ? Math.floor(diffDays(s.lastCheckin.week_start, mondayOf(today)) / 7) - 1
    : Math.floor(diffDays(mondayOf(localDateKey(s.createdAt)), mondayOf(today)) / 7);
  if (missingWeeks >= ALERT_RULES.checkinMissingWeeks) {
    add({
      key: `checkin_missing:${s.lastCheckin?.week_start ?? "never"}`,
      type: "checkin_missing",
      severity: "info",
      text: `Sin check-in hace ${missingWeeks} semanas`,
      chip: `${missingWeeks} sem`,
      status: "Check-in pendiente",
      weight: 40,
    });
  }

  // --- Mediciones desactualizadas
  const measuredAgo = s.lastMeasuredOn ? diffDays(s.lastMeasuredOn, today) : null;
  if (measuredAgo == null || measuredAgo > ALERT_RULES.measurementStaleDays) {
    add({
      key: `measurements_stale:${s.lastMeasuredOn ?? "never"}`,
      type: "measurements_stale",
      severity: "info",
      text: measuredAgo == null ? "Sin mediciones cargadas" : "Mediciones desactualizadas",
      chip: measuredAgo == null ? "Medir" : `${measuredAgo} d`,
      status: "Medir",
      weight: 30,
    });
  }

  // --- Logros
  const record = recentRecord(s, ALERT_RULES.recordWindowDays, now);
  if (record) {
    add({
      key: `new_record:${record.exerciseId}:${record.best}`,
      type: "new_record",
      severity: "positive",
      text: `Récord en ${record.name.toLowerCase()} · ${num(record.best)} kg`,
      chip: signedPct(liftProgress(record)),
      status: "Nuevo récord",
      weight: 20,
    });
  }

  const streak = weekStreak(s, today);
  if (streak >= ALERT_RULES.streakWeeksMin && s.routine) {
    const planned = plannedPerWeek(s) * streak;
    add({
      key: `streak:${streak}`,
      type: "streak",
      severity: "positive",
      text: streak >= 4 && streak < 8 ? "Primer mes sin faltar" : `${streak} semanas sin faltar`,
      chip: `${planned}/${planned}`,
      status: `${streak} semanas sin faltar`,
      weight: 10,
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.weight - a.weight);
}

/** Alertas de atención todavía no marcadas como revisadas. */
export function pendingAttention(s: StudentSummary, alerts = alertsFor(s)) {
  return alerts.filter((a) => a.severity === "attention" && !s.reviewed.includes(a.key));
}

/** Estado visual del alumno (anillo del avatar en D2/D3). */
export type StudentState = "attention" | "progressing" | "inactive" | "pending";

export function studentState(s: StudentSummary, alerts = alertsFor(s), today = localDateKey()): StudentState {
  if (!s.userId) return "pending";
  if (pendingAttention(s, alerts).length > 0) return "attention";
  const since = daysSinceLastWorkout(s, today);
  if (since == null || since >= ALERT_RULES.inactiveDays) return "inactive";
  return "progressing";
}
