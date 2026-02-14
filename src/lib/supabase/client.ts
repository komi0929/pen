import type { Database } from "@/lib/database.types";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  }

  return createBrowserClient<Database>(url, key);
}
