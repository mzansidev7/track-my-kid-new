import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

type SubscriptionStatus =
  | "active"
  | "pending"
  | "past_due"
  | "canceled"
  | "expired"
  | "free_trial"
  | "pending_payment"
  | "trial_ended"
  | "approval_pending"
  | "rejected"
  | "not_subscribed";

type SubscriptionRow = {
  school: {
    id: string;
    name: string;
    school_email: string | null;
    status: string | null;
  };
  subscription: {
    plan_slug: string;
    billing_interval: "monthly" | "annual";
    billing_status: SubscriptionStatus;
    billing_provider: "stripe" | "bank_transfer";
    price_cents: number;
    currency: string;
    current_period_start: string | null;
    current_period_end: string | null;
    grace_period_ends_at: string | null;
    auto_renew: boolean;
    updated_at: string;
  } | null;
  trial: {
    status:
      | "active"
      | "expired"
      | "unavailable"
      | "pending_approval"
      | "rejected";
    started_at: string | null;
    ends_at: string | null;
    days_remaining: number;
  };
  latest_invoice: {
    invoice_number: string;
    amount_cents: number;
    currency: string;
    status: string;
    due_at: string | null;
    paid_at: string | null;
    created_at: string;
    payment_method?: string;
  } | null;
};

const statusOptions: { label: string; value: string }[] = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending payment", value: "pending_payment" },
  { label: "Past due", value: "past_due" },
  { label: "Expired", value: "expired" },
  { label: "Canceled", value: "canceled" },
  { label: "Free trial", value: "free_trial" },
  { label: "Trial ended", value: "trial_ended" },
  { label: "Awaiting admin approval", value: "approval_pending" },
  { label: "Not approved", value: "rejected" },
  { label: "No subscription", value: "not_subscribed" },
];

const money = (cents: number, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);

const date = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-ZA");
};

const label = (value: string) => value.replaceAll("_", " ");

const statusLabel = (status: SubscriptionStatus) =>
  status === "approval_pending"
    ? "Awaiting admin approval"
    : status === "rejected"
      ? "Not approved"
      : label(status);

const getSubscriptionStatus = (row: SubscriptionRow): SubscriptionStatus => {
  if (row.trial.status === "pending_approval") return "approval_pending";
  if (row.trial.status === "rejected") return "rejected";
  const status = row.subscription?.billing_status;
  if (
    status === "pending" ||
    row.latest_invoice?.status === "awaiting_payment"
  ) {
    return "pending_payment";
  }
  if (
    status === "active" ||
    status === "past_due" ||
    status === "expired" ||
    status === "canceled"
  ) {
    return status;
  }
  if (row.trial.status === "active") return "free_trial";
  if (row.trial.status === "expired" && !row.subscription) return "trial_ended";
  return "not_subscribed";
};

const getTrialRemainingDuration = (endsAt: string) => {
  const end = new Date(endsAt);
  const now = new Date();
  if (Number.isNaN(end.getTime()) || end <= now) {
    return { months: 0, days: 0 };
  }

  let months = 0;
  while (months < 3) {
    const nextMonth = new Date(now);
    const dayOfMonth = nextMonth.getUTCDate();
    nextMonth.setUTCDate(1);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + months + 1);
    const lastDayOfMonth = new Date(
      Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
    ).getUTCDate();
    nextMonth.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
    if (nextMonth > end) break;
    months += 1;
  }

  const monthAnchor = new Date(now);
  const dayOfMonth = monthAnchor.getUTCDate();
  monthAnchor.setUTCDate(1);
  monthAnchor.setUTCMonth(monthAnchor.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  monthAnchor.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  return {
    months,
    days: Math.max(
      0,
      Math.ceil((end.getTime() - monthAnchor.getTime()) / 86400000),
    ),
  };
};

const trialRemainingLabel = (trial: SubscriptionRow["trial"]) => {
  if (trial.status !== "active" || !trial.ends_at) return "";
  const { months, days } = getTrialRemainingDuration(trial.ends_at);
  const parts = [
    months ? `${months} month${months === 1 ? "" : "s"}` : "",
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return `${parts.join(" and ") || "Less than a day"} remaining (${trial.days_remaining} day${trial.days_remaining === 1 ? "" : "s"} total)`;
};

export default function AdminSchoolSubscriptions() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const token = user?.token;

  const loadSubscriptions = useCallback(async (isRefresh = false) => {
    if (!token) {
      setError("Your Admin session has expired. Sign in again.");
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/admin/school-billing/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load school subscriptions.");
      }
      setRows(Array.isArray(result.subscriptions) ? result.subscriptions : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load school subscriptions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadSubscriptions(), 0);
      return () => clearTimeout(timer);
    }, [loadSubscriptions]),
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const { school, subscription, latest_invoice } = row;
      const currentStatus = getSubscriptionStatus(row);
      if (statusFilter !== "all" && statusFilter !== currentStatus) return false;
      if (!normalizedQuery) return true;
      return [
        school.name,
        school.school_email,
        subscription?.plan_slug,
        subscription?.billing_interval,
        subscription?.billing_provider,
        currentStatus,
        trialRemainingLabel(row.trial),
        row.trial.status,
        latest_invoice?.invoice_number,
        latest_invoice?.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [query, rows, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      active: 0,
      pending: 0,
      past_due: 0,
      expired: 0,
      canceled: 0,
      free_trial: 0,
      pending_payment: 0,
      trial_ended: 0,
      approval_pending: 0,
      rejected: 0,
      not_subscribed: 0,
    };
    rows.forEach((row) => {
      counts[getSubscriptionStatus(row)] += 1;
    });
    return counts;
  }, [rows]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSubscriptions(true)}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialIcons name="subscriptions" size={23} color="#0369A1" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>School subscriptions</Text>
            <Text style={styles.subtitle}>
              Search plans, billing periods, payment methods, and statuses
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void loadSubscriptions(true)}
            accessibilityLabel="Refresh school subscriptions"
          >
            <MaterialIcons name="refresh" size={22} color="#334155" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.metrics}>
          <Metric label="Schools" value={rows.length} color="#1D4ED8" />
          <Metric label="Free trial" value={statusCounts.free_trial} color="#0369A1" />
          <Metric label="Pending payment" value={statusCounts.pending_payment} color="#B45309" />
          <Metric label="Trial ended" value={statusCounts.trial_ended} color="#B91C1C" />
        </View>

        <View style={styles.filters}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search school, email, plan, method, invoice…"
              placeholderTextColor="#94A3B8"
              accessibilityLabel="Search school subscriptions"
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel="Clear search">
                <MaterialIcons name="close" size={19} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(value) => setStatusFilter(String(value))}
              style={styles.picker}
              accessibilityLabel="Filter subscriptions by status"
            >
              {statusOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={`${option.label}${option.value === "all" ? ` (${rows.length})` : ` (${statusCounts[option.value] || 0})`}`}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={styles.invoiceLink}
          onPress={() => router.push("/(admin)/(tabs)/school-billing" as never)}
        >
          <MaterialIcons name="receipt-long" size={18} color="#047857" />
          <Text style={styles.invoiceLinkText}>Review pending EFT invoices</Text>
          <MaterialIcons name="arrow-forward-ios" size={14} color="#047857" />
        </TouchableOpacity>

        <Text style={styles.results}>
          Showing {filteredRows.length} of {rows.length} schools
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0369A1" style={styles.loader} />
        ) : filteredRows.length ? (
          filteredRows.map((row) => (
            <SubscriptionCard row={row} key={row.school.id} />
          ))
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching schools</Text>
            <Text style={styles.subtitle}>Try a different search or status filter.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label: title,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{title}</Text>
    </View>
  );
}

function SubscriptionCard({ row }: { row: SubscriptionRow }) {
  const { school, subscription, latest_invoice: invoice } = row;
  const status = getSubscriptionStatus(row);
  const provider = subscription?.billing_provider;
  const trialMessage =
    status === "approval_pending"
      ? "School registration is awaiting admin approval. The free-trial clock starts after approval."
      : status === "rejected"
        ? "School registration was not approved."
        : row.trial.status === "active"
          ? `Free trial · ${trialRemainingLabel(row.trial)} · ends ${date(row.trial.ends_at)}`
          : status === "pending_payment"
            ? `Payment awaiting confirmation${row.trial.status === "expired" ? ` · trial ended ${date(row.trial.ends_at)}` : ""}`
            : row.trial.status === "expired" && !subscription
              ? `Trial ended ${date(row.trial.ends_at)} · no paid subscription`
              : "";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.schoolIcon}>
          <MaterialIcons name="school" size={20} color="#0369A1" />
        </View>
        <View style={styles.schoolCopy}>
          <Text style={styles.schoolName} numberOfLines={2}>{school.name}</Text>
          <Text style={styles.schoolEmail} numberOfLines={1}>
            {school.school_email || "No billing email on file"}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusStyles[status].badge]}>
          <Text style={[styles.statusText, statusStyles[status].text]}>
            {statusLabel(status)}
          </Text>
        </View>
      </View>

      {trialMessage ? (
        <Text
          style={[
            styles.trialMessage,
            status === "trial_ended" ? styles.trialEndedMessage : null,
            status === "pending_payment" ? styles.pendingMessage : null,
          ]}
        >
          {trialMessage}
        </Text>
      ) : null}

      <View style={styles.detailsGrid}>
        <Detail label="Plan" value={subscription?.plan_slug || "No paid plan"} />
        <Detail
          label="Billing period"
          value={subscription?.billing_interval || "—"}
        />
        <Detail
          label="Payment method"
          value={
            provider === "stripe"
              ? "Card · Stripe"
              : provider === "bank_transfer"
                ? "Bank transfer · EFT"
                : "—"
          }
        />
        <Detail
          label="Subscription price"
          value={
            subscription
              ? `${money(subscription.price_cents, subscription.currency)} / ${subscription.billing_interval === "annual" ? "year" : "month"}`
              : "—"
          }
        />
        <Detail label="Paid from" value={date(subscription?.current_period_start)} />
        <Detail label="Paid through" value={date(subscription?.current_period_end)} />
        {subscription?.grace_period_ends_at && status === "past_due" && (
          <Detail label="Grace period ends" value={date(subscription.grace_period_ends_at)} />
        )}
        <Detail
          label="Auto-renewal"
          value={
            subscription?.billing_provider === "stripe"
              ? subscription.auto_renew
                ? "On"
                : "Off"
              : "Not applicable"
          }
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.updated}>
          {subscription
            ? `Updated ${date(subscription.updated_at)}`
            : `School account: ${label(school.status || "unknown")}`}
        </Text>
        {invoice ? (
          <View style={styles.invoiceSummary}>
            <MaterialIcons name="receipt" size={15} color="#64748B" />
            <Text style={styles.invoiceText} numberOfLines={1}>
              {invoice.invoice_number} · {money(invoice.amount_cents, invoice.currency)} · {label(invoice.status)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noInvoice}>No invoice history</Text>
        )}
      </View>
    </View>
  );
}

function Detail({ label: title, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{title}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{label(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E0F2FE",
  },
  headerCopy: { flex: 1 },
  title: { color: "#172B4D", fontSize: 19, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 10, lineHeight: 15, marginTop: 3 },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  error: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 11,
    fontSize: 11,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metric: {
    flexGrow: 1,
    minWidth: "22%",
    borderWidth: 1,
    borderColor: "#E4EAF2",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  metricValue: { fontSize: 19, fontWeight: "800" },
  metricLabel: { color: "#64748B", fontSize: 9, marginTop: 3, textAlign: "center" },
  filters: { gap: 8 },
  searchBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, minWidth: 0, color: "#172B4D", fontSize: 12, paddingVertical: 9 },
  pickerBox: {
    overflow: "hidden",
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },
  picker: { height: 46, color: "#334155" },
  invoiceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 9,
    padding: 11,
    backgroundColor: "#ECFDF5",
  },
  invoiceLinkText: { flex: 1, color: "#047857", fontSize: 11, fontWeight: "800" },
  results: { color: "#64748B", fontSize: 10 },
  loader: { marginTop: 25 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 11,
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  schoolIcon: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#E0F2FE",
  },
  schoolCopy: { flex: 1 },
  schoolName: { color: "#172B4D", fontSize: 13, fontWeight: "800" },
  schoolEmail: { color: "#64748B", fontSize: 10, marginTop: 3 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: "800", textTransform: "capitalize" },
  status_active: { backgroundColor: "#DCFCE7" },
  status_pending: { backgroundColor: "#FEF3C7" },
  status_past_due: { backgroundColor: "#FFEDD5" },
  status_expired: { backgroundColor: "#FEE2E2" },
  status_canceled: { backgroundColor: "#F1F5F9" },
  status_not_subscribed: { backgroundColor: "#E2E8F0" },
  status_approval_pending: { backgroundColor: "#F3E8FF" },
  status_rejected: { backgroundColor: "#FEE2E2" },
  status_free_trial: { backgroundColor: "#E0F2FE" },
  status_pending_payment: { backgroundColor: "#FEF3C7" },
  status_trial_ended: { backgroundColor: "#FEE2E2" },
  statusText_active: { color: "#15803D" },
  statusText_pending: { color: "#A16207" },
  statusText_past_due: { color: "#C2410C" },
  statusText_expired: { color: "#B91C1C" },
  statusText_canceled: { color: "#475569" },
  statusText_not_subscribed: { color: "#475569" },
  statusText_approval_pending: { color: "#7E22CE" },
  statusText_rejected: { color: "#B91C1C" },
  statusText_free_trial: { color: "#0369A1" },
  statusText_pending_payment: { color: "#A16207" },
  statusText_trial_ended: { color: "#B91C1C" },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingTop: 8,
  },
  detail: { width: "50%", paddingVertical: 5, paddingRight: 5, gap: 3 },
  trialMessage: {
    color: "#0369A1",
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 9,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  pendingMessage: { color: "#A16207", backgroundColor: "#FFFBEB" },
  trialEndedMessage: { color: "#B91C1C", backgroundColor: "#FEF2F2" },
  detailLabel: { color: "#94A3B8", fontSize: 9, fontWeight: "700" },
  detailValue: { color: "#334155", fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  footer: { borderTopWidth: 1, borderTopColor: "#EEF2F6", paddingTop: 8, gap: 6 },
  updated: { color: "#94A3B8", fontSize: 9 },
  invoiceSummary: { flexDirection: "row", alignItems: "center", gap: 5 },
  invoiceText: { flex: 1, color: "#64748B", fontSize: 9 },
  noInvoice: { color: "#94A3B8", fontSize: 9 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    gap: 7,
  },
  emptyTitle: { color: "#172B4D", fontSize: 14, fontWeight: "800" },
});

const statusStyles: Record<
  SubscriptionStatus,
  { badge: ViewStyle; text: TextStyle }
> = {
  active: { badge: styles.status_active, text: styles.statusText_active },
  pending: { badge: styles.status_pending, text: styles.statusText_pending },
  past_due: { badge: styles.status_past_due, text: styles.statusText_past_due },
  expired: { badge: styles.status_expired, text: styles.statusText_expired },
  canceled: { badge: styles.status_canceled, text: styles.statusText_canceled },
  free_trial: { badge: styles.status_free_trial, text: styles.statusText_free_trial },
  pending_payment: {
    badge: styles.status_pending_payment,
    text: styles.statusText_pending_payment,
  },
  trial_ended: { badge: styles.status_trial_ended, text: styles.statusText_trial_ended },
  not_subscribed: {
    badge: styles.status_not_subscribed,
    text: styles.statusText_not_subscribed,
  },
  approval_pending: {
    badge: styles.status_approval_pending,
    text: styles.statusText_approval_pending,
  },
  rejected: { badge: styles.status_rejected, text: styles.statusText_rejected },
};
