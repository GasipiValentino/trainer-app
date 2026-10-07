"use client";

import { useState, useTransition } from "react";
import { remindCheckinsAction } from "@/lib/actions/checkins";

/** "Recordar a los N que faltan" (D7). */
export function RemindButton({ userIds }: { userIds: string[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const n = userIds.length;

  if (msg?.ok) {
    return <p className="flex h-11 items-center justify-center rounded-[22px] bg-[var(--lime-soft)] text-sm font-semibold text-lime">{msg.text}</p>;
  }
  return (
    <>
      {msg && <p className="text-center text-sm font-semibold text-coral">{msg.text}</p>}
      <button
        type="button"
        disabled={n === 0 || pending}
        onClick={() => start(async () => {
          const r = await remindCheckinsAction(userIds);
          setMsg({ ok: r.ok, text: r.message });
        })}
        className="h-11 rounded-[22px] bg-raised text-sm font-semibold disabled:text-mute"
      >
        {pending ? "Enviando…" : n === 0 ? "Respondieron todos" : `Recordar a ${n === 1 ? "1 que falta" : `los ${n} que faltan`}`}
      </button>
    </>
  );
}
