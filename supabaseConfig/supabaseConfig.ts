/**
 * Postgres schema lives at the workspace root: `supabase.sql`, plus server append DDL
 * `track-my-kid-server/supabase/schema-append.sql` (routes, messaging, links).
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables",
    );
  }

  const isBrowser = typeof window !== "undefined";

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: isBrowser ? AsyncStorage : undefined,
      autoRefreshToken: true,
      persistSession: isBrowser,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

let cachedClient: ReturnType<typeof createClient> | null = null;

export const client = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_target, prop) => {
    if (!cachedClient) {
      cachedClient = getSupabaseClient();
    }
    return (cachedClient as any)[prop as keyof typeof cachedClient];
  },
  set: (_target, prop, value) => {
    if (!cachedClient) {
      cachedClient = getSupabaseClient();
    }
    (cachedClient as any)[prop as keyof typeof cachedClient] = value;
    return true;
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
