import {
  cacheConversations,
  cacheMessages,
  getCachedConversations,
  getCachedMessages,
} from "../asyncStorage/messages.asyncStore";

import { client } from "../../supabaseConfig/supabaseConfig";

export interface ConversationData {
  id: string;
  conversation_type: string;
  other_participant: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    profile: any;
  };
  last_message: any | null;
  unread_count?: number;
  message_count?: number;
  created_at: string;
  last_message_at: string;
}

export interface MessageData {
  id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
  sender_id: string;
  users:
    | {
        name: string;
        role: string;
      }
    | any;
}

const getConversationActivityTime = (conversation: any) => {
  const timestamp =
    conversation?.last_message?.sent_at ||
    conversation?.last_message_at ||
    conversation?.created_at;
  const time = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export const sortConversationsByLastMessage = <T extends object>(
  conversations: T[],
): T[] =>
  [...conversations].sort(
    (first: any, second: any) =>
      getConversationActivityTime(second) - getConversationActivityTime(first),
  );

const supportTeamMessage = (message: any, supportUserId?: string): any => {
  if (!message?.users) return message;
  const normalizeUser = (user: any) =>
    user?.role === "admin" || message.sender_id === supportUserId
      ? { ...user, name: "Support team" }
      : user;
  return {
    ...message,
    users: Array.isArray(message.users)
      ? message.users.map(normalizeUser)
      : normalizeUser(message.users),
  };
};

const supportTeamConversation = (conversation: any): any => ({
  ...conversation,
  other_participant:
    conversation?.conversation_type === "admin_driver" ||
    conversation?.conversation_type === "admin_user" ||
    conversation?.other_participant?.role === "admin"
      ? { ...conversation.other_participant, name: "Support team" }
      : conversation?.other_participant,
  last_message: supportTeamMessage(
    conversation?.last_message,
    conversation?.conversation_type === "admin_driver" ||
    conversation?.conversation_type === "admin_user"
      ? conversation?.other_participant?.id
      : undefined,
  ),
});

/* -------------------------------------------------------------------------- */
/*                    FETCH CONVERSATIONS WITH CACHE                          */
/* -------------------------------------------------------------------------- */

export const fetchConversationsWithCache = async (
  userId: string,
  onCached?: (conversations: ConversationData[]) => void,
): Promise<ConversationData[]> => {
  if (!userId) {
    return [];
  }

  try {
    // Get cached conversations first
    const cachedConversations = await getCachedConversations(userId);
    const normalizedCached = sortConversationsByLastMessage(
      cachedConversations.map(supportTeamConversation),
    );
    if (normalizedCached.length > 0) onCached?.(normalizedCached);

    // Fetch fresh conversations
    const { data, error } = await client
      .from("conversations")
      .select(
        `
        id,
        participant_1_id,
        participant_2_id,
        conversation_type,
        created_at,
        last_message_at,
        messages(
          id,
          content,
          sent_at,
          is_read,
          sender_id,
          users!sender_id(name, role)
        )
      `,
      )
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order("last_message_at", {
        ascending: false,
      });

    if (error) {
      console.error("❌ Error fetching conversations:", error);

      return normalizedCached;
    }

    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv: any) => {
        const otherParticipantId =
          conv.participant_1_id === userId
            ? conv.participant_2_id
            : conv.participant_1_id;

        // Fetch user data
        const { data: userData } = await client
          .from("users")
          .select("id, name, email, phone, role")
          .eq("id", otherParticipantId)
          .single();

        let profileData = null;

        // Fetch role-specific profile
        if (userData?.role === "client") {
          const { data } = await client
            .from("clients")
            .select("id, home_address, avatar")
            .eq("user_id", otherParticipantId)
            .single();

          profileData = data;
        } else if (userData?.role === "driver") {
          const { data } = await client
            .from("drivers")
            .select("id, vehicle_plate_number, avatar")
            .eq("user_id", otherParticipantId)
            .single();

          profileData = data;
        } else if (userData?.role === "owner") {
          const { data } = await client
            .from("owners")
            .select("id, company_name, avatar")
            .eq("user_id", otherParticipantId)
            .single();

          profileData = data;
        }

        const latestMessage =
          conv.messages?.sort(
            (a: any, b: any) =>
              new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
          )[0] || null;
        const messages = Array.isArray(conv.messages) ? conv.messages : [];
        const unreadCount = messages.filter(
          (message: any) =>
            message.sender_id !== userId && message.is_read === false,
        ).length;

        return {
          id: conv.id,

          conversation_type: conv.conversation_type,

          other_participant: {
            id: userData?.id,
            name: userData?.role === "admin" ? "Support team" : userData?.name,
            email: userData?.email,
            phone: userData?.phone,
            role: userData?.role,
            profile: profileData,
          },

          last_message: supportTeamMessage(latestMessage),
          unread_count: unreadCount,
          message_count: messages.length,

          created_at: conv.created_at,

          last_message_at: latestMessage?.sent_at || conv.last_message_at,
        };
      }),
    );

    // Cache fresh conversations
    const normalizedConversations = sortConversationsByLastMessage(
      conversationsWithDetails.map(supportTeamConversation),
    );
    await cacheConversations(normalizedConversations, userId);

    return normalizedConversations;
  } catch (err) {
    console.error("❌ Error in fetchConversationsWithCache:", err);

    return (await getCachedConversations(userId)).map(supportTeamConversation);
  }
};

/* -------------------------------------------------------------------------- */
/*                    SUBSCRIBE TO CONVERSATIONS                              */
/* -------------------------------------------------------------------------- */

export const subscribeToConversations = (
  userId: string,
  onConversationsChange: (conversations: ConversationData[]) => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided for conversations subscription");

    return null;
  }

  const channel = client
    .channel(`conversations-${userId}-${Date.now()}`)

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      async (payload: any) => {
        console.log(`📨 Conversation realtime event for ${userId}:`, payload);

        const conversation = payload.new || payload.old;

        const isRelevant =
          conversation?.participant_1_id === userId ||
          conversation?.participant_2_id === userId;

        if (!isRelevant) {
          return;
        }

        try {
          const updated = await fetchConversationsWithCache(userId);

          onConversationsChange(updated);
        } catch (err) {
          console.error("❌ Error refreshing conversations:", err);
        }
      },
    )

    .subscribe((status: string) => {
      console.log(`🎧 Conversations subscription ${userId}:`, status);
    });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                      FETCH MESSAGES WITH CACHE                             */
/* -------------------------------------------------------------------------- */

export const fetchMessagesWithCache = async (
  conversationId: string,
  onCached?: (messages: MessageData[]) => void,
): Promise<MessageData[]> => {
  if (!conversationId) {
    return [];
  }

  try {
    // Get cached messages first
    const cachedMessages = await getCachedMessages(conversationId);
    const normalizedCached = cachedMessages.map((message) =>
      supportTeamMessage(message),
    );
    if (normalizedCached.length > 0) onCached?.(normalizedCached);

    // Fetch fresh messages
    const { data, error } = await client
      .from("messages")
      .select(
        `
        id,
        content,
        sent_at,
        is_read,
        sender_id,
        users!sender_id(name, role)
      `,
      )
      .eq("conversation_id", conversationId)
      .order("sent_at", {
        ascending: true,
      });

    if (error) {
      console.error("❌ Error fetching messages:", error);

      return normalizedCached;
    }

    // Cache fresh messages
    const normalizedMessages = (data || []).map((message) =>
      supportTeamMessage(message),
    );
    await cacheMessages(conversationId, normalizedMessages);

    return normalizedMessages;
  } catch (err) {
    console.error("❌ Error in fetchMessagesWithCache:", err);

    return (await getCachedMessages(conversationId)).map((message) =>
      supportTeamMessage(message),
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                       SUBSCRIBE TO MESSAGES                                */
/* -------------------------------------------------------------------------- */

export const subscribeToMessages = (
  conversationId: string,
  onMessagesChange: (messages: MessageData[]) => void,
) => {
  if (!conversationId) {
    console.warn("⚠️ No conversationId provided for messages subscription");

    return null;
  }

  const channel = client
    .channel(`messages-${conversationId}-${Date.now()}`)

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload: any) => {
        console.log(
          `📨 Message realtime event for ${conversationId}:`,
          payload,
        );

        try {
          const updated = await fetchMessagesWithCache(conversationId);

          onMessagesChange(updated);
        } catch (err) {
          console.error("❌ Error refreshing messages:", err);
        }
      },
    )

    .subscribe((status: string) => {
      console.log(`🎧 Messages subscription ${conversationId}:`, status);
    });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                      UNSUBSCRIBE FROM REALTIME                             */
/* -------------------------------------------------------------------------- */

export const unsubscribeFromRealtime = async (channel: any) => {
  if (!channel) {
    return;
  }

  try {
    await client.removeChannel(channel);

    console.log("✅ Realtime channel removed");
  } catch (err) {
    console.error("❌ Error unsubscribing from realtime:", err);
  }
};
