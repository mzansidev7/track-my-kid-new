import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerProfile } from "../../ownerHelpers/hooks/useOwnerProfile";
import { AuthContext } from "../../authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  user_id: string | null;
  sender_id: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  related_route_id: string | null;
  related_child_id: string | null;
  related_stop_id: string | null;
};

const Notifications = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { owner } = useOwnerProfile();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { renderHeader } = useOwnerPageHeader({
    title: "Notifications",
    subtitle: "Your latest updates",
    onBackPress: () => router.push("/"),
  });

  const fetchNotifications = useCallback(async () => {
    const candidateIds = [
      user?.userData?.id,
      user?.id,
      user?.userData?.user_id,
      owner?.user_id,
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
      const response = await axios.get(`${baseUrl}/owner/notifications`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = response?.data as NotificationRow[];

      setNotifications((data || []) as NotificationRow[]);
    } catch (err: any) {
      console.error("[notifications] fetch error", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load notifications",
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [
    owner?.id,
    owner?.user_id,
    user?.id,
    user?.token,
    user?.userData?.id,
    user?.userData?.user_id,
  ]);

  useEffect(() => {
    fetchNotifications();

    const candidateIds = [
      user?.userData?.id,
      user?.id,
      user?.userData?.user_id,
      owner?.user_id,
    ].filter(Boolean) as string[];

    if (candidateIds.length === 0) return;

    return undefined;
  }, [
    fetchNotifications,
    owner?.id,
    owner?.user_id,
    user?.id,
    user?.userData?.id,
    user?.userData?.user_id,
  ]);

  const markAsRead = async (
    notificationId: string,
    recipientUserId: string | null,
  ) => {
    if (!notificationId || markingId === notificationId) return;

    // Get current user ID
    const currentUserId = user?.userData?.id || user?.id;

    // Only allow marking as read if the current user is the recipient (user_id), not the sender
    if (currentUserId !== recipientUserId) {
      return;
    }

    setMarkingId(notificationId);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      await axios.put(
        `${baseUrl}/owner/notifications/${notificationId}/read`,
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
    } catch (err: any) {
      console.error("[notifications] markAsRead error", err);
    } finally {
      setMarkingId(null);
    }
  };

  const renderItem = ({ item }: { item: NotificationRow }) => {
    const typeLabel = item.type || "general";
    const iconMap: Record<string, string> = {
      pickup_reminder: "📍",
      dropoff_reminder: "🚌",
      route_started: "🛣️",
      route_completed: "✅",
      delay_warning: "⏰",
      general: "🔔",
    };
    const isUnread = item.is_read !== true;

    // Check if current user is the recipient
    const currentUserId = user?.userData?.id || user?.id;
    const isRecipient = currentUserId === item.user_id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !isUnread && styles.cardRead,
          !isRecipient && styles.cardDisabled,
        ]}
        onPress={() => isRecipient && markAsRead(item.id, item.user_id)}
        activeOpacity={isRecipient ? 0.85 : 1}
        disabled={!isRecipient}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{iconMap[typeLabel] || "🔔"}</Text>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {isUnread && isRecipient ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
            {item.recipient_name || item.user_id ? (
              <Text style={styles.actorText}>
                To: {item.recipient_name || item.user_id}
              </Text>
            ) : null}
            {item.sender_name || item.sender_id ? (
              <Text style={styles.actorText}>
                From: {item.sender_name || item.sender_id}
              </Text>
            ) : null}
            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.typeBadge}>{typeLabel}</Text>
          <Text style={styles.timeText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleString()
              : "Just now"}
          </Text>
          {!isRecipient && (
            <Text style={styles.senderIndicator}>(Sent by you)</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter(
    (item) => item.is_read !== true,
  ).length;

  return (
    <View style={styles.container}>
      {renderHeader()}

      {unreadCount > 0 ? (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Unable to load notifications</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            Your latest updates from the app will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardRead: {
    opacity: 0.75,
    backgroundColor: "#F7F9FC",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4A90E2",
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  actorText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeBadge: {
    fontSize: 12,
    color: "#4A90E2",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 12,
    color: "#999",
  },
  summaryBar: {
    backgroundColor: "#EAF4FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  summaryText: {
    color: "#2B6CB0",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  senderIndicator: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },
});
