import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useTheme } from "../../../styles/theme";
import { useAdminProfile } from "@/app-support/admin/adminHelpers/hooks/useAdminProfile";
import AdminPageHeader, {
  AdminHeaderAction,
} from "../components/AdminPageHeader";

type AdminNotification = {
  id: string;
  event_type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
};

const PAGE_SIZE = 50;

const formatWhen = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function Notifications() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const { colors } = useTheme();
  const { admin } = useAdminProfile();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (isRefresh = false, offset = 0) => {
      if (!userToken) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else if (offset) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/admin/support-notifications?offset=${offset}`,
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.error || "Unable to load Admin notifications.",
          );
        }
        const page = Array.isArray(result) ? result : [];
        setNotifications((current) => (offset ? [...current, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load Admin notifications.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [userToken],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadNotifications(), 0);
      return () => clearTimeout(timer);
    }, [loadNotifications]),
  );

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.read_at) {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/admin/support-notifications/${encodeURIComponent(notification.id)}/read`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${user?.token || ""}` },
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.error || "Unable to mark this notification as read.",
          );
        }
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, read_at: result.read_at || new Date().toISOString() }
              : item,
          ),
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to mark this notification as read.",
        );
      }
    }

    if (notification.entity_type === "incident_report") {
      router.push("/(admin)/(tabs)/tools/incidents");
    } else if (notification.entity_type === "support_ticket") {
      router.push("/(admin)/(tabs)/support");
    } else if (notification.entity_type === "support_settings") {
      router.push("/(admin)/(tabs)/tools/settings" as never);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const adminName =
    admin?.display_name || admin?.name || "Platform administrator";

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifications(true)}
          />
        }
      >
        <AdminPageHeader
          eyebrow="PLATFORM OPERATIONS"
          title="Notifications"
          subtitle="Updates and follow-up alerts for your Admin account."
          adminName={adminName}
          adminRole={admin?.admin_role}
          action={
            <AdminHeaderAction
              onPress={() => void loadNotifications(true)}
              loading={refreshing}
              accessibilityLabel="Refresh notifications"
            />
          }
        />

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryIcon}>
            <MaterialIcons
              name="notifications-active"
              size={21}
              color="#2563EB"
            />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              Your notification inbox
            </Text>
            <Text style={styles.summarySubtitle}>
              {unreadCount
                ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
                : "You’re all caught up"}
            </Text>
          </View>
          <Text style={styles.totalCount}>{notifications.length}</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={21} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadNotifications(true)}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>Loading notifications…</Text>
          </View>
        ) : notifications.length ? (
          <View style={styles.list}>
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    { backgroundColor: colors.surface },
                    unread && styles.unreadCard,
                  ]}
                  onPress={() => void openNotification(notification)}
                  accessibilityRole="button"
                  accessibilityLabel={`${unread ? "Unread: " : ""}${notification.title}`}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      unread ? styles.unreadIcon : styles.readIcon,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        notification.entity_type === "incident_report"
                          ? "report-problem"
                          : notification.entity_type === "support_ticket"
                            ? "support-agent"
                            : "notifications"
                      }
                      size={19}
                      color={unread ? "#B45309" : "#64748B"}
                    />
                  </View>
                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationHeading}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          { color: colors.text.primary },
                        ]}
                      >
                        {notification.title}
                      </Text>
                      {unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationMeta}>
                      {formatWhen(notification.created_at)}
                      {notification.entity_type
                        ? ` · ${notification.entity_type.replaceAll("_", " ")}`
                        : ""}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={21}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              );
            })}
            {hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() =>
                  void loadNotifications(false, notifications.length)
                }
                disabled={loadingMore}
                accessibilityRole="button"
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load older notifications
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : !error ? (
          <View style={styles.emptyCard}>
            <MaterialIcons
              name="notifications-none"
              size={36}
              color="#94A3B8"
            />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              New support and incident updates will appear here.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontSize: 13, fontWeight: "800" },
  summarySubtitle: { color: "#64748B", fontSize: 10, marginTop: 3 },
  totalCount: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  list: { gap: 9 },
  loadMoreButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  loadMoreText: { color: "#1D4ED8", fontSize: 11, fontWeight: "800" },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  unreadCard: { borderColor: "#BFDBFE" },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadIcon: { backgroundColor: "#FEF3C7" },
  readIcon: { backgroundColor: "#F1F5F9" },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  notificationTitle: { flex: 1, fontSize: 12, fontWeight: "800" },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  notificationMessage: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  notificationMeta: {
    color: "#94A3B8",
    fontSize: 9,
    textTransform: "capitalize",
    marginTop: 7,
  },
  errorCard: {
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  errorText: { color: "#991B1B", fontSize: 11, flex: 1 },
  retry: { color: "#1D4ED8", fontSize: 11, fontWeight: "800" },
  stateCard: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: { color: "#64748B", fontSize: 11 },
  emptyCard: {
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EAF0",
    borderRadius: 18,
    padding: 20,
  },
  emptyTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 9,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 5,
  },
});
