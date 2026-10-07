import { ProgressReport } from "@/components/report/progress-report";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getReportData } from "@/lib/data/report";
import { PROGRESS_RANGES, type ProgressRange } from "@/lib/domain/progress";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mi reporte · Trainer" };

/** Reporte de progreso del alumno (sin notas privadas del profesor). */
export default async function StudentReportPage({ searchParams }: PageProps<"/student/report">) {
  await requireRole("student");
  const { range: r } = await searchParams;
  const range: ProgressRange = PROGRESS_RANGES.some((x) => x.value === r) ? (r as ProgressRange) : "3m";
  const studentId = await getMyStudentId();
  const data = studentId ? await getReportData(studentId, range, false) : null;
  if (!data) return null;
  return <ProgressReport data={data} backHref={routes.student.progress} baseHref={routes.student.report} />;
}
