import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";

export const metadata = { title: "Crear cuenta · Trainer" };

/** Registro público = profesores. Los alumnos solo entran por invitación. */
export default function RegisterPage() {
  return (
    <AuthShell
      backHref="/login"
      title="Creá tu cuenta de profesor"
      subtitle="Después vas a poder sumar a tus alumnos con un link de invitación."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-lime">
            Ingresá
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
