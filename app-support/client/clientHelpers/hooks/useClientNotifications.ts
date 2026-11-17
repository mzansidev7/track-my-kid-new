import { useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  subscribeToNotifications,
  unsubscribeFromNotificationsRealtime,
} from "../../../../store/subscriptions/notificationsRealtime";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  user_id: string | null;
  sender_id: string | null;
  recipient_name?: string | null;
  sender_name?: string | null;
  related_child_id?: string | null;
  child_name?: string | null;
  child_school_name?: string | null;
  related_route_id?: string | null;
  related_school_trip_id?: string | null;
  related_stop_id?: string | null;
};

export const useClientNotifications = () => {
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.userData?.id || user?.id || null;
  const cacheKey = userId ? `client_notifications:${userId}` : null;
  const cacheLoadedFor = useRef<string | null>(null);

  const refresh = useCallback(
    async (isRefresh = false) => {
      if (!userToken) {
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/client/notifications?limit=100`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load notifications.");
        }
        setNotifications(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load notifications.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userToken],
  );

  const markAsRead = useCallback(
    async (notification: ClientNotification) => {
      if (notification.is_read === true || notification.user_id !== userId) {
        return;
      }

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/notifications/${notification.id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) return;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
    },
    [userToken, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userToken || !userId) return;

    const baseUrl = await resolveWorkingBaseUrl();
    const response = await fetch(`${baseUrl}/client/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to mark notifications as read.");
    }

    setNotifications((current) =>
      current.map((item) =>
        item.user_id === userId ? { ...item, is_read: true } : item,
      ),
    );
  }, [userId, userToken]);

  useEffect(() => {
    let active = true;
    cacheLoadedFor.current = null;
    setNotifications([]);
    if (!cacheKey || !userToken) return undefined;

    const loadCacheAndRefresh = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (active && cached !== null) {
          setLoading(false);
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setNotifications(parsed);
        }
      } catch (cacheError) {
        console.error("Failed to load client notifications cache:", cacheError);
      } finally {
        if (active) {
          cacheLoadedFor.current = cacheKey;
          void refresh(true);
        }
      }
    };

    void loadCacheAndRefresh();
    return () => {
      active = false;
    };
  }, [cacheKey, refresh, userToken]);

  useEffect(() => {
    if (!cacheKey || cacheLoadedFor.current !== cacheKey) return;
    AsyncStorage.setItem(cacheKey, JSON.stringify(notifications)).catch(
      (cacheError) =>
        console.error("Failed to save client notifications cache:", cacheError),
    );
  }, [cacheKey, notifications]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = subscribeToNotifications(userId, () => refresh(true));
    return () => {
      unsubscribeFromNotificationsRealtime(channel);
    };
  }, [refresh, userId]);

  return {
    userId,
    notifications,
    unreadCount: notifications.filter(
      (item) => item.is_read !== true && item.user_id === userId,
    ).length,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};
