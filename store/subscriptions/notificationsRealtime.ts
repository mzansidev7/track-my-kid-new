import { client } from "../../supabaseConfig/supabaseConfig";

export const subscribeToNotifications = (
  userId: string,
  onNotificationsChange: () => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided for notifications subscription");
    return null;
  }

  const channel = client
    .channel(`notifications-${userId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        console.log(`📬 Notifications realtime event for ${userId}:`, payload);
        onNotificationsChange();
      },
    )
    .subscribe((status: string) => {
      console.log(`🎧 Notifications subscription ${userId}:`, status);
    });

  return channel;
};

export const unsubscribeFromNotificationsRealtime = async (channel: any) => {
  if (!channel) return;

  try {
    await client.removeChannel(channel);
    console.log("✅ Notifications realtime channel removed");
  } catch (err) {
    console.error("❌ Error unsubscribing from notifications realtime:", err);
  }
};
