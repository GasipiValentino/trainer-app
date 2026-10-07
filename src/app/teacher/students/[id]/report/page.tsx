import { notFound } from "next/navigation";
import { ProgressReport } from "@/components/report/progress-report";
import { requireRole } from "@/lib/auth/session";
import { getReportData } from "@/lib/data/report";
import { isUuid } from "@/lib/data/students";
import { PROGRESS_RANGES, type ProgressRange } from "@/lib/domain/progress";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Reporte · Trainer" };

/** Reporte de progreso de un alumno, vista del profesor (incluye sus notas). */
export default async function TeacherReportPage({ params, searchParams }: PageProps<"/teacher/students/[id]/report">) {
  await requireRole("teacher");
  const { id } = await params;
  const { range: r } = await searchParams;
  if (!isUuid(id)) notFound();
  const range: ProgressRange = PROGRESS_RANGES.some((x) => x.value === r) ? (r as ProgressRange) : "3m";
  const data = await getReportData(id, range, true);
  if (!data) notFound();
  return <ProgressReport data={data} backHref={routes.teacher.student(id)} baseHref={`${routes.teacher.student(id)}/report`} />;
}
