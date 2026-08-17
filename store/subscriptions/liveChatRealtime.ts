import { client } from "../../supabaseConfig/supabaseConfig";
import {
  cacheLiveChatSession,
  getCachedLiveChatSession,
} from "../asyncStorage/liveChat.asyncStore";

export interface LiveChatSession {
  id: string;
  user_id: string;
  status: string;
  started_by: string;
  last_message_at?: string | null;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
}

export interface LiveChatMessage {
  id: string;
  session_id: string;
  sender_id?: string | null;
  sender_role: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
}

const normalizeUserRole = (role?: string | null) => {
  const normalized = String(role || "driver").toLowerCase();

  if (["owner", "client", "school", "driver"].includes(normalized)) {
    return normalized;
  }

  return "driver";
};

export const ensureUserLiveChatSession = async (
  userId: string,
  userRole?: string | null,
): Promise<LiveChatSession | null> => {
  if (!userId) {
    return null;
  }

  try {
    const cachedSession = await getCachedLiveChatSession(userId);
    if (cachedSession?.id) {
      return cachedSession;
    }

    const { data, error } = await client
      .from("live_chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      await cacheLiveChatSession(userId, data);
      return data;
    }

    const { data: insertedSession, error: insertError } = await client
      .from("live_chat_sessions")
      .insert({
        user_id: userId,
        status: "open",
        started_by: normalizeUserRole(userRole),
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    await cacheLiveChatSession(userId, insertedSession);
    return insertedSession;
  } catch (error) {
    console.error("❌ Error ensuring live chat session:", error);
    return await getCachedLiveChatSession(userId);
  }
};

export const fetchLiveChatMessages = async (
  sessionId: string,
): Promise<LiveChatMessage[]> => {
  if (!sessionId) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("live_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.error("❌ Error fetching live chat messages:", error);
    return [];
  }
};

export const sendLiveChatMessage = async ({
  sessionId,
  userId,
  userRole,
  message,
}: {
  sessionId: string;
  userId: string;
  userRole?: string | null;
  message: string;
}): Promise<LiveChatMessage | null> => {
  const trimmedMessage = message.trim();

  if (!sessionId || !userId || !trimmedMessage) {
    return null;
  }

  try {
    const { data, error } = await client
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        sender_id: userId,
        sender_role: normalizeUserRole(userRole),
        message: trimmedMessage,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await client
      .from("live_chat_sessions")
      .update({
        status: "active",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return data;
  } catch (error) {
    console.error("❌ Error sending live chat message:", error);
    return null;
  }
};

export const subscribeToLiveChatMessages = (
  sessionId: string,
  onMessagesChange: (messages: LiveChatMessage[]) => void,
) => {
  if (!sessionId) {
    return null;
  }

  const channel = client
    .channel(`live_chat_messages_${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_chat_messages",
        filter: `session_id=eq.${sessionId}`,
      },
      async () => {
        const messages = await fetchLiveChatMessages(sessionId);
        onMessagesChange(messages);
      },
    )
    .subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`⚠️ Live chat realtime unavailable for session ${sessionId}`);
      }
    });

  return channel;
};
