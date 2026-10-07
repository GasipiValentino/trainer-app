import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { finishOnboardingAction } from "@/lib/actions/teacher";
import { routes } from "@/lib/navigation";

/**
 * Primer ingreso del profesor: 4 pasos, todos opcionales. Card lima como
 * "Atención hoy" + filas como "Novedades". "Saltar" lo cierra para siempre.
 */
export function Onboarding({
  firstName,
  hasStudent,
  hasRoutine,
  hasEvent,
}: {
  firstName: string;
  hasStudent: boolean;
  hasRoutine: boolean;
  hasEvent: boolean;
}) {
  const steps = [
    { done: true, title: "Creaste tu cuenta", hint: "Bienvenido a tu espacio de trabajo", href: null },
    { done: hasStudent, title: "Agregá tu primer alumno", hint: "Cargalo y mandale el link de invitación", href: routes.teacher.newStudent },
    { done: hasRoutine, title: "Creá tu primera rutina", hint: "Días, ejercicios, series y progresión", href: routes.teacher.newRoutine },
    { done: hasEvent, title: "Configurá tu agenda", hint: "Sesiones presenciales, online y evaluaciones", href: routes.teacher.newEvent },
  ];
  const left = steps.filter((s) => !s.done).length;

  return (
    <>
      <section className="flex flex-col gap-2 rounded-[28px] bg-lime p-5 text-bg">
        <span className="text-[13px] font-semibold">Bienvenido, {firstName}</span>
        <span className="text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">
          Armemos tu
          <br />
          espacio en {left} {left === 1 ? "paso" : "pasos"}
        </span>
        <span className="text-sm font-medium">Podés hacerlos en cualquier orden o saltarlos.</span>
      </section>

      <section className="flex flex-col gap-1.5 rounded-[24px] bg-surface px-2 pb-2 pt-2">
        {steps.map((s, i) => {
          const body = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  s.done ? "bg-lime text-bg" : "bg-line text-ink"
                }`}
              >
                {s.done ? <CheckIcon size={18} strokeWidth={2.4} /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-[15px] font-semibold ${s.done ? "text-mute line-through" : ""}`}>{s.title}</span>
                <span className="text-[13px] text-mute">{s.hint}</span>
              </span>
            </>
          );
          return s.href && !s.done ? (
            <Link key={s.title} href={s.href} className="flex items-center gap-3 rounded-[18px] bg-raised px-3 py-2.5">
              {body}
            </Link>
          ) : (
            <div key={s.title} className="flex items-center gap-3 rounded-[18px] bg-raised px-3 py-2.5">
              {body}
            </div>
          );
        })}
      </section>

      <form action={finishOnboardingAction}>
        <Button type="submit" variant="tonal" size="md" className="w-full">
          {left === 0 ? "Listo, ir a mi panel" : "Saltar por ahora"}
        </Button>
      </form>
    </>
  );
}
