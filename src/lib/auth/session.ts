import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

/**
 * Usuario autenticado + rol leído de la BASE (profiles.role), nunca del
 * cliente ni de metadata editable. Memoizado por request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, email")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: user.id,
    email: profile.email,
    role: profile.role as Role,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role): string {
  return role === "teacher" ? "/teacher" : "/student";
}

/** Para alumnos: su student_profiles.id (los datos cuelgan de ahí). */
export const getMyStudentId = cache(async (): Promise<string | null> => {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
});
