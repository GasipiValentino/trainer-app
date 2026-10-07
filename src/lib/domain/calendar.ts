import { formatTime } from "@/lib/dates";
import { fullName } from "@/lib/format";
import type { CalendarEvent } from "@/lib/data/calendar";

/** Presentación de eventos de agenda, igual a D6. */

export const TYPE_LABEL: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  evaluacion: "Evaluación",
  tarea: "Tarea",
  otro: "Otro",
};

/** Punto de color de la leyenda/lista (D6). */
export function eventDot(type: string): { background: string; border?: string; radius: string } {
  switch (type) {
    case "presencial":
      return { background: "#D4F64A", radius: "50%" };
    case "online":
      return { background: "transparent", border: "1.5px solid #F2F2EE", radius: "50%" };
    case "evaluacion":
      return { background: "#8EC5FF", radius: "50%" };
    case "tarea":
      return { background: "#6A6D74", radius: "50%" };
    default:
      return { background: "#9A9DA5", radius: "50%" };
  }
}

/**
 * Título y subtítulo de una tarjeta:
 *  - con alumno: "Lucas Ferreyra" / "Presencial · Tren inferior"
 *  - evaluación: "Camila Torres" / "Evaluación y mediciones" (el título ya lo dice)
 *  - tarea: "Ajustar rutina de Sofía" / "Tarea"
 */
export function eventLines(e: CalendarEvent, viewer: "teacher" | "student" = "teacher") {
  const label = TYPE_LABEL[e.type] ?? "Otro";
  if (viewer === "student" || !e.student) {
    return { title: e.title, sub: e.description ?? label };
  }
  const name = fullName(e.student.first_name, e.student.last_name);
  const sub = e.type === "evaluacion" || e.type === "otro" ? e.title : `${label} · ${e.title}`;
  return { title: name, sub };
}

export function eventMinutes(e: Pick<CalendarEvent, "start_at" | "end_at">) {
  return e.end_at ? Math.round((+new Date(e.end_at) - +new Date(e.start_at)) / 60000) : null;
}

export const eventTime = (e: Pick<CalendarEvent, "start_at">) => formatTime(e.start_at);
