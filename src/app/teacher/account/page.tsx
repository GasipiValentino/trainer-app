import { AccountView } from "@/components/account/account-view";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Mi cuenta · Trainer" };

export default async function TeacherAccountPage() {
  const user = await requireRole("teacher");
  return <AccountView user={user} backHref={routes.teacher.home} />;
}
