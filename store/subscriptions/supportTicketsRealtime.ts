import { client } from "../../supabaseConfig/supabaseConfig";
import {
  cacheUserTickets,
  getCachedUserTickets,
} from "../asyncStorage/supportTickets.asyncStore";

export const fetchSupportTicketsForUser = async (userId: string) => {
  if (!userId) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const tickets = data ?? [];
    await cacheUserTickets(userId, tickets);
    return tickets;
  } catch (error) {
    console.error("❌ Error fetching support tickets:", error);
    return await getCachedUserTickets(userId);
  }
};

export const subscribeToSupportTickets = (
  userId: string,
  onTicketsChange: (tickets: any[]) => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided for support ticket subscription");
    return null;
  }

  const channel = client
    .channel(`support_tickets_user_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_tickets",
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const updatedTickets = await fetchSupportTicketsForUser(userId);
        onTicketsChange(updatedTickets);
      },
    )
    .subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`⚠️ Support ticket realtime unavailable for ${userId}`);
      }
    });

  return channel;
};
