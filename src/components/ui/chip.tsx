import type { ReactNode } from "react";

/**
 * Chips de estado del diseño:
 *  warn  → coral sobre coral 16% (D1 "8 días", D3 "8 días sin entrenar")
 *  up    → lima sobre lima 14% (D2 "+12%", D4 "+12%")
 *  solid → lima sólido con texto oscuro (D1 "+12%", "16/16")
 *  flat  → #26282D con texto mute (D2 "—")
 *  dark  → oscuro 12% sobre lima (E1 "Semana 3 de 4")
 */
export type ChipTone = "warn" | "up" | "solid" | "flat" | "dark";

const TONE: Record<ChipTone, string> = {
  warn: "bg-[var(--coral-soft)] text-coral",
  up: "bg-[var(--lime-soft)] text-lime",
  solid: "bg-lime text-bg",
  flat: "bg-raised text-mute",
  dark: "bg-[rgba(17,18,20,0.12)] text-bg",
};

export function Chip({
  tone,
  children,
  size = "md",
  className = "",
}: {
  tone: ChipTone;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  const sz = size === "sm" ? "h-6 px-2 text-xs rounded-xl" : "h-7 px-2.5 text-[13px] rounded-[14px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap font-[650] ${sz} ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}
