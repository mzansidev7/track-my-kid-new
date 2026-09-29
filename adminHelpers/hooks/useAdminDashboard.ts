import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AuthContext } from "../../context/authContext/auth-context";
import { useContext } from "react";
import { resolveWorkingBaseUrl } from "../../url";

type AdminDashboardData = {
  metrics: {
    users: number;
    parents: number;
    drivers: number;
    schools: number;
    children: number;
    vehicles: number;
    activeVehicles: number;
    routes: number;
    liveTrips: number;
    openTickets: number;
    openIncidents: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity_type?: string | null;
    created_at: string;
    users?: { name?: string; email?: string; role?: string } | null;
  }>;
  generatedAt: string;
};

const emptyData: AdminDashboardData = {
  metrics: {
    users: 0,
    parents: 0,
    drivers: 0,
    schools: 0,
    children: 0,
    vehicles: 0,
    activeVehicles: 0,
    routes: 0,
    liveTrips: 0,
    openTickets: 0,
    openIncidents: 0,
  },
  recentActivity: [],
  generatedAt: "",
};

export function useAdminDashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState<AdminDashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.token) {
      setError("Your Admin session has expired. Sign in again.");
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to load the Admin dashboard.");
      }
      setData({
        metrics: { ...emptyData.metrics, ...(result.metrics || {}) },
        recentActivity: Array.isArray(result.recentActivity)
          ? result.recentActivity
          : [],
        generatedAt: result.generatedAt || "",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the Admin dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { data, loading, refreshing, error, refresh };
}
