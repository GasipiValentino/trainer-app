import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { MetricsTab } from "@/components/teacher/profile/metrics-tab";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMeasurements } from "@/lib/data/student-detail";
import { localDateKey } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mis mediciones · Trainer" };

/** Historial de mediciones del alumno (solo lectura: las carga el profesor). */
export default async function MyMeasurementsPage() {
  await requireRole("student");
  const studentId = await getMyStudentId();
  if (!studentId) return null;
  const measurements = await getMeasurements(studentId);
  return (
    <Page narrow>
      <SubHeader backHref={routes.student.progress} eyebrow="Mi progreso" title="Mediciones" />
      <MetricsTab studentId={studentId} measurements={measurements} measureHref={routes.student.progress} today={localDateKey()} readOnly />
    </Page>
  );
}
