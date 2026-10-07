import { RoutineEditor } from "@/components/routine/routine-editor";
import { emptyRoutine } from "@/components/routine/editor-state";
import { requireRole } from "@/lib/auth/session";
import { getAssignableStudents, getExerciseLibrary } from "@/lib/data/routines";
import { localDateKey } from "@/lib/dates";

export const metadata = { title: "Nueva rutina · Trainer" };

export default async function NewRoutinePage() {
  const user = await requireRole("teacher");
  const [library, students] = await Promise.all([getExerciseLibrary(user.id), getAssignableStudents()]);
  return <RoutineEditor initial={emptyRoutine()} library={library} students={students} assigned={[]} today={localDateKey()} />;
}
