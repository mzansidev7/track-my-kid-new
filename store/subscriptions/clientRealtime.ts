import { clearAuthToken, client } from "../../supabaseConfig/supabaseConfig";

const logSubscriptionStatus = (
  subscriptionName: string,
  userIdOrClientId: string,
  status: string,
) => {
  if (status === "SUBSCRIBED") {
    console.log(`✅ ${subscriptionName} active for ${userIdOrClientId}`);
  } else if (status === "CLOSED") {
    console.log(`❌ ${subscriptionName} closed for ${userIdOrClientId}`);
  } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    clearAuthToken();
    console.warn(
      `⚠️ ${subscriptionName} unavailable for ${userIdOrClientId}; continuing without live updates`,
    );
  }
};

export const subscribeToClientProfileUpdates = (
  userId: string,
  onProfileChange: () => void,
) => {
  if (!userId) {
    console.warn("⚠️ No userId provided for client profile subscription");
    return null;
  }

  const channel = client
    .channel(`client-profile-${userId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "clients",
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        onProfileChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
      },
      async () => {
        onProfileChange();
      },
    );

  channel.subscribe((status: string) => {
    logSubscriptionStatus("Client profile subscription", userId, status);
  });

  return channel;
};

export const subscribeToClientChildrenUpdates = (
  clientId: string,
  onChildrenChange: () => void,
) => {
  if (!clientId) {
    console.warn("⚠️ No clientId provided for children subscription");
    return null;
  }

  const channel = client.channel(`client-children-${clientId}-${Date.now()}`);

  const childFilter = `client_id=eq.${clientId}`;

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: childFilter,
      },
      async () => {
        onChildrenChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "parent_child",
      },
      async () => {
        onChildrenChange();
      },
    );

  channel.subscribe((status: string) => {
    logSubscriptionStatus("Client children subscription", clientId, status);
  });

  return channel;
};

export const subscribeToClientChildrenAndSchoolsUpdates = (
  onDataChange: () => void,
) => {
  const channel = client.channel(
    `client-children-schools-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
      },
      async () => {
        onDataChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "schools",
      },
      async () => {
        onDataChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "parent_child",
      },
      async () => {
        onDataChange();
      },
    );

  channel.subscribe((status: string) => {
    logSubscriptionStatus(
      "Client children and schools subscription",
      "current-user",
      status,
    );
  });

  return channel;
};

export const subscribeToPaymentUpdates = (
  scope: "client_id" | "owner_id",
  id: string,
  onPaymentChange: () => void,
) => {
  if (!id) return null;

  const channel = client.channel(`payments-${scope}-${id}-${Date.now()}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "payments",
      filter: `${scope}=eq.${id}`,
    },
    onPaymentChange,
  );

  channel.subscribe((status: string) => {
    logSubscriptionStatus(`Payment ${scope} subscription`, id, status);
  });

  return channel;
};

export const subscribeToOwnerPaymentStatusUpdates = (
  ownerId: string,
  onStatusChange: () => void,
) => {
  if (!ownerId) return null;

  const channel = client
    .channel(`owner-payment-status-${ownerId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "client_vehicle_links",
        filter: `owner_id=eq.${ownerId}`,
      },
      onStatusChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
      },
      onStatusChange,
    );

  channel.subscribe((status: string) => {
    logSubscriptionStatus("Owner payment status subscription", ownerId, status);
  });

  return channel;
};

export const unsubscribeFromRealtime = async (channel: any) => {
  if (!channel) return;

  try {
    await client.removeChannel(channel);
  } catch (error) {
    console.error("❌ Error unsubscribing from client realtime:", error);
  }
};
