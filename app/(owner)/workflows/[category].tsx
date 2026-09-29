import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useOwnerPageHeader } from "../ownerHelpers/hooks/useOwnerPageHeader";
import { resolveWorkingBaseUrl } from "../../../url";

type RouteCategoryKey =
  | "dispatches"
  | "complianceDocuments"
  | "clientEnrollments"
  | "pricingAgreements"
  | "invoices"
  | "refunds"
  | "reconciliations";

type CategoryConfig = {
  key: RouteCategoryKey;
  title: string;
  endpoint: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
};

const CATEGORY_CONFIG: Record<RouteCategoryKey, CategoryConfig> = {
  dispatches: {
    key: "dispatches",
    title: "Dispatches",
    endpoint: "dispatches",
    icon: "local-shipping",
    accent: "#2563EB",
  },
  complianceDocuments: {
    key: "complianceDocuments",
    title: "Compliance",
    endpoint: "compliance",
    icon: "verified-user",
    accent: "#7C3AED",
  },
  clientEnrollments: {
    key: "clientEnrollments",
    title: "Client Enrollments",
    endpoint: "client-enrollments",
    icon: "groups",
    accent: "#10B981",
  },
  pricingAgreements: {
    key: "pricingAgreements",
    title: "Pricing Agreements",
    endpoint: "pricing-agreements",
    icon: "payments",
    accent: "#F59E0B",
  },
  invoices: {
    key: "invoices",
    title: "Invoices",
    endpoint: "invoices",
    icon: "receipt-long",
    accent: "#EF4444",
  },
  refunds: {
    key: "refunds",
    title: "Refunds",
    endpoint: "refunds",
    icon: "currency-exchange",
    accent: "#F97316",
  },
  reconciliations: {
    key: "reconciliations",
    title: "Reconciliations",
    endpoint: "reconciliations",
    icon: "account-balance",
    accent: "#0EA5E9",
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number") return "R0.00";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value / 100);
};

const getItemPrimaryText = (categoryKey: RouteCategoryKey, item: any) => {
  switch (categoryKey) {
    case "dispatches":
      return item.dispatch_label || `Dispatch ${item.id?.slice(0, 8) || ""}`;
    case "complianceDocuments":
      return item.title || item.document_type || "Compliance item";
    case "clientEnrollments":
      return (
        item.clients?.users?.name || item.client_name || "Client enrollment"
      );
    case "pricingAgreements":
      return item.agreement_name || "Pricing agreement";
    case "invoices":
      return item.invoice_number || "Invoice";
    case "refunds":
      return item.reason || "Refund request";
    case "reconciliations":
      return item.batch_reference || "Reconciliation";
    default:
      return "Record";
  }
};

const getItemSecondaryText = (categoryKey: RouteCategoryKey, item: any) => {
  switch (categoryKey) {
    case "dispatches":
      return `${item.status || "scheduled"} • ${item.routes?.route_name || "No route"}`;
    case "complianceDocuments":
      return `${item.status || "pending"} • ${item.expires_at ? formatDate(item.expires_at) : "No expiry"}`;
    case "clientEnrollments":
      return `${item.status || "active"} • ${item.routes?.route_name || "No route"}`;
    case "pricingAgreements":
      return `${item.billing_cycle || "monthly"} • ${formatCurrency(item.amount_cents)}`;
    case "invoices":
      return `${item.status || "draft"} • ${formatCurrency(item.amount_cents)}`;
    case "refunds":
      return `${item.status || "requested"} • ${formatCurrency(item.amount_cents)}`;
    case "reconciliations":
      return `${item.status || "pending"} • ${formatCurrency(item.amount_cents)}`;
    default:
      return "";
  }
};

const OwnerWorkflowCategoryDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { user } = useContext(AuthContext);

  const categoryParam =
    typeof params.category === "string" ? params.category : "dispatches";

  const config =
    CATEGORY_CONFIG[categoryParam as RouteCategoryKey] ||
    CATEGORY_CONFIG.dispatches;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { renderHeader } = useOwnerPageHeader({
    title: config.title,
    subtitle: `Manage ${config.title.toLowerCase()} for this owner account`,
    actionLabel: `New ${config.title}`,
    onBackPress: () => router.push("/(owner)/workflows"),
    onActionPress: () =>
      router.push({
        pathname: "/(owner)/workflow-form",
        params: { category: config.key },
      }),
  });

  useEffect(() => {
    const fetchCategoryItems = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/owner/workflows/${config.endpoint}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${config.title}`);
        }

        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn(`Failed loading ${config.title}:`, error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryItems();
  }, [config.endpoint, config.title, user?.token]);

  const emptyText = useMemo(() => {
    switch (config.key) {
      case "dispatches":
        return "No dispatches created yet.";
      case "complianceDocuments":
        return "No compliance items yet.";
      case "clientEnrollments":
        return "No client enrollments yet.";
      case "pricingAgreements":
        return "No pricing agreements yet.";
      case "invoices":
        return "No invoices created yet.";
      case "refunds":
        return "No refund requests yet.";
      case "reconciliations":
        return "No reconciliations yet.";
      default:
        return "No records found.";
    }
  }, [config.key]);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={config.accent} />
          <Text style={styles.loadingText}>Loading {config.title}...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${config.accent}22` },
                ]}
              >
                <MaterialIcons
                  name={config.icon}
                  size={18}
                  color={config.accent}
                />
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryTitle}>{config.title}</Text>
                <Text style={styles.summaryMeta}>{items.length} record(s)</Text>
              </View>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{emptyText}</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(owner)/workflow-form",
                      params: {
                        category: config.key,
                        mode: "edit",
                        item: JSON.stringify(item),
                      },
                    })
                  }
                >
                  <View
                    style={[styles.listDot, { backgroundColor: config.accent }]}
                  />
                  <View style={styles.listBody}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {getItemPrimaryText(config.key, item)}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={2}>
                      {getItemSecondaryText(config.key, item)}
                    </Text>
                    <Text style={styles.itemDate}>
                      {formatDate(
                        item.created_at ||
                          item.dispatch_date ||
                          item.expires_at ||
                          item.start_date ||
                          item.issued_at ||
                          item.effective_date,
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default OwnerWorkflowCategoryDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyStateText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  listDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 8,
    marginRight: 10,
  },
  listBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: "#64748B",
  },
});
