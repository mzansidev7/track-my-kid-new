import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

type WorkflowSummary = {
  summary: {
    dispatches: number;
    complianceDocuments: number;
    clientEnrollments: number;
    pricingAgreements: number;
    invoices: number;
    refunds: number;
    reconciliations: number;
  };
  recent: {
    dispatches: any[];
    complianceDocuments: any[];
    clientEnrollments: any[];
    pricingAgreements: any[];
    invoices: any[];
    refunds: any[];
    reconciliations: any[];
  };
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

const formatCurrency = (cents?: number | null) => {
  if (typeof cents !== "number") return "R0.00";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
};

const getWorkflowCategoryConfig = (summary?: WorkflowSummary) => [
  {
    key: "dispatches",
    title: "Dispatches",
    icon: "local-shipping" as const,
    count: summary?.summary.dispatches ?? 0,
    items: summary?.recent.dispatches ?? [],
    emptyText: "No dispatches created yet",
    accent: "#2563EB",
  },
  {
    key: "complianceDocuments",
    title: "Compliance",
    icon: "verified-user" as const,
    count: summary?.summary.complianceDocuments ?? 0,
    items: summary?.recent.complianceDocuments ?? [],
    emptyText: "No compliance items yet",
    accent: "#7C3AED",
  },
  {
    key: "clientEnrollments",
    title: "Client Enrollments",
    icon: "groups" as const,
    count: summary?.summary.clientEnrollments ?? 0,
    items: summary?.recent.clientEnrollments ?? [],
    emptyText: "No client enrollments yet",
    accent: "#10B981",
  },
  {
    key: "pricingAgreements",
    title: "Pricing Agreements",
    icon: "payments" as const,
    count: summary?.summary.pricingAgreements ?? 0,
    items: summary?.recent.pricingAgreements ?? [],
    emptyText: "No pricing agreements yet",
    accent: "#F59E0B",
  },
  {
    key: "invoices",
    title: "Invoices",
    icon: "receipt-long" as const,
    count: summary?.summary.invoices ?? 0,
    items: summary?.recent.invoices ?? [],
    emptyText: "No invoices created yet",
    accent: "#EF4444",
  },
  {
    key: "refunds",
    title: "Refunds",
    icon: "currency-exchange" as const,
    count: summary?.summary.refunds ?? 0,
    items: summary?.recent.refunds ?? [],
    emptyText: "No refund requests yet",
    accent: "#F97316",
  },
  {
    key: "reconciliations",
    title: "Reconciliations",
    icon: "account-balance" as const,
    count: summary?.summary.reconciliations ?? 0,
    items: summary?.recent.reconciliations ?? [],
    emptyText: "No reconciliations yet",
    accent: "#0EA5E9",
  },
];

const getSectionPrimaryText = (sectionKey: string, item: any) => {
  switch (sectionKey) {
    case "dispatches":
      return item.dispatch_label || `Dispatch ${item.id?.slice(0, 8) || ""}`;
    case "complianceDocuments":
      return item.title || item.document_type || "Compliance item";
    case "clientEnrollments":
      return item.clients?.users?.name || "Client enrollment";
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

const getSectionSecondaryText = (sectionKey: string, item: any) => {
  switch (sectionKey) {
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

const OwnerWorkflows = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const { renderHeader } = useOwnerPageHeader({
    title: "Operations Center",
    subtitle: "Dispatches, compliance, billing, and client workflows",
    onBackPress: () => router.push("/"),
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/owner/workflows/summary`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch workflow summary");
        }

        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.warn("Failed loading workflow summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user?.token]);

  const categories = useMemo(
    () => getWorkflowCategoryConfig(summary ?? undefined),
    [summary],
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading workflow overview...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryGrid}>
            {categories.map((category) => (
              <View key={category.key} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${category.accent}22` },
                    ]}
                  >
                    <MaterialIcons
                      name={category.icon}
                      size={18}
                      color={category.accent}
                    />
                  </View>
                  <Text style={styles.summaryTitle}>{category.title}</Text>
                </View>
                <Text style={styles.summaryCount}>{category.count}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionsContainer}>
            {categories.map((category) => (
              <View key={category.key} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{category.title}</Text>
                  <TouchableOpacity
                    style={styles.sectionAction}
                    onPress={() =>
                      router.push({
                        pathname: "/(owner)/workflows/[category]",
                        params: { category: category.key },
                      })
                    }
                  >
                    <Text style={styles.sectionActionText}>View all</Text>
                  </TouchableOpacity>
                </View>

                {category.items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {category.emptyText}
                    </Text>
                  </View>
                ) : (
                  category.items.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View
                        style={[
                          styles.listDot,
                          { backgroundColor: category.accent },
                        ]}
                      />
                      <View style={styles.listItemTextWrap}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {getSectionPrimaryText(category.key, item)}
                        </Text>
                        <Text style={styles.listItemMeta} numberOfLines={2}>
                          {getSectionSecondaryText(category.key, item)}
                        </Text>
                        <Text style={styles.listItemDate}>
                          {formatDate(
                            item.created_at ||
                              item.dispatch_date ||
                              item.expires_at ||
                              item.start_date ||
                              item.issued_at,
                          )}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default OwnerWorkflows;

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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryCount: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111827",
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
    marginRight: 10,
  },
  listItemTextWrap: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  listItemMeta: {
    fontSize: 12,
    color: "#475569",
  },
  listItemDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
  },
});
