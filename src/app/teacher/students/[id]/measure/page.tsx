import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { MeasurementForm } from "@/components/teacher/measurement-form";
import { requireRole } from "@/lib/auth/session";
import { getStudentProfile, isUuid } from "@/lib/data/students";
import { getMeasurements } from "@/lib/data/student-detail";
import { localDateKey } from "@/lib/dates";
import { fullName, num } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Medir · Trainer" };

export default async function MeasurePage({ params }: PageProps<"/teacher/students/[id]/measure">) {
  await requireRole("teacher");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  // Último valor de cada medida, como referencia en el placeholder.
  const ms = await getMeasurements(id);
  const lastOf = (k: "weight" | "body_fat" | "muscle_mass" | "waist" | "chest" | "hips" | "arm" | "thigh") => {
    const m = [...ms].reverse().find((x) => x[k] != null);
    return m ? num(Number(m[k])) : undefined;
  };

  const back = `${routes.teacher.student(id)}?tab=metricas`;
  return (
    <Page narrow>
      <SubHeader backHref={back} eyebrow="Nueva medición" title={fullName(profile.first_name, profile.last_name)} />
      <MeasurementForm
        studentId={id}
        today={localDateKey()}
        cancelHref={back}
        last={{
          weight: lastOf("weight"),
          bodyFat: lastOf("body_fat"),
          muscleMass: lastOf("muscle_mass"),
          waist: lastOf("waist"),
          chest: lastOf("chest"),
          hips: lastOf("hips"),
          arm: lastOf("arm"),
          thigh: lastOf("thigh"),
        }}
      />
    </Page>
  );
}
