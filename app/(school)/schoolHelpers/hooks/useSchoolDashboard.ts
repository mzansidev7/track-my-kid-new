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
    [user?.token, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    loading,
    error,
    refresh: () => refresh(true),
  };
};
