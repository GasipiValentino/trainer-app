/**
 * Mapa central de permisos por rol. La UI lo usa para decidir qué mostrar y
 * las server actions para cortar temprano; la autoridad final es RLS.
 */
export type Role = "teacher" | "student";

export const PERMISSIONS = {
  "students:manage": ["teacher"],
  "routines:manage": ["teacher"],
  "routines:view": ["teacher", "student"],
  "measurements:write": ["teacher"],
  "measurements:view": ["teacher", "student"],
  "checkins:submit": ["student"],
  "checkins:review": ["teacher"],
  "workouts:log": ["teacher", "student"],
  "notes:manage": ["teacher"],
  "calendar:manage": ["teacher"],
  "calendar:view": ["teacher", "student"],
  "messages:send": ["teacher", "student"],
  "reports:generate": ["teacher", "student"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
