/**
 * Postgres schema lives at the workspace root: `supabase.sql`, plus server append DDL
 * `track-my-kid-server/supabase/schema-append.sql` (routes, messaging, links).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables",
  );
}

// Regular client for user operations (uses anon key)
export const client = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: false, // We're handling auth manually
  },
});

// Function to set auth token for the client
export const setAuthToken = (token?: string | null) => {
  const normalizedToken = typeof token === "string" ? token.trim() : "";

  if (!normalizedToken) {
    client.realtime.setAuth("");
    return false;
  }

  // This app authenticates users with a backend JWT rather than a Supabase auth session.
  // Realtime channels should not receive that token, otherwise they fail with CHANNEL_ERROR.
  client.realtime.setAuth("");
  console.warn(
    "⚠️ Realtime auth skipped; using anonymous Supabase access for subscriptions.",
  );

  return false;
};

// Clear realtime auth token, to avoid invalid JWTs from breaking realtime channels
export const clearAuthToken = () => {
  client.realtime.setAuth("");
};
