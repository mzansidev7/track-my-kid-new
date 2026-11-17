import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  subscribeToNotifications,
  unsubscribeFromNotificationsRealtime,
} from "../../../../store/subscriptions/notificationsRealtime";

export type SchoolNotification = {
  id: string;
  user_id?: string | null;
  sender_id?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
  recipient_name?: string | null;
  sender_name?: string | null;
  route_name?: string | null;
  child_name?: string | null;
  child_school_name?: string | null;
  stop_address?: string | null;
  stop_type?: string | null;
  related_route_id?: string | null;
  related_child_id?: string | null;
  related_stop_id?: string | null;
  related_announcement_id?: string | null;
  related_school_trip_id?: string | null;
  support_ticket_id?: string | null;
};

const cacheKey = (userId: string) => `school_notifications_${userId}`;

export const useSchoolNotifications = () => {
  const { user } = useContext(AuthContext);
  const token = user?.token as string | undefined;
  const userId = (user?.userData?.id || user?.userData?.user_id) as
    | string
    | undefined;
  const schoolRole = user?.userData?.admin_profile?.role;
  const isSchoolDriver = schoolRole === "driver";
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const notificationsRef = useRef<SchoolNotification[]>([]);
  const currentUserIdRef = useRef<string | undefined>(userId);
  const [loadedForUserId, setLoadedForUserId] = useState<string>();

  const updateNotifications = useCallback(
    (nextNotifications: SchoolNotification[]) => {
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      setLoadedForUserId(userId);
    },
    [userId],
  );

  const refresh = useCallback(
    async (isRefresh = false) => {
      if (!token || !userId) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/school/notifications?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load notifications.");
        }

        const nextNotifications: SchoolNotification[] = Array.isArray(result)
          ? result
          : [];
        const driverFilteredNotifications =
          isSchoolDriver
            ? nextNotifications.filter(
                (notification) =>
                  notification.type === "school_trip" &&
                  Boolean(notification.related_school_trip_id),
              )
            : nextNotifications;
        if (
          !mountedRef.current ||
          currentUserIdRef.current !== userId
        ) {
          return;
        }

        updateNotifications(driverFilteredNotifications);
        setError(null);
        try {
          await AsyncStorage.setItem(
            cacheKey(userId),
            JSON.stringify(driverFilteredNotifications),
          );
        } catch (cacheError) {
          console.error("Unable to cache school notifications:", cacheError);
        }
      } catch (requestError) {
        if (mountedRef.current) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load notifications.",
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, updateNotifications, isSchoolDriver, userId],
  );

  useEffect(() => {
    currentUserIdRef.current = userId;
    mountedRef.current = Boolean(userId);
    if (!userId) {
      return undefined;
    }

    let active = true;
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey(userId));
        if (active && cached && !isSchoolDriver) {
          const parsed: unknown = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            updateNotifications(parsed as SchoolNotification[]);
          }
        }
      } catch (cacheError) {
        console.error("Unable to load cached school notifications:", cacheError);
      } finally {
        if (active) {
          setLoading(false);
          void refresh(true);
        }
      }
    };
    void loadCache();

    const channel = subscribeToNotifications(userId, () => {
      void refresh(true);
    });

    return () => {
      active = false;
      mountedRef.current = false;
      void unsubscribeFromNotificationsRealtime(channel);
    };
  }, [isSchoolDriver, refresh, updateNotifications, userId]);

  const markAsRead = useCallback(
    async (notification: SchoolNotification) => {
      if (
        !token ||
        !userId ||
        notification.user_id !== userId ||
        notification.is_read === true
      ) {
        return;
      }

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/notifications/${notification.id}/read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to mark notification as read.");
      }

      const updated = notificationsRef.current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      );
      updateNotifications(updated);
      void AsyncStorage.setItem(cacheKey(userId), JSON.stringify(updated)).catch(
        (cacheError) =>
          console.error("Unable to cache school notifications:", cacheError),
      );
    },
    [token, updateNotifications, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token || !userId) return;

    const baseUrl = await resolveWorkingBaseUrl();
    const response = await fetch(`${baseUrl}/school/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Unable to mark notifications as read.");
    }

    const updated = notificationsRef.current.map((item) =>
      item.user_id === userId ? { ...item, is_read: true } : item,
    );
    updateNotifications(updated);
    try {
      await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(updated));
    } catch (cacheError) {
      console.error("Unable to cache school notifications:", cacheError);
    }
  }, [token, updateNotifications, userId]);

  const userNotifications =
    userId && loadedForUserId === userId ? notifications : [];

  return {
    notifications: userNotifications,
    unreadCount: userNotifications.filter(
      (notification) =>
        notification.user_id === userId && notification.is_read !== true,
    ).length,
    loading: Boolean(userId) && loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};
