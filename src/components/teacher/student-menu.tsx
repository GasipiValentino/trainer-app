"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet, SheetOption } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { InviteShare } from "@/components/teacher/invite-share";
import { regenerateInviteAction, unlinkStudentAction } from "@/lib/actions/students";
import { routes } from "@/lib/navigation";

type View = "menu" | "invite" | "unlink";

/** Botón "…" de D3: editar, progreso, invitación y desvincular. */
export function StudentMenu({ studentId, firstName, pending }: { studentId: string; firstName: string; pending: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const close = () => {
    setOpen(false);
    setView("menu");
    setError(null);
  };

  function newInvite() {
    setError(null);
    start(async () => {
      const res = await regenerateInviteAction(studentId);
      if (res.ok && res.data?.inviteUrl) {
        setInviteUrl(res.data.inviteUrl);
        setView("invite");
      } else setError(res.message ?? "No pudimos generar la invitación.");
    });
  }

  function unlink() {
    start(async () => {
      const res = await unlinkStudentAction(studentId);
      if (res && !res.ok) setError(res.message ?? "No pudimos desvincular al alumno.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Más opciones"
        className="flex h-11 w-11 items-center justify-center gap-[3px] rounded-full bg-surface"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-ink" />
        ))}
      </button>

      <Sheet open={open} onClose={close} title={view === "invite" ? "Invitación" : view === "unlink" ? "Desvincular" : firstName}>
        {error && (
          <div className="px-2">
            <FormMessage kind="error">{error}</FormMessage>
          </div>
        )}
        {view === "menu" && (
          <>
            <SheetOption label="Ver progreso" hint="Peso, fuerza y constancia" onClick={() => router.push(routes.teacher.studentProgress(studentId))} />
            <SheetOption label="Reporte de progreso" hint="Para compartir o descargar en PDF" onClick={() => router.push(`${routes.teacher.student(studentId)}/report`)} />
            <SheetOption label="Editar datos" onClick={() => router.push(`${routes.teacher.student(studentId)}/edit`)} />
            {pending && (
              <SheetOption label={busy ? "Generando…" : "Reenviar invitación"} hint="Genera un link nuevo y anula el anterior" onClick={newInvite} />
            )}
            <SheetOption label="Desvincular alumno" tone="danger" onClick={() => setView("unlink")} />
          </>
        )}
        {view === "invite" && inviteUrl && (
          <div className="px-2 pb-2">
            <InviteShare url={inviteUrl} firstName={firstName} />
          </div>
        )}
        {view === "unlink" && (
          <div className="flex flex-col gap-3 px-2 pb-2">
            <p className="px-1 text-sm text-mute">
              {firstName} deja de estar en tu lista y pierde acceso a tus rutinas. Su historial no se borra.
            </p>
            <Button variant="outline" className="w-full !border-coral !text-coral" pending={busy} pendingLabel="Desvinculando…" onClick={unlink}>
              Desvincular a {firstName}
            </Button>
            <Button variant="tonal" className="w-full" onClick={() => setView("menu")}>
              Cancelar
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
