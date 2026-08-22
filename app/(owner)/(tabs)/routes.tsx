import { useOwnerPageHeader } from "../ownerHelpers/hooks/useOwnerPageHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoutes } from "../ownerHelpers/hooks/useRoutes";
import { TimePreference } from "../../../store/asyncStorage/timePreferences.asyncStore";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const Routes = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { routes, loadingRoutes, refreshRoutes, timePreferences } = useRoutes();

  const activeRoutesCount = routes?.length || 0;

  const { renderHeader } = useOwnerPageHeader({
    title: "Route Management",
    subtitle: `${activeRoutesCount} active route${activeRoutesCount !== 1 ? "s" : ""}`,
    actionLabel: "Create New Route",
    onActionPress: () => router.push("/(owner)/createRoutes"),
    onBackPress: () => router.push("/"),
  });

  const formatTime = (value: string | null | undefined) => {
    if (!value) return "--";

    const normalized = String(value).trim();

    const timeOnlyMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const hour24 = parseInt(timeOnlyMatch[1], 10);
      const minutes = timeOnlyMatch[2];
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? "PM" : "AM";
      return `${hour12}:${minutes} ${ampm}`;
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTimeOnly = (value: string | null | undefined) => {
    if (!value) return null;
    const normalized = String(value).trim();
    const timeOnlyMatch = normalized.match(/(\d{1,2}:\d{2})(?::\d{2})?$/);
    if (timeOnlyMatch) return timeOnlyMatch[1];
    try {
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return null;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return null;
    }
  };

  const formatPreferenceScope = (scope?: string | null) => {
    if (!scope) return null;
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  };

  const getPreferenceScopeForTime = (
    value: string | null | undefined,
    routeId?: string | number | null,
    routeScope?: string | null,
  ) => {
    const scopeFromRoute = routeScope?.trim();
    if (scopeFromRoute) return scopeFromRoute;

    const normalizedRouteId = routeId != null ? String(routeId).trim() : "";
    const timeOnly = getTimeOnly(value);
    if (!timeOnly && !normalizedRouteId) return null;
    const today = new Date().toISOString().split("T")[0];

    if (normalizedRouteId) {
      const byRoute = timePrefs.find(
        (p) =>
          String(p.routeId ?? "") === normalizedRouteId &&
          (!p.expiryDate || p.expiryDate >= today),
      );
      if (byRoute) return byRoute.scope;
    }

    if (!timeOnly) return null;

    const pref = timePrefs.find(
      (p) => p.time === timeOnly && (!p.expiryDate || p.expiryDate >= today),
    );
    return pref ? pref.scope : null;
  };

  // Use time preferences provided by `useRoutes`
  const timePrefs = timePreferences || [];

  const formatTimeWindow = (
    start: string | null | undefined,
    end: string | null | undefined,
  ) => {
    if (!start && !end) return "--";
    if (!start) return formatTime(end);
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const calculateDuration = (
    start: string | null | undefined,
    end: string | null | undefined,
  ) => {
    if (!start || !end) return "--";
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      return "--";
    const minutes = Math.max(
      0,
      Math.round((endDate.getTime() - startDate.getTime()) / 60000),
    );
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}h ${remainder}m` : `${remainder} min`;
  };

  const confirmDeleteRoute = (routeId: string) => {
    Alert.alert(
      "Delete Route",
      "Are you sure you want to delete this route? This will unlink the assigned vehicle from the route.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRoute(routeId),
        },
      ],
    );
  };

  const deleteRoute = async (routeId: string) => {
    if (!user?.token) return;
    const normalizedRouteId = String(routeId || "").trim();
    console.log("[Owner Routes] deleteRoute called", {
      routeId,
      normalizedRouteId,
      tokenPresent: !!user?.token,
    });
    if (!normalizedRouteId) {
      Alert.alert("Delete failed", "Invalid route identifier.");
      return;
    }

    const routeIdParam = encodeURIComponent(normalizedRouteId);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/routes/${routeIdParam}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      console.log("[Owner Routes] deleteRoute response", {
        routeId: normalizedRouteId,
        status: response.status,
        ok: response.ok,
        data,
      });
      if (response.ok) {
        refreshRoutes();
      } else {
        Alert.alert("Delete failed", data.error || "Could not delete route.");
      }
    } catch (err) {
      console.error("Error deleting route:", err);
      Alert.alert("Delete failed", "Could not delete route.");
    }
  };

  const renderRoute = ({ item }: any) => {
    const routeId =
      item.id || item.route_id || item.routeId || item?.raw?.id || "";
    const routeName =
      item.route_name || (routeId ? `Route ${routeId}` : "Route");
    const routeAssignmentsCount = Array.isArray(item.route_assignments)
      ? item.route_assignments.length
      : 0;
    const hasMultipleVehicles = routeAssignmentsCount > 1;
    const routeOwner = item.drivers?.users?.name || "No Driver";
    const licensePlate = item.vehicles?.license_plate || "No Plate";
    const students = item.route_children?.length || 0;
    const stops = item.route_stops?.length || 0;
    const duration = calculateDuration(
      item.pickup_start_time || item.departure_time,
      item.dropoff_end_time || item.dropoff_start_time,
    );
    const routePreferenceScope = getPreferenceScopeForTime(
      item.departure_time || item.pickup_start_time,
      item.id ?? item.route_id ?? item.routeId,
      item.time_scope ||
        item.timeScope ||
        item.raw?.time_scope ||
        item.raw?.timeScope,
    );

    return (
      <View style={styles.routeCard}>
        <View style={styles.routeCardHeaderRow}>
          <View style={styles.routeInfoMain}>
            <View style={styles.routeIconCircle}>
              <MaterialIcons name="location-on" size={24} color="#FFF" />
            </View>
            <View style={styles.routeTitleGroup}>
              <Text style={styles.routeTitle}>{routeName}</Text>
              <Text style={styles.routeSubtitle} numberOfLines={1}>
                {hasMultipleVehicles
                  ? `${routeAssignmentsCount} vehicles`
                  : `${routeOwner} • ${licensePlate}`}
              </Text>
            </View>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        <View style={styles.routeStatsRow}>
          <View style={styles.routeStatCard}>
            <View style={styles.routeStatTop}>
              <MaterialIcons name="school" size={16} color="#7C3AED" />
              <Text style={styles.routeStatLabel}>Students</Text>
            </View>
            <Text style={styles.routeStatValue}>{students}</Text>
          </View>
          <View style={styles.routeStatCard}>
            <View style={styles.routeStatTop}>
              <MaterialIcons name="place" size={16} color="#7C3AED" />
              <Text style={styles.routeStatLabel}>Stops</Text>
            </View>
            <Text style={styles.routeStatValue}>{stops}</Text>
          </View>
        </View>

        <View style={styles.routeSummaryRow}>
          <View style={styles.routeSummaryItem}>
            <View style={styles.routeSummaryLabelRow}>
              <MaterialIcons
                name="schedule"
                size={14}
                color="#6B7280"
                style={styles.routeSummaryIcon}
              />
              <Text style={styles.routeSummaryLabel}>Pickup Window</Text>
            </View>
            <Text style={styles.routeSummaryValue}>
              {formatTimeWindow(item.pickup_start_time, item.pickup_end_time)}
            </Text>
          </View>
          <View style={styles.routeSummaryItem}>
            <View style={styles.routeSummaryLabelRow}>
              <MaterialIcons
                name="access-time"
                size={14}
                color="#6B7280"
                style={styles.routeSummaryIcon}
              />
              <Text style={styles.routeSummaryLabel}>Drop-off Window</Text>
            </View>
            <Text style={styles.routeSummaryValue}>
              {formatTimeWindow(item.dropoff_start_time, item.dropoff_end_time)}
            </Text>
          </View>
          <View style={styles.routeSummaryItem}>
            <View style={styles.routeSummaryLabelRow}>
              <MaterialIcons
                name="timer"
                size={14}
                color="#6B7280"
                style={styles.routeSummaryIcon}
              />
              <Text style={styles.routeSummaryLabel}>Duration</Text>
            </View>
            <Text style={styles.routeSummaryValue}>{duration}</Text>
          </View>
          <View style={styles.routeSummaryItem}>
            <View style={styles.routeSummaryLabelRow}>
              <MaterialIcons
                name="event"
                size={14}
                color="#6B7280"
                style={styles.routeSummaryIcon}
              />
              <Text style={styles.routeSummaryLabel}>Departure</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.routeSummaryValue}>
                {formatTime(item.departure_time || item.pickup_start_time)}
              </Text>
              {routePreferenceScope ? (
                <Text style={styles.routePrefLabel}>
                  {formatPreferenceScope(routePreferenceScope)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.routeActionsRow}>
          <TouchableOpacity
            style={[styles.routeActionButton, styles.routeActionPrimary]}
            activeOpacity={0.75}
            onPress={() =>
              routeId &&
              router.push(
                `/(owner)/route-details?routeId=${encodeURIComponent(routeId)}`,
              )
            }
            disabled={!routeId}
          >
            <MaterialIcons name="near-me" size={18} color="#111827" />
            <Text style={styles.routeActionText}>Track</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={[styles.routeActionButton, styles.routeActionPrimary]}
            activeOpacity={0.75}
            onPress={() =>
              router.push(`/(owner)/route-details?routeId=${item.id}`)
            }
          >
            <MaterialIcons name="edit" size={18} color="#111827" />
            <Text style={styles.routeActionText}>Edit</Text>
          </TouchableOpacity> */}
          {routeId ? (
            <TouchableOpacity
              style={[styles.routeActionButton, styles.routeActionDelete]}
              activeOpacity={0.75}
              onPress={() => confirmDeleteRoute(String(routeId))}
            >
              <MaterialIcons name="delete" size={18} color="#EF4444" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routeList}>
          {loadingRoutes ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          ) : routes && routes.length > 0 ? (
            <FlatList
              data={routes}
              renderItem={renderRoute}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="route" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No active routes yet</Text>
              <Text style={styles.emptyText}>
                Create a new route to start managing your fleet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  pageHeader: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  createRouteWrapper: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  createRouteButtonLarge: {
    backgroundColor: "#A855F7",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  createRouteButtonLargeText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  routeList: {
    paddingBottom: 20,
    paddingTop: 20,
  },
  routeCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  routeCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  routeInfoMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  routeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  routeTitleGroup: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  activeBadge: {
    backgroundColor: "#10B981",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  routeStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  routeStatCard: {
    flex: 1,
    backgroundColor: "#F6F3FF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 88,
  },
  routeStatTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  routeStatLabel: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  routeStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  routeSummaryRow: {
    marginBottom: 18,
  },
  routeSummaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  routeSummaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeSummaryIcon: {
    marginRight: 4,
  },
  routeSummaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  routeSummaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  routePrefLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  routeActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  routeActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  routeActionPrimary: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  routeActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  routeActionDelete: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 14,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 18,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default Routes;
