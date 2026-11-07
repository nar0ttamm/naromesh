import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// Server-side only — uses the service role key.
// NEVER import this file in browser/client components.
// Lazily initialised so build does not throw when env vars are absent.

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables."
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
    // Node 20 has no built-in WebSocket. The pipeline only uses REST,
    // but the client still constructs a realtime socket on startup.
    realtime: { transport: ws as unknown as typeof WebSocket }
  });
  return _client;
}

// Proxy so callers can use `supabaseAdmin.from(...)` etc. without change
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getClient();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  }
});
