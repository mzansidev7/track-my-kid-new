import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

type FinanceSection =
  | "subscriptions"
  | "fares"
  | "fees"
  | "legacy";

type FinanceData = {
  summary: Record<string, number>;
  subscriptions: any[];
  subscription_invoices: any[];
  client_fares: any[];
  client_service_fees: any[];
  legacy_owner_fees: { owners_owing: any[]; invoices: any[] };
  generated_at: string;
};

const emptyData: FinanceData = {
  summary: {},
  subscriptions: [],
  subscription_invoices: [],
  client_fares: [],
  client_service_fees: [],
  legacy_owner_fees: { owners_owing: [], invoices: [] },
  generated_at: "",
};

const formatMoney = (cents = 0, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: String(currency || "zar").toUpperCase(),
  }).format(Number(cents || 0) / 100);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-ZA");
};

const statusLabel = (item: any) =>
  item.overdue ? "Overdue" : String(item.status || "unknown").replaceAll("_", " ");

function MoneyRow({
  title,
  detail,
  amount,
  status,
  overdue,
  url,
}: {
  title: string;
  detail: string;
  amount: string;
  status: string;
  overdue?: boolean;
  url?: string | null;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{detail}</Text>
        <Text style={[styles.status, overdue && styles.overdue]}>
          {status}
        </Text>
        {url ? (
          <TouchableOpacity onPress={() => void Linking.openURL(url)}>
            <Text style={styles.link}>Open invoice</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.amount, overdue && styles.overdue]}>{amount}</Text>
    </View>
  );
}

export default function AdminFinance() {
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const [data, setData] = useState(emptyData);
  const [section, setSection] = useState<FinanceSection>("subscriptions");
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
          throw new Error(result.error || "Unable to load finance records.");
        }
        setData({
          ...emptyData,
          ...result,
          summary: result.summary || {},
          subscriptions: Array.isArray(result.subscriptions)
            ? result.subscriptions
            : [],
          subscription_invoices: Array.isArray(result.subscription_invoices)
            ? result.subscription_invoices
            : [],
          client_fares: Array.isArray(result.client_fares)
            ? result.client_fares
            : [],
          client_service_fees: Array.isArray(result.client_service_fees)
            ? result.client_service_fees
            : [],
          legacy_owner_fees: {
            owners_owing: Array.isArray(
              result.legacy_owner_fees?.owners_owing,
            )
              ? result.legacy_owner_fees.owners_owing
              : [],
            invoices: Array.isArray(result.legacy_owner_fees?.invoices)
              ? result.legacy_owner_fees.invoices
              : [],
          },
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load finance records.",
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

  const summary = data.summary;
  const cards = [
    {
      label: "Unpaid owner subscription invoices",
      value: summary.owner_subscription_invoices_outstanding_cents,
      color: "#B91C1C",
    },
    {
      label: "Client fares outstanding",
      value: summary.client_fare_outstanding_cents,
      color: "#B45309",
    },
    {
      label: "Client fares collected",
      value: summary.client_fare_collected_cents,
      color: "#047857",
    },
    {
      label: "Client service fees collected",
      value: summary.client_service_fees_collected_cents,
      color: "#047857",
    },
    {
      label: "Owner subscription revenue",
      value: summary.owner_subscription_revenue_collected_cents,
      color: "#1D4ED8",
    },
    {
      label: "Legacy owner fees owed",
      value: summary.legacy_owner_fees_owing_cents,
      color: "#6D28D9",
    },
  ];

  const sections: { id: FinanceSection; label: string }[] = [
    { id: "subscriptions", label: "Owner subscriptions" },
    { id: "fares", label: "Client fares" },
    { id: "fees", label: "Service fees" },
    { id: "legacy", label: "Legacy owner fees" },
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
            <Text style={styles.title}>Finance</Text>
            <Text style={styles.subtitle}>
              Subscription income, client payments and outstanding balances
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void loadData(true)}
            accessibilityLabel="Refresh finance data"
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

        <View style={styles.metrics}>
          {cards.map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{card.label}</Text>
              <Text style={[styles.metricAmount, { color: card.color }]}>
                {formatMoney(card.value)}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {sections.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSection(item.id)}
              style={[styles.tab, section === item.id && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  section === item.id && styles.activeTabText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && !data.generated_at ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.subtitle}>Loading finance records…</Text>
          </View>
        ) : (
          <>
            {section === "subscriptions" ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Owner subscriptions</Text>
                  {data.subscriptions.length ? (
                    data.subscriptions.map((item) => (
                      <MoneyRow
                        key={item.id}
                        title={`${item.owner_name} · ${item.plan_name}`}
                        detail={`${item.billing_interval} · Next period ends ${formatDate(item.current_period_end)} · ${item.auto_renew ? "Auto-renew on" : "Auto-renew off"}`}
                        amount={formatMoney(item.amount_cents, item.currency)}
                        status={item.overdue ? "Overdue" : item.status}
                        overdue={item.overdue}
                      />
                    ))
                  ) : (
                    <Text style={styles.empty}>No owner subscriptions found.</Text>
                  )}
                </View>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Subscription invoices</Text>
                  {data.subscription_invoices.length ? (
                    data.subscription_invoices.map((item) => (
                      <MoneyRow
                        key={item.stripe_invoice_id}
                        title={item.owner_name}
                        detail={`${formatDate(item.period_start)} – ${formatDate(item.period_end)} · Due ${formatDate(item.due_at)}`}
                        amount={formatMoney(
                          item.amount_due_cents,
                          item.currency,
                        )}
                        status={statusLabel(item)}
                        overdue={item.overdue}
                        url={item.hosted_invoice_url}
                      />
                    ))
                  ) : (
                    <Text style={styles.empty}>
                      Invoice history starts as Stripe billing events arrive.
                    </Text>
                  )}
                </View>
              </>
            ) : null}

            {section === "fares" ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Client transport fares</Text>
                {data.client_fares.length ? (
                  data.client_fares.map((item) => (
                    <MoneyRow
                      key={item.id}
                      title={`${item.client_name} → ${item.owner_name}`}
                      detail={`${item.payment_method} · ${item.children_count} child(ren) · Due ${formatDate(item.due_at)} · ${item.vehicle_name}`}
                      amount={formatMoney(item.amount_cents, item.currency)}
                      status={statusLabel(item)}
                      overdue={item.overdue}
                    />
                  ))
                ) : (
                  <Text style={styles.empty}>No client fares recorded.</Text>
                )}
              </View>
            ) : null}

            {section === "fees" ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Client service fees</Text>
                {data.client_service_fees.length ? (
                  data.client_service_fees.map((item) => (
                    <MoneyRow
                      key={item.id}
                      title={`${item.client_name} · ${item.owner_name}`}
                      detail={`${item.payment_method} fare · Related payment ${item.payment_id.slice(0, 8)} · Due ${formatDate(item.due_at)}`}
                      amount={formatMoney(item.amount_cents, item.currency)}
                      status={statusLabel(item)}
                      overdue={item.overdue}
                    />
                  ))
                ) : (
                  <Text style={styles.empty}>No client service fees recorded.</Text>
                )}
              </View>
            ) : null}

            {section === "legacy" ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    Legacy owner balances
                  </Text>
                  <Text style={styles.sectionNote}>
                    Only balances from the previous owner-billed cash-fee
                    policy appear here. New client-paid fees are not owner debt.
                  </Text>
                  {data.legacy_owner_fees.owners_owing.length ? (
                    data.legacy_owner_fees.owners_owing.map((item) => (
                      <MoneyRow
                        key={item.owner_id}
                        title={item.name}
                        detail={`${item.payment_count} legacy cash payment(s) · ${item.not_invoiced_cents > 0 ? `${formatMoney(item.not_invoiced_cents)} not invoiced` : "Invoiced"}`}
                        amount={formatMoney(item.owing_cents)}
                        status="Outstanding"
                      />
                    ))
                  ) : (
                    <Text style={styles.empty}>No legacy owner balance owed.</Text>
                  )}
                </View>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Legacy owner invoices</Text>
                  {data.legacy_owner_fees.invoices.length ? (
                    data.legacy_owner_fees.invoices.map((item) => (
                      <MoneyRow
                        key={item.id}
                        title={item.owner_name}
                        detail={`${item.period_start} – ${item.period_end} · Due ${formatDate(item.due_at)}`}
                        amount={formatMoney(item.amount_cents, item.currency)}
                        status={item.status}
                        overdue={item.status !== "paid" && item.overdue}
                        url={item.hosted_invoice_url}
                      />
                    ))
                  ) : (
                    <Text style={styles.empty}>No legacy invoices found.</Text>
                  )}
                </View>
              </>
            ) : null}
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
  tabs: { gap: 8, paddingVertical: 2 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  activeTab: { borderColor: "#2563EB", backgroundColor: "#2563EB" },
  tabText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  activeTabText: { color: "#FFFFFF" },
  card: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: { color: "#1E293B", fontSize: 13, fontWeight: "800" },
  sectionNote: { marginTop: 5, color: "#64748B", fontSize: 10, lineHeight: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#1E293B", fontSize: 11, fontWeight: "800" },
  rowSub: { marginTop: 3, color: "#64748B", fontSize: 9 },
  status: {
    alignSelf: "flex-start",
    marginTop: 4,
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  amount: { color: "#1E293B", fontSize: 11, fontWeight: "900" },
  overdue: { color: "#B91C1C" },
  link: { marginTop: 5, color: "#2563EB", fontSize: 9, fontWeight: "800" },
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
