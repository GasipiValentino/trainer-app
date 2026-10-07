import type { ReactNode } from "react";
import { IconLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";

/**
 * Contenedor de las pantallas de acceso:
 * misma grilla que las pantallas mobile (padding 58/16, gap 14) y misma
 * tipografía de título que E4 ("¿Cómo fue tu semana?").
 */
type AuthShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, backHref, badge, children, footer }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-[14px] px-4 pb-10 pt-[58px]">
      {(backHref || badge) && (
        <header className="flex items-center justify-between">
          {backHref ? (
            <IconLink href={backHref} aria-label="Volver">
              <BackIcon />
            </IconLink>
          ) : (
            <span />
          )}
          {badge}
        </header>
      )}

      <section className="flex flex-col gap-1 px-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="text-sm text-mute">{subtitle}</p>}
      </section>

      {children}

      {footer && <div className="mt-auto pt-6 text-center text-sm text-mute">{footer}</div>}
    </main>
  );
}

/** Pill "VG · Pedido por Valen" (E4), reutilizado para mostrar quién invita. */
export function PersonPill({ initials, label }: { initials: string; label: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-[18px] bg-surface pl-1 pr-3 text-[13px] font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime text-[11px] font-bold text-bg">
        {initials}
      </span>
      {label}
    </div>
  );
}
