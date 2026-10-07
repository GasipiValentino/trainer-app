/**
 * Avatar de iniciales. Variantes del diseño:
 *  - neutral: #3A3C42 (alumnos)
 *  - lime: el profesor ("VG" lima en D1/E1)
 *  - ring: anillo de estado (coral = atención, lima = progresa, gris = inactivo) — D2/D3
 */
export function initials(first: string, last?: string | null) {
  const a = first.trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

type AvatarProps = {
  first: string;
  last?: string | null;
  size?: number;
  tone?: "neutral" | "lime";
  ring?: string | null;
  className?: string;
};

export function Avatar({ first, last, size = 46, tone = "neutral", ring, className = "" }: AvatarProps) {
  const fontSize = Math.round(size * 0.3);
  const inner = (
    <span
      className={`flex h-full w-full items-center justify-center rounded-full font-semibold ${
        tone === "lime" ? "bg-lime text-bg font-bold" : "bg-line text-ink"
      }`}
      style={{ fontSize }}
    >
      {initials(first, last)}
    </span>
  );

  if (!ring) {
    return (
      <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
        {inner}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full p-[2px] ${className}`}
      style={{ width: size, height: size, border: `2px solid ${ring}` }}
    >
      {inner}
    </span>
  );
}
