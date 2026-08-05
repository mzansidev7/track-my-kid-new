import { client } from "../../supabaseConfig/supabaseConfig";

/* -------------------------------------------------------------------------- */
/*                        UNSUBSCRIBE FROM REALTIME                           */
/* -------------------------------------------------------------------------- */

export const unsubscribeFromRealtime = async (
  channel: any,
): Promise<void> => {
  if (!channel) {
    console.warn("⚠️ No realtime channel provided");
    return;
  }

  try {
    await client.removeChannel(channel);

    console.log("✅ Realtime channel unsubscribed successfully");
  } catch (err) {
    console.error(
      "❌ Error unsubscribing from realtime:",
      err,
    );
  }
};