import Link from "next/link";
import { Page, PageTitle } from "@/components/layout/page";
import { PlusIcon } from "@/components/ui/icons";
import { initials } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getRoutineList } from "@/lib/data/routines";
import { routes } from "@/lib/navigation";

export const metadata = { title: "Rutinas · Trainer" };

/** Biblioteca de rutinas del profesor (filas con el lenguaje de D2/D5). */
export default async function RoutinesPage() {
  await requireRole("teacher");
  const routines = await getRoutineList();

  return (
    <Page>
      <header className="flex items-center justify-between px-1">
        <PageTitle aside={`${routines.length}`}>Rutinas</PageTitle>
        <Link href={routes.teacher.newRoutine} aria-label="Nueva rutina" className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-bg">
          <PlusIcon size={20} />
        </Link>
      </header>

      {routines.length === 0 ? (
        <EmptyState title="Todavía no creaste rutinas" action={<LinkButton href={routes.teacher.newRoutine}>Crear rutina</LinkButton>}>
          Armá días, ejercicios, series y progresiones, y asignala a uno o varios alumnos.
        </EmptyState>
      ) : (
        <section className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {routines.map((r) => (
            <Link key={r.id} href={routes.teacher.routine(r.id)} className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
              <span className="text-base font-[650]">{r.name}</span>
              <div className="flex items-center gap-2 text-[13px] text-mute">
                {r.assigned.length > 0 && (
                  <div className="flex">
                    {r.assigned.slice(0, 3).map((a, i) => (
                      <span
                        key={a.id}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[9px] font-semibold text-ink"
                        style={{ background: ["#3A3C42", "#4A4D54", "#5A5D64"][i], marginLeft: i ? -8 : 0 }}
                      >
                        {initials(a.firstName, a.lastName)}
                      </span>
                    ))}
                  </div>
                )}
                <span>
                  {r.assigned.length ? `Asignada a ${r.assigned.length}` : "Sin asignar"}
                  {r.durationWeeks ? ` · ${r.durationWeeks} semanas` : ""} · {r.days} {r.days === 1 ? "día" : "días"}
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </Page>
  );
}
