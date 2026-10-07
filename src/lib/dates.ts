/**
 * Fechas en la zona horaria de la app. Todo formateo pasa por acá para que
 * servidor y cliente muestren lo mismo.
 */
export const APP_TZ = "America/Argentina/Buenos_Aires";
const LOCALE = "es-AR";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Martes 6 de octubre" */
export function formatLongDay(date: Date = new Date()) {
  const s = new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TZ,
  }).format(date);
  return capitalize(s.replace(",", ""));
}

/** "07:00" */
export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TZ,
  }).format(new Date(date));
}

/** Fecha local (YYYY-MM-DD) de un instante, en la zona de la app. */
export function localDateKey(date: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date(date));
}

/** Hora local 0–23. */
export function localHour(date: Date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: APP_TZ }).format(date),
  ) % 24;
}

/** "Buen día" / "Buenas tardes" / "Buenas noches" según la hora local. */
export function greeting(date: Date = new Date()) {
  const h = localHour(date);
  if (h >= 5 && h < 13) return "Buen día";
  if (h >= 13 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Inicio y fin (UTC ISO) del día local que contiene `date`. */
export function localDayRange(date: Date = new Date()) {
  const key = localDateKey(date);
  const start = zonedMidnight(key);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Medianoche local de una fecha YYYY-MM-DD, como instante UTC. */
export function zonedMidnight(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  // Offset de la zona en ese instante (Argentina no tiene DST hoy, pero no lo asumimos).
  const asLocal = new Date(guess.toLocaleString("en-US", { timeZone: APP_TZ }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() + (asUtc.getTime() - asLocal.getTime()));
}

// ------------------------------------------------------------------
// Aritmética sobre fechas locales "YYYY-MM-DD" (sin horas ni zonas).

const DAY_MS = 24 * 60 * 60 * 1000;
const keyToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const utcToKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(key: string, days: number) {
  return utcToKey(keyToUtc(key) + days * DAY_MS);
}

/** Días entre dos fechas locales (b − a). */
export function diffDays(a: string, b: string) {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

/** Lunes de la semana de una fecha local. */
export function mondayOf(key: string) {
  const dow = (new Date(keyToUtc(key)).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(key, -dow);
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(key: string) {
  return (new Date(keyToUtc(key)).getUTCDay() + 6) % 7;
}

export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** "6 jul" */
export function shortDate(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "28 SEP" (historial de D3) */
export function shortDateUpper(key: string) {
  return shortDate(key).toUpperCase();
}

/** "18 de agosto" */
export function longDate(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${d} de ${MONTHS_LONG[m - 1]}`;
}

/** "Octubre 2026" */
export function monthTitle(key: string) {
  const [y, m] = key.split("-").map(Number);
  const name = MONTHS_LONG[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** "dom 20:14" */
export function weekdayTime(iso: string) {
  return `${WEEKDAYS_SHORT[weekdayIndex(localDateKey(iso))]} ${formatTime(iso)}`;
}

export function weekdayShort(key: string) {
  return WEEKDAYS_SHORT[weekdayIndex(key)];
}

/** "hoy" / "ayer" / "hace 3 d" */
export function relativeDay(key: string, today = localDateKey()) {
  const n = diffDays(key, today);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} d`;
}
