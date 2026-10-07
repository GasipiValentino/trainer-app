import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { FormMessage } from "@/components/ui/field";

export const metadata = { title: "Ingresar · Trainer" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, deleted, link } = await searchParams;

  return (
    <AuthShell
      title="Hola de nuevo"
      subtitle="Ingresá para ver a tus alumnos o tu plan de entrenamiento."
      footer={
        <>
          ¿Sos profesor y no tenés cuenta?{" "}
          <Link href="/register" className="font-semibold text-lime">
            Creala gratis
          </Link>
          <p className="mt-2 text-[13px]">Si sos alumno, entrá con el link de invitación de tu profesor.</p>
        </>
      }
    >
      {deleted && <FormMessage kind="success">Tu cuenta fue eliminada.</FormMessage>}
      {link === "expired" && (
        <FormMessage kind="error">El link venció o ya fue usado. Ingresá con tu email y contraseña.</FormMessage>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
