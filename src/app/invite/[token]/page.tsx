import { AuthShell, PersonPill } from "@/components/auth/auth-shell";
import { InviteRegisterForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { initials } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { logError } from "@/lib/errors";

export const metadata = { title: "Invitación · Trainer" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const valid = /^[a-f0-9]{64}$/.test(token);

  // Con una sesión abierta el alta se haría sobre otra cuenta: pedir salir primero.
  const current = await getSessionUser();
  if (current) {
    return (
      <AuthShell title="Ya tenés una sesión abierta" subtitle={`Estás conectado como ${current.email}.`}>
        <p className="px-1 text-sm text-mute">
          Para aceptar esta invitación cerrá sesión y volvé a abrir el link.
        </p>
        <form action={logoutAction}>
          <Button type="submit" variant="tonal" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </AuthShell>
    );
  }

  let invitation: { email: string; student_first_name: string; teacher_name: string } | undefined;
  if (valid) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
    if (error) logError("invite.page", error);
    invitation = data?.[0];
  }

  if (!invitation) {
    return (
      <AuthShell title="Esta invitación no es válida" subtitle="Puede que haya vencido o que ya la hayas usado.">
        <FormMessage kind="error">Pedile a tu profesor que te mande un link nuevo.</FormMessage>
        <LinkButton href="/login" variant="tonal" className="w-full">
          Ya tengo cuenta, ingresar
        </LinkButton>
      </AuthShell>
    );
  }

  const [tFirst, ...tRest] = invitation.teacher_name.split(" ");
  return (
    <AuthShell
      badge={<PersonPill initials={initials(tFirst, tRest.join(" "))} label={`Invitación de ${tFirst}`} />}
      title={`Hola, ${invitation.student_first_name}`}
      subtitle={`${invitation.teacher_name} te sumó como alumno. Creá tu contraseña para ver tu plan.`}
    >
      <InviteRegisterForm token={token} email={invitation.email} />
    </AuthShell>
  );
}
