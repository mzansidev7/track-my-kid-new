import { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "@/context/authContext/auth-context";
import { client } from "@/supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "@/url";

export interface DriverRoute {
  id: string;
  route_name: string;
  start_location: string;
  end_location: string;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  departure_time: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  dropoff_start_time: string | null;
  dropoff_end_time: string | null;
  driver_id: string;
  vehicle_id: string | null;
  route_stops?: Array<{
    id: string;
    child_id?: string;
    stop_type: "pickup" | "dropoff";
    address?: string;
    latitude?: number;
    longitude?: number;
    status?: "pending" | "in_progress" | "completed" | "skipped";
    stop_order?: number;
  }>;
  vehicle?: {
    id: string;
    name?: string;
    license_plate?: string;
    capacity?: number | null;
  } | null;
  students?: number;
  children?: any[];
  route_children?: Array<{
    child_id: string;
    children?: {
      id?: string;
      name?: string;
      lastname?: string;
      school_name?: string;
      grade?: string;
      avatar?: string | null;
      schools?: {
        name?: string;
        address?: string;
        latitude?: number | null;
        longitude?: number | null;
      };
    } | null;
  }>;
  created_at: string;
}

export type DriverStudentStatus =
  | "WAITING"
  | "CURRENT STOP"
  | "ONBOARD"
  | "DROPPED OFF";

export const deriveDriverStudentStatus = (
  stops: DriverRoute["route_stops"] = [],
) => {
  const childStops = stops || [];
  const pickupStops = childStops.filter((stop) => stop.stop_type === "pickup");
  const dropoffStops = childStops.filter((stop) => stop.stop_type === "dropoff");
  const currentStop = childStops.find((stop) => stop.status === "in_progress");
  const pickedUp = pickupStops.some((stop) => stop.status === "completed");
  const droppedOff =
    dropoffStops.length > 0 &&
    dropoffStops.every((stop) =>
      ["completed", "skipped"].includes(stop.status || ""),
    ) &&
    dropoffStops.some((stop) => stop.status === "completed");
  const onboard = pickedUp && !droppedOff;

  return {
    status: droppedOff
      ? ("DROPPED OFF" as const)
      : currentStop
        ? ("CURRENT STOP" as const)
        : onboard
          ? ("ONBOARD" as const)
          : ("WAITING" as const),
    pickedUp,
    onboard,
    currentStop,
  };
};

const DRIVER_ROUTES_CACHE_KEY = "driver_routes_cache";
const DRIVER_ROUTES_CACHE_TTL = 5 * 60 * 1000;

const loadDriverRoutesCache = async (
  cacheKey: string,
): Promise<DriverRoute[] | null> => {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const now = Date.now();
    const isFresh =
      parsed?.timestamp && now - parsed.timestamp < DRIVER_ROUTES_CACHE_TTL;

    if (!isFresh) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return Array.isArray(parsed?.data) ? (parsed.data as DriverRoute[]) : null;
  } catch (error) {
    console.error("[driver-routes] cache read error", error);
    return null;
  }
};

const saveDriverRoutesCache = async (cacheKey: string, data: DriverRoute[]) => {
  try {
    const payload = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (error) {
    console.error("[driver-routes] cache write error", error);
  }
};

export const useDriverRoutes = () => {
  const { user } = useContext(AuthContext);
  const driverUserId = user?.userData?.id || user?.userData?.user_id || user?.id;
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchDriverRoutes = useCallback(
    async (forceRefresh = false) => {
      if (!user?.token) {
        setError("Missing authentication token");
        setRoutes([]);
        setLoading(false);
        return;
      }

      setError(null);
      const cacheKey = `${DRIVER_ROUTES_CACHE_KEY}:${driverUserId || "unknown"}`;
      console.log("[driver-routes] fetch start", {
        forceRefresh,
        driverUserId: driverUserId || null,
      });

      if (!forceRefresh) {
        const cachedRoutes = await loadDriverRoutesCache(cacheKey);
        if (cachedRoutes) {
          setRoutes(cachedRoutes);
        }
      }

      setLoading(true);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        console.log("[driver-routes] requesting", `${baseUrl}/driver/routes`);
        const response = await axios.get(`${baseUrl}/driver/routes`, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "application/json",
          },
        });

        if (!Array.isArray(response?.data)) {
          throw new Error("The server returned invalid route data.");
        }
        const data = response.data as DriverRoute[];
        console.log("[driver-routes] fetch success", {
          status: response.status,
          routeIds: data.map((route) => route.id),
          routeCount: data.length,
        });
        setRoutes(data);
        await saveDriverRoutesCache(cacheKey, data);
        return data;
      } catch (err: any) {
        console.error("[driver-routes] fetch error", {
          message: err?.message,
          code: err?.code,
          status: err?.response?.status,
          response: err?.response?.data,
          requestUrl: err?.config?.url,
        });
        setError(
          err?.response?.data?.error || err?.message || "Failed to load routes",
        );
        setRoutes([]);
        try {
          await AsyncStorage.removeItem(cacheKey);
        } catch (cacheError) {
          console.error("[driver-routes] cache cleanup failed", cacheError);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [driverUserId, user?.token],
  );

  useEffect(() => {
    setRoutes([]);
    setError(null);
  }, [driverUserId]);

  useEffect(() => {
    fetchDriverRoutes();
  }, [fetchDriverRoutes]);

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    if (channelRef.current) {
      client.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = client
      .channel(`driver-routes-${user.userData?.id || "me"}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        () => {
          fetchDriverRoutes(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_stops" },
        () => {
          fetchDriverRoutes(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        () => {
          fetchDriverRoutes(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        () => {
          fetchDriverRoutes(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schools" },
        () => {
          fetchDriverRoutes(true);
        },
      )
      .subscribe((status: string) => {
        console.log(`🎧 Driver routes subscription status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchDriverRoutes, user?.token, user?.userData?.id]);

  return {
    routes,
    routesLoading: loading,
    routesError: error,
    refreshRoutes: fetchDriverRoutes,
  };
};

export default useDriverRoutes;
