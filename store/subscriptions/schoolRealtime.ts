import { clearAuthToken, client } from "../../supabaseConfig/supabaseConfig";

export const subscribeToSchoolDashboardUpdates = (
  schoolId: string,
  onChange: () => void,
) => {
  if (!schoolId) return null;

  const channel = client
    .channel(`school-dashboard-${schoolId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: `school_id=eq.${schoolId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "routes",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "route_children",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "route_assignments",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "drivers",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "clients",
      },
      onChange,
    );

  channel.subscribe((status: string) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      clearAuthToken();
      console.warn("School dashboard realtime unavailable", status);
    }
  });

  return channel;
};
