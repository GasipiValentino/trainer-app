import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Pastillas de filtro / pestañas (D2 filtros, D3 pestañas, D5 días, D8 grupos):
 * activa = #F2F2EE con texto oscuro; inactiva = borde #3A3C42.
 * Scroll horizontal sin barra, como en el diseño (se cortan contra el borde).
 */
export function PillRow({ children, bleed = true }: { children: ReactNode; bleed?: boolean }) {
  return (
    <div className={`no-scrollbar flex gap-1.5 overflow-x-auto ${bleed ? "-mr-4 pr-4 lg:mr-0 lg:pr-0" : ""}`}>
      {children}
    </div>
  );
}

const pillClass = (active: boolean, size: "md" | "lg") =>
  `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold ${
    size === "lg" ? "h-[38px]" : "h-9"
  } ${active ? "bg-ink text-bg" : "border border-line text-ink"}`;

type PillProps = {
  active: boolean;
  children: ReactNode;
  count?: number | string;
  size?: "md" | "lg";
};

export function PillLink({ href, active, children, count, size = "md" }: PillProps & { href: string }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className={pillClass(active, size)}>
      {children}
      {count != null && <span className="font-medium opacity-70">{count}</span>}
    </Link>
  );
}

export function PillButton({
  active,
  children,
  count,
  size = "md",
  onClick,
}: PillProps & { onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={pillClass(active, size)}>
      {children}
      {count != null && <span className="font-medium opacity-70">{count}</span>}
    </button>
  );
}
