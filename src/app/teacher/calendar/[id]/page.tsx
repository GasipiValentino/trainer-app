import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { EventForm } from "@/components/calendar/event-form";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getEvent } from "@/lib/data/calendar";
import { getAssignableStudents } from "@/lib/data/routines";
import { isUuid } from "@/lib/data/students";
import { deleteEventAction } from "@/lib/actions/calendar";
import { formatTime, localDateKey } from "@/lib/dates";
import { eventMinutes } from "@/lib/domain/calendar";
import { routes } from "@/lib/navigation";
import type { EventType } from "@/lib/validation/event";

export const metadata = { title: "Evento · Trainer" };

export default async function EditEventPage({ params }: PageProps<"/teacher/calendar/[id]">) {
  await requireRole("teacher");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [event, students] = await Promise.all([getEvent(id), getAssignableStudents()]);
  if (!event) notFound();

  const date = localDateKey(event.start_at);
  const mins = eventMinutes(event);
  return (
    <Page narrow>
      <SubHeader backHref={`${routes.teacher.calendar}?date=${date}`} eyebrow="Agenda" title="Editar evento" />
      <EventForm
        eventId={id}
        students={students}
        defaults={{
          type: event.type as EventType,
          studentId: event.student_id ?? "",
          title: event.title,
          date,
          time: formatTime(event.start_at),
          duration: mins ? String(mins) : "",
          description: event.description ?? "",
        }}
      />
      <form action={deleteEventAction.bind(null, id, date)}>
        <Button type="submit" variant="outline" size="md" className="w-full !border-coral !text-coral">
          Eliminar evento
        </Button>
      </form>
    </Page>
  );
}
