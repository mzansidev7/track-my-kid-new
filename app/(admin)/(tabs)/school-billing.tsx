import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useAdminProfile } from "../../../adminHelpers/hooks/useAdminProfile";
import { resolveWorkingBaseUrl } from "../../../url";

type PendingInvoice = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  plan_slug: string;
  billing_interval: string;
  due_at: string;
  created_at: string;
  schools?: { name?: string; school_email?: string };
};

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(cents || 0) / 100);

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA");

export default function AdminSchoolBilling() {
  const { user } = useContext(AuthContext);
  const { admin } = useAdminProfile();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyInvoice, setBusyInvoice] = useState("");
  const [error, setError] = useState("");

  const loadInvoices = useCallback(async (refreshingNow = false) => {
    if (!user?.token) {
      setError("Your Admin session has expired. Sign in again.");
      setLoading(false);
      return;
    }
    if (refreshingNow) setRefreshing(true);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/admin/school-billing/invoices`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load school invoices.");
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load school invoices.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadInvoices();
    }, [loadInvoices]),
  );

  const markPaid = async (invoice: PendingInvoice) => {
    Alert.alert(
      "Confirm EFT payment",
      `Only continue after confirming that ${formatMoney(invoice.amount_cents)} has cleared for ${invoice.schools?.name || "this school"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm payment",
          onPress: async () => {
            setBusyInvoice(invoice.id);
            setError("");
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/admin/school-billing/invoices/${invoice.id}/mark-paid`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${user?.token}` },
                },
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Unable to confirm payment.");
              await loadInvoices();
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : "Unable to confirm payment.",
              );
            } finally {
              setBusyInvoice("");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadInvoices(true)}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.icon}>
            <MaterialIcons name="receipt-long" size={23} color="#047857" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>School EFT invoices</Text>
            <Text style={styles.subtitle}>Confirm bank payments to activate subscriptions</Text>
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {admin?.admin_role !== "super_admin" && (
          <Text style={styles.notice}>
            You can review requests, but only a super administrator can confirm received payments.
          </Text>
        )}
        {loading ? (
          <ActivityIndicator size="large" color="#047857" />
        ) : invoices.length ? (
          invoices.map((invoice) => (
            <View style={styles.card} key={invoice.id}>
              <View style={styles.cardHeading}>
                <Text style={styles.schoolName}>{invoice.schools?.name || "School"}</Text>
                <Text style={styles.amount}>{formatMoney(invoice.amount_cents)}</Text>
              </View>
              <Text style={styles.detail}>{invoice.invoice_number}</Text>
              <Text style={styles.detail}>
                {invoice.plan_slug} · {invoice.billing_interval} · due {formatDate(invoice.due_at)}
              </Text>
              {invoice.schools?.school_email ? (
                <Text style={styles.detail}>{invoice.schools.school_email}</Text>
              ) : null}
              {admin?.admin_role === "super_admin" && (
                <TouchableOpacity
                  style={styles.confirm}
                  disabled={busyInvoice === invoice.id}
                  onPress={() => void markPaid(invoice)}
                >
                  <MaterialIcons name="check-circle" size={17} color="#FFFFFF" />
                  <Text style={styles.confirmText}>
                    {busyInvoice === invoice.id ? "Confirming…" : "Confirm EFT received"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="task-alt" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No pending school EFT invoices</Text>
            <Text style={styles.subtitle}>Pull down to refresh the list.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 3 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#172B4D", fontSize: 19, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 11, marginTop: 3, lineHeight: 16 },
  notice: {
    borderRadius: 8,
    padding: 11,
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
    fontSize: 11,
    lineHeight: 16,
  },
  error: {
    borderRadius: 8,
    padding: 11,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E4EAF2",
    borderRadius: 13,
    padding: 14,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  schoolName: { color: "#172B4D", fontSize: 14, fontWeight: "800", flex: 1 },
  amount: { color: "#047857", fontSize: 13, fontWeight: "800" },
  detail: { color: "#64748B", fontSize: 11 },
  confirm: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#047857",
    padding: 10,
    marginTop: 7,
  },
  confirmText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
  },
  emptyTitle: { color: "#172B4D", fontSize: 14, fontWeight: "800" },
});
