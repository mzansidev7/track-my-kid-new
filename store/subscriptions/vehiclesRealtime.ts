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

export const subscribeToOwnerVehiclesUpdates = (
  ownerId: string,
  onVehiclesChange: () => void,
) => {
  if (!ownerId) {
    console.warn("⚠️ No ownerId provided");
    return null;
  }

  const channel = client
    .channel(`owner-vehicles-${ownerId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vehicles",
        filter: `owner_id=eq.${ownerId}`,
      },
      async (payload: any) => {
        console.log(`🚗 Vehicle realtime event for owner ${ownerId}:`, payload);
        onVehiclesChange();
      },
    )
    .subscribe((status: string) => {
      console.log(`🎧 Vehicle subscription ${ownerId}:`, status);
      logSubscriptionStatus("Owner vehicles subscription", ownerId, status);
    });

  return channel;
};
