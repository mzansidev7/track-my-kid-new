import { clearAuthToken, client } from "../../supabaseConfig/supabaseConfig";

const logSubscriptionStatus = (
  subscriptionName: string,
  ownerId: string,
  status: string,
) => {
  if (status === "SUBSCRIBED") {
    console.log(`✅ ${subscriptionName} active for ${ownerId}`);
  } else if (status === "CLOSED") {
    console.log(`❌ ${subscriptionName} closed for ${ownerId}`);
  } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    clearAuthToken();
    console.warn(
      `⚠️ ${subscriptionName} unavailable for ${ownerId}; continuing without live updates`,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                           ROUTES LIST UPDATES                              */
/* -------------------------------------------------------------------------- */

export const subscribeToRoutesListUpdates = (
  ownerId: string,
  onRoutesChange: () => void,
) => {
  if (!ownerId) {
    console.warn("⚠️ No ownerId provided");
    return null;
  }

  const channel = client
    .channel(`routes-list-${ownerId}-${Date.now()}`)

    // ROUTE CHANGES - filter by owner_id
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "routes",
        filter: `owner_id=eq.${ownerId}`,
      },
      async (payload: any) => {
        console.log(`🛣️ Routes realtime event for owner ${ownerId}:`, payload);
        onRoutesChange();
      },
    )

    // ROUTE CHILDREN CHANGES - need to check if route belongs to owner
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "route_children",
      },
      async (payload: any) => {
        // Check if the route belongs to this owner
        if (payload.new?.route_id || payload.old?.route_id) {
          const routeId = payload.new?.route_id || payload.old?.route_id;
          const { data: route } = await client
            .from("routes")
            .select("owner_id")
            .eq("id", routeId)
            .single();

          if (route?.owner_id === ownerId) {
            console.log(
              `👶 Route children realtime event for owner ${ownerId}:`,
              payload,
            );
            onRoutesChange();
          }
        }
      },
    )

    // ROUTE STOPS CHANGES - need to check if route belongs to owner
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "route_stops",
      },
      async (payload: any) => {
        // Check if the route belongs to this owner
        if (payload.new?.route_id || payload.old?.route_id) {
          const routeId = payload.new?.route_id || payload.old?.route_id;
          const { data: route } = await client
            .from("routes")
            .select("owner_id")
            .eq("id", routeId)
            .single();

          if (route?.owner_id === ownerId) {
            console.log(
              `🛑 Route stops realtime event for owner ${ownerId}:`,
              payload,
            );
            onRoutesChange();
          }
        }
      },
    );

  channel.subscribe((status: string) => {
    console.log(`🎧 Routes list subscription ${ownerId}:`, status);
    logSubscriptionStatus("Routes list subscription", ownerId, status);
  });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                               UNSUBSCRIBE                                  */
/* -------------------------------------------------------------------------- */

export const unsubscribeFromRoutesRealtime = async (channel: any) => {
  if (!channel) return;

  try {
    await client.removeChannel(channel);
    console.log("✅ Routes realtime unsubscribed");
  } catch (err) {
    console.error("❌ Error unsubscribing from routes:", err);
  }
};
