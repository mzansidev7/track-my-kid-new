import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "@/context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "@/url";
import { subscribeToDriverNotifications } from "@/store/subscriptions/driversRealtime";
import { NotificationRow } from "../../types/driver-types";

export const useDriverNotifications = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const candidateIds = [
      user?.userData?.id,
      user?.id,
      user?.userData?.user_id,
    ].filter(Boolean) as string[];

    if (candidateIds.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await axios.get(`${baseUrl}/driver/notifications`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = response?.data as NotificationRow[];
      setNotifications((data || []) as NotificationRow[]);
    } catch (err: any) {
      console.error("[driver-notifications] fetch error", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load notifications",
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.userData?.id, user?.id, user?.userData?.user_id]);

  const markAsRead = useCallback(
    async (notificationId: string, recipientUserId: string | null) => {
      if (!notificationId || markingId === notificationId) return;

      const currentUserId = user?.userData?.id || user?.id;

      if (currentUserId !== recipientUserId) {
        return;
      }

      setMarkingId(notificationId);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        await axios.put(
          `${baseUrl}/driver/notifications/${notificationId}/read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${user?.token}`,
              "Content-Type": "application/json",
            },
          },
        );

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, is_read: true } : item,
          ),
        );
      } catch (err) {
        console.error("[mark as read] error", err);
      } finally {
        setMarkingId(null);
      }
    },
    [user?.token, user?.userData?.id, user?.id, markingId],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    const currentUserId = user?.userData?.id || user?.id;
    if (!currentUserId) return;

    const subscription = subscribeToDriverNotifications(currentUserId, () => {
      fetchNotifications();
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchNotifications, user?.userData?.id, user?.id]);

  return {
    notifications,
    loading,
    error,
    markingId,
    refreshing,
    fetchNotifications,
    markAsRead,
    onRefresh,
  };
};
