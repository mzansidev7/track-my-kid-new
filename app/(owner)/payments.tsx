import { File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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
import { useOwnerPageHeader } from "@/app-support/owner/ownerHelpers/hooks/useOwnerPageHeader";

const formatCurrency = (cents: number, currency = "zar") => {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: (currency || "zar").toUpperCase(),
  }).format(value);
};

const getTransferStatusLabel = (transfer: any) => {
  switch (transfer?.status) {
    case "paid":
      return "Transferred to your bank account";
    case "processing":
      return "Bank transfer processing";
    case "queued":
      return "Bank transfer queued";
    case "failed":
      return "Bank transfer needs attention";
    case "reversed":
      return "Bank transfer reversed";
    default:
      return null;
  }
};

export default function OwnerPayments() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const fromOnboarding = searchParams.fromOnboarding === "true";
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [childStatuses, setChildStatuses] = useState<any[]>([]);
  const [cashCommissionInvoices, setCashCommissionInvoices] = useState<any[]>([]);
  const [payingCommissionInvoiceId, setPayingCommissionInvoiceId] = useState<
    string | null
  >(null);
  const [confirmingCashPaymentId, setConfirmingCashPaymentId] = useState<
    string | null
  >(null);
  const [retryingOwnerTransferId, setRetryingOwnerTransferId] = useState<
    string | null
  >(null);
  const [billingPeriod, setBillingPeriod] = useState<any>(null);
  const [payoutBankDetails, setPayoutBankDetails] = useState({
    bank_name: "",
    bank_account_number: "",
    bank_branch_code: "",
  });
  const [savedPayoutBankDetails, setSavedPayoutBankDetails] = useState({
    bank_name: "",
    bank_account_number: "",
    bank_branch_code: "",
  });
  const [payoutAccountReady, setPayoutAccountReady] = useState(false);
  const [savedPayoutAccountReady, setSavedPayoutAccountReady] = useState(false);
  const [payoutTransfersEnabled, setPayoutTransfersEnabled] = useState(false);
  const [cardPaymentsEnabled, setCardPaymentsEnabled] = useState(false);
  const [cardPaymentsPreferenceAvailable, setCardPaymentsPreferenceAvailable] =
    useState(false);
  const [savingCardPaymentSetting, setSavingCardPaymentSetting] =
    useState(false);
  const [payoutBanks, setPayoutBanks] = useState<
    { name: string; code: string }[]
  >([]);
  const [loadingPayoutBanks, setLoadingPayoutBanks] = useState(false);
  const [payoutBanksError, setPayoutBanksError] = useState("");
  const payoutBanksRequestRef = useRef(false);
  const [editingPayoutDetails, setEditingPayoutDetails] = useState(false);
  const [savingPayoutDetails, setSavingPayoutDetails] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ visible: false, message: "", type: "success" });
  const hasPayoutBankDetails = Boolean(
    payoutBankDetails.bank_name.trim() &&
      payoutBankDetails.bank_account_number.trim() &&
      payoutBankDetails.bank_branch_code.trim(),
  );
  const hasSavedPayoutBankDetails = Boolean(
    savedPayoutBankDetails.bank_name.trim() &&
      savedPayoutBankDetails.bank_account_number.trim() &&
      savedPayoutBankDetails.bank_branch_code.trim(),
  );
  const maskedAccountNumber = payoutBankDetails.bank_account_number
    ? `•••• ${payoutBankDetails.bank_account_number.slice(-4)}`
    : "";

  const { renderHeader } = useOwnerPageHeader({
    title: "Payments",
    subtitle: "Review client payments and payout availability",
    onBackPress: fromOnboarding
      ? () => router.push("/(owner)/onboarding")
      : () => router.push("/(owner)/(tabs)/profile"),
  });

  const loadPayoutBanks = useCallback(async () => {
    if (!user?.token || payoutBanksRequestRef.current) return;
    payoutBanksRequestRef.current = true;
    setLoadingPayoutBanks(true);
    setPayoutBanksError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/payout/banks`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(
          data.error || "Unable to load Paystack's supported banks.",
        );
      }
      setPayoutBanks(data);
    } catch (error: any) {
      setPayoutBanksError(
        error?.message || "Unable to load Paystack's supported banks.",
      );
    } finally {
      payoutBanksRequestRef.current = false;
      setLoadingPayoutBanks(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();

      const [profileRes, historyRes, paymentStatusRes] =
        await Promise.all([
          fetch(`${baseUrl}/owner/profile`, {
            headers: { Authorization: "Bearer " + user.token },
          }),
          fetch(`${baseUrl}/owner/payments/history`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${baseUrl}/owner/payments/status`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

      const payoutHistoryRes = await fetch(
        `${baseUrl}/owner/payments/payouts`,
        { headers: { Authorization: "Bearer " + user.token } },
      );
      const cashInvoicesRes = await fetch(
        `${baseUrl}/owner/payments/cash-commission-invoices`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const profileData = await profileRes.json();
      const historyData = await historyRes.json();
      const paymentStatusData = await paymentStatusRes.json();
      const payoutHistoryData = await payoutHistoryRes.json();
      const cashInvoicesData = await cashInvoicesRes.json();

      if (!profileRes.ok) {
        throw new Error(profileData.error || "Failed to load owner profile");
      }
      if (!historyRes.ok) {
        throw new Error(historyData.error || "Failed to load payment history");
      }
      if (!paymentStatusRes.ok) {
        throw new Error(
          paymentStatusData.error || "Failed to load child payment status",
        );
      }
      if (!payoutHistoryRes.ok) {
        throw new Error(
          payoutHistoryData.error || "Failed to load payout statements",
        );
      }
      if (!cashInvoicesRes.ok) {
        throw new Error(
          cashInvoicesData.error || "Failed to load cash commission invoices",
        );
      }

      setHistory(historyData || []);
      setPayoutHistory(
        Array.isArray(payoutHistoryData) ? payoutHistoryData : [],
      );
      setChildStatuses(paymentStatusData.children || []);
      setCashCommissionInvoices(
        Array.isArray(cashInvoicesData) ? cashInvoicesData : [],
      );
      setBillingPeriod(paymentStatusData);
      const bankDetails = {
        bank_name: profileData.bank_name || "",
        bank_account_number: profileData.bank_account_number || "",
        bank_branch_code: profileData.bank_branch_code || "",
      };
      setPayoutBankDetails(bankDetails);
      setSavedPayoutBankDetails(bankDetails);
      setPayoutAccountReady(profileData.payout_account_ready === true);
      setSavedPayoutAccountReady(profileData.payout_account_ready === true);
      setPayoutTransfersEnabled(profileData.payout_transfers_enabled === true);
      setCardPaymentsEnabled(profileData.card_payments_enabled === true);
      setCardPaymentsPreferenceAvailable(
        profileData.card_payments_preference_available === true,
      );
      if (
        !bankDetails.bank_name.trim() ||
        !bankDetails.bank_account_number.trim() ||
        !bankDetails.bank_branch_code.trim()
      ) {
        void loadPayoutBanks();
      }
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

  const savePayoutBankDetails = async () => {
    if (!user?.token || savingPayoutDetails) return;
    if (
      !payoutBankDetails.bank_name.trim() ||
      !payoutBankDetails.bank_account_number.trim() ||
      !payoutBankDetails.bank_branch_code.trim()
    ) {
      setNotification({
        visible: true,
        message:
          "Select a supported bank and enter the bank account number before saving.",
        type: "warning",
      });
      return;
    }
    setSavingPayoutDetails(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payoutBankDetails),
      });
      const data = await response.json();
      if (!response.ok) {
        const payoutErrorMessages: Record<string, string> = {
          OWNER_PAYOUT_ACCOUNT_VERIFICATION_FAILED:
            "Paystack could not verify this account. Confirm the account number and selected bank.",
          OWNER_PAYOUT_BANK_INVALID:
            "Paystack rejected the selected bank. Reload the bank list and choose the matching bank.",
        };
        throw new Error(
          payoutErrorMessages[data.error] ||
            data.error ||
            "Unable to save payout bank details.",
        );
      }
      setEditingPayoutDetails(false);
      setNotification({
        visible: true,
        message:
          "Payout bank details saved. Client card-payment availability will update automatically.",
        type: "success",
      });
      await loadData();
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error?.message || "Unable to save payout bank details.",
        type: "error",
      });
    } finally {
      setSavingPayoutDetails(false);
    }
  };

  const updateCardPaymentsEnabled = async (enabled: boolean) => {
    if (!user?.token || savingCardPaymentSetting) return;
    setSavingCardPaymentSetting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + user.token,
        },
        body: JSON.stringify({ card_payments_enabled: enabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          OWNER_PAYOUTS_NOT_ENABLED:
            "The platform has not enabled automatic owner transfers yet. Clients cannot pay by card until this is enabled.",
          OWNER_PAYOUT_ACCOUNT_REQUIRED:
            "Add complete bank details before accepting card payments.",
          OWNER_PAYOUT_ACCOUNT_VERIFICATION_FAILED:
            "Paystack could not verify this account. Confirm the account number and select the correct bank from the list.",
          OWNER_PAYOUT_BANK_INVALID:
            "Paystack rejected the selected bank. Reload the bank list and choose the matching bank.",
        };
        throw new Error(
          messages[data.error] || data.error || "Unable to update card payment settings.",
        );
      }
      setCardPaymentsEnabled(enabled);
      if (enabled) {
        setPayoutAccountReady(true);
        setSavedPayoutAccountReady(true);
      }
      setNotification({
        visible: true,
        message: enabled
          ? "Card payments are on. Clients can pay by card."
          : "Card payments are off. Clients cannot make card payments.",
        type: "success",
      });
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error?.message || "Unable to update card payment settings.",
        type: "error",
      });
    } finally {
      setSavingCardPaymentSetting(false);
    }
  };

  const confirmCashPayment = async (paymentId: string) => {
    if (!user?.token || confirmingCashPaymentId) return;
    setConfirmingCashPaymentId(paymentId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/payments/${paymentId}/confirm-cash`,
        {
          method: "POST",
          headers: { Authorization: "Bearer " + user.token },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to confirm cash.");
      }
      setNotification({
        visible: true,
        message: "Cash receipt confirmed. The client-paid service fee is not billed to you.",
        type: "success",
      });
      await loadData();
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error?.message || "Unable to confirm cash payment.",
        type: "error",
      });
    } finally {
      setConfirmingCashPaymentId(null);
    }
  };

  const retryOwnerTransfer = async (paymentId: string) => {
    if (!user?.token || retryingOwnerTransferId) return;
    setRetryingOwnerTransferId(paymentId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/payments/${paymentId}/transfer/retry`,
        {
          method: "POST",
          headers: { Authorization: "Bearer " + user.token },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to retry the bank transfer.");
      }
      setNotification({
        visible: true,
        message: "Bank transfer queued for retry.",
        type: "success",
      });
      await loadData();
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error?.message || "Unable to retry the bank transfer.",
        type: "error",
      });
    } finally {
      setRetryingOwnerTransferId(null);
    }
  };

  const openCashCommissionInvoice = async (invoice: any) => {
    try {
      if (invoice.payment_provider !== "paystack") {
        throw new Error(
          "This legacy invoice needs manual reconciliation. Please contact support.",
        );
      }
      if (!user?.token) throw new Error("Please sign in again to pay this invoice.");
      setPayingCommissionInvoiceId(invoice.id);
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/payments/cash-commission-invoices/${invoice.id}/checkout`,
        {
          method: "POST",
          headers: { Authorization: "Bearer " + user.token },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        throw new Error(
          data.error || "Unable to initialize commission invoice checkout.",
        );
      }
      await Linking.openURL(data.checkout_url);
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error?.message || "Unable to open the commission invoice.",
        type: "error",
      });
    } finally {
      setPayingCommissionInvoiceId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.token, searchParams.paystack]);

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

  const completeOnboarding = async () => {
    if (!fromOnboarding) {
      return;
    }

    try {
      await AsyncStorage.setItem("owner_onboarding_complete", "true");
      router.replace("/(owner)/(tabs)" as never);
    } catch (error) {
      console.warn("Unable to persist owner onboarding completion:", error);
      router.replace("/(owner)/(tabs)" as never);
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
        "Payment Method",
        "Amount",
        "Service Fee",
        "Owner Payout",
        "Currency",
        "Date",
      ];
      const rows = history.map((item) => {
        const fee = item.platform_fee_cents ?? item.service_fee_amount_cents ?? 0;
        const ownerFeeOwed =
          item.payment_method === "cash" &&
          ["owed", "invoiced"].includes(item.platform_fee_status);
        const transfer = Array.isArray(item.owner_payment_transfers)
          ? item.owner_payment_transfers[0]
          : item.owner_payment_transfers;
        const transferStatusLabel = getTransferStatusLabel(transfer);
        const payout =
          transferStatusLabel ||
          (item.payment_provider === "paystack"
            ? "Reconciled through monthly payout statement"
            : formatCurrency(
                item.payment_method === "cash"
                  ? item.amount_cents || 0
                  : (item.amount_cents || 0) - fee,
                item.currency,
              ));
        const date = item.created_at || item.processed_at || "";
        return [
          item.clients?.users?.name || "Client",
          item.children_count || 0,
          item.status || "",
          item.payment_method || "card",
          formatCurrency(item.amount_cents || 0, item.currency),
          ownerFeeOwed
            ? formatCurrency(fee, item.currency)
            : "Client-paid; not owner-billed",
          payout,
          (item.currency || "zar").toUpperCase(),
          date,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `payment_history_${Date.now()}.csv`;

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

      const file = new File(Paths.cache, filename);
      await file.write(csv);
      setNotification({
        visible: true,
        message: `Payment history saved to ${file.uri}`,
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
          <ActivityIndicator size="large" color="#35D9B3" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Client and parent payments</Text>
            <View style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <View style={styles.payoutIcon}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={22}
                    color="#B45309"
                  />
                </View>
                <View style={styles.payoutCopy}>
                  <Text style={styles.payoutStatusLabel}>Payment provider</Text>
                  <Text style={styles.payoutStatusValue}>Paystack</Text>
                </View>
              </View>
              <Text style={styles.payoutDescription}>
                Client card fares are collected by Paystack and transferred to
                your bank account. Add and verify your bank details before
                clients can pay by card. Transfers are only available when
                automatic owner payouts are enabled by the platform.
              </Text>
              <View style={{ marginTop: 16, gap: 10 }}>
                {hasPayoutBankDetails && !editingPayoutDetails ? (
                  <>
                    <View style={styles.bankCard}>
                      <View style={styles.bankCardHeader}>
                        <MaterialIcons
                          name="account-balance"
                          size={23}
                          color="#D1FAE5"
                        />
                        <Text style={styles.bankCardBrand}>BANK ACCOUNT</Text>
                        <MaterialIcons
                          name="verified-user"
                          size={19}
                          color={payoutAccountReady ? "#6EE7B7" : "#FCD34D"}
                        />
                      </View>
                      <Text style={styles.bankCardName}>
                        {payoutBankDetails.bank_name}
                      </Text>
                      <Text style={styles.bankCardNumber}>
                        {maskedAccountNumber}
                      </Text>
                      <Text style={styles.bankCardCode}>
                        Paystack bank code · {payoutBankDetails.bank_branch_code}
                      </Text>
                      <Text style={styles.bankCardStatus}>
                        {payoutAccountReady
                          ? "Verified for card-payment transfers"
                          : payoutTransfersEnabled
                            ? "Saved; Paystack verification is required"
                            : "Saved; automatic transfers are not enabled yet"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editPayoutButton}
                      onPress={() => {
                        setEditingPayoutDetails(true);
                        loadPayoutBanks();
                      }}
                    >
                      <MaterialIcons name="edit" size={17} color="#A7F3D0" />
                      <Text style={styles.editPayoutButtonText}>
                        Edit bank details
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.rowTitle}>
                      {hasPayoutBankDetails
                        ? "Edit payout bank account"
                        : "Set up your payout bank account"}
                    </Text>
                    <Text style={styles.payoutFieldLabel}>Bank</Text>
                    <View style={styles.bankPicker}>
                      {loadingPayoutBanks ? (
                        <ActivityIndicator color="#35D9B3" />
                      ) : (
                        <Picker
                          accessibilityLabel="Select bank"
                          selectedValue={
                            payoutBanks.some(
                              (bank) =>
                                bank.code ===
                                payoutBankDetails.bank_branch_code,
                            )
                              ? payoutBankDetails.bank_branch_code
                              : ""
                          }
                          onValueChange={(bankCode: string) => {
                            const selectedBank = payoutBanks.find(
                              (bank) => bank.code === bankCode,
                            );
                            setPayoutAccountReady(false);
                            setPayoutBankDetails((current) => ({
                              ...current,
                              bank_name: selectedBank?.name || "",
                              bank_branch_code: selectedBank?.code || "",
                            }));
                          }}
                          style={styles.bankPickerControl}
                          dropdownIconColor="#F4FBF8"
                        >
                          <Picker.Item label="Select your bank" value="" />
                          {payoutBanks.map((bank) => (
                            <Picker.Item
                              key={bank.code}
                              label={bank.name}
                              value={bank.code}
                            />
                          ))}
                        </Picker>
                      )}
                    </View>
                    <Text style={styles.rowSub}>
                      Select your bank from Paystack’s supported list. A branch
                      code is not accepted here.
                    </Text>
                    {!!payoutBanksError && (
                      <View>
                        <Text style={styles.bankListError}>
                          {payoutBanksError}
                        </Text>
                        <TouchableOpacity onPress={loadPayoutBanks}>
                          <Text style={styles.editPayoutButtonText}>
                            Retry loading banks
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput
                      accessibilityLabel="Bank account number"
                      placeholder="Bank account number"
                      value={payoutBankDetails.bank_account_number}
                      onChangeText={(bank_account_number) => {
                        setPayoutAccountReady(false);
                        setPayoutBankDetails((current) => ({
                          ...current,
                          bank_account_number,
                        }));
                      }}
                      keyboardType="number-pad"
                      style={styles.payoutInput}
                    />
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.continueButton,
                        savingPayoutDetails && { opacity: 0.6 },
                      ]}
                      disabled={savingPayoutDetails}
                      onPress={savePayoutBankDetails}
                    >
                      <Text style={styles.buttonText}>
                        {savingPayoutDetails
                          ? "Verifying bank details..."
                          : "Save and verify bank account"}
                      </Text>
                    </TouchableOpacity>
                    {hasSavedPayoutBankDetails && (
                      <TouchableOpacity
                        style={styles.cancelEditButton}
                        onPress={() => {
                          setPayoutBankDetails(savedPayoutBankDetails);
                          setPayoutAccountReady(savedPayoutAccountReady);
                          setEditingPayoutDetails(false);
                        }}
                      >
                        <Text style={styles.cancelEditButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.rowSub}>
                      {payoutAccountReady
                        ? "Your account is ready to receive enabled card-payment transfers."
                        : payoutTransfersEnabled
                          ? "Saving will ask Paystack to validate the payout recipient."
                          : "Automatic transfers are not enabled yet; client card payments stay unavailable until payouts are enabled."}
                    </Text>
                  </>
                )}
                <View style={styles.cardPaymentSetting}>
                  <View style={styles.cardPaymentSettingCopy}>
                    <Text style={styles.rowTitle}>Accept card payments</Text>
                    <Text style={styles.rowSub}>
                      {cardPaymentsEnabled
                        ? payoutTransfersEnabled
                          ? "Card payments are on. Clients can pay by card."
                          : "Your card-payment preference is on, but the platform has disabled transfers. Clients still cannot pay by card."
                        : !cardPaymentsPreferenceAvailable
                          ? "Apply the owner card-payment migration before changing this setting."
                          : !payoutTransfersEnabled
                            ? "Card payments are off. Clients cannot pay by card until the platform enables automatic transfers."
                            : !hasPayoutBankDetails
                              ? "Add complete bank details before clients can pay by card."
                              : "Card payments are off. Clients cannot make card payments."}
                    </Text>
                  </View>
                  <View style={styles.cardPaymentSettingControl}>
                    {savingCardPaymentSetting ? (
                      <ActivityIndicator size="small" color="#35D9B3" />
                    ) : (
                      <Switch
                        accessibilityLabel="Accept card payments"
                        value={cardPaymentsEnabled}
                        onValueChange={updateCardPaymentsEnabled}
                        disabled={
                          !cardPaymentsPreferenceAvailable ||
                          ((!payoutTransfersEnabled || !hasPayoutBankDetails) &&
                            !cardPaymentsEnabled)
                        }
                        trackColor={{ false: "#294238", true: "#087F5B" }}
                        thumbColor={
                          cardPaymentsEnabled ? "#A7F3D0" : "#B1C4BC"
                        }
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
            {fromOnboarding && (
                <TouchableOpacity
                  style={[styles.button, styles.continueButton]}
                  onPress={completeOnboarding}
                >
                  <Text style={styles.buttonText}>Continue to dashboard</Text>
                </TouchableOpacity>
              )}
          </View>

          <View style={styles.card}>
              <Text style={styles.title}>Historical monthly payout statements</Text>
              <Text style={styles.rowSub}>
                These statements cover reconciled monthly payouts. Client card
                fares appear in payment history with their individual Paystack
                bank-transfer status.
              </Text>
              <FlatList
                data={payoutHistory}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No monthly payout statements are available yet.
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.period_start} – {item.period_end}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.status === "paid"
                          ? `Paid ${item.paid_at ? new Date(item.paid_at).toLocaleDateString("en-ZA") : ""}`
                          : "Prepared; bank transfer pending"}
                      </Text>
                      {item.destination_label ? (
                        <Text style={styles.rowSub}>
                          {item.destination_label}
                          {item.transfer_reference
                            ? ` · Reference ${item.transfer_reference}`
                            : ""}
                        </Text>
                      ) : null}
                      <Text style={styles.rowSub}>
                        Transport fares{" "}
                        {formatCurrency(
                          item.gross_fare_receipts_cents,
                          item.currency,
                        )}{" "}
                        · Client service fees (not deducted){" "}
                        {formatCurrency(
                          item.client_service_fees_cents,
                          item.currency,
                        )}{" "}
                        · Deductions{" "}
                        {formatCurrency(item.adjustments_cents, item.currency)}
                      </Text>
                    </View>
                    <Text style={styles.amount}>
                      {formatCurrency(item.net_payout_cents, item.currency)}
                    </Text>
                  </View>
                )}
              />
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
            <Text style={styles.title}>Cash commission invoices</Text>
            <Text style={styles.rowSub}>
              Fees due from owner-confirmed cash payments.
            </Text>
            <FlatList
              data={cashCommissionInvoices}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No outstanding cash commission invoices.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {item.period_start} – {item.period_end}
                    </Text>
                    <Text style={styles.rowSub}>
                      {item.status === "paid"
                        ? "Paid"
                        : item.status === "open"
                          ? `Due ${item.due_at ? new Date(item.due_at).toLocaleDateString("en-ZA") : "soon"}`
                          : item.status}
                    </Text>
                  </View>
                  <Text style={styles.amount}>
                    {formatCurrency(item.amount_cents, item.currency)}
                  </Text>
                  {item.status === "open" &&
                  (item.hosted_invoice_url ||
                    item.payment_provider === "paystack") ? (
                    <TouchableOpacity
                      style={[
                        styles.confirmCashButton,
                        payingCommissionInvoiceId === item.id &&
                          styles.buttonDisabled,
                      ]}
                      disabled={payingCommissionInvoiceId === item.id}
                      onPress={() => openCashCommissionInvoice(item)}
                    >
                      <Text style={styles.confirmCashButtonText}>
                        {payingCommissionInvoiceId === item.id
                          ? "Opening..."
                          : "Pay"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
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
                const fee = item.platform_fee_cents ?? item.service_fee_amount_cents ?? 0;
                const ownerFeeOwed =
                  item.payment_method === "cash" &&
                  ["owed", "invoiced"].includes(item.platform_fee_status);
                const serviceFeeReady = ["collected", "waived"].includes(
                  item.platform_fee_status,
                );
                const transfer = Array.isArray(item.owner_payment_transfers)
                  ? item.owner_payment_transfers[0]
                  : item.owner_payment_transfers;
                const transferStatusLabel = getTransferStatusLabel(transfer);
                const payout =
                  transferStatusLabel ||
                  (item.payment_provider === "paystack"
                    ? "See monthly payout statement"
                    : `Owner received: ${formatCurrency(
                        item.payment_method === "cash"
                          ? item.amount_cents || 0
                          : (item.amount_cents || 0) - fee,
                        item.currency,
                      )}`);
                return (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.clients?.users?.name || "Client"}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.children_count} child(ren) -{" "}
                        {item.payment_method === "cash" ? "Cash" : "Card"} -{" "}
                        {item.status}
                      </Text>
                      <Text style={styles.rowSub}>
                        Vehicle: {item.vehicles?.name || "Not recorded"} -{" "}
                        {ownerFeeOwed
                          ? `Legacy owner fee owed: ${formatCurrency(fee, item.currency)}`
                          : item.platform_fee_status === "waived"
                            ? "Client service fee waived"
                          : `Client-paid service fee: ${formatCurrency(fee, item.currency)}`}{" "}
                        • {payout}
                      </Text>
                      {transfer?.status === "failed" && (
                        <TouchableOpacity
                          style={[
                            styles.confirmCashButton,
                            retryingOwnerTransferId !== null &&
                              styles.buttonDisabled,
                          ]}
                          disabled={retryingOwnerTransferId !== null}
                          onPress={() => retryOwnerTransfer(item.id)}
                        >
                          <Text style={styles.confirmCashButtonText}>
                            {retryingOwnerTransferId === item.id
                              ? "Retrying transfer..."
                              : "Retry bank transfer"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {item.payment_method === "cash" &&
                      item.status === "pending" ? (
                        <>
                          {!serviceFeeReady && (
                            <Text style={styles.rowSub}>
                              Client must pay the service fee online before you can confirm.
                            </Text>
                          )}
                          {item.platform_fee_status === "waived" && (
                            <Text style={styles.rowSub}>
                              Service fee waived for the client’s free period.
                            </Text>
                          )}
                          <TouchableOpacity
                            style={styles.confirmCashButton}
                            disabled={
                              confirmingCashPaymentId !== null ||
                              !serviceFeeReady
                            }
                            onPress={() => confirmCashPayment(item.id)}
                          >
                            <Text style={styles.confirmCashButtonText}>
                              {confirmingCashPaymentId === item.id
                                ? "Confirming..."
                                : "Confirm cash received"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
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
  container: { flex: 1, backgroundColor: "#0D1713" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, gap: 14 },
  card: {
    backgroundColor: "#0D1713",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#F4FBF8", marginBottom: 10 },
  button: {
    backgroundColor: "#00B894",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonDisabled: { opacity: 0.65 },
  continueButton: { marginTop: 10, backgroundColor: "#16A34A" },
  buttonText: { color: "#FFF", fontWeight: "700" },
  noteText: {
    color: "#B1C4BC",
    fontSize: 13,
    marginBottom: 12,
  },
  payoutCard: {
    backgroundColor: "#13231D",
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
    backgroundColor: "#0D1713",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  payoutCopy: { flex: 1 },
  payoutStatusLabel: { color: "#B1C4BC", fontSize: 12 },
  payoutStatusValue: { color: "#F4FBF8", fontWeight: "700", marginTop: 3 },
  payoutDescription: {
    color: "#35D9B3",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  bankCard: {
    backgroundColor: "#17382D",
    borderWidth: 1,
    borderColor: "#2F6B55",
    borderRadius: 16,
    padding: 18,
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bankCardBrand: {
    flex: 1,
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bankCardName: {
    color: "#F4FBF8",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 22,
  },
  bankCardNumber: {
    color: "#D1FAE5",
    fontSize: 16,
    letterSpacing: 2,
    marginTop: 10,
  },
  bankCardCode: {
    color: "#B1C4BC",
    fontSize: 12,
    marginTop: 8,
  },
  bankCardStatus: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
  },
  editPayoutButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  editPayoutButtonText: { color: "#A7F3D0", fontWeight: "600" },
  cancelEditButton: { alignSelf: "center", paddingVertical: 8 },
  cancelEditButtonText: { color: "#B1C4BC", fontWeight: "600" },
  payoutInput: {
    borderWidth: 1,
    borderColor: "#294238",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F4FBF8",
    backgroundColor: "#0D1713",
  },
  payoutFieldLabel: { color: "#D1FAE5", fontSize: 13, fontWeight: "600" },
  bankPicker: {
    borderWidth: 1,
    borderColor: "#294238",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0D1713",
    justifyContent: "center",
    minHeight: 52,
  },
  bankPickerControl: { color: "#F4FBF8" },
  bankListError: { color: "#FCA5A5", fontSize: 12, marginBottom: 4 },
  cardPaymentSetting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#294238",
    paddingTop: 14,
    marginTop: 4,
  },
  cardPaymentSettingCopy: { flex: 1, gap: 3 },
  cardPaymentSettingControl: {
    minWidth: 52,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButton: {
    backgroundColor: "#00B894",
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
    borderTopColor: "#294238",
    paddingVertical: 10,
  },
  rowTitle: { fontWeight: "600", color: "#F4FBF8" },
  rowSub: { color: "#B1C4BC", fontSize: 12, marginTop: 2 },
  amount: { fontWeight: "700", color: "#F4FBF8", marginLeft: 10 },
  confirmCashButton: {
    alignSelf: "flex-start",
    marginTop: 7,
    borderRadius: 8,
    backgroundColor: "#13231D",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  confirmCashButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
