import type { ReactNode } from "react";

/**
 * Contenedor de página. Mobile: grilla del diseño (padding 58/16, gap 12) y
 * espacio para la barra flotante. Desktop: ancho máximo y padding de lámina 00.
 */
export function Page({
  children,
  className = "",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-3 px-4 pb-32 pt-[58px] lg:px-8 lg:pb-12 lg:pt-8 ${
        narrow ? "max-w-[640px]" : "max-w-[1200px]"
      } ${className}`}
    >
      {children}
    </main>
  );
}

/** Título de pantalla de nivel 1 (D2 "Alumnos", D6 "Agenda"). */
export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 px-1">
      <h1 className="text-[30px] font-bold tracking-[-0.03em]">{children}</h1>
      {aside && <span className="text-[15px] text-mute">{aside}</span>}
    </div>
  );
}
