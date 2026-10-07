import Link from "next/link";
import type { ReactNode } from "react";

/** Card base: #1C1D21, radio 24, padding 16/18 (D3, D4). */
export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={`flex flex-col gap-3 rounded-[24px] bg-surface px-[18px] py-4 ${className}`}>{children}</Tag>;
}

/** Título de card (16/650) con acción opcional a la derecha (lima, 13px). */
export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base font-[650]">{children}</span>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-semibold text-lime">
      {children}
    </Link>
  );
}

/**
 * Lista dentro de card (D1 "Novedades", D7 "Sin novedades"): contenedor con
 * padding 6/8/8 y filas #26282D radio 18.
 */
export function ListCard({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-[24px] bg-surface px-2 pb-2 pt-1.5">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-[17px] font-[650]">{title}</span>
        {action}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

export const ROW_CLASS = "flex items-center gap-3 rounded-[18px] bg-raised px-3 py-2.5";
