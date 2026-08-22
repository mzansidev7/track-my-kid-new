import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { resolveWorkingBaseUrl } from "../../url";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import {
  subscribeToOwnerPaymentStatusUpdates,
  subscribeToPaymentUpdates,
  unsubscribeFromRealtime,
} from "../../store/subscriptions/clientRealtime";
import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";

const formatCurrency = (cents: number, currency = "zar") => {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: (currency || "zar").toUpperCase(),
  }).format(value);
};

export default function OwnerPayments() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [childStatuses, setChildStatuses] = useState<any[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<any>(null);
  const [connectedAccountId, setConnectedAccountId] = useState("");
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
  });
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ visible: false, message: "", type: "success" });

  const { renderHeader } = useOwnerPageHeader({
    title: "Payments & Payouts",
    subtitle: "Manage your payment methods and payouts",
    onBackPress: () => router.push("/(owner)/(tabs)/profile"),
  });

  const loadData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();

      const [profileRes, historyRes, stripeStatusRes, paymentStatusRes] =
        await Promise.all([
          fetch(`${baseUrl}/owner/profile`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${baseUrl}/owner/payments/history`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${baseUrl}/owner/payments/stripe-status`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${baseUrl}/owner/payments/status`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

      const profileData = await profileRes.json();
      const historyData = await historyRes.json();
      const stripeStatusData = await stripeStatusRes.json();
      const paymentStatusData = await paymentStatusRes.json();

      if (!profileRes.ok) {
        throw new Error(profileData.error || "Failed to load owner profile");
      }
      if (!historyRes.ok) {
        throw new Error(historyData.error || "Failed to load payment history");
      }
      if (!stripeStatusRes.ok) {
        throw new Error(
          stripeStatusData.error || "Failed to load payout status",
        );
      }
      if (!paymentStatusRes.ok) {
        throw new Error(
          paymentStatusData.error || "Failed to load child payment status",
        );
      }

      setConnectedAccountId(profileData.stripe_connected_account_id || "");
      setStripeStatus(stripeStatusData);
      setHistory(historyData || []);
      setChildStatuses(paymentStatusData.children || []);
      setBillingPeriod(paymentStatusData);
      if (profileData.id) {
        await AsyncStorage.setItem(
          `owner-payment-history-${profileData.id}`,
          JSON.stringify(historyData || []),
        );
      }
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to load payment data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.token]);

  useEffect(() => {
    let cancelled = false;
    let ownerId: string | null = null;

    const loadCachedHistoryAndSubscribe = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const profileResponse = await fetch(`${baseUrl}/owner/profile`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        const profile = await profileResponse.json();
        ownerId = profile?.id || null;
        if (!ownerId) return;

        const cached = await AsyncStorage.getItem(
          `owner-payment-history-${ownerId}`,
        );
        if (!cancelled && cached) setHistory(JSON.parse(cached));

        const channel = subscribeToPaymentUpdates("owner_id", ownerId, () => {
          loadData();
        });
        const statusChannel = subscribeToOwnerPaymentStatusUpdates(
          ownerId,
          loadData,
        );
        return async () => {
          await unsubscribeFromRealtime(channel);
          await unsubscribeFromRealtime(statusChannel);
        };
      } catch (cacheError) {
        console.warn("Unable to load cached owner payment history", cacheError);
      }
    };

    let cleanup: (() => Promise<void>) | undefined;
    loadCachedHistoryAndSubscribe().then((unsubscribe) => {
      cleanup = unsubscribe;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [user?.token]);

  const connectStripeAccount = async () => {
    if (!user?.token) return;
    setConnectingStripe(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const res = await fetch(`${baseUrl}/owner/payments/stripe-onboarding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(
          data.message || data.error || "Unable to open Stripe onboarding.",
        );
      }
      await Linking.openURL(data.url);
      setConnectedAccountId(data.stripe_connected_account_id || "connected");
      setStripeStatus({
        connected: true,
        details_submitted: Boolean(data.details_submitted),
        charges_enabled: Boolean(data.charges_enabled),
        payouts_enabled: Boolean(data.payouts_enabled),
      });
      setNotification({
        visible: true,
        message: "Continue in Stripe to finish setting up payouts.",
        type: "success",
      });
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to connect your payout account.",
        type: "error",
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const downloadHistory = async () => {
    if (!history.length) {
      setNotification({
        visible: true,
        message: "No payment history available to download.",
        type: "warning",
      });
      return;
    }

    try {
      const headers = [
        "Client",
        "Children",
        "Status",
        "Amount",
        "Service Fee",
        "Payout",
        "Currency",
        "Date",
      ];
      const rows = history.map((item) => {
        const fee =
          item.service_fee_amount_cents ?? (item.children_count || 0) * 500;
        const payout = (item.amount_cents || 0) - fee;
        const date = item.created_at || item.processed_at || "";
        return [
          item.clients?.users?.name || "Client",
          item.children_count || 0,
          item.status || "",
          formatCurrency(item.amount_cents || 0, item.currency),
          formatCurrency(fee, item.currency),
          formatCurrency(payout, item.currency),
          (item.currency || "zar").toUpperCase(),
          date,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      const cacheDir =
        (FileSystem as any).cacheDirectory ||
        (FileSystem as any).documentDirectory;
      if (!cacheDir) {
        throw new Error("Unable to determine storage path.");
      }

      const filename = `payment_history_${Date.now()}.csv`;
      const fileUri = `${cacheDir}${filename}`;

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        setNotification({
          visible: true,
          message: "Payment history downloaded.",
          type: "success",
        });
        return;
      }

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: "utf8",
      });
      setNotification({
        visible: true,
        message: `Payment history saved to ${fileUri}`,
        type: "success",
      });
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Failed to download payment history.",
        type: "error",
      });
    }
  };

  return (
    <View style={styles.container}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Payout Settings</Text>
            <View style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <View style={styles.payoutIcon}>
                  <MaterialIcons
                    name={
                      stripeStatus.payouts_enabled
                        ? "check"
                        : "account-balance-wallet"
                    }
                    size={22}
                    color={stripeStatus.payouts_enabled ? "#15803D" : "#B45309"}
                  />
                </View>
                <View style={styles.payoutCopy}>
                  <Text style={styles.stripeStatusLabel}>Payout account</Text>
                  <Text style={styles.stripeStatusValue}>
                    {stripeStatus.payouts_enabled
                      ? "Ready to receive money"
                      : stripeStatus.connected
                        ? "Finish Stripe setup"
                        : "Not connected"}
                  </Text>
                </View>
              </View>
              <Text style={styles.payoutDescription}>
                {stripeStatus.payouts_enabled
                  ? "Client payments will be transferred to your Stripe account."
                  : "Connect Stripe to verify your identity and add payout details."}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.button, connectingStripe && styles.buttonDisabled]}
              onPress={connectStripeAccount}
              disabled={connectingStripe}
            >
              <Text style={styles.buttonText}>
                {connectingStripe
                  ? "Opening Stripe..."
                  : connectedAccountId
                    ? "Update payout details"
                    : "Connect payout account"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.noteText}>
              Stripe securely manages your payout banking details. The platform
              deducts a R5 service fee per child when clients pay.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Current Child Payment Status</Text>
            <Text style={styles.rowSub}>
              Payment due by {billingPeriod?.payment_due_at || "the 5th"};
              current period ends{" "}
              {billingPeriod?.billing_period_end || "month end"}.
            </Text>
            <FlatList
              data={childStatuses}
              keyExtractor={(item) => item.child_id}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No linked children yet.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.child_name}</Text>
                    <Text style={styles.rowSub}>
                      {item.vehicle_name} - {item.status}
                    </Text>
                  </View>
                  <Text style={styles.rowSub}>
                    {item.status === "paid" ? "Paid" : "Payment required"}
                  </Text>
                </View>
              )}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.historyHeader}>
              <Text style={styles.title}>Payment History</Text>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadHistory}
              >
                <Text style={styles.downloadButtonText}>Download CSV</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No payments yet.</Text>
              }
              renderItem={({ item }) => {
                const fee =
                  item.service_fee_amount_cents ??
                  (item.children_count || 0) * 500;
                const payout = (item.amount_cents || 0) - fee;
                return (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.clients?.users?.name || "Client"}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.children_count} child(ren) - {item.status}
                      </Text>
                      <Text style={styles.rowSub}>
                        Vehicle: {item.vehicles?.name || "Not recorded"} - Fee:{" "}
                        {formatCurrency(fee, item.currency)} • Payout:{" "}
                        {formatCurrency(payout, item.currency)}
                      </Text>
                    </View>
                    <Text style={styles.amount}>
                      {formatCurrency(item.amount_cents, item.currency)}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, gap: 14 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#333", marginBottom: 10 },
  button: {
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  noteText: {
    color: "#555",
    fontSize: 13,
    marginBottom: 12,
  },
  payoutCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  payoutHeader: { flexDirection: "row", alignItems: "center" },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  payoutCopy: { flex: 1 },
  stripeStatusLabel: { color: "#64748B", fontSize: 12 },
  stripeStatusValue: { color: "#1F2937", fontWeight: "700", marginTop: 3 },
  payoutDescription: {
    color: "#166534",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  downloadButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyText: { color: "#888", marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingVertical: 10,
  },
  rowTitle: { fontWeight: "600", color: "#333" },
  rowSub: { color: "#777", fontSize: 12, marginTop: 2 },
  amount: { fontWeight: "700", color: "#111", marginLeft: 10 },
});
