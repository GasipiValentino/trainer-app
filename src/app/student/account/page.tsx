import { AccountView } from "@/components/account/account-view";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMyCoach } from "@/lib/data/coach";
import { getStudentProfile } from "@/lib/data/students";
import { longDate, localDateKey } from "@/lib/dates";
import { age, fullName, LEVEL_LABEL, num } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mi cuenta · Trainer" };

/** Cuenta del alumno: su perfil (solo lectura), cerrar sesión y eliminar cuenta. */
export default async function StudentAccountPage() {
  const user = await requireRole("student");
  const studentId = await getMyStudentId();
  const [profile, coach] = studentId ? await Promise.all([getStudentProfile(studentId), getMyCoach(studentId)]) : [null, null];

  const years = age(profile?.birth_date);
  const details = profile
    ? [
        coach ? { label: "Coach", value: fullName(coach.firstName, coach.lastName) } : null,
        profile.goal ? { label: "Objetivo", value: profile.goal } : null,
        profile.level ? { label: "Nivel", value: LEVEL_LABEL[profile.level] ?? profile.level } : null,
        years != null ? { label: "Edad", value: `${years} años` } : null,
        profile.height_cm ? { label: "Altura", value: `${num(Number(profile.height_cm))} cm` } : null,
        profile.phone ? { label: "Teléfono", value: profile.phone } : null,
        { label: "Alumno desde", value: longDate(localDateKey(profile.created_at)) },
      ].filter((d): d is { label: string; value: string } => d !== null)
    : [];

  return <AccountView user={user} backHref={routes.student.home} details={details} />;
}
