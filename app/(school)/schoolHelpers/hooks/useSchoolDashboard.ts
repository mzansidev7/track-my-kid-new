import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  loadSchoolDashboard,
  SchoolDashboardData,
  saveSchoolDashboard,
} from "../../../../store/asyncStorage/schoolCache";
import { unsubscribeFromRealtime } from "../../../../store/subscriptions/realtimeUtils";
import { subscribeToSchoolDashboardUpdates } from "../../../../store/subscriptions/schoolRealtime";
import { RecentTrip } from "@/types/school/client.interfaces";

export type AssignedSchoolTrip = {
  id: string;
  trip_id: string;
  assigned_role: "driver" | "coordinator" | "driver_and_coordinator";
  learner_count: number;
  trip: {
    name: string;
    destination: string;
    departure_at: string;
    return_at: string;
    status: string;
  };
  vehicle?: {
    name?: string;
    registration_number?: string;
  } | null;
  tracking?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
  } | null;
};

const emptyDashboard: SchoolDashboardData = {
  school: null,
  students: [],
  routes: [],
  drivers: [],
  parents: [],
};

export const useSchoolDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] =
    useState<SchoolDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedTrips, setAssignedTrips] = useState<AssignedSchoolTrip[]>([]);
  const [assignedTripsLoading, setAssignedTripsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const userId = user?.userData?.id || user?.userData?.user_id || "";

  const refresh = useCallback(
    async (forceRefresh = false) => {
      if (!user?.token || !userId) {
        setLoading(false);
        return null;
      }

      let cached: SchoolDashboardData | null = null;
      try {
        if (!forceRefresh) {
          cached = await loadSchoolDashboard(userId);
          if (cached) {
            setDashboard(cached);
            setLoading(false);
          }
        }

        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/school/dashboard`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to load school data");

        const fresh: SchoolDashboardData = {
          school: data.school || null,
          students: Array.isArray(data.students) ? data.students : [],
          routes: Array.isArray(data.routes) ? data.routes : [],
          drivers: Array.isArray(data.drivers) ? data.drivers : [],
          parents: Array.isArray(data.parents) ? data.parents : [],
        };
        setDashboard(fresh);
        await saveSchoolDashboard(userId, fresh);
        return fresh;
      } catch (requestError: any) {
        setError(requestError?.message || "Could not load school data");
        if (!cached) setDashboard(emptyDashboard);
        return cached;
      } finally {
        setLoading(false);
      }
    },
    [user, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.token) {
      return undefined;
    }

    let active = true;
    const loadAssignedTrips = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/school/trips/assigned`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load assigned trips.");
        }
        if (active) {
          setAssignedTrips(Array.isArray(data) ? data : []);
          setAssignedTripsLoading(false);
        }
      } catch {
        if (active) setAssignedTripsLoading(false);
      }
    };

    void loadAssignedTrips();
    const interval = setInterval(() => void loadAssignedTrips(), 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (channelRef.current) {
      unsubscribeFromRealtime(channelRef.current);
      channelRef.current = null;
    }

    const schoolId = dashboard.school?.id;
    if (!user?.token || !schoolId) return undefined;

    channelRef.current = subscribeToSchoolDashboardUpdates(schoolId, () =>
      refresh(true),
    );

    return () => {
      if (channelRef.current) {
        unsubscribeFromRealtime(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [dashboard.school?.id, refresh, user?.token]);

  return {
    user: user?.userData || null,
    ...dashboard,
    assignedTrips: user?.token ? assignedTrips : [],
    assignedTripsLoading: user?.token ? assignedTripsLoading : false,
    loading,
    error,
    refresh: () => refresh(true),
  };
};

export const useRecentTrips = (routes: any) => {
  const recentTrips: RecentTrip[] = routes.slice(0, 3).map((route: any) => {
    const assignment = route.assignments?.[0];
    const driver = assignment?.drivers?.users;
    return {
      id: route.id,
      route: route.route_name || "School route",
      vehicle: assignment?.vehicle_id ? "Assigned vehicle" : "No vehicle",
      driver: driver?.name || "No driver",
      status: assignment?.is_active === false ? "Inactive" : "Scheduled",
      statusColor: assignment?.is_active === false ? "#F39C12" : "#34A853",
      time: route.pickup_start_time || "--:--",
    };
  });

  return recentTrips;
};
