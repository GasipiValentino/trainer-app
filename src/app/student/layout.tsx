import { AppNav } from "@/components/nav/app-nav";
import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/data/messages";

/** Todo /student/* exige rol alumno (leído de la base, no del cliente). */
export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const user = await requireRole("student");
  const unread = await getUnreadCount(user.id);

  return (
    <>
      <AppNav role="student" user={user} unreadMessages={unread} />
      {children}
    </>
  );
}
