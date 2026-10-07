"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/lib/actions/messages";
import { formatTime, localDateKey, shortDate } from "@/lib/dates";
import type { Message } from "@/lib/data/messages";

/**
 * Conversación: burbujas (propias en lima, ajenas en #1C1D21), compositor
 * abajo y mensajes nuevos en tiempo real (Supabase Realtime respeta RLS).
 */
export function Conversation({
  me,
  otherId,
  otherName,
  initial,
  composerOffset = "none",
}: {
  me: string;
  otherId: string;
  otherName: string;
  initial: Message[];
  /** "nav": deja lugar a la barra inferior mobile (pestaña Coach del alumno). */
  composerOffset?: "none" | "nav";
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [messages, addOptimistic] = useOptimistic(initial, (cur: Message[], m: Message) => [...cur, m]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Mensajes entrantes de este contacto → refrescar (y marcar leído en el server).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${me}-${otherId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${me}` }, (payload) => {
        if ((payload.new as { sender_id?: string }).sender_id === otherId) router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, otherId, router]);

  function send() {
    const content = text.trim();
    if (!content) return;
    setError(null);
    setText("");
    start(async () => {
      addOptimistic({ id: `tmp-${Date.now()}`, content, created_at: new Date().toISOString(), read_at: null, mine: true });
      const res = await sendMessageAction(otherId, content);
      if (!res.ok) {
        setError(res.message ?? "No pudimos enviar el mensaje.");
        setText(content);
      }
      router.refresh();
    });
  }

  return (
    <>
      <section className="flex flex-1 flex-col gap-2 pb-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="rounded-[20px] bg-surface px-4 py-5 text-sm text-mute">Escribile a {otherName} para empezar la conversación.</p>
        )}
        {messages.map((m, i) => {
          const day = localDateKey(m.created_at);
          const showDay = i === 0 || day !== localDateKey(messages[i - 1].created_at);
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {showDay && <span className="self-center pt-2 text-xs font-semibold text-mute">{shortDate(day)}</span>}
              <div
                className={`max-w-[82%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${
                  m.mine ? "self-end rounded-br-md bg-lime text-bg" : "self-start rounded-bl-md bg-surface text-ink"
                } ${m.id.startsWith("tmp-") ? "opacity-70" : ""}`}
              >
                {m.content}
                <span className={`mt-1 block text-right text-[11px] ${m.mine ? "text-bg/60" : "text-mute"}`}>{formatTime(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={`sticky flex items-end gap-2 bg-bg pt-2 shadow-[0_-20px_40px_rgba(17,18,20,0.9)] ${
          composerOffset === "nav" ? "bottom-[104px] lg:bottom-6" : "bottom-6"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {error && <span className="px-2 text-[13px] text-coral">{error}</span>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={`Escribile a ${otherName}…`}
            aria-label="Mensaje"
            className="max-h-32 min-h-12 resize-none rounded-3xl bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-mute outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label="Enviar"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime text-bg disabled:bg-raised disabled:text-mute"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </>
  );
}
