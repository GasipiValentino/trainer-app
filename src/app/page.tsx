import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth/session";

/** Punto de entrada: cada rol va a su propio dashboard. */
export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? homeFor(user.role) : "/login");
}
