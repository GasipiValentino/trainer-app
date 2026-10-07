import { LinkButton } from "@/components/ui/button";

/** 404. También es la respuesta cuando un recurso no existe o no es tuyo. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-[14px] px-4">
      <h1 className="px-1 text-[28px] font-bold tracking-[-0.03em]">No encontramos esta página</h1>
      <p className="px-1 text-sm text-mute">Puede que el link esté mal o que no tengas acceso a este contenido.</p>
      <LinkButton href="/" className="w-full">
        Ir al inicio
      </LinkButton>
    </main>
  );
}
