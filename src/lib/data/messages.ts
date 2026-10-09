import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/** Mensajes sin leer del usuario autenticado (RLS limita a los propios). Memoizado por request. */
export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);
  if (error) {
    logError("data.messages.unread", error);
    return 0;
  }
  return count ?? 0;
});

export type Thread = {
  otherId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastContent: string | null;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
};

/** Una fila por contacto (alumnos del profesor / profesor del alumno). */
export async function getThreads(): Promise<Thread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("message_threads");
  if (error) {
    logError("data.messages.threads", error);
    throw new Error("No se pudieron cargar las conversaciones");
  }
  return (data ?? []).map((t) => ({
    otherId: t.other_id,
    firstName: t.first_name,
    lastName: t.last_name,
    role: t.role,
    lastContent: t.last_content,
    lastAt: t.last_at,
    lastFromMe: !!t.last_from_me,
    unread: Number(t.unread),
  }));
}

/** Perfil del contacto, solo si hay vínculo (RLS de profiles). */
export async function getContact(otherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("id", otherId)
    .maybeSingle();
  if (error) logError("data.messages.contact", error);
  return data;
}

export type Message = { id: string; content: string; created_at: string; read_at: string | null; mine: boolean };

/** Últimos mensajes entre el usuario y un contacto, en orden cronológico. */
export async function getConversation(me: string, otherId: string, limit = 200): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at, read_at")
    .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logError("data.messages.conversation", error);
    throw new Error("No se pudo cargar la conversación");
  }
  return (data ?? [])
    .reverse()
    .map((m) => ({ id: m.id, content: m.content, created_at: m.created_at, read_at: m.read_at, mine: m.sender_id === me }));
}

/** Marca como leídos los mensajes recibidos de un contacto. */
export async function markThreadRead(otherId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_thread_read", { p_other: otherId });
  if (error) logError("data.messages.read", error);
}
