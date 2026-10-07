import type { ReactNode } from "react";

/**
 * Estado vacío útil: título, explicación y acción. Card #1C1D21 radio 24,
 * misma jerarquía que el resto (16/650 + 14 mute).
 */
export function EmptyState({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col items-start gap-3 rounded-[24px] bg-surface px-[18px] py-5 ${className}`}>
      <div className="flex flex-col gap-1">
        <span className="text-base font-[650]">{title}</span>
        {children && <p className="text-sm text-mute">{children}</p>}
      </div>
      {action}
    </section>
  );
}

/** Error de carga dentro de una sección (sin detalle técnico). */
export function SectionError({ message = "No pudimos cargar la información. Intentá nuevamente." }: { message?: string }) {
  return (
    <p role="alert" className="rounded-[18px] bg-[var(--coral-soft)] px-4 py-3 text-sm font-semibold text-coral">
      {message}
    </p>
  );
}
