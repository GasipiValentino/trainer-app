import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/ui/field";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Nueva contraseña · Trainer" };

/** Se llega desde el link del email (auth/confirm ya abrió la sesión de recuperación). */
export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <AuthShell backHref="/login" title="El link venció" subtitle="Por seguridad, los links de recuperación duran poco.">
        <FormMessage kind="error">Pedí un link nuevo para crear tu contraseña.</FormMessage>
        <LinkButton href="/forgot-password" className="w-full">
          Pedir un link nuevo
        </LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Creá una contraseña nueva" subtitle={user.email}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
