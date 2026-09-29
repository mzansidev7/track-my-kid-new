import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminDashboard } from "../../../adminHelpers/hooks/useAdminDashboard";
import { useAdminProfile } from "../../../adminHelpers/hooks/useAdminProfile";
import { useTheme } from "../../../styles/theme";

const formatTime = (value?: string) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const metricCards = [
  {
    key: "users",
    label: "Platform users",
    icon: "people-outline",
    color: "#2563EB",
  },
  { key: "schools", label: "Schools", icon: "school", color: "#7C3AED" },
  { key: "children", label: "Students", icon: "child-care", color: "#0891B2" },
  {
    key: "drivers",
    label: "Drivers",
    icon: "person-outline",
    color: "#D97706",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    icon: "directions-bus",
    color: "#059669",
  },
  { key: "routes", label: "Routes", icon: "alt-route", color: "#DB2777" },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    admin,
    loading: profileLoading,
    error: profileError,
    refreshAdmin,
  } = useAdminProfile();
  const { data, loading, refreshing, error, refresh } = useAdminDashboard();
  const metrics = data.metrics;
  const adminName =
    admin?.display_name || admin?.name || "Platform administrator";
  const offlineVehicles = Math.max(
    0,
    metrics.vehicles - metrics.activeVehicles,
  );
  const hasAlerts =
    metrics.openTickets > 0 || metrics.openIncidents > 0 || offlineVehicles > 0;

  const retry = async () => {
    await Promise.all([refreshAdmin(), refresh()]);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PLATFORM OPERATIONS</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Admin dashboard
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Welcome, {adminName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void refresh()}
            disabled={refreshing}
            accessibilityLabel="Refresh dashboard"
          >
            {refreshing ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <MaterialIcons name="refresh" size={22} color="#2563EB" />
            )}
          </TouchableOpacity>
        </View>

        {error || profileError ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>
                Could not load current Admin data
              </Text>
              <Text style={styles.errorText}>{error || profileError}</Text>
            </View>
            <TouchableOpacity onPress={() => void retry()}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !data.generatedAt ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.subtitle}>Loading platform metrics…</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              {metricCards.map((metric) => (
                <View
                  key={metric.key}
                  style={[
                    styles.metricCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.metricIcon,
                      { backgroundColor: `${metric.color}18` },
                    ]}
                  >
                    <MaterialIcons
                      name={metric.icon as any}
                      size={21}
                      color={metric.color}
                    />
                  </View>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text
                    style={[styles.metricValue, { color: colors.text.primary }]}
                  >
                    {metrics[metric.key].toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.operationsCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Needs attention
              </Text>
              {hasAlerts ? (
                <>
                  {metrics.openTickets > 0 && (
                    <TouchableOpacity
                      style={styles.alertRow}
                      onPress={() => router.push("/(admin)/(tabs)/support")}
                    >
                      <View
                        style={[
                          styles.alertIcon,
                          { backgroundColor: "#FEF2F2" },
                        ]}
                      >
                        <MaterialIcons
                          name="support-agent"
                          size={20}
                          color="#DC2626"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>
                          Support tickets need attention
                        </Text>
                        <Text style={styles.alertSub}>
                          {metrics.openTickets} open or in-progress tickets
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  )}
                  {metrics.openIncidents > 0 && (
                    <View style={styles.alertRow}>
                      <View
                        style={[
                          styles.alertIcon,
                          { backgroundColor: "#FFF7ED" },
                        ]}
                      >
                        <MaterialIcons
                          name="report-problem"
                          size={20}
                          color="#EA580C"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>
                          Incident reports are open
                        </Text>
                        <Text style={styles.alertSub}>
                          {metrics.openIncidents} reports require review
                        </Text>
                      </View>
                    </View>
                  )}
                  {offlineVehicles > 0 && (
                    <TouchableOpacity
                      style={styles.alertRow}
                      onPress={() => router.push("/(admin)/(tabs)/live")}
                    >
                      <View
                        style={[
                          styles.alertIcon,
                          { backgroundColor: "#EFF6FF" },
                        ]}
                      >
                        <MaterialIcons
                          name="directions-bus"
                          size={20}
                          color="#2563EB"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>
                          Vehicles not currently active
                        </Text>
                        <Text style={styles.alertSub}>
                          {offlineVehicles} of {metrics.vehicles} vehicles are
                          not in an active tracking session
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.clearState}>
                  <MaterialIcons
                    name="check-circle"
                    size={22}
                    color="#059669"
                  />
                  <Text style={styles.alertSub}>
                    No open tickets or incidents, and all vehicles have active
                    sessions.
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.operationsCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.sectionHeading}>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Live operations
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(admin)/(tabs)/live")}
                >
                  <Text style={styles.link}>View trips</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.liveSummary}>
                <MaterialIcons name="location-on" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveNumber}>{metrics.liveTrips}</Text>
                  <Text style={styles.alertSub}>
                    active tracking sessions now
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => router.push("/(admin)/(tabs)/live")}
                >
                  <Text style={styles.smallButtonText}>Open live</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.operationsCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.sectionHeading}>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Recent platform activity
                </Text>
                <Text style={styles.updated}>
                  {data.generatedAt
                    ? `Updated ${formatTime(data.generatedAt)}`
                    : ""}
                </Text>
              </View>
              {data.recentActivity.length ? (
                data.recentActivity.map((item) => {
                  const profile = Array.isArray(item.users)
                    ? item.users[0]
                    : item.users;
                  return (
                    <View key={item.id} style={styles.activityRow}>
                      <View style={styles.activityDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle}>{item.action}</Text>
                        <Text style={styles.alertSub}>
                          {profile?.name || profile?.email || "System"}
                          {item.entity_type
                            ? ` · ${item.entity_type.replaceAll("_", " ")}`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.activityTime}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.empty}>
                  No platform activity has been recorded yet.
                </Text>
              )}
            </View>
          </>
        )}
        {(loading || profileLoading) && (
          <Text style={styles.footer}>
            Loading verified platform administrator…
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type AdminDashboardStyles = {
  safe: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  kicker: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  refreshButton: ViewStyle;
  metricsGrid: ViewStyle;
  metricCard: ViewStyle;
  metricIcon: ViewStyle;
  metricLabel: TextStyle;
  metricValue: TextStyle;
  operationsCard: ViewStyle;
  sectionHeading: ViewStyle;
  sectionTitle: TextStyle;
  link: TextStyle;
  alertRow: ViewStyle;
  alertIcon: ViewStyle;
  alertTitle: TextStyle;
  alertSub: TextStyle;
  clearState: ViewStyle;
  liveSummary: ViewStyle;
  liveNumber: TextStyle;
  smallButton: ViewStyle;
  smallButtonText: TextStyle;
  activityRow: ViewStyle;
  activityDot: ViewStyle;
  activityTitle: TextStyle;
  activityTime: TextStyle;
  updated: TextStyle;
  empty: TextStyle;
  loading: ViewStyle;
  errorCard: ViewStyle;
  errorTitle: TextStyle;
  errorText: TextStyle;
  retry: TextStyle;
  footer: TextStyle;
};

const styles = StyleSheet.create<AdminDashboardStyles>({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  kicker: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { fontSize: 25, fontWeight: "900", marginTop: 4 },
  subtitle: { fontSize: 12, marginTop: 4 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 116,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E6EAF0",
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 23, fontWeight: "900", marginTop: 3 },
  operationsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    padding: 14,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  link: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { color: "#1E293B", fontSize: 12, fontWeight: "700" },
  alertSub: { color: "#64748B", fontSize: 10, lineHeight: 15, marginTop: 3 },
  clearState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 8,
  },
  liveSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  liveNumber: { color: "#0F172A", fontSize: 22, fontWeight: "900" },
  smallButton: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  smallButtonText: { color: "#047857", fontSize: 11, fontWeight: "800" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  activityTitle: { color: "#1E293B", fontSize: 11, fontWeight: "700" },
  activityTime: {
    color: "#94A3B8",
    fontSize: 9,
    maxWidth: 94,
    textAlign: "right",
  },
  updated: { color: "#94A3B8", fontSize: 9, flexShrink: 1, textAlign: "right" },
  empty: { color: "#64748B", fontSize: 11, paddingVertical: 14 },
  loading: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
  },
  errorTitle: { color: "#991B1B", fontSize: 11, fontWeight: "800" },
  errorText: { color: "#B91C1C", fontSize: 10, marginTop: 3 },
  retry: { color: "#B91C1C", fontWeight: "800", fontSize: 11 },
  footer: { color: "#94A3B8", fontSize: 9, textAlign: "center" },
});
