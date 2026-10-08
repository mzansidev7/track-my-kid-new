import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Linking from "expo-linking";
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
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

type SchoolPlan = {
  slug: string;
  name: string;
  monthly_price_cents: number | null;
  annual_price_cents: number | null;
  learner_limit: number | null;
  features: string[];
};

type SchoolInvoice = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  status: string;
  due_at: string;
  created_at: string;
  payment_reported_at?: string | null;
  payment_method?: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

type BillingData = {
  school: {
    id: string;
    name: string;
  };
  plans: SchoolPlan[];
  trial: {
    duration_months: number;
    status:
      | "active"
      | "expired"
      | "unavailable"
      | "pending_approval"
      | "rejected";
    approval_status?: string;
    started_at: string | null;
    ends_at: string | null;
    days_remaining: number;
    included_plan_slug: string;
    starter_learner_limit: number;
    learner_count: number;
    is_over_starter_limit: boolean;
    recommended_plan_slug: string | null;
  };
  subscription: {
    plan_slug: string;
    billing_interval: string;
    billing_status: string;
    billing_provider: string;
    price_cents: number;
    current_period_end: string | null;
    grace_period_ends_at: string | null;
    auto_renew: boolean;
    can_request_bank_transfer_renewal: boolean;
  } | null;
  invoices: SchoolInvoice[];
  learner_count: number;
  bank_details: {
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    branch_code: string | null;
  };
};

const money = (cents: number | null) =>
  cents === null
    ? "Custom"
    : new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(cents / 100);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-ZA") : "—";

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

  const nextMonth = new Date(now);
  const dayOfMonth = nextMonth.getUTCDate();
  nextMonth.setUTCDate(1);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  nextMonth.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  const days = Math.ceil((end.getTime() - nextMonth.getTime()) / 86400000);

  return { months, days: Math.max(days, 0) };
};

export default function SchoolBilling() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [method, setMethod] = useState<"card" | "bank_transfer">("card");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportingInvoice, setReportingInvoice] = useState("");
  const [error, setError] = useState("");
  const token = user?.token;

  const refresh = useCallback(async (pullToRefresh = false) => {
    if (!token) {
      setError("Your session has expired. Sign in again.");
      setLoading(false);
      return;
    }
    if (pullToRefresh) setRefreshing(true);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/school/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load billing.");
      setBilling(result);
      if (result.subscription?.plan_slug) {
        setSelectedPlan(result.subscription.plan_slug);
        if (["monthly", "annual"].includes(result.subscription.billing_interval)) {
          setInterval(result.subscription.billing_interval);
        }
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load billing.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const submit = async () => {
    if (!billing || !token) return;
    setBusy(true);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const path =
        method === "card"
          ? "/school/billing/checkout"
          : "/school/billing/invoices";
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_slug: selectedPlan,
          billing_interval: interval,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start payment.");

      if (method === "card") {
        if (!result.checkout_url) throw new Error("Checkout URL was not returned.");
        await Linking.openURL(result.checkout_url);
      } else {
        await refresh();
        Alert.alert(
          "EFT invoice requested",
          `Invoice ${result.invoice.invoice_number} for ${money(result.invoice.amount_cents)} is awaiting payment. Use the invoice number as your bank-transfer reference. The payment will be activated after Track My Kid confirms receipt.`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Payment could not be started.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reportEftPayment = async (invoice: SchoolInvoice) => {
    if (!token) return;
    setReportingInvoice(invoice.id);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/billing/invoices/${invoice.id}/payment-reported`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to report the EFT payment.");
      }
      await refresh();
      Alert.alert(
        "EFT payment reported",
        `Your payment for invoice ${invoice.invoice_number} has been reported. Support will confirm it after checking the bank account.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to report the EFT payment.",
      );
    } finally {
      setReportingInvoice("");
    }
  };

  const cancelRenewal = () => {
    Alert.alert(
      "Turn off automatic renewal?",
      "Your school retains access through the period already paid.",
      [
        { text: "Keep renewal", style: "cancel" },
        {
          text: "Turn off renewal",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(`${baseUrl}/school/billing/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || "Unable to cancel renewal.");
              await refresh();
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : "Unable to cancel renewal.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.muted}>Loading billing…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = billing?.subscription;
  const currentPlan = billing?.plans.find((plan) => plan.slug === current?.plan_slug);
  const plan = billing?.plans.find((item) => item.slug === selectedPlan);
  const pendingInvoice = billing?.invoices.find(
    (invoice) => invoice.status === "awaiting_payment",
  );
  const canResumeCheckout =
    current?.billing_status === "pending" && current.billing_provider === "stripe";
  const isSelectedCheckout =
    canResumeCheckout &&
    current?.plan_slug === selectedPlan &&
    current.billing_interval === interval;
  const canPurchase =
    !current ||
    ["canceled", "expired"].includes(current.billing_status) ||
    canResumeCheckout;
  const canRenewByBankTransfer =
    current?.can_request_bank_transfer_renewal;
  const canProceed =
    method === "bank_transfer"
      ? canPurchase || canRenewByBankTransfer
      : canPurchase;
  const overLimit = Boolean(
    plan?.learner_limit && (billing?.learner_count || 0) > plan.learner_limit,
  );
  const bank = billing?.bank_details;
  const trial = billing?.trial;
  const hasPaidSubscription = current?.billing_status === "active";
  const approvalPending = trial?.status === "pending_approval";
  const recommendedPlan = billing?.plans.find(
    (item) => item.slug === trial?.recommended_plan_slug,
  );
  const trialDurationRemaining = trial?.ends_at
    ? getTrialRemainingDuration(trial.ends_at)
    : { months: 0, days: trial?.days_remaining || 0 };
  const trialDaysRemaining = trial?.days_remaining || 0;
  const trialDurationLabel = [
    trialDurationRemaining.months
      ? `${trialDurationRemaining.months} month${trialDurationRemaining.months === 1 ? "" : "s"}`
      : "",
    trialDurationRemaining.days
      ? `${trialDurationRemaining.days} day${trialDurationRemaining.days === 1 ? "" : "s"}`
      : "",
  ]
    .filter(Boolean)
    .join(" and ");
  const schoolName = billing?.school?.name || "Your school";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={21} color="#172B4D" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Subscription & Billing</Text>
            <Text style={styles.subtitle}>Plans for your school in South African rand</Text>
          </View>
        </View>

        {approvalPending && !hasPaidSubscription ? (
          <Text style={styles.warning}>
            Your school registration is awaiting approval from Track My Kid support. Your 3-month free trial starts on the approval date.
          </Text>
        ) : null}
        {trial?.status === "rejected" && !hasPaidSubscription ? (
          <Text style={styles.warning}>
            Your school registration was not approved. Please contact Track My Kid support for more information.
          </Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.currentCard}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.eyebrow}>CURRENT SUBSCRIPTION</Text>
              <Text style={styles.cardTitle}>
                {currentPlan?.name ||
                  (approvalPending
                    ? "Awaiting admin approval"
                    : trial?.status === "rejected"
                      ? "Registration not approved"
                      : "No paid plan")}
              </Text>
            </View>
            <MaterialIcons name="verified" size={22} color="#16A34A" />
          </View>
          {current ? (
            <>
              <Text style={styles.status}>
                {current.billing_status.replaceAll("_", " ")} ·{" "}
                {money(current.price_cents)} per{" "}
                {current.billing_interval === "annual" ? "year" : "month"}
              </Text>
              <Text style={styles.muted}>
                {billing?.learner_count || 0} learners · paid through{" "}
                {formatDate(current.current_period_end)}
              </Text>
              {current.billing_status === "past_due" && (
                <Text style={styles.warning}>
                  Payment overdue. Grace period ends{" "}
                  {formatDate(current.grace_period_ends_at)}. Learner and trip-safety information remains available.
                </Text>
              )}
              {current.billing_status === "active" && current.auto_renew && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={busy}
                  onPress={cancelRenewal}
                >
                  <Text style={styles.cancelText}>Turn off automatic renewal</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.muted}>
              {trial?.status === "active"
                ? `${schoolName} is in its 3-month free trial, with ${trialDurationLabel} remaining (${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} total). Trial ends ${formatDate(trial.ends_at)}.`
                : trial?.status === "expired"
                  ? `Your 3-month trial ended ${formatDate(trial.ends_at)}. Choose a plan to subscribe.`
                  : approvalPending
                    ? "Your school must be approved by Track My Kid support before its free trial starts. No subscription payment is due while approval is pending."
                    : trial?.status === "rejected"
                      ? "Your school registration was not approved. Please contact Track My Kid support."
                  : "Choose a plan below."}{" "}
              Your school features remain available while billing is arranged.
            </Text>
          )}
        </View>

        {!hasPaidSubscription && trial?.status === "active" && (
          <View style={styles.trialNotice}>
            <Text style={styles.trialNoticeTitle}>Free trial</Text>
            <Text style={styles.muted}>
              {schoolName} has {trialDurationLabel} remaining ({trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} total) in its 3-month free trial. Starter includes up to {trial.starter_learner_limit} learners. No payment is taken automatically when the trial ends.
            </Text>
          </View>
        )}
        {!hasPaidSubscription &&
          trial?.is_over_starter_limit &&
          recommendedPlan && (
            <View style={styles.recommendation}>
              <Text style={styles.recommendationTitle}>
                We recommend {recommendedPlan.name}
              </Text>
              <Text style={styles.muted}>
                Your school has {billing?.learner_count || 0} learners, above Starter&apos;s{" "}
                {trial.starter_learner_limit}-learner limit.{" "}
                {recommendedPlan.monthly_price_cents === null
                  ? "Contact us to discuss an Enterprise plan."
                  : `${money(recommendedPlan.monthly_price_cents)} per month or ${money(recommendedPlan.annual_price_cents)} per year.`}
              </Text>
              <TouchableOpacity
                style={styles.recommendationButton}
                onPress={() => {
                  setSelectedPlan(recommendedPlan.slug);
                }}
              >
                <Text style={styles.recommendationButtonText}>
                  {recommendedPlan.monthly_price_cents === null
                    ? "Select Enterprise"
                    : `Select ${recommendedPlan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={styles.cardTitle}>Choose a plan</Text>
            <Text style={styles.muted}>
              {billing?.learner_count || 0} learners · annual saves 10%
            </Text>
          </View>
        </View>
        <View style={styles.intervalRow}>
          {(["monthly", "annual"] as const).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setInterval(value)}
              style={[styles.interval, interval === value && styles.intervalActive]}
            >
              <Text style={[styles.intervalText, interval === value && styles.intervalTextActive]}>
                {value === "monthly" ? "Monthly" : "Annual · 10% off"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {billing?.plans.map((item) => {
          const price =
            interval === "annual"
              ? item.annual_price_cents
              : item.monthly_price_cents;
          const isOverLimit =
            item.learner_limit !== null &&
            (billing.learner_count || 0) > item.learner_limit;
          return (
            <TouchableOpacity
              key={item.slug}
              disabled={Boolean(pendingInvoice)}
              style={[
                styles.planCard,
                selectedPlan === item.slug && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(item.slug)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === item.slug }}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.price}>
                  {money(price)}
                  {price !== null && (
                    <Text style={styles.priceUnit}>
                      {" "}/{interval === "annual" ? "year" : "month"}
                    </Text>
                  )}
                </Text>
              </View>
              {item.slug === trial?.recommended_plan_slug && !hasPaidSubscription ? (
                <Text style={styles.recommendedLabel}>Recommended for your school</Text>
              ) : null}
              <Text style={styles.muted}>
                {item.learner_limit
                  ? `Up to ${item.learner_limit.toLocaleString()} learners`
                  : "Multiple campuses · contact us"}
              </Text>
              {isOverLimit && (
                <Text style={styles.warning}>
                  Your school is above this plan&apos;s learner limit.
                </Text>
              )}
              {item.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <MaterialIcons name="check" size={16} color="#16A34A" />
                  <Text style={styles.feature}>{feature}</Text>
                </View>
              ))}
              {item.slug === "enterprise" && (
                <Text
                  style={styles.contactLink}
                  onPress={() =>
                    void Linking.openURL(
                      "mailto:support@trackmykid.com?subject=Track%20My%20Kid%20school%20Enterprise%20plan",
                    )
                  }
                >
                  Contact us about Enterprise
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.currentCard}>
          <Text style={styles.cardTitle}>How would you like to pay?</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.method, method === "card" && styles.methodActive]}
              onPress={() => setMethod("card")}
            >
              <MaterialIcons name="credit-card" size={19} color="#4285F4" />
              <Text style={styles.methodText}>Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.method,
                method === "bank_transfer" && styles.methodActive,
              ]}
              onPress={() => setMethod("bank_transfer")}
            >
              <MaterialIcons name="receipt-long" size={19} color="#4285F4" />
              <Text style={styles.methodText}>Invoice / EFT</Text>
            </TouchableOpacity>
          </View>
          {method === "bank_transfer" && (
            <View style={styles.bankBox}>
              <Text style={styles.bankHeading}>Bank transfer details</Text>
              {bank?.bank_name && <Text style={styles.bankText}>Bank: {bank.bank_name}</Text>}
              {bank?.account_name && <Text style={styles.bankText}>Account name: {bank.account_name}</Text>}
              {bank?.account_number && <Text style={styles.bankText}>Account number: {bank.account_number}</Text>}
              {bank?.branch_code && <Text style={styles.bankText}>Branch code: {bank.branch_code}</Text>}
              {!bank?.account_number && (
                <Text style={styles.warning}>
                  Bank details have not been configured. Contact Track My Kid before requesting an invoice.
                </Text>
              )}
              {pendingInvoice && (
                <Text style={styles.bankText}>
                  Invoice {pendingInvoice.invoice_number} is awaiting payment. Use it as your EFT reference.
                </Text>
              )}
              <Text style={styles.bankText}>
                Bank-transfer payments are activated after receipt is confirmed by Track My Kid.
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.submit,
              (busy ||
                !canProceed ||
                !plan ||
                plan.monthly_price_cents === null ||
                overLimit ||
                (method === "bank_transfer" && !bank?.account_number) ||
                Boolean(pendingInvoice)) &&
                styles.disabled,
            ]}
            disabled={
              busy ||
              !canProceed ||
              !plan ||
              plan.monthly_price_cents === null ||
              overLimit ||
              (method === "bank_transfer" && !bank?.account_number) ||
              Boolean(pendingInvoice)
            }
            onPress={() => void submit()}
          >
            <Text style={styles.submitText}>
              {busy
                ? "Please wait…"
                : isSelectedCheckout
                  ? "Resume secure checkout"
                  : canResumeCheckout
                    ? "Change plan and continue to checkout"
                  : method === "card"
                    ? pendingInvoice
                      ? "Invoice already requested"
                      : "Continue to secure card checkout"
                    : pendingInvoice
                      ? "EFT invoice already requested"
                      : "Request EFT invoice"}
            </Text>
          </TouchableOpacity>
          {!canProceed && (
            <Text style={styles.muted}>
              {canResumeCheckout
                ? "Your checkout is unfinished. Choose another plan or billing interval to replace it, or continue to the current checkout."
                : "Your current plan is active. You can change plans after the paid period ends."}
            </Text>
          )}
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.cardTitle}>Invoices &amp; payment history</Text>
          {billing?.invoices.length ? (
            billing.invoices.map((invoice) => (
              <View key={invoice.id} style={styles.invoice}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                  <Text style={styles.muted}>
                    Due {formatDate(invoice.due_at)} · {invoice.status.replaceAll("_", " ")}
                    {invoice.payment_method === "card" ? " · card" : ""}
                  </Text>
                </View>
                <Text style={styles.invoiceAmount}>{money(invoice.amount_cents)}</Text>
                {invoice.status === "awaiting_payment" &&
                  invoice.payment_method === "bank_transfer" && (
                    <TouchableOpacity
                      style={styles.reportPayment}
                      disabled={Boolean(reportingInvoice) || Boolean(invoice.payment_reported_at)}
                      onPress={() => void reportEftPayment(invoice)}
                    >
                      <Text style={styles.reportPaymentText}>
                        {reportingInvoice === invoice.id
                          ? "Reporting..."
                          : invoice.payment_reported_at
                            ? `Reported ${formatDate(invoice.payment_reported_at)}`
                            : "I've paid by EFT"}
                      </Text>
                    </TouchableOpacity>
                  )}
                {(invoice.hosted_invoice_url || invoice.invoice_pdf) && (
                  <Text
                    style={styles.invoiceLink}
                    onPress={() =>
                      void Linking.openURL(
                        invoice.hosted_invoice_url || invoice.invoice_pdf || "",
                      )
                    }
                  >
                    View
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No invoices yet.</Text>
          )}
          {pendingInvoice?.payment_method === "bank_transfer" && (
            <View style={styles.bankBox}>
              <Text style={styles.bankHeading}>
                EFT details for {pendingInvoice.invoice_number}
              </Text>
              {bank?.bank_name ? (
                <Text style={styles.bankText}>Bank: {bank.bank_name}</Text>
              ) : null}
              {bank?.account_name ? (
                <Text style={styles.bankText}>Account name: {bank.account_name}</Text>
              ) : null}
              {bank?.account_number ? (
                <Text style={styles.bankText}>Account number: {bank.account_number}</Text>
              ) : null}
              {bank?.branch_code ? (
                <Text style={styles.bankText}>Branch code: {bank.branch_code}</Text>
              ) : null}
              <Text style={styles.bankText}>
                Payment reference: {pendingInvoice.invoice_number}
              </Text>
              <Text style={styles.bankText}>
                Report the payment above after making the transfer. Support will confirm receipt after checking the bank account.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, paddingBottom: 140, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: { color: "#172B4D", fontSize: 21, fontWeight: "800" },
  subtitle: { color: "#718096", fontSize: 11, marginTop: 3 },
  currentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 15,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: { color: "#4285F4", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  cardTitle: { color: "#172B4D", fontSize: 15, fontWeight: "800" },
  status: { color: "#334155", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  muted: { color: "#718096", fontSize: 11, lineHeight: 17 },
  error: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 11,
    fontSize: 12,
  },
  warning: { color: "#9A3412", fontSize: 11, lineHeight: 17 },
  trialNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 12,
    gap: 5,
  },
  trialNoticeTitle: { color: "#1D4ED8", fontSize: 12, fontWeight: "800" },
  recommendation: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 12,
    gap: 6,
  },
  recommendationTitle: { color: "#9A3412", fontSize: 13, fontWeight: "800" },
  recommendationButton: {
    alignSelf: "flex-start",
    borderRadius: 7,
    backgroundColor: "#1D4ED8",
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  recommendationButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  recommendedLabel: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
  },
  cancelButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cancelText: { color: "#B91C1C", fontSize: 11, fontWeight: "700" },
  intervalRow: { flexDirection: "row", gap: 8 },
  interval: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    backgroundColor: "#FFFFFF",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  intervalActive: { borderColor: "#4285F4", backgroundColor: "#EFF6FF" },
  intervalText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  intervalTextActive: { color: "#1D4ED8" },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 14,
    gap: 7,
  },
  planCardSelected: { borderColor: "#4285F4", borderWidth: 2 },
  price: { color: "#2563EB", fontSize: 14, fontWeight: "800" },
  priceUnit: { color: "#718096", fontSize: 10, fontWeight: "500" },
  featureRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  feature: { color: "#475569", fontSize: 11, flex: 1 },
  contactLink: { color: "#2563EB", fontSize: 11, fontWeight: "800", marginTop: 5 },
  methodRow: { flexDirection: "row", gap: 8 },
  method: {
    flex: 1,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4EAF2",
    borderRadius: 9,
    padding: 10,
  },
  methodActive: { borderColor: "#4285F4", backgroundColor: "#EFF6FF" },
  methodText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  bankBox: { backgroundColor: "#F8FAFC", borderRadius: 9, padding: 11, gap: 5 },
  bankHeading: { color: "#172B4D", fontSize: 12, fontWeight: "800" },
  bankText: { color: "#475569", fontSize: 11, lineHeight: 16 },
  submit: {
    borderRadius: 9,
    backgroundColor: "#2563EB",
    alignItems: "center",
    padding: 12,
    marginTop: 2,
  },
  disabled: { opacity: 0.45 },
  submitText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  invoice: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingTop: 10,
    gap: 8,
  },
  reportPayment: {
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  reportPaymentText: { color: "#2563EB", fontSize: 10, fontWeight: "700" },
  invoiceNumber: { color: "#172B4D", fontSize: 11, fontWeight: "800" },
  invoiceAmount: { color: "#334155", fontSize: 11, fontWeight: "700" },
  invoiceLink: { color: "#2563EB", fontSize: 11, fontWeight: "800" },
});
