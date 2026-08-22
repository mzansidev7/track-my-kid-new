import React, { useCallback, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ExpoLinking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import {
  subscribeToClientChildrenUpdates,
  subscribeToPaymentUpdates,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/clientRealtime";

const formatCurrency = (cents = 0, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const PaymentHistory = ({ payments }: { payments: any[] }) => (
  <View style={styles.historyCard}>
    <Text style={styles.historyTitle}>Payment history</Text>
    {payments.length === 0 ? (
      <Text style={styles.historyEmpty}>No payments recorded yet.</Text>
    ) : (
      payments.map((payment) => (
        <View key={payment.id} style={styles.historyRow}>
          <View style={styles.historyCopy}>
            <Text style={styles.historyStatus}>
              {payment.status === "paid"
                ? "Payment successful"
                : payment.status === "failed"
                  ? "Payment failed"
                  : payment.status === "cancelled"
                    ? "Payment cancelled"
                    : "Payment pending"}
            </Text>
            <Text style={styles.historyDetails}>
              {payment.owners?.company_name ||
                payment.owners?.users?.name ||
                "Owner unavailable"}{" "}
              • {payment.vehicles?.name || "Vehicle not recorded"} •{" "}
              {payment.children_count} child(ren) •{" "}
              {new Date(payment.created_at).toLocaleDateString("en-ZA")}
            </Text>
          </View>
          <Text style={styles.historyAmount}>
            {formatCurrency(payment.amount_cents, payment.currency)}
          </Text>
        </View>
      ))
    )}
  </View>
);

const ClientPayments = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payingGroupId, setPayingGroupId] = useState<string | null>(null);

  const loadSummary = useCallback(
    async (isRefresh = false) => {
      if (!user?.token) {
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const [summaryResponse, historyResponse] = await Promise.all([
          fetch(`${baseUrl}/client/payments/summary`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${baseUrl}/client/payments/history`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);
        const data = await summaryResponse.json();
        const historyData = await historyResponse.json();
        if (historyResponse.ok) {
          const nextHistory = Array.isArray(historyData) ? historyData : [];
          setHistory(nextHistory);
          if (data?.client_id) {
            await AsyncStorage.setItem(
              `client-payment-history-${data.client_id}`,
              JSON.stringify(nextHistory),
            );
          }
        }
        if (!summaryResponse.ok)
          throw new Error(data.error || "Unable to load payment details.");
        if (!historyResponse.ok)
          throw new Error(
            historyData.error || "Unable to load payment history.",
          );
        setSummary(data);
        setError("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load payment details.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token],
  );

  React.useEffect(() => {
    let cancelled = false;
    const clientId = summary?.client_id;
    if (!clientId) return undefined;

    const loadCachedHistory = async () => {
      try {
        const cached = await AsyncStorage.getItem(
          `client-payment-history-${clientId}`,
        );
        if (!cancelled && cached) setHistory(JSON.parse(cached));
      } catch (cacheError) {
        console.warn(
          "Unable to load cached client payment history",
          cacheError,
        );
      }
    };
    loadCachedHistory();

    const paymentChannel = subscribeToPaymentUpdates(
      "client_id",
      clientId,
      () => {
        loadSummary(true);
      },
    );
    const childrenChannel = subscribeToClientChildrenUpdates(clientId, () => {
      loadSummary(true);
    });
    return () => {
      cancelled = true;
      unsubscribeFromRealtime(paymentChannel);
      unsubscribeFromRealtime(childrenChannel);
    };
  }, [summary?.client_id, loadSummary]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary]),
  );

  React.useEffect(() => {
    if (!summary?.pending_child_names?.length) return undefined;

    let attempts = 0;
    const reconciliationTimer = setInterval(() => {
      attempts += 1;
      loadSummary(true);
      if (attempts >= 30) clearInterval(reconciliationTimer);
    }, 2000);

    return () => clearInterval(reconciliationTimer);
  }, [summary?.pending_child_names?.length, loadSummary]);

  const payForGroup = async (groupId: string) => {
    if (!user?.token) return;
    setPayingGroupId(groupId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/payments/checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            group_id: groupId,
            return_url: ExpoLinking.createURL("pages/payments"),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Unable to start payment.");
      }
      await Linking.openURL(data.checkout_url);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start payment.",
      );
    } finally {
      setPayingGroupId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={23} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Manage your transport payments</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSummary(true)}
          />
        }
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#8B5CF6" />
            <Text style={styles.stateText}>Loading payment details...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <MaterialIcons name="error-outline" size={30} color="#DC2626" />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadSummary()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
            {history.length > 0 && <PaymentHistory payments={history} />}
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.paymentIcon}>
                <MaterialIcons name="payments" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.cardTitle}>Current transport amount</Text>
              <Text style={styles.amount}>
                {formatCurrency(summary?.total_amount_cents, summary?.currency)}
              </Text>
              <Text style={styles.mutedText}>
                Based on {summary?.children_count || 0} linked child(ren)
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Row
                label="Children covered"
                value={String(summary?.children_count || 0)}
              />
              <Row
                label="Payment status"
                value={
                  summary?.total_amount_cents
                    ? "Payment required"
                    : summary?.pending_child_names?.length
                      ? "Payment processing"
                      : "All children paid"
                }
              />
              <Row
                label="Pay by"
                value={summary?.payment_due_at || "5th of the month"}
              />
            </View>

            {!!summary?.unpaid_child_names?.length && (
              <View style={styles.paymentNotice}>
                <MaterialIcons name="info-outline" size={20} color="#92400E" />
                <Text style={styles.paymentNoticeText}>
                  Payment is required for:{" "}
                  {summary.unpaid_child_names.join(", ")}.
                </Text>
              </View>
            )}

            {!!summary?.pending_child_names?.length && (
              <View style={styles.paymentNotice}>
                <MaterialIcons name="hourglass-top" size={20} color="#92400E" />
                <Text style={styles.paymentNoticeText}>
                  Payment is processing for:{" "}
                  {summary.pending_child_names.join(", ")}. You cannot make
                  another payment for these children.
                </Text>
              </View>
            )}

            {(summary?.payment_groups || []).map((group: any) => (
              <View key={group.group_id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.groupTitle}>
                    <Text style={styles.ownerName}>{group.owner_name}</Text>
                    <Text style={styles.routeName}>
                      {group.vehicle_name || "Transport vehicle"}
                    </Text>
                    <Text style={styles.routeDetails}>
                      {group.children_count} child(ren)
                    </Text>
                    {!!group.child_names?.length && (
                      <Text style={styles.childNames}>
                        {group.child_names.join(", ")}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.routeAmount}>
                    {formatCurrency(
                      group.total_amount_cents,
                      summary?.currency,
                    )}
                  </Text>
                </View>
                {(group.route_pricing || []).map((route: any) => (
                  <Text key={route.route_id} style={styles.routeDetails}>
                    {route.route_name || "Transport route"}: {route.child_count}{" "}
                    child(ren) at{" "}
                    {formatCurrency(
                      route.per_child_amount_cents,
                      summary?.currency,
                    )}{" "}
                    per child
                  </Text>
                ))}
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    !group.owner_id && styles.payButtonDisabled,
                  ]}
                  onPress={() => payForGroup(group.group_id)}
                  disabled={payingGroupId !== null || !group.owner_id}
                >
                  <Text style={styles.payButtonText}>
                    {!group.owner_id
                      ? "Owner unavailable"
                      : payingGroupId === group.group_id
                        ? "Opening checkout..."
                        : `Pay ${formatCurrency(group.total_amount_cents, summary?.currency)}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <PaymentHistory payments={history} />

            <Text style={styles.note}>
              Your total is calculated from the route assigned to each child.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export default ClientPayments;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 3 },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#F2E9FF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  paymentIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: { color: "#5B21B6", fontSize: 14, fontWeight: "700" },
  amount: { color: "#2E1065", fontSize: 32, fontWeight: "800", marginTop: 8 },
  mutedText: { color: "#6D28D9", fontSize: 12, marginTop: 4 },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  paymentNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  paymentNoticeText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    lineHeight: 18,
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 12,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  routeName: { color: "#0F172A", fontSize: 14, fontWeight: "700", flex: 1 },
  routeAmount: { color: "#5B21B6", fontSize: 14, fontWeight: "800" },
  routeDetails: { color: "#64748B", fontSize: 12, marginTop: 6 },
  childNames: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  groupTitle: { flex: 1 },
  ownerName: { color: "#64748B", fontSize: 11, marginBottom: 2 },
  payButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 9,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 12,
  },
  payButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  payButtonDisabled: { backgroundColor: "#94A3B8" },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginTop: 14,
  },
  historyTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  historyEmpty: { color: "#64748B", fontSize: 13, marginTop: 10 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 12,
    marginTop: 10,
  },
  historyCopy: { flex: 1 },
  historyStatus: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  historyDetails: { color: "#64748B", fontSize: 12, marginTop: 4 },
  historyAmount: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 12,
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowLabel: { color: "#64748B", fontSize: 13 },
  rowValue: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  note: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: "center",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  stateText: { color: "#64748B", fontSize: 13, textAlign: "center" },
  retryButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
});
