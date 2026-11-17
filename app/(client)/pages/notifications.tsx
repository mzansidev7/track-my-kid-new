import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader from "../components/ClientHeader";
import {
  ClientNotification,
  useClientNotifications,
} from "@/app-support/client/clientHelpers/hooks/useClientNotifications";

const Notifications = () => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    userId,
  } = useClientNotifications();
  const [selected, setSelected] = useState<ClientNotification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const openNotification = async (notification: ClientNotification) => {
    if (/sos/i.test(notification.title || "")) {
      setSelected(null);
      if (notification.is_read !== true) {
        await markAsRead(notification);
      }
      router.push("/(client)/pages/sos-messages" as never);
      return;
    }
    setSelected(notification);
    if (notification.is_read !== true) {
      await markAsRead(notification);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (requestError) {
      Alert.alert(
        "Unable to update notifications",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: ClientNotification }) => (
    <TouchableOpacity
      style={[styles.card, item.is_read === true && styles.readCard]}
      onPress={() => openNotification(item)}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons
          name={item.is_read === true ? "notifications-none" : "notifications"}
          size={22}
          color={item.is_read === true ? "#B9AFC4" : "#C14BFF"}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.is_read !== true && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {item.message}
        </Text>
        {item.related_child_id && item.child_name ? (
          <Text style={styles.cardTime}>
            For: {item.child_name}
            {item.child_school_name ? ` - ${item.child_school_name}` : ""}
          </Text>
        ) : null}
        <Text style={styles.cardTime}>
          {item.created_at
            ? new Date(item.created_at).toLocaleString()
            : "Just now"}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={21} color="#B9AFC4" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ClientHeader
        title="Notifications"
        subtitle="Your latest updates"
        style={styles.header}
        showBackButton
        notificationCount={unreadCount}
        onBackPress={() => router.back()}
      />
      {unreadCount > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={markingAll}
            onPress={handleMarkAllAsRead}
            style={styles.readAllButton}
          >
            <MaterialIcons name="done-all" size={17} color="#C14BFF" />
            <Text style={styles.readAllText}>
              {markingAll ? "Reading..." : "Read all"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#C14BFF" />
          <Text style={styles.stateText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <MaterialIcons name="error-outline" size={30} color="#DC2626" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refresh()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <MaterialIcons
                name="notifications-none"
                size={42}
                color="#B9AFC4"
              />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.stateText}>
                Your latest updates will appear here.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelected(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalTopRow}>
              <View style={styles.modalIconWrap}>
                <MaterialIcons name="notifications" size={24} color="#C14BFF" />
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.modalType}>{selected?.type || "general"}</Text>
            <Text style={styles.modalTitle}>{selected?.title}</Text>
            <Text style={styles.modalMessage}>{selected?.message}</Text>
            <View style={styles.divider} />
            {selected?.related_child_id ? (
              <Text style={styles.modalMeta}>
                For: {selected.child_name || "Your child"}
                {selected.child_school_name
                  ? ` - ${selected.child_school_name}`
                  : ""}
              </Text>
            ) : null}
            {selected?.user_id && selected.user_id !== userId ? (
              <Text style={styles.modalMeta}>
                To: {selected.recipient_name || "Unknown"}
              </Text>
            ) : null}
            {selected?.sender_id && selected.sender_id !== userId ? (
              <Text style={styles.modalMeta}>
                From: {selected.sender_name || "System"}
              </Text>
            ) : null}
            <Text style={styles.modalMeta}>
              {selected?.created_at
                ? new Date(selected.created_at).toLocaleString()
                : "Just now"}
            </Text>
            {selected?.type === "school_trip" &&
              selected.related_school_trip_id && (
                <TouchableOpacity
                  style={styles.tripNotificationAction}
                  onPress={() => {
                    const schoolTripId = selected.related_school_trip_id;
                    setSelected(null);
                    router.push({
                      pathname: "/(client)/(tabs)/school-trip/[tripId]",
                      params: { tripId: schoolTripId },
                    } as never);
                  }}
                >
                  <Text style={styles.tripNotificationActionText}>
                    View trip details
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={17}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07040B" },
  header: {
    backgroundColor: "#9B2BE7",
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#C14BFF",
    shadowOpacity: 0.06,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 2,
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#DCE8F5",
    borderRadius: 13,
    backgroundColor: "#130D1A",
  },
  summaryText: {
    flex: 1,
    color: "#23496F",
    fontWeight: "700",
    fontSize: 11,
  },
  readAllButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  readAllText: { color: "#C14BFF", fontSize: 11, fontWeight: "800" },
  list: { padding: 14, paddingTop: 10, paddingBottom: 32, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#130D1A",
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#352341",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.045,
    shadowRadius: 5,
    elevation: 1,
  },
  readCard: {
    borderColor: "#352341",
    backgroundColor: "#1C1026",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { flex: 1, color: "#FBF8FF", fontSize: 13, fontWeight: "800" },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9B2BE7",
    margin: 5,
  },
  cardMessage: { color: "#B9AFC4", fontSize: 11, lineHeight: 18, marginTop: 4 },
  cardTime: { color: "#B9AFC4", fontSize: 10, marginTop: 7 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    color: "#B9AFC4",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    fontSize: 12,
  },
  emptyTitle: {
    color: "#FBF8FF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: "#9B2BE7",
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 14,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 34, 57, 0.58)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#130D1A",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#352341",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#B9AFC4",
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "300",
  },
  modalType: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 20,
  },
  modalTitle: {
    color: "#FBF8FF",
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "800",
    marginTop: 7,
  },
  modalMessage: {
    color: "#B9AFC4",
    fontSize: 14,
    lineHeight: 23,
    marginTop: 12,
  },
  divider: { height: 1, backgroundColor: "#1C1026", marginVertical: 16 },
  modalMeta: { color: "#B9AFC4", fontSize: 11, marginTop: 5 },
  tripNotificationAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#9B2BE7",
  },
  tripNotificationActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
