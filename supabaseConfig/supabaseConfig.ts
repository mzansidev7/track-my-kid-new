/**
 * Postgres schema lives at the workspace root: `supabase.sql`, plus server append DDL
 * `track-my-kid-server/supabase/schema-append.sql` (routes, messaging, links).
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables",
  );
}

// Regular client for user operations (uses anon key)
export const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const setSupabaseSession = async (session?: {
  access_token: string;
  refresh_token: string;
}) => {
  if (!session?.access_token || !session.refresh_token) {
    throw new Error("A valid Supabase Auth session is required");
  }

  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
};

export const clearSupabaseSession = async () => {
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

const restoreRealtimeAuth = async () => {
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error("Could not restore Supabase Realtime session:", error);
    client.realtime.setAuth("");
    return;
  }
  client.realtime.setAuth(data.session?.access_token || "");
};

export const setAuthToken = (_backendToken?: string | null) => {
  void restoreRealtimeAuth();
};

export const clearAuthToken = () => {
  void restoreRealtimeAuth();
};
