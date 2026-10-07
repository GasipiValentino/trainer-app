import { Avatar } from "@/components/ui/avatar";
import { Button, IconLink } from "@/components/ui/button";
import { BackIcon, LogoutIcon } from "@/components/ui/icons";
import { DeleteAccountForm } from "@/components/auth/forms";
import { logoutAction } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";

/** Cuenta: datos básicos, cerrar sesión y eliminar cuenta (requisito de tiendas). */
export function AccountView({
  user,
  backHref,
  details = [],
}: {
  user: SessionUser;
  backHref: string;
  /** Datos de perfil de solo lectura (alumno: objetivo, nivel, coach…). */
  details?: { label: string; value: string }[];
}) {
  const consequence =
    user.role === "teacher"
      ? "Se borran tus rutinas, tu agenda, tus notas y tus mensajes. Tus alumnos con cuenta conservan su historial; los que nunca activaron su cuenta se eliminan."
      : "Se borran tu historial de entrenamientos, mediciones, fotos, check-ins y mensajes. No se puede deshacer.";

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pb-12 pt-[58px] lg:pt-8">
      <div className="flex">
        <IconLink href={backHref} aria-label="Volver">
          <BackIcon />
        </IconLink>
      </div>

      <section className="flex items-center gap-3.5 px-1">
        <Avatar first={user.firstName} last={user.lastName} size={72} tone={user.role === "teacher" ? "lime" : "neutral"} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-[-0.03em]">
            {user.firstName} {user.lastName}
          </h1>
          <span className="truncate text-[13px] text-mute">{user.email}</span>
          <span className="text-[13px] text-mute">{user.role === "teacher" ? "Profesor" : "Alumno"}</span>
        </div>
      </section>

      {details.length > 0 && (
        <section className="flex flex-col gap-1.5 rounded-[24px] bg-surface p-2">
          {details.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-3 rounded-[18px] bg-raised px-4 py-3 text-[15px]">
              <span className="text-mute">{d.label}</span>
              <span className="text-right font-semibold">{d.value}</span>
            </div>
          ))}
          <p className="px-3 pb-1 pt-1 text-[13px] text-mute">Si algún dato está mal, pedile a tu coach que lo actualice.</p>
        </section>
      )}

      <section className="rounded-[24px] bg-surface p-2">
        <form action={logoutAction}>
          <Button type="submit" variant="tonal" className="w-full">
            <LogoutIcon size={18} />
            Cerrar sesión
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4">
        <span className="text-base font-[650]">Eliminar cuenta</span>
        <DeleteAccountForm consequence={consequence} />
      </section>
    </main>
  );
}
