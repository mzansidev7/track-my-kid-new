import { clearAuthToken, client } from "../../supabaseConfig/supabaseConfig";

const logSubscriptionStatus = (
  subscriptionName: string,
  ownerIdOrUserId: string,
  status: string,
) => {
  if (status === "SUBSCRIBED") {
    console.log(`✅ ${subscriptionName} active for ${ownerIdOrUserId}`);
  } else if (status === "CLOSED") {
    console.log(`❌ ${subscriptionName} closed for ${ownerIdOrUserId}`);
  } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    clearAuthToken();
    console.warn(
      `⚠️ ${subscriptionName} unavailable for ${ownerIdOrUserId}; continuing without live updates`,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                           DRIVER PROFILE UPDATES                           */
/* -------------------------------------------------------------------------- */

export const subscribeToDriverProfileUpdates = (
  userId: string,
  onProfileChange: () => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided");
    return null;
  }

  console.log({ subscribeToDriverProfileUpdates: userId });
  const channel = client
    .channel(`driver-profile-${userId}-${Date.now()}`)

    // DRIVER PROFILE CHANGES
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drivers",
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        console.log(`📡 Driver profile realtime event for ${userId}:`, payload);

        onProfileChange();
      },
    )

    // VEHICLE CHANGES - listen to all vehicle changes since we can't filter by driver_id without driver record ID
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vehicles",
      },
      async (payload: any) => {
        console.log(`🚗 Vehicle realtime event for ${userId}:`, payload);
        // Only trigger update if this vehicle might be relevant to this driver
        // We could check if the vehicle was assigned/unassigned from this driver
        onProfileChange();
      },
    );

  channel.subscribe((status: string) => {
    console.log(`🎧 Driver profile subscription ${userId}:`, status);
    logSubscriptionStatus("Driver profile subscription", userId, status);
  });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                          DRIVER NOTIFICATIONS                              */
/* -------------------------------------------------------------------------- */

export const subscribeToDriverNotifications = (
  userId: string,
  onNewNotification: (notification: any) => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided");
    return null;
  }

  console.log({ subscribeToDriverNotifications: userId });

  const channel = client
    .channel(`driver-notifications-${userId}-${Date.now()}`)

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        console.log(
          `📬 Driver notification realtime event for ${userId}:`,
          payload,
        );

        onNewNotification(payload.new);
      },
    )

    .subscribe((status: string) => {
      console.log(`🎧 Driver notifications subscription ${userId}:`, status);
    });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                           DRIVERS LIST UPDATES                             */
/* -------------------------------------------------------------------------- */

export const subscribeToDriversListUpdates = (
  ownerId: string,
  onDriversChange: () => void,
) => {
  if (!ownerId) {
    console.warn("⚠️ No ownerId provided");
    return null;
  }

  console.log({ subscribeToDriversListUpdates: ownerId });

  console.log("we are here");
  const channel = client
    .channel(`drivers-list-${ownerId}-${Date.now()}`)

    // DRIVER CHANGES
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drivers",
        filter: `owner_id=eq.${ownerId}`,
      },

      async (payload: any) => {
        console.log("lets check the payload", payload);
        console.log(`📡 Drivers realtime event for owner ${ownerId}:`, payload);

        onDriversChange();
      },
    )

    // VEHICLE CHANGES
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vehicles",
      },
      async (payload: any) => {
        console.log(`🚗 Vehicle realtime event for owner ${ownerId}:`, payload);

        onDriversChange();
      },
    );

  channel.subscribe((status: string) => {
    console.log(`🎧 Drivers list subscription ${ownerId}:`, status);
    logSubscriptionStatus("Drivers list subscription", ownerId, status);
  });

  return channel;
};

/* -------------------------------------------------------------------------- */
/*                               UNSUBSCRIBE                                  */
/* -------------------------------------------------------------------------- */

export const unsubscribeFromRealtime = async (channel: any) => {
  if (!channel) return;

  try {
    await client.removeChannel(channel);

    console.log("✅ Realtime unsubscribed");
  } catch (err) {
    console.error("❌ Error unsubscribing:", err);
  }
};
