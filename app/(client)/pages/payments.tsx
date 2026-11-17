import React, { useCallback, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
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
  subscribeToOwnerPayoutSettingsUpdates,
  subscribeToPaymentUpdates,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/clientRealtime";

const formatCurrency = (cents = 0, currency = "zar") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const getPayoutSetupMessage = (reason: string | null | undefined) => {
  switch (reason) {
    case "OWNER_PAYOUT_ACCOUNT_REQUIRED":
      return "This transport owner must add a bank account before card payments can be accepted.";
    case "OWNER_PAYOUT_ACCOUNT_UNVERIFIED":
      return "Paystack is verifying this owner’s bank details. Card payment will be available once verification succeeds.";
    case "OWNER_CARD_PAYMENTS_DISABLED":
      return "This transport owner has turned off card payments. Please report a cash payment or contact the owner.";
    case "OWNER_CARD_PAYMENT_SCHEMA_MISSING":
      return "Card payment settings are being updated. Please report a cash payment or try again later.";
    case "OWNER_PAYOUT_SCHEMA_MISSING":
      return "Card payments are temporarily unavailable while payment setup is updated. You can still report a cash payment.";
    case "OWNER_PAYOUTS_NOT_ENABLED":
      return "Card payments are currently unavailable because the platform has not enabled automatic owner bank transfers.";
    default:
      return "Card payments are temporarily unavailable. You can still report a cash payment.";
  }
};

const PaymentHistory = ({
  payments,
  onPayCashServiceFee,
  payingPaymentId,
}: {
  payments: any[];
  onPayCashServiceFee: (paymentId: string) => void;
  payingPaymentId: string | null;
}) => (
  <View style={styles.historyCard}>
    <Text style={styles.historyTitle}>Payment history</Text>
    {payments.length === 0 ? (
      <Text style={styles.historyEmpty}>No payments recorded yet.</Text>
    ) : (
      payments.map((payment) => (
        (() => {
          const fee = Array.isArray(payment.client_cash_service_fees)
            ? payment.client_cash_service_fees[0]
            : payment.client_cash_service_fees;
          const needsFeePayment =
            payment.payment_method === "cash" &&
            payment.status === "pending" &&
            fee?.status !== "paid" &&
            fee?.status !== "waived";
          const feeWasWaived =
            fee?.status === "waived" ||
            (payment.platform_fee_status === "waived" &&
              Number(payment.platform_fee_cents) === 0);
          return (
            <View key={payment.id} style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <Text style={styles.historyStatus}>
                  {needsFeePayment
                    ? "Cash reported — service fee payment required"
                    : payment.payment_method === "cash" &&
                        payment.status === "pending"
                      ? "Cash payment awaiting owner confirmation"
                      : payment.status === "paid"
                        ? "Payment successful"
                        : payment.status === "failed"
                          ? "Payment failed"
                          : payment.status === "cancelled"
                            ? "Payment cancelled"
                            : "Payment pending"}
                </Text>
                <Text style={styles.historyDetails}>
                  {payment.payment_method === "cash" ? "Cash • " : "Card • "}
                  {payment.owners?.company_name ||
                    payment.owners?.users?.name ||
                    "Owner unavailable"}{" "}
                  • {payment.vehicles?.name || "Vehicle not recorded"} •{" "}
                  {payment.children_count} child(ren) •{" "}
                  {new Date(payment.created_at).toLocaleDateString("en-ZA")}
                  {feeWasWaived
                    ? " • Track My Kid service fee waived"
                    : fee?.amount_cents || payment.platform_fee_cents
                      ? ` • Service fee ${formatCurrency(
                          fee?.amount_cents ?? payment.platform_fee_cents,
                          payment.currency,
                        )} (${fee?.status || payment.platform_fee_status})`
                      : ""}
                </Text>
                {needsFeePayment && (
                  <TouchableOpacity
                    style={styles.resumeFeeButton}
                    onPress={() => onPayCashServiceFee(payment.id)}
                    disabled={payingPaymentId !== null}
                  >
                    <Text style={styles.resumeFeeText}>
                      {payingPaymentId === payment.id
                        ? "Opening checkout..."
                        : `Pay ${formatCurrency(fee?.amount_cents ?? (payment.children_count || 0) * 500, payment.currency)} service fee`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.historyAmount}>
                {formatCurrency(payment.amount_cents, payment.currency)}
              </Text>
            </View>
          );
        })()
      ))
    )}
  </View>
);

const ClientPayments = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payingGroupId, setPayingGroupId] = useState<string | null>(null);
  const [reportingCashGroupId, setReportingCashGroupId] = useState<
    string | null
  >(null);
  const [payingCashFeePaymentId, setPayingCashFeePaymentId] = useState<
    string | null
  >(null);

  const loadSummary = useCallback(
    async (isRefresh = false) => {
      if (!token) {
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
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseUrl}/client/payments/history`, {
            headers: { Authorization: `Bearer ${token}` },
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
    [token],
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

  React.useEffect(() => {
    const ownerIds: string[] = [
      ...new Set<string>(
        (summary?.payment_groups || [])
          .map((group: any) => group.owner_id)
          .filter(
            (ownerId: unknown): ownerId is string =>
              typeof ownerId === "string" && ownerId.length > 0,
          ),
      ),
    ];
    if (!ownerIds.length) return undefined;

    const ownerSettingsChannel = subscribeToOwnerPayoutSettingsUpdates(
      ownerIds,
      () => loadSummary(true),
    );
    return () => {
      unsubscribeFromRealtime(ownerSettingsChannel);
    };
  }, [summary?.payment_groups, loadSummary]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      const refreshInterval = setInterval(() => {
        loadSummary(true);
      }, 30000);
      return () => clearInterval(refreshInterval);
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
      const errorCode =
        paymentError instanceof Error ? paymentError.message : "";
      setError(
        errorCode === "OWNER_PAYOUTS_NOT_ENABLED"
          ? "Card payments are temporarily unavailable while owner bank transfers are being configured."
          : errorCode === "OWNER_CARD_PAYMENTS_DISABLED"
            ? "This transport owner has turned off card payments. Please report a cash payment or contact the owner."
            : errorCode === "OWNER_CARD_PAYMENT_SCHEMA_MISSING"
              ? "Card payment settings are being updated. Please report a cash payment or try again later."
          : errorCode === "OWNER_PAYOUT_ACCOUNT_REQUIRED"
            ? "The transport owner must add and verify a bank account before card payment."
            : errorCode === "OWNER_PAYOUT_ACCOUNT_UNVERIFIED"
              ? "Paystack has not verified the transport owner’s bank account yet. Please try again later."
            : errorCode === "OWNER_PAYOUT_SCHEMA_MISSING"
              ? "Card payments are temporarily unavailable while the payment system is updated. Please report a cash payment or try again later."
            : errorCode === "OWNER_PAYOUT_ACCOUNT_VERIFICATION_FAILED"
              ? "Paystack could not verify the owner’s payout account. Please try again later."
              : errorCode || "Unable to start payment.",
      );
    } finally {
      setPayingGroupId(null);
    }
  };

  const reportCashPayment = async (groupId: string) => {
    if (!user?.token || reportingCashGroupId) return;
    setReportingCashGroupId(groupId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/payments/cash-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          group_id: groupId,
          return_url: ExpoLinking.createURL("pages/payments"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to report cash payment.");
      }
      if (data.checkout_url) await Linking.openURL(data.checkout_url);
      await loadSummary(true);
      Alert.alert(
        "Cash payment reported",
        "Pay the R5-per-child service fee online. Once it succeeds, your fleet owner can confirm the cash fare you paid them.",
      );
    } catch (reportError) {
      Alert.alert(
        "Unable to report cash payment",
        reportError instanceof Error
          ? reportError.message
          : "Please try again.",
      );
    } finally {
      setReportingCashGroupId(null);
    }
  };

  const payCashServiceFee = async (paymentId: string) => {
    if (!user?.token || payingCashFeePaymentId) return;
    setPayingCashFeePaymentId(paymentId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/payments/${paymentId}/cash-service-fee-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            return_url: ExpoLinking.createURL("pages/payments"),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Unable to start service-fee payment.");
      }
      await Linking.openURL(data.checkout_url);
    } catch (paymentError) {
      Alert.alert(
        "Unable to start service-fee payment",
        paymentError instanceof Error
          ? paymentError.message
          : "Please try again.",
      );
    } finally {
      setPayingCashFeePaymentId(null);
    }
  };

  const hasRouteLinkedChildren =
    Number(summary?.route_linked_children_count || 0) > 0;
  const hasChildren = Number(summary?.client_children_count || 0) > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={23} color="#FBF8FF" />
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
            <ActivityIndicator color="#C14BFF" />
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
            {history.length > 0 && (
              <PaymentHistory
                payments={history}
                onPayCashServiceFee={payCashServiceFee}
                payingPaymentId={payingCashFeePaymentId}
              />
            )}
          </View>
        ) : (
          <>
            {hasRouteLinkedChildren && summary?.service_fee_trial && (
              <View style={styles.trialNotice}>
                <MaterialIcons
                  name="card-giftcard"
                  size={21}
                  color="#C14BFF"
                />
                <Text style={styles.trialNoticeText}>
                  {summary.service_fee_trial.starts_after_first_payment
                    ? "Your first two months of the R5-per-child Track My Kid service fee are free. The offer period starts when your first transport payment succeeds."
                    : summary.service_fee_trial.is_free
                      ? `Your R5-per-child service fee is free until ${new Date(
                          summary.service_fee_trial.expires_at,
                        ).toLocaleDateString("en-ZA")}.`
                      : summary.service_fee_trial.expires_at
                        ? `Your two-month service-fee offer ended on ${new Date(
                            summary.service_fee_trial.expires_at,
                          ).toLocaleDateString("en-ZA")}. The standard R5-per-child fee now applies.`
                        : "Your two-month service-fee offer has ended. The standard R5-per-child fee now applies."}
                </Text>
              </View>
            )}

            {hasRouteLinkedChildren ? (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.paymentIcon}>
                    <MaterialIcons name="payments" size={28} color="#C14BFF" />
                  </View>
                  <Text style={styles.cardTitle}>
                    Current transport amount (before service fees)
                  </Text>
                  <Text style={styles.amount}>
                    {formatCurrency(
                      summary?.total_amount_cents,
                      summary?.currency,
                    )}
                  </Text>
                  <Text style={styles.mutedText}>
                    Based on {summary?.children_count || 0} child(ren) currently
                    requiring payment
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  <Row
                    label="Children covered"
                    value={String(summary?.route_linked_children_count || 0)}
                  />
                  <Row
                    label="Payment status"
                    value={
                      summary?.unpaid_child_names?.length
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
                    <MaterialIcons
                      name="info-outline"
                      size={20}
                      color="#92400E"
                    />
                    <Text style={styles.paymentNoticeText}>
                      Payment is required for:{" "}
                      {summary.unpaid_child_names.join(", ")}.
                    </Text>
                  </View>
                )}

                {!!summary?.pending_child_names?.length && (
                  <View style={styles.paymentNotice}>
                    <MaterialIcons
                      name="hourglass-top"
                      size={20}
                      color="#92400E"
                    />
                    <Text style={styles.paymentNoticeText}>
                      Payment is processing for:{" "}
                      {summary.pending_child_names.join(", ")}. You cannot make
                      another payment for these children.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.paymentNotice}>
                <MaterialIcons
                  name="info-outline"
                  size={20}
                  color="#1D4ED8"
                />
                <Text style={styles.paymentNoticeText}>
                  {hasChildren
                    ? "Payment details will appear once your child is linked to a transport route."
                    : "Add a child and link them to a transport route to see payment details here."}
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
                <View style={styles.feeBreakdown}>
                  <Row
                    label={
                      group.service_fee_waived
                        ? "Track My Kid service fee (two-month offer)"
                        : `Track My Kid service fee (${group.children_count} × R5)`
                    }
                    value={
                      group.service_fee_waived
                        ? "Waived"
                        : formatCurrency(
                            group.service_fee_cents,
                            summary?.currency,
                          )
                    }
                  />
                  <Row
                    label="Total due by card"
                    value={formatCurrency(group.total_due_cents, summary?.currency)}
                  />
                  <Text style={styles.routeDetails}>
                    {group.service_fee_waived
                      ? "This service fee is waived for the two-month offer for both card and cash payments."
                      : "If you pay the transport fare in cash, pay this service fee online separately."}
                  </Text>
                </View>
                {!group.card_payment_available ? (
                  <View style={styles.paymentNotice}>
                    <MaterialIcons
                      name="info-outline"
                      size={20}
                      color="#B45309"
                    />
                    <Text style={styles.paymentNoticeText}>
                      {getPayoutSetupMessage(group.payout_setup_required)}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!group.owner_id || !group.card_payment_available) &&
                      styles.payButtonDisabled,
                  ]}
                  onPress={() => payForGroup(group.group_id)}
                  disabled={
                    payingGroupId !== null ||
                    !group.owner_id ||
                    !group.card_payment_available
                  }
                >
                  <Text style={styles.payButtonText}>
                    {!group.owner_id
                      ? "Owner unavailable"
                      : !group.card_payment_available
                        ? "Card payment unavailable"
                      : payingGroupId === group.group_id
                        ? "Opening checkout..."
                        : `Pay ${formatCurrency(group.total_due_cents, summary?.currency)}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cashButton,
                    !group.owner_id && styles.payButtonDisabled,
                  ]}
                  onPress={() => reportCashPayment(group.group_id)}
                  disabled={
                    reportingCashGroupId !== null ||
                    payingGroupId !== null ||
                    !group.owner_id
                  }
                >
                  <Text style={styles.cashButtonText}>
                    {reportingCashGroupId === group.group_id
                      ? "Reporting cash payment..."
                      : "Already paid cash? Report it"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <PaymentHistory
              payments={history}
              onPayCashServiceFee={payCashServiceFee}
              payingPaymentId={payingCashFeePaymentId}
            />

            {hasRouteLinkedChildren ? (
              <Text style={styles.note}>
                Your total is calculated from the route assigned to each child.
              </Text>
            ) : null}
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
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#130D1A",
    borderBottomWidth: 1,
    borderBottomColor: "#352341",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: { color: "#FBF8FF", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#B9AFC4", fontSize: 10, marginTop: 3 },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#1C1026",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#352341",
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  paymentIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#130D1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: { color: "#C14BFF", fontSize: 13, fontWeight: "700" },
  amount: { color: "#FBF8FF", fontSize: 29, fontWeight: "800", marginTop: 8 },
  mutedText: { color: "#B9AFC4", fontSize: 11, marginTop: 4 },
  detailCard: {
    backgroundColor: "#130D1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#352341",
    paddingHorizontal: 16,
  },
  paymentNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1026",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  paymentNoticeText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    lineHeight: 18,
  },
  trialNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1C1026",
    borderColor: "#B8E4C4",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  trialNoticeText: {
    flex: 1,
    color: "#176B32",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
  },
  routeCard: {
    backgroundColor: "#130D1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#352341",
    padding: 14,
    marginTop: 12,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  routeName: { color: "#FBF8FF", fontSize: 13, fontWeight: "700", flex: 1 },
  routeAmount: { color: "#C14BFF", fontSize: 13, fontWeight: "800" },
  routeDetails: { color: "#B9AFC4", fontSize: 11, marginTop: 6 },
  childNames: {
    color: "#B9AFC4",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  groupTitle: { flex: 1 },
  ownerName: { color: "#B9AFC4", fontSize: 11, marginBottom: 2 },
  payButton: {
    backgroundColor: "#9B2BE7",
    borderRadius: 9,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 12,
  },
  payButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  payButtonDisabled: { backgroundColor: "#B9AFC4" },
  cashButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C14BFF",
    borderRadius: 9,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: "#1C1026",
  },
  cashButtonText: { color: "#C14BFF", fontWeight: "700", fontSize: 11 },
  historyCard: {
    backgroundColor: "#130D1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#352341",
    padding: 16,
    marginTop: 14,
  },
  historyTitle: { color: "#FBF8FF", fontSize: 14, fontWeight: "800" },
  historyEmpty: { color: "#B9AFC4", fontSize: 12, marginTop: 10 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1C1026",
    paddingVertical: 12,
    marginTop: 10,
  },
  historyCopy: { flex: 1 },
  historyStatus: { color: "#FBF8FF", fontSize: 12, fontWeight: "700" },
  historyDetails: { color: "#B9AFC4", fontSize: 11, marginTop: 4 },
  historyAmount: {
    color: "#FBF8FF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 12,
  },
  feeBreakdown: {
    borderTopWidth: 1,
    borderTopColor: "#1C1026",
    marginTop: 10,
    paddingTop: 4,
  },
  resumeFeeButton: {
    alignSelf: "flex-start",
    backgroundColor: "#9B2BE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  resumeFeeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1C1026",
  },
  rowLabel: { color: "#B9AFC4", fontSize: 12 },
  rowValue: { color: "#FBF8FF", fontSize: 12, fontWeight: "700" },
  note: {
    color: "#B9AFC4",
    fontSize: 11,
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
  stateText: { color: "#B9AFC4", fontSize: 12, textAlign: "center" },
  retryButton: {
    backgroundColor: "#9B2BE7",
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
});
