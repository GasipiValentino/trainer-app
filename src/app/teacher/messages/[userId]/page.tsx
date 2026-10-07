import { notFound } from "next/navigation";
import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { Conversation } from "@/components/messages/conversation";
import { requireRole } from "@/lib/auth/session";
import { getContact, getConversation, markThreadRead } from "@/lib/data/messages";
import { isUuid } from "@/lib/data/students";
import { fullName } from "@/lib/format";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Conversación · Trainer" };

export default async function TeacherThreadPage({ params }: PageProps<"/teacher/messages/[userId]">) {
  const user = await requireRole("teacher");
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  // Solo contactos con vínculo activo (RLS de profiles); si no, 404.
  const contact = await getContact(userId);
  if (!contact) notFound();

  await markThreadRead(userId);
  const messages = await getConversation(user.id, userId);
  return (
    <Page narrow className="min-h-dvh !pb-6">
      <SubHeader backHref={routes.teacher.messages} eyebrow="Mensajes" title={fullName(contact.first_name, contact.last_name)} />
      <Conversation me={user.id} otherId={userId} otherName={contact.first_name} initial={messages} />
    </Page>
  );
}
