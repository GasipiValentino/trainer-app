import { notFound } from "next/navigation";
import { RoutineEditor } from "@/components/routine/routine-editor";
import { fromDetail } from "@/components/routine/editor-state";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/data/students";
import { getRoutineDetail } from "@/lib/data/student-detail";
import { getAssignableStudents, getExerciseLibrary, getRoutineList } from "@/lib/data/routines";
import { localDateKey } from "@/lib/dates";

export const metadata = { title: "Rutina · Trainer" };

/** D5 — Editor de una rutina existente. */
export default async function RoutinePage({ params, searchParams }: PageProps<"/teacher/routines/[id]">) {
  const user = await requireRole("teacher");
  const { id } = await params;
  const { assign } = await searchParams;
  if (!isUuid(id)) notFound();

  const detail = await getRoutineDetail(id);
  // Solo el dueño la edita: si es de otro profesor RLS no la devuelve → 404.
  if (!detail || detail.teacher_id !== user.id) notFound();

  const [library, students, list] = await Promise.all([getExerciseLibrary(user.id), getAssignableStudents(), getRoutineList()]);
  const assigned = list.find((r) => r.id === id)?.assigned ?? [];

  return (
    <RoutineEditor
      initial={fromDetail(detail)}
      library={library}
      students={students}
      assigned={assigned}
      today={localDateKey()}
      openAssign={assign === "1"}
    />
  );
}
