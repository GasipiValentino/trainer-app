"use client";

import Link from "next/link";

/**
 * Control segmentado del diseño: contenedor oscuro con opción activa en lima.
 *  - "inline": D3 rangos (7D/30D/3M…) — fondo #111214, alto 28
 *  - "wide":   D4 modos — ocupa el ancho, alto 32
 *  - "header": D6 Día/Semana/Mes — fondo #1C1D21, alto 36
 */
type Variant = "inline" | "wide" | "header";

const WRAP: Record<Variant, string> = {
  inline: "flex gap-0.5 rounded-2xl bg-bg p-[3px]",
  wide: "flex gap-1 rounded-[18px] bg-bg p-[3px]",
  header: "flex gap-0.5 rounded-[22px] bg-surface p-1",
};
const ITEM: Record<Variant, string> = {
  inline: "h-7 min-w-[34px] rounded-[14px] px-1.5 text-xs",
  wide: "h-8 flex-1 rounded-2xl px-2 text-[13px] leading-tight",
  header: "h-9 rounded-[18px] px-3 text-[13px]",
};

type Option<T extends string> = { value: T; label: string; href?: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = "inline",
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange?: (v: T) => void;
  variant?: Variant;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={WRAP[variant]}>
      {options.map((o) => {
        const on = o.value === value;
        const cls = `${ITEM[variant]} flex items-center justify-center font-[650] transition-colors ${
          on ? "bg-lime text-bg" : "text-mute hover:text-ink"
        }`;
        return o.href ? (
          <Link key={o.value} href={o.href} role="radio" aria-checked={on} className={cls} scroll={false}>
            {o.label}
          </Link>
        ) : (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={cls} onClick={() => onChange?.(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
