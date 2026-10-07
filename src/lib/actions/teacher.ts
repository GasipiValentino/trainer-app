"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";

/** Saltar / cerrar el onboarding del profesor. */
export async function finishOnboardingAction() {
  const user = await requireRole("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_profiles").update({ onboarding_done: true }).eq("user_id", user.id);
  if (error) logError("teacher.onboarding", error);
  revalidatePath(routes.teacher.home);
}
