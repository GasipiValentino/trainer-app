import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/**
 * Destino de los links de email (confirmación de cuenta y recuperación de
 * contraseña). Acepta el flujo PKCE (?code=) y el de token_hash.
 */
const ALLOWED_NEXT = ["/teacher", "/student", "/reset-password", "/"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  const next = ALLOWED_NEXT.includes(nextParam) ? nextParam : "/";

  const supabase = await createClient();

  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = "faltan parámetros";
  }

  if (error) {
    logError("auth.confirm", error);
    const target = next === "/reset-password" ? "/forgot-password?expired=1" : "/login?link=expired";
    return NextResponse.redirect(new URL(target, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
