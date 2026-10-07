import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { EventForm } from "@/components/calendar/event-form";
import { requireRole } from "@/lib/auth/session";
import { getAssignableStudents } from "@/lib/data/routines";
import { localDateKey } from "@/lib/dates";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Nuevo evento · Trainer" };

export default async function NewEventPage({ searchParams }: PageProps<"/teacher/calendar/new">) {
  await requireRole("teacher");
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDateKey();
  const studentId = typeof sp.student === "string" ? sp.student : "";
  const students = await getAssignableStudents();
  return (
    <Page narrow>
      <SubHeader backHref={`${routes.teacher.calendar}?date=${date}`} eyebrow="Agenda" title="Nuevo evento" />
      <EventForm
        students={students}
        defaults={{ type: "presencial", studentId, title: "", date, time: "09:00", duration: "60", description: "" }}
      />
    </Page>
  );
}
