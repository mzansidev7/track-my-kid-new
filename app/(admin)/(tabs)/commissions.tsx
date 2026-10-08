import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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

type CommissionData = {
  summary: {
    accrued_cents: number;
    settled_cents: number;
    owing_cents: number;
    not_invoiced_cents: number;
    owing_owner_count: number;
  };
  owners_owing: {
    owner_id: string;
    owner_name: string;
    email: string | null;
    owing_cents: number;
    not_invoiced_cents: number;
    payment_count: number;
  }[];
  invoices: {
    id: string;
    owner_name: string;
    owner_email: string | null;
    period_start: string;
    period_end: string;
    amount_cents: number;
    currency: string;
    status: string;
    due_at: string | null;
    paid_at: string | null;
  }[];
  generated_at: string;
};

const emptyData: CommissionData = {
  summary: {
    accrued_cents: 0,
    settled_cents: 0,
    owing_cents: 0,
    not_invoiced_cents: 0,
    owing_owner_count: 0,
  },
  owners_owing: [],
  invoices: [],
  generated_at: "",
};

const formatMoney = (cents: number, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-ZA");
};

export default function AdminCommissions() {
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!userToken) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/admin/commissions`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load cash commissions.");
        }
        setData({
          ...emptyData,
          ...result,
          summary: { ...emptyData.summary, ...result.summary },
          owners_owing: Array.isArray(result.owners_owing)
            ? result.owners_owing
            : [],
          invoices: Array.isArray(result.invoices) ? result.invoices : [],
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load cash commissions.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userToken],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadData(), 0);
      return () => clearTimeout(timer);
    }, [loadData]),
  );

  const metrics = [
    { label: "Owed to platform", amount: data.summary.owing_cents, color: "#B91C1C" },
    { label: "Already settled", amount: data.summary.settled_cents, color: "#047857" },
    { label: "Not invoiced yet", amount: data.summary.not_invoiced_cents, color: "#B45309" },
    { label: "Total accrued", amount: data.summary.accrued_cents, color: "#1D4ED8" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>PLATFORM FINANCE</Text>
            <Text style={styles.title}>Cash commissions</Text>
            <Text style={styles.subtitle}>
              Fees due from fleet owners on confirmed cash payments
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void loadData(true)}
            accessibilityLabel="Refresh commission data"
          >
            <MaterialIcons name="refresh" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadData(true)}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !data.generated_at ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.subtitle}>Loading commission ledger…</Text>
          </View>
        ) : (
          <>
            <View style={styles.metrics}>
              {metrics.map((metric) => (
                <View key={metric.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={[styles.metricAmount, { color: metric.color }]}>
                    {formatMoney(metric.amount)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Fleet owners owing</Text>
                <Text style={styles.count}>
                  {data.summary.owing_owner_count}
                </Text>
              </View>
              {data.owners_owing.length ? (
                data.owners_owing.map((owner) => (
                  <View key={owner.owner_id} style={styles.row}>
                    <View style={styles.ownerIcon}>
                      <MaterialIcons
                        name="account-balance-wallet"
                        size={18}
                        color="#B45309"
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.ownerName}>{owner.owner_name}</Text>
                      <Text style={styles.rowSub}>
                        {owner.email || "No billing email"} ·{" "}
                        {owner.payment_count} cash payment
                        {owner.payment_count === 1 ? "" : "s"}
                      </Text>
                      {owner.not_invoiced_cents > 0 ? (
                        <Text style={styles.notInvoiced}>
                          {formatMoney(owner.not_invoiced_cents)} not invoiced
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.owingAmount}>
                      {formatMoney(owner.owing_cents)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>
                  No outstanding cash commissions.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Commission invoices</Text>
              {data.invoices.length ? (
                data.invoices.map((invoice) => (
                  <View key={invoice.id} style={styles.invoiceRow}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.ownerName}>{invoice.owner_name}</Text>
                      <Text style={styles.rowSub}>
                        {invoice.period_start} – {invoice.period_end}
                      </Text>
                      <Text style={styles.rowSub}>
                        {invoice.status === "paid"
                          ? `Paid ${formatDate(invoice.paid_at)}`
                          : `Due ${formatDate(invoice.due_at)}`}
                      </Text>
                    </View>
                    <View style={styles.invoiceAmountCopy}>
                      <Text style={styles.invoiceAmount}>
                        {formatMoney(invoice.amount_cents, invoice.currency)}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceStatus,
                          invoice.status === "paid"
                            ? styles.paidStatus
                            : styles.openStatus,
                        ]}
                      >
                        {invoice.status.replaceAll("_", " ")}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No commission invoices yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F8FC" },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center" },
  heading: { flex: 1 },
  kicker: { color: "#2563EB", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { marginTop: 3, color: "#0F172A", fontSize: 23, fontWeight: "900" },
  subtitle: { marginTop: 3, color: "#64748B", fontSize: 11 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 76,
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  metricLabel: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  metricAmount: { marginTop: 5, fontSize: 18, fontWeight: "900" },
  card: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#1E293B", fontSize: 13, fontWeight: "800" },
  count: {
    minWidth: 25,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    fontSize: 10,
    textAlign: "center",
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  ownerIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
  },
  rowCopy: { flex: 1, minWidth: 0 },
  ownerName: { color: "#1E293B", fontSize: 11, fontWeight: "800" },
  rowSub: { marginTop: 3, color: "#64748B", fontSize: 9 },
  notInvoiced: { marginTop: 3, color: "#B45309", fontSize: 9, fontWeight: "700" },
  owingAmount: { color: "#B91C1C", fontSize: 12, fontWeight: "900" },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  invoiceAmountCopy: { alignItems: "flex-end", marginLeft: 8 },
  invoiceAmount: { color: "#1E293B", fontSize: 11, fontWeight: "800" },
  invoiceStatus: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  paidStatus: { color: "#047857", backgroundColor: "#ECFDF5" },
  openStatus: { color: "#B45309", backgroundColor: "#FFFBEB" },
  empty: { marginTop: 12, color: "#64748B", fontSize: 10 },
  loading: { alignItems: "center", gap: 8, padding: 26 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  errorText: { flex: 1, color: "#991B1B", fontSize: 10 },
  retry: { color: "#1D4ED8", fontSize: 10, fontWeight: "800" },
});
