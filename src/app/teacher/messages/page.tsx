import { Page } from "@/components/layout/page";
import { SubHeader } from "@/components/layout/sub-header";
import { ThreadList } from "@/components/messages/thread-list";
import { requireRole } from "@/lib/auth/session";
import { getThreads } from "@/lib/data/messages";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mensajes · Trainer" };

export default async function TeacherMessagesPage() {
  await requireRole("teacher");
  const threads = await getThreads();
  return (
    <Page narrow>
      <SubHeader backHref={routes.teacher.home} eyebrow="Alumnos" title="Mensajes" />
      <ThreadList threads={threads} hrefFor={routes.teacher.thread} />
    </Page>
  );
}
