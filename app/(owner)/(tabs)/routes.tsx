import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useOwnerTheme } from "../../../styles/theme";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoutes } from "@/app-support/owner/ownerHelpers/hooks/useRoutes";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const Routes = () => {
  const router = useRouter();
  const { getBrandColors } = useOwnerTheme();
  const ownerColors = getBrandColors("owner");
  const { user } = useContext(AuthContext);
  const { allRoutes, loadingRoutes, refreshRoutes, timePreferences } =
    useRoutes();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showStatusFilters, setShowStatusFilters] = useState(false);
  const statusOptions = ["All", "Active", "Inactive", "Upcoming", "Completed"] as const;

  const getRouteStatus = (route: any) => {
    const status = String(
      route.status || route.raw?.status || route.display_status || "",
    ).toLowerCase();
    if (
      status.includes("complete") ||
      status.includes("finished") ||
      status.includes("closed")
    ) {
      return "Completed";
    }
    if (
      status.includes("upcoming") ||
      status.includes("planned") ||
      status.includes("scheduled")
    ) {
      return "Upcoming";
    }
    if (status.includes("inactive")) {
      return "Inactive";
    }
    if (status.includes("active") || status.includes("in progress")) {
      return "Active";
    }

    return route.route_assignments?.length || route.driver_id
      ? "Active"
      : "Upcoming";
  };

  const allRouteItems = Array.isArray(allRoutes) ? allRoutes : [];
  const routeCounts = {
    All: allRouteItems.length,
    Active: allRouteItems.filter(
      (route: any) => getRouteStatus(route) === "Active",
    ).length,
    Inactive: allRouteItems.filter(
      (route: any) => getRouteStatus(route) === "Inactive",
    ).length,
    Upcoming: allRouteItems.filter(
      (route: any) => getRouteStatus(route) === "Upcoming",
    ).length,
    Completed: allRouteItems.filter(
      (route: any) => getRouteStatus(route) === "Completed",
    ).length,
  };
  const query = searchQuery.trim().toLowerCase();
  const filteredRoutes = allRouteItems.filter((route: any) => {
    const matchesStatus =
      statusFilter === "All" || getRouteStatus(route) === statusFilter;
    const matchesQuery =
      !query ||
      [
        route.route_name,
        route.raw?.route_name,
        route.start_location,
        route.end_location,
        route.drivers?.users?.name,
        route.vehicles?.license_plate,
        getRouteStatus(route),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    return matchesStatus && matchesQuery;
  });

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

  const calculateDuration = (
    start: string | null | undefined,
    end: string | null | undefined,
  ) => {
    if (!start || !end) return "--";
    const parseTime = (value: string) => {
      const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!match) return null;
      return Number(match[1]) * 60 + Number(match[2]);
    };
    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    let minutes: number;
    if (startMinutes != null && endMinutes != null) {
      minutes = endMinutes - startMinutes;
      if (minutes < 0) minutes += 24 * 60;
    } else {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
        return "--";
      minutes = Math.max(
        0,
        Math.round((endDate.getTime() - startDate.getTime()) / 60000),
      );
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours} h ${remainder} min` : `${remainder} min`;
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

  const renderRoute = (item: any) => {
    const routeId =
      item.id || item.route_id || item.routeId || item?.raw?.id || "";
    const routeName = item.route_name || item.raw?.route_name || "Route";
    const startLocation = item.start_location || item.raw?.start_location || "";
    const endLocation = item.end_location || item.raw?.end_location || "";
    const status = getRouteStatus(item);
    const assignedDriver =
      item.drivers?.users?.name ||
      item.route_assignments?.[0]?.drivers?.users?.name ||
      "No driver";
    const assignedVehicle =
      item.vehicles?.license_plate ||
      item.route_assignments?.[0]?.vehicles?.license_plate ||
      "No vehicle";
    const distance =
      item.distance_km ??
      item.estimated_distance_km ??
      item.raw?.distance_km ??
      item.raw?.estimated_distance_km;
    const duration =
      item.estimated_duration ||
      calculateDuration(
        item.pickup_start_time || item.departure_time,
        item.dropoff_end_time || item.dropoff_start_time,
      );
    const routePreferenceScope = getPreferenceScopeForTime(
      item.departure_time || item.pickup_start_time,
      routeId,
      item.time_scope || item.timeScope || item.raw?.time_scope,
    );

    return (
      <View style={styles.routeCard}>
        <TouchableOpacity
          style={styles.routeMainTap}
          activeOpacity={0.84}
          disabled={!routeId}
          onPress={() =>
            routeId &&
            router.push({
              pathname: "/(owner)/route-details",
              params: { routeId: String(routeId) },
            })
          }
        >
          <View style={styles.routeIconCircle}>
            <MaterialIcons name="alt-route" size={20} color="#35D9B3" />
          </View>
          <View style={styles.routeCardContent}>
            <View style={styles.routeTitleRow}>
              <Text style={styles.routeTitle} numberOfLines={1}>
                {startLocation && endLocation
                  ? `${startLocation} → ${endLocation}`
                  : routeName}
              </Text>
              <Text
                style={[
                  styles.statusBadge,
                  status === "Active"
                    ? styles.statusActive
                    : status === "Completed"
                      ? styles.statusCompleted
                      : status === "Inactive"
                        ? styles.statusInactive
                      : styles.statusUpcoming,
                ]}
              >
                {status}
              </Text>
            </View>
            <Text style={styles.routeSubtitle} numberOfLines={1}>
              {startLocation && endLocation
                ? `${assignedDriver}  ·  ${assignedVehicle}`
                : routeName}
            </Text>
            <View style={styles.routeMetaRow}>
              {distance != null ? (
                <>
                  <MaterialIcons name="place" size={12} color="#82968D" />
                  <Text style={styles.routeMetaText}>{distance} km</Text>
                  <Text style={styles.metaDivider}>|</Text>
                </>
              ) : null}
              <MaterialIcons name="schedule" size={12} color="#82968D" />
              <Text style={styles.routeMetaText}>{duration}</Text>
              {routePreferenceScope ? (
                <>
                  <Text style={styles.metaDivider}>|</Text>
                  <Text style={styles.routeMetaText}>
                    {formatPreferenceScope(routePreferenceScope)}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() =>
            Alert.alert(routeName, "Choose a route action", [
              {
                text: "View Route",
                onPress: () =>
                  routeId &&
                  router.push({
                    pathname: "/(owner)/route-details",
                    params: { routeId: String(routeId) },
                  }),
              },
              ...(routeId
                ? [
                    {
                      text: "Delete Route",
                      style: "destructive" as const,
                      onPress: () => confirmDeleteRoute(String(routeId)),
                    },
                  ]
                : []),
              { text: "Cancel", style: "cancel" as const },
            ])
          }
          accessibilityLabel={`Actions for ${routeName}`}
        >
          <MaterialIcons name="more-vert" size={19} color="#56718D" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.pageHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/(owner)/(tabs)")}
            accessibilityLabel="Open owner home"
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Route Management</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowStatusFilters(true)}
            accessibilityLabel={`Filter routes by status. Current filter: ${statusFilter}`}
          >
            <MaterialIcons name="filter-list" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={18} color="#82968D" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search routes by name, destination or status..."
          placeholderTextColor="#8A9DB1"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search routes"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            accessibilityLabel="Clear route search"
          >
            <MaterialIcons name="close" size={18} color="#B1C4BC" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showStatusFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusFilters(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <View>
                <Text style={styles.filterModalTitle}>Filter routes</Text>
                <Text style={styles.filterModalSubtitle}>
                  Choose a route status to display
                </Text>
              </View>
              <TouchableOpacity
                style={styles.filterModalClose}
                onPress={() => setShowStatusFilters(false)}
                accessibilityLabel="Close route filters"
              >
                <MaterialIcons name="close" size={20} color="#5D7186" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterOptions}>
              {statusOptions.map((status) => {
                const selected = statusFilter === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      selected && styles.filterOptionSelected,
                    ]}
                    onPress={() => {
                      setStatusFilter(status);
                      setShowStatusFilters(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          selected && styles.filterOptionLabelSelected,
                        ]}
                      >
                        {status}
                      </Text>
                      <Text style={styles.filterOptionCount}>
                        {routeCounts[status]}{" "}
                        {routeCounts[status] === 1 ? "route" : "routes"}
                      </Text>
                    </View>
                    {selected ? (
                      <MaterialIcons
                        name="check-circle"
                        size={21}
                        color="#35D9B3"
                      />
                    ) : (
                      <View style={styles.filterOptionRadio} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        style={styles.routeList}
        contentContainerStyle={styles.scrollContent}
        data={loadingRoutes ? [] : filteredRoutes}
        keyExtractor={(route: any, index) =>
          String(route.id || route.route_id || route.routeId || index)
        }
        renderItem={({ item }: { item: any }) => renderRoute(item)}
        ListEmptyComponent={
          loadingRoutes ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={ownerColors.primary} />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="alt-route" size={27} color="#35D9B3" />
              </View>
              <Text style={styles.emptyTitle}>
                {allRouteItems.length === 0
                  ? "No routes yet"
                  : "No matching routes"}
              </Text>
              <Text style={styles.emptyText}>
                {allRouteItems.length === 0
                  ? "Create a new route to start managing your fleet."
                  : "Try another search or status filter."}
              </Text>
              {allRouteItems.length > 0 && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery("");
                    setStatusFilter("All");
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.createRouteButton}
        activeOpacity={0.85}
        onPress={() => router.push("/(owner)/createRoutes")}
      >
        <MaterialIcons name="add" size={19} color="#FFFFFF" />
        <Text style={styles.createRouteButtonText}>Create New Route</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050907",
  },
  headerSafeArea: {
    backgroundColor: "#050907",
  },
  pageHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 12,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  searchContainer: {
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 10,
    backgroundColor: "#0D1713",
    borderWidth: 1,
    borderColor: "#294238",
    borderRadius: 9,
  },
  searchInput: {
    flex: 1,
    color: "#F4FBF8",
    fontSize: 11,
    paddingVertical: 7,
  },
  routeList: {
    flex: 1,
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(13, 31, 51, 0.48)",
  },
  filterModalCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  filterModalTitle: {
    color: "#F4FBF8",
    fontSize: 18,
    fontWeight: "700",
  },
  filterModalSubtitle: {
    marginTop: 3,
    color: "#B1C4BC",
    fontSize: 12,
  },
  filterModalClose: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#13231D",
  },
  filterOptions: {
    gap: 7,
  },
  filterOption: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#294238",
    borderRadius: 12,
    backgroundColor: "#0D1713",
  },
  filterOptionSelected: {
    borderColor: "#9CC6F3",
    backgroundColor: "#13231D",
  },
  filterOptionLabel: {
    color: "#F4FBF8",
    fontSize: 14,
    fontWeight: "600",
  },
  filterOptionLabelSelected: {
    color: "#35D9B3",
  },
  filterOptionCount: {
    marginTop: 2,
    color: "#B1C4BC",
    fontSize: 11,
  },
  filterOptionRadio: {
    width: 19,
    height: 19,
    borderWidth: 1.5,
    borderColor: "#294238",
    borderRadius: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 6,
  },
  routeCard: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
  },
  routeMainTap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  routeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#13231D",
    alignItems: "center",
    justifyContent: "center",
  },
  routeCardContent: {
    flex: 1,
    minWidth: 0,
  },
  routeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  routeTitle: {
    flex: 1,
    color: "#F4FBF8",
    fontSize: 10,
    fontWeight: "700",
  },
  routeSubtitle: {
    color: "#B1C4BC",
    fontSize: 8,
    marginTop: 1,
  },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8,
    fontWeight: "600",
  },
  statusActive: {
    color: "#35D9B3",
    backgroundColor: "#13231D",
  },
  statusInactive: {
    color: "#B1C4BC",
    backgroundColor: "#13231D",
  },
  statusUpcoming: {
    color: "#35D9B3",
    backgroundColor: "#13231D",
  },
  statusCompleted: {
    color: "#B1C4BC",
    backgroundColor: "#13231D",
  },
  moreButton: {
    width: 20,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  routeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  routeMetaText: {
    color: "#82968D",
    fontSize: 8,
  },
  metaDivider: {
    color: "#B1C4BC",
    fontSize: 8,
    marginHorizontal: 3,
  },
  createRouteButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginHorizontal: 12,
    marginTop: 1,
    marginBottom: 5,
    borderRadius: 9,
    backgroundColor: "#00B894",
  },
  createRouteButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  loadingState: {
    paddingVertical: 36,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 12,
    color: "#B1C4BC",
    marginTop: 10,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#13231D",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F4FBF8",
    marginTop: 12,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 11,
    color: "#B1C4BC",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 280,
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#13231D",
  },
  clearFiltersText: {
    color: "#35D9B3",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default Routes;
