import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SchoolNotification,
  useSchoolNotifications,
} from "../../../app-support/school/schoolHelpers/hooks/useSchoolNotifications";
import { useAuth } from "../../../context/authContext/auth-context";

const SchoolNotifications = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useSchoolNotifications();
  const userId = user?.userData?.id || user?.userData?.user_id;
  const [selectedNotification, setSelectedNotification] =
    useState<SchoolNotification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const handleNotificationPress = async (notification: SchoolNotification) => {
    setSelectedNotification(notification);
    try {
      await markAsRead(notification);
      if (notification.user_id === userId && notification.is_read !== true) {
        setSelectedNotification({ ...notification, is_read: true });
      }
    } catch (markError) {
      Alert.alert(
        "Unable to update notification",
        markError instanceof Error ? markError.message : "Please try again.",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (markError) {
      Alert.alert(
        "Unable to mark notifications as read",
        markError instanceof Error ? markError.message : "Please try again.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.push("/(school)/(tabs)" as never)}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={22} color="#17365E" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>School alerts and updates</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          disabled={markingAll || unreadCount === 0}
          onPress={() => void handleMarkAllAsRead()}
          style={styles.readAllButton}
        >
          <Text
            style={[
              styles.readAllText,
              (markingAll || unreadCount === 0) && styles.readAllDisabled,
            ]}
          >
            {markingAll ? "Reading..." : "Read all"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh notifications"
          onPress={() => void refresh(true)}
          style={styles.refreshButton}
        >
          <MaterialIcons name="refresh" size={22} color="#17365E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
            tintColor="#17365E"
          />
        }
      >
        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void refresh(true)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.stateCard}>
            <MaterialIcons
              name="notifications-none"
              size={32}
              color="#94A3B8"
            />
            <Text style={styles.emptyText}>No notifications to show.</Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const isUnread =
              notification.user_id === userId && notification.is_read !== true;
            return (
              <TouchableOpacity
                key={notification.id}
                activeOpacity={0.75}
                onPress={() => void handleNotificationPress(notification)}
                style={[
                  styles.notification,
                  isUnread && styles.unreadNotification,
                ]}
              >
                <View style={styles.notificationIcon}>
                  <MaterialIcons
                    name={isUnread ? "notifications-active" : "notifications"}
                    size={20}
                    color={isUnread ? "#2563EB" : "#94A3B8"}
                  />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>
                    {notification.title || "School notification"}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message || ""}
                  </Text>
                  {notification.created_at ? (
                    <Text style={styles.notificationDate}>
                      {new Date(notification.created_at).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
                {isUnread ? <View style={styles.unreadDot} /> : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <Modal
        visible={selectedNotification !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeading}>
                <View style={styles.detailIcon}>
                  <MaterialIcons
                    name="notifications-active"
                    size={22}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.detailTitleCopy}>
                  <Text style={styles.detailEyebrow}>NOTIFICATION</Text>
                  <Text style={styles.detailTitle}>
                    {selectedNotification?.title || "School notification"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close notification details"
                onPress={() => setSelectedNotification(null)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={21} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedNotification?.type ? (
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>
                    {selectedNotification.type.replaceAll("_", " ")}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.detailMessage}>
                {selectedNotification?.message ||
                  "There are no additional details for this notification."}
              </Text>

              {selectedNotification?.created_at ? (
                <DetailRow
                  icon="schedule"
                  label="Received"
                  value={new Date(
                    selectedNotification.created_at,
                  ).toLocaleString()}
                />
              ) : null}
              {selectedNotification?.sender_name ? (
                <DetailRow
                  icon="person-outline"
                  label="From"
                  value={selectedNotification.sender_name}
                />
              ) : null}
              {selectedNotification?.child_name ? (
                <DetailRow
                  icon="child-care"
                  label="Student"
                  value={selectedNotification.child_name}
                />
              ) : null}
              {selectedNotification?.route_name ? (
                <DetailRow
                  icon="alt-route"
                  label="Route"
                  value={selectedNotification.route_name}
                />
              ) : null}
              {selectedNotification?.stop_type ||
              selectedNotification?.stop_address ? (
                <DetailRow
                  icon="place"
                  label="Stop"
                  value={[
                    selectedNotification.stop_type?.replaceAll("_", " "),
                    selectedNotification.stop_address,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ) : null}
              {selectedNotification?.child_school_name ? (
                <DetailRow
                  icon="school"
                  label="School"
                  value={selectedNotification.child_school_name}
                />
              ) : null}
              {selectedNotification?.support_ticket_id ? (
                <DetailRow
                  icon="support-agent"
                  label="Support ticket"
                  value={selectedNotification.support_ticket_id}
                />
              ) : null}
              <View style={styles.readStatus}>
                <MaterialIcons
                  name={
                    selectedNotification?.user_id === userId &&
                    selectedNotification?.is_read !== true
                      ? "mark-email-unread"
                      : "mark-email-read"
                  }
                  size={17}
                  color="#64748B"
                />
                <Text style={styles.readStatusText}>
                  {selectedNotification?.user_id === userId &&
                  selectedNotification?.is_read !== true
                    ? "Unread"
                    : "Read"}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SchoolNotifications;

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={18} color="#64748B" />
    <View style={styles.detailRowCopy}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  readAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginRight: 4,
  },
  readAllText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  readAllDisabled: { color: "#94A3B8" },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: "#17365E",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  stateCard: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#17365E",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  unreadNotification: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  notificationIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  notificationCopy: {
    flex: 1,
  },
  notificationTitle: {
    color: "#17365E",
    fontSize: 13,
    fontWeight: "700",
  },
  notificationMessage: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  notificationDate: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  detailSheet: {
    maxHeight: "84%",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
  },
  detailTitleCopy: { flex: 1 },
  detailEyebrow: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  detailTitle: {
    color: "#17365E",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
  },
  detailScroll: { flexGrow: 0 },
  detailContent: { paddingTop: 18, paddingBottom: 10 },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  typePillText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  detailMessage: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailRowCopy: { flex: 1 },
  detailRowLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRowValue: {
    color: "#1E293B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  readStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 14,
  },
  readStatusText: { color: "#64748B", fontSize: 11, fontWeight: "600" },
});
