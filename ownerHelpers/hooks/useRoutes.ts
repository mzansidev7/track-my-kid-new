import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  loadOwnerRoutes,
  saveOwnerRoutes,
} from "../../asyncStorage/ownerCache";
import { AuthContext } from "../../authContext/auth-context";
import {
  subscribeToRoutesListUpdates,
  unsubscribeFromRoutesRealtime,
} from "../../store/subscriptions/routesRealtime";
import { resolveWorkingBaseUrl } from "../../url";
import { useOwnerProfile } from "./useOwnerProfile";

const normalizeRoute = (route: any) => {
  return {
    id: route.id,
    route_name: route.route_name || route.name || null,
    driver_id: route.driver_id,
    vehicle_id: route.vehicle_id,
    per_child_amount_cents: route.per_child_amount_cents || 0,
    departure_time: route.departure_time,
    pickup_start_time: route.pickup_start_time,
    pickup_end_time: route.pickup_end_time,
    dropoff_start_time: route.dropoff_start_time,
    dropoff_end_time: route.dropoff_end_time,
    created_at: route.created_at,
    start_location: route.start_location,
    end_location: route.end_location,
    drivers: route.drivers || null,
    vehicles: route.vehicles || null,
    route_assignments: route.route_assignments || [],
    route_children: route.route_children || [],
    route_stops: route.route_stops || [],
    raw: route,
  };
};

export const useRoutes = () => {
  const { user } = useContext(AuthContext);
  const { owner } = useOwnerProfile();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchRoutes = useCallback(
    async (forceRefresh = false) => {
      if (!user?.token) {
        setError("Missing authentication token");
        setRoutes([]);
        setLoadingRoutes(false);
        return;
      }

      let cachedData: any[] | null = null;
      setLoadingRoutes(true);
      setError(null);

      try {
        // Try to load from cache first unless force refresh
        if (!forceRefresh) {
          cachedData = await loadOwnerRoutes();
          if (cachedData) {
            setRoutes(cachedData);
          }
        }

        // Fetch from server after cache load so UI updates with fresh data
        const baseUrl = await resolveWorkingBaseUrl();
        console.log("🌐 Fetching fresh routes from server", { baseUrl });
        const response = await fetch(`${baseUrl}/owner/routes`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await response.json();

        if (response.ok) {
          const normalized = (data || []).map(normalizeRoute);
          setRoutes(normalized);
          // Save fresh data to cache
          await saveOwnerRoutes(normalized);
        } else {
          setError(data.error || "Failed to load routes");
          if (!cachedData) {
            setRoutes([]);
          }
        }
      } catch (err) {
        console.error("Error fetching routes:", err);
        setError("Could not load routes");
        if (!cachedData) {
          setRoutes([]);
        }
      } finally {
        setLoadingRoutes(false);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const ownerId = owner?.user_id || owner?.id;
  // Filter routes to only show active ones (assigned to vehicle AND driver)
  const activeRoutes = routes.filter((route) => {
    const hasDirectVehicle = !!route.vehicle_id;
    const hasDirectDriver = !!route.driver_id;
    const hasAssignment = Array.isArray(route.route_assignments)
      ? route.route_assignments.some(
          (assignment: any) => assignment.vehicle_id && assignment.driver_id,
        )
      : false;
    return (hasDirectVehicle && hasDirectDriver) || hasAssignment;
  });

  useEffect(() => {
    // Clean up previous subscription before creating new one
    if (channelRef.current) {
      unsubscribeFromRoutesRealtime(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.token || !ownerId) {
      return;
    }

    channelRef.current = subscribeToRoutesListUpdates(
      ownerId,
      () => fetchRoutes(true), // Force refresh on real-time updates
    );

    return () => {
      if (channelRef.current) {
        unsubscribeFromRoutesRealtime(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.token, ownerId, fetchRoutes]); // Removed fetchRoutes from dependencies

  return {
    routes: activeRoutes,
    allRoutes: routes,
    loadingRoutes,
    error,
    refreshRoutes: fetchRoutes,
  };
};
