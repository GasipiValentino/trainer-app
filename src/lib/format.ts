/**
 * Formato de números y textos como en el diseño: coma decimal ("82,1"),
 * signo menos tipográfico ("−1,9") y "±0" para sin cambio.
 */
const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const MINUS = "−";

export function num(value: number | null | undefined, decimals: 0 | 1 = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return (decimals === 0 ? nf0 : nf1).format(value).replace("-", MINUS);
}

/** Delta con signo: "+12", "−1,9", "±0". */
export function signed(value: number, decimals: 0 | 1 = 1): string {
  const rounded = decimals === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  if (rounded === 0) return "±0";
  return `${rounded > 0 ? "+" : MINUS}${num(Math.abs(rounded), decimals)}`;
}

/** Porcentaje con signo: "+12%". */
export function signedPct(ratio: number): string {
  const pct = Math.round(ratio * 100);
  if (pct === 0) return "±0%";
  return `${pct > 0 ? "+" : MINUS}${Math.abs(pct)}%`;
}

/** Edad en años a partir de YYYY-MM-DD. */
export function age(birthDate: string | null | undefined, today = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  let a = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) a--;
  return a;
}

export function fullName(first: string, last?: string | null) {
  return `${first} ${last ?? ""}`.trim();
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export const LEVEL_LABEL: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};
