import type { Role } from "@/lib/auth/permissions";

/** Rutas de la app, en un solo lugar. */
export const routes = {
  teacher: {
    home: "/teacher",
    students: "/teacher/students",
    newStudent: "/teacher/students/new",
    student: (id: string) => `/teacher/students/${id}`,
    studentProgress: (id: string) => `/teacher/students/${id}/progress`,
    routines: "/teacher/routines",
    newRoutine: "/teacher/routines/new",
    routine: (id: string) => `/teacher/routines/${id}`,
    calendar: "/teacher/calendar",
    newEvent: "/teacher/calendar/new",
    checkins: "/teacher/check-ins",
    news: "/teacher/news",
    messages: "/teacher/messages",
    thread: (userId: string) => `/teacher/messages/${userId}`,
    account: "/teacher/account",
  },
  student: {
    home: "/student",
    routine: "/student/routine",
    workout: "/student/workout",
    progress: "/student/progress",
    report: "/student/report",
    measurements: "/student/progress/measurements",
    checkin: "/student/check-in",
    calendar: "/student/calendar",
    messages: "/student/messages",
    account: "/student/account",
  },
} as const;

export type NavIcon = "home" | "users" | "list" | "calendar" | "chat" | "trend" | "check";

export type NavItem = { href: string; label: string; icon: NavIcon; desktopOnly?: boolean };

/**
 * Pestañas por rol. Mobile = exactamente las del diseño (D1–D3 / E1–E3).
 * desktopOnly = destinos que en mobile se alcanzan desde el header o el
 * dashboard, y que en la barra superior de desktop tienen lugar propio
 * (lámina "00 — Experiencia y navegación").
 */
export const NAV: Record<Role, NavItem[]> = {
  teacher: [
    { href: routes.teacher.home, label: "Hoy", icon: "home" },
    { href: routes.teacher.students, label: "Alumnos", icon: "users" },
    { href: routes.teacher.routines, label: "Rutinas", icon: "list" },
    { href: routes.teacher.calendar, label: "Agenda", icon: "calendar" },
    { href: routes.teacher.checkins, label: "Check-ins", icon: "check", desktopOnly: true },
    { href: routes.teacher.messages, label: "Mensajes", icon: "chat", desktopOnly: true },
  ],
  student: [
    { href: routes.student.home, label: "Hoy", icon: "home" },
    { href: routes.student.routine, label: "Mi plan", icon: "list" },
    { href: routes.student.progress, label: "Progreso", icon: "trend" },
    { href: routes.student.messages, label: "Coach", icon: "chat" },
  ],
};

/** Pantallas donde se muestra la barra inferior mobile (como en el diseño). */
export function showsBottomNav(role: Role, pathname: string): boolean {
  const tabs = NAV[role].filter((i) => !i.desktopOnly).map((i) => i.href);
  if (tabs.includes(pathname)) return true;
  // D3 (perfil del alumno) mantiene la barra.
  return role === "teacher" && /^\/teacher\/students\/[0-9a-f-]{36}$/.test(pathname);
}

/** Pestaña activa: la de prefijo más largo que matchea. */
export function activeHref(role: Role, pathname: string): string | undefined {
  return NAV[role]
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
}
