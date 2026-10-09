import "server-only";
import { headers } from "next/headers";

const isLocal = (url: string) => /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);

/**
 * URL pública de la app para armar links que salen del navegador (invitaciones,
 * emails de Supabase). Prioridad:
 *  1. NEXT_PUBLIC_SITE_URL, si apunta a un dominio real (no localhost);
 *  2. el host del request actual (sirve en local, en Vercel y en previews);
 *  3. el dominio de producción que expone Vercel.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured && !isLocal(configured)) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : configured ?? "http://localhost:3000";
}
