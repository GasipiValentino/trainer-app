import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { StudentForm } from "@/components/teacher/student-form";
import { requireRole } from "@/lib/auth/session";
import { createStudentAction } from "@/lib/actions/students";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Agregar alumno · Trainer" };

export default async function NewStudentPage() {
  await requireRole("teacher");
  return (
    <Page narrow>
      <SubHeader backHref={routes.teacher.students} eyebrow="Alumnos" title="Agregar alumno" />
      <p className="px-1 text-sm text-mute">
        Solo nombre y email son obligatorios. El resto lo podés completar después.
      </p>
      <StudentForm action={createStudentAction} submitLabel="Crear e invitar" cancelHref={routes.teacher.students} />
    </Page>
  );
}
