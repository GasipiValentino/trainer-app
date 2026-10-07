"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { LOAD_ERROR } from "@/lib/errors";

/** Error inesperado: mensaje amable, detalle técnico solo en consola. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ui.error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-[14px] px-4">
      <h1 className="px-1 text-[28px] font-bold tracking-[-0.03em]">Algo salió mal</h1>
      <p className="px-1 text-sm text-mute">{LOAD_ERROR}</p>
      <Button onClick={reset} className="w-full">
        Reintentar
      </Button>
      <LinkButton href="/" variant="tonal" className="w-full">
        Ir al inicio
      </LinkButton>
    </main>
  );
}
