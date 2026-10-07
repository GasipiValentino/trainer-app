import { Page } from "@/components/layout/page";
import { Conversation } from "@/components/messages/conversation";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { getMyStudentId, requireRole } from "@/lib/auth/session";
import { getMyCoach } from "@/lib/data/coach";
import { getConversation, markThreadRead } from "@/lib/data/messages";

export const metadata = { title: "Coach · Trainer" };

/** Coach: conversación directa con el profesor (un alumno solo habla con él). */
export default async function CoachPage() {
  const user = await requireRole("student");
  const studentId = await getMyStudentId();
  const coach = studentId ? await getMyCoach(studentId) : null;
  if (!coach) {
    return (
      <Page narrow>
        <h1 className="px-1 text-[30px] font-bold tracking-[-0.03em]">Coach</h1>
        <EmptyState title="Todavía no tenés coach asignado">Cuando tu profesor te vincule, vas a poder escribirle desde acá.</EmptyState>
      </Page>
    );
  }
  await markThreadRead(coach.id);
  const messages = await getConversation(user.id, coach.id);
  return (
    <Page narrow className="min-h-dvh">
      <header className="flex items-center gap-3 px-1">
        <Avatar first={coach.firstName} last={coach.lastName} size={46} tone="lime" />
        <div className="flex flex-col">
          <span className="text-[13px] text-mute">Tu coach</span>
          <h1 className="text-xl font-bold tracking-[-0.02em]">
            {coach.firstName} {coach.lastName}
          </h1>
        </div>
      </header>
      <Conversation me={user.id} otherId={coach.id} otherName={coach.firstName} initial={messages} composerOffset="nav" />
    </Page>
  );
}
