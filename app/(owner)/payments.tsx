import * as FileSystem from "expo-file-system";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../../url";
import { AuthContext } from "../../authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
import Notification from "../../components/Notification";

const formatCurrency = (cents: number, currency = "zar") => {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: (currency || "zar").toUpperCase(),
  }).format(value);
};

export default function OwnerPayments() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [perChildAmountCents, setPerChildAmountCents] = useState("10000");
  const [connectedAccountId, setConnectedAccountId] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ visible: false, message: "", type: "success" });

  const loadData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        fetch(`${BASE_URL}/owner/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BASE_URL}/owner/payments/history`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      const profileData = await profileRes.json();
      const historyData = await historyRes.json();

      if (!profileRes.ok) {
        throw new Error(profileData.error || "Failed to load owner profile");
      }
      if (!historyRes.ok) {
        throw new Error(historyData.error || "Failed to load payment history");
      }

      setPerChildAmountCents(
        String(profileData.per_child_amount_cents ?? 10000),
      );
      setConnectedAccountId(profileData.stripe_connected_account_id || "");
      setBankName(profileData.bank_name || "");
      setBankAccountNumber(profileData.bank_account_number || "");
      setBankBranchCode(profileData.bank_branch_code || "");
      setHistory(historyData || []);
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

  const saveBillingSettings = async () => {
    if (!user?.token) return;
    const parsed = Number.parseInt(perChildAmountCents || "", 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setNotification({
        visible: true,
        message: "Per-child amount must be a valid non-negative number.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/owner/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          per_child_amount_cents: parsed,
          stripe_connected_account_id: connectedAccountId.trim() || null,
          bank_name: bankName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
          bank_branch_code: bankBranchCode.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setNotification({
        visible: true,
        message: "Billing settings updated.",
        type: "success",
      });
      loadData();
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to save settings",
        type: "error",
      });
    } finally {
      setSaving(false);
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
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {/* <Header
        setActiveButton={() => {}}
        title="Payments"
        subTitle="Billing and payout history"
      /> */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Owner Billing Settings</Text>
            <FloatingInput
              label="Price per Child (cents)"
              value={perChildAmountCents}
              keyboardType="numeric"
              onChangeText={setPerChildAmountCents}
            />
            <FloatingInput
              label="Stripe Connected Account ID"
              value={connectedAccountId}
              onChangeText={setConnectedAccountId}
              autoCapitalize="none"
            />
            <FloatingInput
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              autoCapitalize="words"
            />
            <FloatingInput
              label="Account Number"
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              keyboardType="numeric"
            />
            <FloatingInput
              label="Branch Code"
              value={bankBranchCode}
              onChangeText={setBankBranchCode}
              keyboardType="numeric"
            />
            <Text style={styles.noteText}>
              Enter your payout banking details here. The platform deducts a R5
              service fee per child when clients pay.
            </Text>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={saveBillingSettings}
              disabled={saving}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving..." : "Save Billing Settings"}
              </Text>
            </TouchableOpacity>
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
                        Fee: {formatCurrency(fee, item.currency)} • Payout:{" "}
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
