import Link from "next/link";
import { Page, PageTitle } from "@/components/layout/page";
import { PlusIcon } from "@/components/ui/icons";
import { StudentList, type StudentRow } from "@/components/teacher/student-list";
import { requireRole } from "@/lib/auth/session";
import { getEnrichedStudents } from "@/lib/data/students";
import { pendingAttention } from "@/lib/domain/alerts";
import { activity14, attentionScore, lastActivity, listChip, ringColor } from "@/lib/domain/presenters";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Alumnos · Trainer" };

export default async function StudentsPage() {
  await requireRole("teacher");
  const students = await getEnrichedStudents();

  const rows: StudentRow[] = students.map((s) => {
    const last = lastActivity(s);
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      goal: s.goal ?? "Sin objetivo",
      ring: ringColor(s.state),
      state: s.state,
      lastLabel: last.label,
      lastColor: last.color,
      cells: activity14(s),
      chip: listChip(s),
      score: attentionScore(s),
      lastWorkoutAt: s.lastWorkoutAt,
      needsReview: pendingAttention(s, s.alerts).length > 0,
    };
  });

  const active = students.filter((s) => s.userId).length;

  return (
    <Page>
      <header className="flex items-center justify-between px-1">
        <PageTitle aside={`${active} ${active === 1 ? "activo" : "activos"}`}>Alumnos</PageTitle>
        <Link
          href={routes.teacher.newStudent}
          aria-label="Agregar alumno"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-bg"
        >
          <PlusIcon size={20} />
        </Link>
      </header>
      <StudentList rows={rows} />
    </Page>
  );
}
