import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerProfile } from "./ownerHelpers/hooks/useOwnerProfile";
import OwnerCompactHeader from "./ownerHelpers/components/OwnerCompactHeader";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import {
  subscribeToNotifications,
  unsubscribeFromNotificationsRealtime,
} from "../../store/subscriptions/notificationsRealtime";

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
  const currentUserId = user?.userData?.id || user?.id;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRow | null>(null);

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

    const recipientId = owner?.user_id || candidateIds[0];
    if (!recipientId) return undefined;

    const channel = subscribeToNotifications(recipientId, fetchNotifications);
    return () => {
      unsubscribeFromNotificationsRealtime(channel);
    };
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
      setSelectedNotification((current) =>
        current?.id === notificationId
          ? { ...current, is_read: true }
          : current,
      );
    } catch (err: any) {
      console.error("[notifications] markAsRead error", err);
    } finally {
      setMarkingId(null);
    }
  };

  const openNotification = async (item: NotificationRow) => {
    const currentUserId = user?.userData?.id || user?.id;
    if (currentUserId !== item.user_id) return;

    setSelectedNotification(item);
    if (item.is_read === true) return;

    await markAsRead(item.id, item.user_id);
  };

  const renderItem = ({ item }: { item: NotificationRow }) => {
    const typeLabel = item.type || "general";
    const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
      pickup_reminder: "place",
      dropoff_reminder: "directions-bus",
      route_started: "alt-route",
      route_completed: "check-circle",
      delay_warning: "schedule",
      general: "notifications",
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
        onPress={() => isRecipient && openNotification(item)}
        activeOpacity={isRecipient ? 0.85 : 1}
        disabled={!isRecipient}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, !isUnread && styles.iconWrapRead]}>
            <MaterialIcons
              name={iconMap[typeLabel] || "notifications"}
              size={21}
              color={isUnread ? "#2563EB" : "#7B8FA3"}
            />
          </View>
          <View style={styles.cardText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {isUnread && isRecipient ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
            {item.user_id && item.user_id !== currentUserId ? (
              <Text style={styles.actorText}>
                To: {item.recipient_name || item.user_id}
              </Text>
            ) : null}
            {item.sender_id && item.sender_id !== currentUserId ? (
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
        <OwnerCompactHeader
          title="Notifications"
          onBackPress={() => router.push("/")}
        />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter(
    (item) => item.is_read !== true && item.user_id === currentUserId,
  ).length;

  const markAllAsRead = async () => {
    if (!currentUserId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      await axios.put(
        `${baseUrl}/owner/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setNotifications((current) =>
        current.map((item) =>
          item.user_id === currentUserId ? { ...item, is_read: true } : item,
        ),
      );
      setSelectedNotification((current) =>
        current && current.user_id === currentUserId
          ? { ...current, is_read: true }
          : current,
      );
    } catch (err: any) {
      Alert.alert(
        "Unable to update notifications",
        err?.response?.data?.error || err?.message || "Please try again.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View style={styles.container}>
      <OwnerCompactHeader
        title="Notifications"
        onBackPress={() => router.push("/")}
      />

      {unreadCount > 0 ? (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={markingAll}
            onPress={markAllAsRead}
            style={styles.readAllButton}
          >
            <MaterialIcons name="done-all" size={17} color="#1D4ED8" />
            <Text style={styles.readAllText}>
              {markingAll ? "Reading..." : "Read all"}
            </Text>
          </TouchableOpacity>
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

      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MaterialIcons
                  name="notifications"
                  size={24}
                  color="#2563EB"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close notification"
                style={styles.closeButton}
                onPress={() => setSelectedNotification(null)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {selectedNotification?.user_id &&
            selectedNotification.user_id !== currentUserId ? (
              <Text style={styles.modalMeta}>
                To: {selectedNotification.recipient_name || "Unknown"}
              </Text>
            ) : null}
            <Text style={styles.modalEyebrow}>
              {selectedNotification?.type || "general"}
            </Text>
            <Text style={styles.modalTitle}>{selectedNotification?.title}</Text>
            <Text style={styles.modalMessage}>
              {selectedNotification?.message}
            </Text>
            <View style={styles.modalDivider} />
            {selectedNotification?.sender_id &&
            selectedNotification.sender_id !== currentUserId ? (
              <Text style={styles.modalMeta}>
                From: {selectedNotification.sender_name || "System"}
              </Text>
            ) : null}
            <Text style={styles.modalMeta}>
              {selectedNotification?.created_at
                ? new Date(selectedNotification.created_at).toLocaleString()
                : "Just now"}
            </Text>
            {selectedNotification?.related_child_id ? (
              <View style={styles.relatedBadge}>
                <Text style={styles.relatedBadgeText}>Child update</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FC",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 13,
    borderRadius: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#DCE8F5",
    elevation: 1,
    shadowColor: "#17385F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.045,
    shadowRadius: 5,
  },
  cardRead: {
    backgroundColor: "#FCFDFE",
    borderColor: "#E6ECF2",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
  },
  iconWrapRead: {
    backgroundColor: "#F0F3F7",
  },
  cardText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17385F",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },
  message: {
    fontSize: 12,
    color: "#526981",
    lineHeight: 18,
  },
  actorText: {
    fontSize: 11,
    color: "#71869C",
    marginTop: 2,
  },
  metaRow: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeBadge: {
    fontSize: 10,
    color: "#1D4ED8",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 10,
    color: "#8799AB",
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 13,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#DCE8F5",
    borderRadius: 13,
  },
  summaryText: {
    flex: 1,
    color: "#23496F",
    fontSize: 12,
    fontWeight: "700",
  },
  readAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  readAllText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17385F",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#647A90",
    textAlign: "center",
    lineHeight: 20,
  },
  cardDisabled: {
    opacity: 0.72,
  },
  senderIndicator: {
    fontSize: 11,
    color: "#8799AB",
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 34, 57, 0.58)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E3EBF4",
    shadowColor: "#17385F",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 26,
    lineHeight: 28,
    color: "#475569",
    fontWeight: "300",
  },
  modalEyebrow: {
    marginTop: 20,
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    marginTop: 7,
    color: "#17385F",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
  },
  modalMessage: {
    marginTop: 12,
    color: "#526981",
    fontSize: 13,
    lineHeight: 19,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E4EBF2",
    marginVertical: 18,
  },
  modalMeta: {
    color: "#71869C",
    fontSize: 12,
    marginTop: 5,
  },
  relatedBadge: {
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  relatedBadgeText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
});
