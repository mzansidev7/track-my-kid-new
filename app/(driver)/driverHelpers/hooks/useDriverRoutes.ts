import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "@/context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "@/url";

export interface DriverRoute {
  id: string;
  route_name: string;
  start_location: string;
  end_location: string;
  departure_time: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  dropoff_start_time: string | null;
  dropoff_end_time: string | null;
  driver_id: string;
  vehicle_id: string | null;
  students?: number;
  children?: any[];
  created_at: string;
}

export const useDriverRoutes = () => {
  const { user } = useContext(AuthContext);
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverRoutes = useCallback(async () => {
    if (!user?.token) {
      setError("Missing authentication token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await axios.get(`${baseUrl}/driver/routes`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = response?.data as DriverRoute[];
      setRoutes((data || []) as DriverRoute[]);
    } catch (err: any) {
      console.error("[driver-routes] fetch error", err);
      setError(
        err?.response?.data?.error || err?.message || "Failed to load routes",
      );
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchDriverRoutes();
  }, [fetchDriverRoutes]);

  return {
    routes,
    routesLoading: loading,
    routesError: error,
    refreshRoutes: fetchDriverRoutes,
  };
};

export default useDriverRoutes;
