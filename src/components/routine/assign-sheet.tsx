"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { assignToStudentsAction } from "@/lib/actions/routines";

type Student = { id: string; first_name: string; last_name: string; status: string; goal: string | null };

/** "Guardar y asignar": elegir alumnos y fecha de inicio. */
export function AssignSheet({
  open,
  onClose,
  routineId,
  students,
  assignedIds,
  today,
}: {
  open: boolean;
  onClose: () => void;
  routineId: string | undefined;
  students: Student[];
  assignedIds: string[];
  today: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState(today);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function submit() {
    if (!routineId) return;
    startTransition(async () => {
      const res = await assignToStudentsAction({ routineId, studentIds: selected, startDate: start });
      setMsg({ kind: res.ok ? "success" : "error", text: res.message });
      if (res.ok) setSelected([]);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Asignar rutina">
      <div className="flex flex-col gap-3 px-2 pb-2">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {students.length === 0 ? (
          <p className="px-1 text-sm text-mute">Todavía no tenés alumnos para asignarle esta rutina.</p>
        ) : (
          <div className="flex max-h-[44dvh] flex-col gap-1.5 overflow-y-auto">
            {students.map((s) => {
              const on = selected.includes(s.id);
              const has = assignedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  disabled={has}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-3 rounded-[18px] border-2 bg-raised px-3 py-2 text-left disabled:opacity-50 ${on ? "border-lime" : "border-transparent"}`}
                >
                  <Avatar first={s.first_name} last={s.last_name} size={36} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className="text-[13px] text-mute">{has ? "Ya la tiene asignada" : (s.goal ?? "Sin objetivo")}</span>
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-extrabold text-bg ${on ? "bg-lime" : "border-[1.5px] border-ink"}`}>
                    {on ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <TextField name="start" type="date" label="Empieza" onCard value={start} onChange={(e) => setStart(e.target.value)} />
        <p className="px-1 text-[13px] text-mute">Si el alumno tiene otra rutina activa, queda como completada.</p>
        <Button type="button" disabled={selected.length === 0} pending={pending} pendingLabel="Asignando…" onClick={submit}>
          {selected.length ? `Asignar a ${selected.length}` : "Elegí alumnos"}
        </Button>
      </div>
    </Sheet>
  );
}
