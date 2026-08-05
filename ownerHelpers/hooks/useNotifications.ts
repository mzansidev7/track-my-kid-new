import axios from "axios";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import { useOwnerProfile } from "./useOwnerProfile";

export const useNotifications = () => {
  const { user } = useContext(AuthContext);
  const { owner } = useOwnerProfile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.token || !owner?.id) return;

    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await axios.get(`${baseUrl}/owner/notifications`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
        },
      });

      const notifications = response?.data || [];
      const currentUserId = user?.userData?.id || user?.id;

      // Only count unread notifications directed to the current user (not sent by them)
      const unreadNotifications = notifications.filter(
        (notification: any) =>
          notification.is_read === false &&
          notification.user_id === currentUserId,
      );
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error("Failed to fetch unread notifications count:", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.userData?.id, user?.id, owner?.id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    refreshUnreadCount: fetchUnreadCount,
  };
};
