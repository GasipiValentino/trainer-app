"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { routes } from "@/lib/navigation";
import { CalendarIcon, ListIcon, UsersIcon } from "@/components/ui/icons";
import { ROW_CLASS } from "@/components/ui/card";

/** Acciones del botón "+" (filas como las de "Novedades" en D1). */
const ACTIONS = [
  { href: routes.teacher.newStudent, label: "Agregar alumno", hint: "Cargalo y mandale la invitación", Icon: UsersIcon },
  { href: routes.teacher.newRoutine, label: "Nueva rutina", hint: "Armala y asignala", Icon: ListIcon },
  { href: routes.teacher.newEvent, label: "Nuevo evento", hint: "Sesión, evaluación o tarea", Icon: CalendarIcon },
];

export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Crear">
      {ACTIONS.map(({ href, label, hint, Icon }) => (
        <Link key={href} href={href} onClick={onClose} className={ROW_CLASS}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-line">
            <Icon size={20} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{label}</span>
            <span className="text-[13px] text-mute">{hint}</span>
          </span>
        </Link>
      ))}
    </Sheet>
  );
}
