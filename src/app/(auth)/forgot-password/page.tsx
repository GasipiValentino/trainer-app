import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/ui/field";

export const metadata = { title: "Recuperar contraseña · Trainer" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { expired } = await searchParams;
  return (
    <AuthShell
      backHref="/login"
      title="Recuperá tu contraseña"
      subtitle="Te mandamos un link por email para crear una nueva."
    >
      {expired && <FormMessage kind="error">El link venció o ya fue usado. Pedí uno nuevo.</FormMessage>}
      <ForgotPasswordForm />
    </AuthShell>
  );
}
