import React, { useState } from "react";
import {
  ActivityIndicator,
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
} from "../clientHelpers/hooks/useClientNotifications";

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
    userId,
  } = useClientNotifications();
  const [selected, setSelected] = useState<ClientNotification | null>(null);

  const openNotification = async (notification: ClientNotification) => {
    setSelected(notification);
    if (notification.is_read !== true) {
      await markAsRead(notification);
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
          color={item.is_read === true ? "#64748B" : "#0EA5A4"}
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
        <Text style={styles.cardTime}>
          {item.created_at
            ? new Date(item.created_at).toLocaleString()
            : "Just now"}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={21} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ClientHeader
        title="Notifications"
        subtitle="Your latest updates"
        showBackButton
        notificationCount={unreadCount}
        onBackPress={() => router.back()}
      />
      {unreadCount > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </Text>
        </View>
      )}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#0EA5A4" />
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
                color="#94A3B8"
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
                <MaterialIcons name="notifications" size={24} color="#0EA5A4" />
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  summaryBar: {
    alignSelf: "flex-start",
    margin: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E6FFFB",
  },
  summaryText: { color: "#0F766E", fontWeight: "700", fontSize: 13 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  readCard: { borderColor: "#E2E8F0", opacity: 0.78 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: { flex: 1, color: "#0F172A", fontSize: 15, fontWeight: "800" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0EA5A4",
    margin: 5,
  },
  cardMessage: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 5 },
  cardTime: { color: "#94A3B8", fontSize: 11, marginTop: 8 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: "#0EA5A4",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#0F172A",
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
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E6FFFB",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#475569",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "300",
  },
  modalType: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 20,
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginTop: 7,
  },
  modalMessage: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 18 },
  modalMeta: { color: "#64748B", fontSize: 13, marginTop: 5 },
});
