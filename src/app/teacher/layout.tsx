import { AppNav } from "@/components/nav/app-nav";
import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/data/messages";

/** Todo /teacher/* exige rol profesor (leído de la base, no del cliente). */
export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  const user = await requireRole("teacher");
  const unread = await getUnreadCount(user.id);

  return (
    <>
      <AppNav role="teacher" user={user} unreadMessages={unread} />
      {children}
    </>
  );
}
