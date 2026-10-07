"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { friendlyError, logError } from "@/lib/errors";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Escribí un mensaje.").max(4000, "Máximo 4000 caracteres."),
});

/**
 * Enviar mensaje. RLS (messages_insert) exige sender = usuario autenticado y
 * vínculo activo profesor↔alumno con el receptor.
 */
export async function sendMessageAction(otherId: string, content: string): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(otherId)) return { ok: false, message: "No tenés permiso para hacer esto." };
  const parsed = messageSchema.safeParse({ content });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .insert({ sender_id: user.id, receiver_id: otherId, content: parsed.data.content });
  if (error) {
    logError("messages.send", error);
    return { ok: false, message: friendlyError(error, "No pudimos enviar el mensaje. Intentá nuevamente.") };
  }
  revalidatePath(`/${user.role}/messages`, "layout");
  return { ok: true };
}
