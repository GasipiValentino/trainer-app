import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { StudentForm } from "@/components/teacher/student-form";
import { requireRole } from "@/lib/auth/session";
import { updateStudentAction } from "@/lib/actions/students";
import { getStudentProfile, isUuid } from "@/lib/data/students";
import { fullName } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Editar alumno · Trainer" };

export default async function EditStudentPage({ params }: PageProps<"/teacher/students/[id]/edit">) {
  await requireRole("teacher");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const s = await getStudentProfile(id);
  if (!s) notFound();

  const str = (v: number | string | null) => (v == null ? "" : String(v));
  return (
    <Page narrow>
      <SubHeader backHref={routes.teacher.student(id)} eyebrow="Editar" title={fullName(s.first_name, s.last_name)} />
      <StudentForm
        action={updateStudentAction.bind(null, id)}
        emailLocked={!!s.user_id}
        submitLabel="Guardar cambios"
        cancelHref={routes.teacher.student(id)}
        defaults={{
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
          birthDate: str(s.birth_date),
          phone: str(s.phone),
          goal: str(s.goal),
          level: str(s.level),
          heightCm: str(s.height_cm),
          initialWeight: str(s.initial_weight),
          notes: str(s.notes),
        }}
      />
    </Page>
  );
}
