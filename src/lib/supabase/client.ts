import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Cliente de navegador: solo para realtime y uploads. Las mutaciones van por server actions. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
