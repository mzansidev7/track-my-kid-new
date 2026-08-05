import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { AuthContext } from "../../authContext/auth-context";
import { BASE_URL, resolveWorkingBaseUrl } from "../../url";
import {
  initStripe,
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

export default function OwnerSubscriptions() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const [plans, setPlans] = useState<any[]>([]);
  const [ownerSubscription, setOwnerSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "Access Code">(
    "card",
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const [stripePublishableKey, setStripePublishableKey] = useState<
    string | null
  >(null);
  const [isStripeTestMode, setIsStripeTestMode] = useState(false);

  const currentPlanId =
    ownerSubscription?.subscription_plan_id ||
    ownerSubscription?.subscription_plans?.id;

  const freeFallback = plans.find(
    (plan) =>
      plan.monthly_price_cents === 0 ||
      plan.name?.toLowerCase().includes("free") ||
      plan.name?.toLowerCase().includes("starter"),
  );

  const currentPlan = plans.find((plan) => plan.id === currentPlanId) ||
    freeFallback || {
      id: "free-starter",
      name: "Free / Starter",
      monthly_price_cents: 0,
      description: "Your starter plan after registration.",
    };

  const currentSubscriptionStatus = ownerSubscription?.status || "active";
  const currentSubscriptionBadgeStyle = styles[
    `status_${currentSubscriptionStatus}` as keyof typeof styles
  ] as ViewStyle;

  const subscriptionStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending";
      case "past_due":
        return "Past due";
      case "canceled":
      case "cancelled":
        return "Canceled";
      case "trialing":
        return "Trialing";
      default:
        return status?.replace(/_/g, " ") || "Unknown";
    }
  };

  const currentSubscriptionLabel = () => {
    if (!ownerSubscription) {
      return "Subscription details are not available yet.";
    }

    if (ownerSubscription.status === "pending") {
      return "Your subscription is waiting for payment confirmation.";
    }

    if (ownerSubscription.status === "past_due") {
      return "Your subscription payment is overdue. Please update your payment details.";
    }

    if (
      ownerSubscription.status === "canceled" ||
      ownerSubscription.status === "cancelled"
    ) {
      return ownerSubscription.current_period_end
        ? `Subscription ended on ${new Date(
            ownerSubscription.current_period_end,
          ).toLocaleDateString()}`
        : "Your subscription has been canceled.";
    }

    if (ownerSubscription.current_period_end) {
      const endDate = new Date(ownerSubscription.current_period_end);
      const formattedDate = endDate.toLocaleDateString();
      return ownerSubscription.auto_renew
        ? `Renews on ${formattedDate}`
        : `Ends on ${formattedDate}`;
    }

    return "This is your current subscription plan.";
  };

  const currentSubscriptionLabelText = currentSubscriptionLabel();

  const loadSubscriptions = async () => {
    if (!user?.token) {
      return;
    }
    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/subscriptions`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load subscriptions.");
      }

      setPlans(data.plans || []);
      setOwnerSubscription(data.subscription || null);
      // fetch stripe publishable key and determine test/live mode
      try {
        const cfgRes = await fetch(`${baseUrl}/owner/payments/stripe-config`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
        });
        const cfg = await cfgRes.json();
        if (cfgRes.ok && cfg.publishable_key) {
          setStripePublishableKey(cfg.publishable_key);
          setIsStripeTestMode(
            String(cfg.publishable_key).startsWith("pk_test_"),
          );
        }
      } catch (e) {
        // ignore stripe config errors for now
      }
    } catch (err: any) {
      setNotification({
        visible: true,
        type: "error",
        message: err.message || "Failed to load subscriptions.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [user?.token]);

  useEffect(() => {
    if (stripePublishableKey) {
      try {
        initStripe({ publishableKey: stripePublishableKey });
      } catch (e) {
        console.warn("Failed to init Stripe SDK:", e);
      }
    }
  }, [stripePublishableKey]);

  useEffect(() => {
    // Detect checkout completion from Stripe redirect
    const status = searchParams.status as string | undefined;
    if (status === "success") {
      setNotification({
        visible: true,
        type: "success",
        message: "Payment successful! Your subscription has been updated.",
      });
      loadSubscriptions();
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 5000);
    } else if (status === "cancelled") {
      setNotification({
        visible: true,
        type: "warning",
        message: "Checkout was cancelled.",
      });
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 5000);
    }
  }, [searchParams.status]);

  const openPaymentModal = (plan: any) => {
    const isCurrent = plan.id === currentPlan.id;
    if (plan.name === "Free / Starter" || isCurrent) {
      setNotification({
        visible: true,
        type: "warning",
        message:
          "The Free / Starter plan is your default plan with limited features. To access all features, please select a paid plan.",
      });
      setTimeout(() => {
        setNotification({ ...notification, visible: false });
      }, 6000);
      return;
    }
    setSelectedPlan(plan);
    setPaymentMethod("card");
    setReferenceNumber("");
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedPlan(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    const isCurrent = selectedPlan.id === currentPlan.id;

    if (isCurrent) {
      setNotification({
        visible: true,
        type: "warning",
        message: "You are already subscribed to this plan.",
      });
      closePaymentModal();
      return;
    }

    if (paymentMethod === "Access Code" && !referenceNumber.trim()) {
      setNotification({
        visible: true,
        type: "error",
        message: "Please enter a payment reference.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/subscriptions/create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ plan_id: selectedPlan.id }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create subscription.");
      }

      const clientSecret = data.client_secret;

      if (!clientSecret) {
        // Fallback to checkout redirect if server doesn't return client secret
        if (data.checkout_url) {
          await Linking.openURL(data.checkout_url);
          setPaymentModalVisible(false);
          return;
        }
        throw new Error("Payment client secret missing from server response.");
      }

      // Initialize PaymentSheet with the PaymentIntent client secret
      const initResult = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Track My Kid",
      });

      if (initResult.error) {
        throw new Error(
          initResult.error.message || "Failed to init payment sheet",
        );
      }

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        throw new Error(presentResult.error.message || "Payment failed");
      }

      setNotification({
        visible: true,
        type: "success",
        message: "Payment successful! Your subscription has been updated.",
      });
      setPaymentModalVisible(false);
      // Refresh subscription state
      loadSubscriptions();
    } catch (err: any) {
      setNotification({
        visible: true,
        type: "error",
        message: err.message || "Unable to start checkout.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const planPriceLabel = (plan: any) =>
    plan.monthly_price_cents
      ? `R${(plan.monthly_price_cents / 100).toFixed(2)}/mo`
      : "Free";

  const planFeatures = (plan: any) => {
    if (plan.features && Array.isArray(plan.features)) {
      return plan.features;
    }

    if (plan.description) {
      return plan.description.split("\n").filter(Boolean);
    }

    return [
      "No ads, experience a free app",
      "View and manage unlimited documents",
      "All pro tools",
    ];
  };

  const planIconName = (plan: any) => {
    if (!plan.monthly_price_cents || plan.monthly_price_cents === 0) {
      return "auto-awesome";
    }
    if (plan.name?.toLowerCase().includes("year")) {
      return "calendar-month";
    }
    return "trending-up";
  };

  const renderNotification = () => {
    if (!notification.visible) return null;

    return (
      <View
        style={[
          styles.notification,
          notification.type === "success" && styles.notificationSuccess,
          notification.type === "error" && styles.notificationError,
          notification.type === "warning" && styles.notificationWarning,
        ]}
      >
        <Text style={styles.notificationText}>{notification.message}</Text>
        <TouchableOpacity
          onPress={() => setNotification({ ...notification, visible: false })}
        >
          <MaterialIcons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderNotification()}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a plan</Text>
        <Text style={styles.headerSubtitle}>All features, no limit.</Text>
      </View>

      {isStripeTestMode && (
        <View style={styles.testBanner}>
          <MaterialIcons name="info" size={18} color="#111827" />
          <Text style={styles.testBannerText}>
            Test mode — use Stripe test card 4242 4242 4242 4242 (CVC any,
            future expiry). Real cards will fail in test mode.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7ED321" />
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.currentPlanCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentLabel}>Current Plan</Text>
              <View
                style={[styles.currentBadge, currentSubscriptionBadgeStyle]}
              >
                <Text style={styles.currentBadgeText}>
                  {subscriptionStatusLabel(currentSubscriptionStatus)}
                </Text>
              </View>
            </View>
            <View style={styles.currentPlanMeta}>
              <View style={styles.currentPlanIcon}>
                <MaterialIcons name="verified" size={20} color="#2563EB" />
              </View>
              <Text style={styles.currentPlanCaption}>
                {currentSubscriptionLabelText}
              </Text>
            </View>
            <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
            <Text style={styles.currentPlanPrice}>
              {planPriceLabel(currentPlan)}
            </Text>
            <Text style={styles.currentPlanDescription}>
              {currentPlan.description ||
                "This is your current subscription plan."}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Available Plans</Text>
          {plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No subscription plans are available at the moment.
              </Text>
            </View>
          ) : (
            plans.map((plan) => {
              const isCurrent = plan.id === currentPlan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isCurrent && styles.planCardCurrent]}
                  activeOpacity={0.9}
                  onPress={() => openPaymentModal(plan)}
                >
                  <View style={styles.planCardHeader}>
                    <View style={styles.planTitleRow}>
                      <View style={styles.planIconBox}>
                        <MaterialIcons
                          name={planIconName(plan)}
                          size={20}
                          color="#2563EB"
                        />
                      </View>
                      <View>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planPrice}>
                          {planPriceLabel(plan)}
                        </Text>
                      </View>
                    </View>
                    {plan.name === "Standard" && (
                      <View style={styles.planBadgeWithIcon}>
                        <MaterialIcons name="star" size={14} color="#FBBF24" />
                        <Text style={styles.planBadgeText}>Recommended</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.planFeatures}>
                    {planFeatures(plan).map(
                      (feature?: string, index?: number) => (
                        <View
                          key={`${plan.id}-feature-${index}`}
                          style={styles.planFeatureRow}
                        >
                          <MaterialIcons
                            name="check"
                            size={16}
                            color="#7C3AED"
                          />
                          <Text style={styles.planFeatureText}>{feature}</Text>
                        </View>
                      ),
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPlan?.name || "Payment"}
              </Text>
              <TouchableOpacity onPress={closePaymentModal}>
                <MaterialIcons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedPlan?.id === currentPlan.id
                ? "This is your current plan."
                : "Choose a payment method to continue."}
            </Text>

            <View style={styles.paymentMethodRow}>
              {(["card", "Access Code"] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method &&
                      styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <View style={styles.paymentMethodIconRow}>
                    <MaterialIcons
                      name={method === "card" ? "credit-card" : "receipt-long"}
                      size={18}
                      color={paymentMethod === method ? "#1D4ED8" : "#475569"}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method &&
                          styles.paymentMethodTextActive,
                      ]}
                    >
                      {method === "card" ? "Card" : "Access Code"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {selectedPlan?.id !== currentPlan.id && (
              <View style={styles.modalForm}>
                {paymentMethod === "card" ? (
                  <Text style={styles.checkOutMessage}>
                    You will be redirected to a secure Stripe checkout page to
                    complete your payment.
                  </Text>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="Access Code"
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                  />
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedPlan?.id === currentPlan.id &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmPayment}
              disabled={submitting || selectedPlan?.id === currentPlan.id}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {selectedPlan?.id === currentPlan.id
                    ? "Current plan"
                    : "Confirm payment"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D1A",
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#111827",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  backButton: {
    marginBottom: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#1F2937",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 22,
    maxWidth: "90%",
  },
  testBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
  },
  testBannerText: {
    color: "#111827",
    marginLeft: 6,
    flex: 1,
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: "#6B7280",
    fontSize: 15,
  },
  currentPlanCard: {
    backgroundColor: "#111827",
    borderRadius: 26,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  currentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  currentLabel: {
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontSize: 12,
  },
  currentBadge: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  status_active: {
    backgroundColor: "#10B981",
  },
  status_pending: {
    backgroundColor: "#F59E0B",
  },
  status_past_due: {
    backgroundColor: "#EF4444",
  },
  status_canceled: {
    backgroundColor: "#6B7280",
  },
  status_cancelled: {
    backgroundColor: "#6B7280",
  },
  status_trialing: {
    backgroundColor: "#3B82F6",
  },
  currentPlanName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  currentPlanPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#60A5FA",
    marginBottom: 12,
  },
  currentPlanDescription: {
    color: "#CBD5E1",
    lineHeight: 24,
  },
  currentPlanMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  currentPlanIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  currentPlanCaption: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
  planCardCurrent: {
    borderColor: "#2563EB",
    backgroundColor: "#1F2937",
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  planIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  planPrice: {
    fontSize: 15,
    color: "#60A5FA",
    marginTop: 6,
    fontWeight: "700",
  },
  planBadge: {
    backgroundColor: "#4338CA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  planBadgeWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  planDescription: {
    color: "#CBD5E1",
    lineHeight: 22,
  },
  planFeatures: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  planFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  planFeatureText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyStateText: {
    color: "#CBD5E1",
    lineHeight: 22,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 18,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  paymentMethodIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentMethodButtonActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  paymentMethodText: {
    color: "#475569",
    fontWeight: "700",
  },
  paymentMethodTextActive: {
    color: "#1D4ED8",
  },
  modalForm: {
    marginBottom: 20,
  },
  checkOutMessage: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    color: "#111827",
    fontSize: 15,
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 12,
  },
  inlineInput: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  notification: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    margin: 20,
    borderRadius: 18,
  },
  notificationSuccess: {
    backgroundColor: "#D1FAE5",
  },
  notificationError: {
    backgroundColor: "#FEE2E2",
  },
  notificationWarning: {
    backgroundColor: "#FEF3C7",
  },
  notificationText: {
    flex: 1,
    color: "#111827",
    marginRight: 10,
    fontSize: 14,
  },
});
