"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { logError } from "@/lib/errors";
import { routes } from "@/lib/navigation";

/**
 * "Recordar a los N que faltan" (D7): manda un mensaje a cada alumno con
 * cuenta que no respondió el check-in de la semana. RLS (messages_insert)
 * garantiza que solo pueda escribirle a sus alumnos.
 */
export async function remindCheckinsAction(userIds: string[]): Promise<{ ok: boolean; message: string }> {
  const user = await requireRole("teacher");
  const ids = userIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
  if (ids.length === 0) return { ok: false, message: "No hay alumnos para recordar." };

  const supabase = await createClient();
  const content = `¡Hola! Te recuerdo completar el check-in de la semana: es un minuto y me ayuda a ajustar tu plan. — ${user.firstName}`;
  const { error } = await supabase
    .from("messages")
    .insert(ids.map((receiver_id) => ({ sender_id: user.id, receiver_id, content })));
  if (error) {
    logError("checkins.remind", error);
    return { ok: false, message: "No pudimos enviar los recordatorios. Intentá nuevamente." };
  }
  revalidatePath(routes.teacher.checkins);
  return { ok: true, message: ids.length === 1 ? "Recordatorio enviado." : `Recordatorio enviado a ${ids.length} alumnos.` };
}
