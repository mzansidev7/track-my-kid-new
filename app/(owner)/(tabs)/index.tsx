import { useTheme } from "../../../styles/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import AppNotification from "../../../components/Notification";
import { resolveWorkingBaseUrl } from "../../../url";
import CustomMap from "../../../components/map";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { useNotifications } from "../ownerHelpers/hooks/useNotifications";
import { useOwnerProfile } from "../ownerHelpers/hooks/useOwnerProfile";
import { useOwnerVehicles } from "../ownerHelpers/hooks/useOwnerVehicles";
import { useActiveRoutes, useRoutes } from "../ownerHelpers/hooks/useRoutes";
import { useOwnerStyles } from "../ownerHelpers/styles/ownerStyles";
import { useSubscription } from "@/context/subscriptionContext/SubscriptionContext";
import {
  formatDateTime,
  getRouteStatus,
  getWeeklyTripsAndRevenueData,
} from "../ownerHelpers/actionHelpers/actions";
import RenderMetricCard from "../ownerHelpers/components/RenderMetricCard";
import { ForceProfileUpdate } from "../ownerHelpers/components/Modals";

export default function Home({ user }: any) {
  const router = useRouter();
  const styles = useOwnerStyles();
  const { colors, shadows } = useTheme();

  const { subscription } = useSubscription();
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [profileNotice, setProfileNotice] = useState({
    visible: false,
    message: "",
    type: "warning" as "warning",
  });

  const { drivers, refreshDrivers } = useDrivers();
  const { owner } = useOwnerProfile();
  const { vehicles, fetchVehicles } = useOwnerVehicles();
  const { allRoutes, loadingRoutes, refreshRoutes } = useRoutes();
  const [startedHistories, setStartedHistories] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { unreadCount, refreshUnreadCount } = useNotifications();
  // Filter routes into active and inactive
  const activeRoutes = useActiveRoutes(allRoutes);
  const { weeklyTrips, revenueTrend } =
    getWeeklyTripsAndRevenueData(dashboardData);

  const fetchOwnerRouteHistory = useCallback(async () => {
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const resp = await fetch(`${baseUrl}/owner/route-history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: user?.token ? `Bearer ${user.token}` : "",
        },
      });

      if (!resp.ok) {
        setStartedHistories([]);
        return;
      }

      const data = await resp.json();
      // Keep only started entries
      const started = (data || []).filter((h: any) => h.status === "started");
      setStartedHistories(started || []);
    } catch (err) {
      console.warn("Failed fetching owner route history:", err);
      setStartedHistories([]);
    }
  }, [user?.token]);

  const fetchOwnerDashboard = useCallback(async () => {
    if (!user?.token) {
      setDashboardData(null);
      return;
    }

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const resp = await fetch(`${baseUrl}/owner/dashboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!resp.ok) {
        setDashboardData(null);
        return;
      }

      const data = await resp.json();
      setDashboardData(data || null);
    } catch (err) {
      console.warn("Failed fetching owner dashboard:", err);
      setDashboardData(null);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      refreshDrivers(true);
      refreshRoutes(true);
      refreshUnreadCount();
      fetchVehicles();
      fetchOwnerRouteHistory();
      fetchOwnerDashboard();
    }, [
      fetchVehicles,
      refreshDrivers,
      refreshRoutes,
      refreshUnreadCount,
      fetchOwnerRouteHistory,
      fetchOwnerDashboard,
    ]),
  );

  const hasValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return JSON.stringify(value) !== "{}" && JSON.stringify(value) !== "null";
    }

    return true;
  };

  const missingOwnerFields = useMemo(() => {
    const fields: string[] = [];

    if (!hasValue(owner?.company_name)) {
      fields.push("company name");
    }

    if (!hasValue(owner?.identity_number)) {
      fields.push("identity number");
    }

    if (!hasValue(owner?.address)) {
      fields.push("address");
    }

    return fields;
  }, [owner]);

  const isProfileOverdue = useMemo(() => {
    if (!owner?.created_at) {
      return false;
    }

    const createdAt = new Date(owner.created_at).getTime();
    if (Number.isNaN(createdAt)) {
      return false;
    }

    return Date.now() - createdAt >= 1000 * 60 * 60 * 24 * 90;
  }, [owner?.created_at]);

  const shouldForceProfileUpdate =
    isProfileOverdue && missingOwnerFields.length > 0;

  useEffect(() => {
    if (!owner) {
      return;
    }

    if (shouldForceProfileUpdate) {
      setProfileNotice({
        visible: true,
        message: `Your profile needs updating. Missing: ${missingOwnerFields.join(", ")}.`,
        type: "warning",
      });
      return;
    }

    if (missingOwnerFields.length > 0) {
      setProfileNotice({
        visible: true,
        message: `Complete your owner profile: ${missingOwnerFields.join(", ")}.`,
        type: "warning",
      });
      return;
    }

    setProfileNotice({
      visible: false,
      message: "",
      type: "warning",
    });
  }, [owner, missingOwnerFields, shouldForceProfileUpdate]);

  const fleetMarkers = (activeRoutes || [])
    .map((route: any, index: any) => {
      const rawRoute = route?.raw || route || {};
      const latitude = Number(
        rawRoute.start_latitude ?? rawRoute.end_latitude ?? null,
      );
      const longitude = Number(
        rawRoute.start_longitude ?? rawRoute.end_longitude ?? null,
      );

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        id: route.id || `route-${index}`,
        coordinate: { latitude, longitude },
        title: route?.vehicles?.name || `Route ${index + 1}`,
        color: index % 2 === 0 ? "#4F46E5" : "#22C55E",
      };
    })
    .filter(
      (marker: any): marker is NonNullable<typeof marker> => marker !== null,
    );

  const mapRegion = fleetMarkers.length
    ? (() => {
        const latitudes = fleetMarkers.map(
          (marker: any) => marker.coordinate.latitude,
        );
        const longitudes = fleetMarkers.map(
          (marker: any) => marker.coordinate.longitude,
        );
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        return {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.8),
          longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.8),
        };
      })()
    : {
        latitude: -1.2921,
        longitude: 36.8219,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

  const renderRoute = ({ item }: any) => {
    const driverName = item.drivers?.users?.name || "No Driver";
    const studentCount = item.route_children?.length || 0;

    const status = getRouteStatus(item);

    return (
      <TouchableOpacity
        style={[
          styles.routeItem,
          {
            shadowColor: shadows.md.shadowColor,
            backgroundColor: colors.surface,
          },
        ]}
        onPress={() => router.push(`/(owner)/route-details?routeId=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.routeItemContent}>
          <View style={styles.routeItemLeft}>
            <Text style={[styles.routeName, { color: colors.text.primary }]}>
              {item.route_name || item.vehicles?.name || "Route"}
            </Text>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MaterialIcons name="person" size={15} color="#2563EB" />
              <Text
                style={[styles.routeDriver, { color: colors.text.secondary }]}
              >
                {driverName}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MaterialIcons name="school" size={15} color="#F5A623" />
              <Text
                style={[styles.routeStudents, { color: colors.text.secondary }]}
              >
                {studentCount} students
              </Text>
            </View>
          </View>
          <View style={styles.routeItemRight}>
            <View
              style={[styles.statusBadge, { backgroundColor: status.bgColor }]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            {/* Placeholder for ETA */}
            {status.text === "Ready" && (
              <Text style={[styles.routeEta, { color: colors.text.secondary }]}>
                ETA 5 min
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalVehicles =
    dashboardData?.summary?.totalVehicles ?? vehicles?.length ?? 0;

  const totalDrivers =
    dashboardData?.summary?.totalDrivers ??
    (drivers || []).filter(
      (driver) => driver.status === "active" || driver.hasAssignedVehicle,
    ).length;
  const totalStudents =
    dashboardData?.summary?.totalStudents ??
    (allRoutes || []).reduce(
      (total, route) => total + (route.route_children?.length || 0),
      0,
    );

  const estimatedRevenue =
    dashboardData?.summary?.estimatedRevenueCents ??
    (allRoutes || []).reduce(
      (total, route) =>
        total +
        (route.per_child_amount_cents || 0) *
          (route.route_children?.length || 0),
      0,
    );

  console.log({ totalVehicles });

  const formatCurrency = (amountInCents: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amountInCents / 100);

  const readyRoutes =
    dashboardData?.summary?.readyRoutes ??
    activeRoutes.filter((route: any) => getRouteStatus(route).text === "Ready")
      .length;

  const needsAttentionRoutes =
    dashboardData?.summary?.needsAttentionRoutes ??
    activeRoutes.length - readyRoutes;

  const onScheduleCount =
    dashboardData?.summary?.onScheduleCount ?? readyRoutes;

  const delayedCount = dashboardData?.summary?.delayedCount ?? 0;

  if (shouldForceProfileUpdate) {
    return <ForceProfileUpdate missingOwnerFields={missingOwnerFields} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, marginTop: 10 },
        ]}
      >
        <View style={[styles.headerTop, { marginTop: 12 }]}>
          <View>
            <Text style={[styles.headerDate, { color: colors.text.primary }]}>
              {formatDateTime()}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.push("/(owner)/incident-report" as never)}
              accessibilityLabel="Report an incident"
              style={{ marginRight: 14 }}
            >
              <MaterialIcons
                name="report-problem"
                size={23}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                router.push("/(owner)/notifications");
              }}
              style={{ position: "relative" }}
            >
              <MaterialIcons
                name="notifications-none"
                size={24}
                color={colors.text.primary}
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -6,
                    backgroundColor: "#EF4444",
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
            // onPress={() => router.push("/(owner)/profile")}
            >
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primaryDark },
                ]}
              >
                <Text
                  style={[styles.avatarText, { color: colors.text.primary }]}
                >
                  T
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <AppNotification
        visible={profileNotice.visible}
        message={profileNotice.message}
        type={profileNotice.type}
        onHide={() => setProfileNotice({ ...profileNotice, visible: false })}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards */}
        <View style={styles.metricsSection}>
          <View style={styles.metricsRow}>
            <RenderMetricCard
              icon="directions-car"
              label="Total Vehicles"
              value={totalVehicles.toString()}
              subtext={`${activeRoutes.length} routes assigned`}
              color="#4A90E2"
            />
            <RenderMetricCard
              icon="people"
              label="Active Drivers"
              value={totalDrivers.toString()}
              subtext={`${drivers.length} drivers on record`}
              color="#22C55E"
            />
          </View>
          <View style={styles.metricsRow}>
            <RenderMetricCard
              icon="school"
              label="Students Today"
              value={totalStudents.toString()}
              subtext={`${activeRoutes.length} routes with students`}
              color="#7C3AED"
            />
            <RenderMetricCard
              icon="attach-money"
              label="Revenue Estimate"
              value={formatCurrency(estimatedRevenue)}
              subtext={`${totalStudents} students across routes`}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Live Fleet Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Live Fleet Tracking
            </Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText]}>
                {fleetMarkers.length > 0
                  ? `${fleetMarkers.length} live`
                  : "No live routes"}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.mapPlaceholder,
              {
                backgroundColor: colors.surface,
                shadowColor: shadows.md.shadowColor,
              },
            ]}
          >
            <View style={styles.mapHeader}>
              <View>
                <Text
                  style={[
                    styles.mapHeaderTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Live Fleet Overview
                </Text>
                <Text
                  style={[
                    styles.mapHeaderSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  {fleetMarkers.length > 0
                    ? `${fleetMarkers.length} active route${fleetMarkers.length > 1 ? "s" : ""}`
                    : "No route coordinates available"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mapPill}
                onPress={() => setIsMapExpanded(true)}
                activeOpacity={0.8}
              >
                <View style={styles.liveDot} />
                <Text style={styles.mapPillText}>Open map</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsMapExpanded(true)}
            >
              {startedHistories && startedHistories.length > 0 ? (
                (() => {
                  const markers = startedHistories
                    .map((h) => {
                      const updates = Array.isArray(h.location_updates)
                        ? h.location_updates
                        : [];
                      const last =
                        updates.length > 0 ? updates[updates.length - 1] : null;
                      const lat =
                        last?.latitude ??
                        last?.lat ??
                        h?.route_snapshot?.start_latitude ??
                        null;
                      const lon =
                        last?.longitude ??
                        last?.lon ??
                        h?.route_snapshot?.start_longitude ??
                        null;
                      if (
                        !Number.isFinite(Number(lat)) ||
                        !Number.isFinite(Number(lon))
                      )
                        return null;
                      return { lat: Number(lat), lon: Number(lon) };
                    })
                    .filter(
                      (m): m is { lat: number; lon: number } => m != null,
                    );

                  if (markers.length === 0) {
                    return (
                      <CustomMap
                        markers={fleetMarkers.map((m: any) => ({
                          latitude: m.coordinate.latitude,
                          longitude: m.coordinate.longitude,
                          title: m.title,
                        }))}
                        style={styles.mapCanvas}
                      />
                    );
                  }

                  const first = markers[0];
                  const last = markers[markers.length - 1];
                  return (
                    <View>
                      <CustomMap
                        markers={markers.map((m) => ({
                          latitude: m.lat,
                          longitude: m.lon,
                        }))}
                        origin={{ latitude: first.lat, longitude: first.lon }}
                        destination={
                          markers.length > 1
                            ? { latitude: last.lat, longitude: last.lon }
                            : undefined
                        }
                        style={styles.mapCanvas}
                      />
                      <View style={{ padding: 8 }}>
                        {markers.map((m, idx) => (
                          <Text
                            key={idx}
                            style={{ color: colors.text.secondary }}
                          >
                            Route {idx + 1}: {m.lat.toFixed(6)},{" "}
                            {m.lon.toFixed(6)}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })()
              ) : (
                <CustomMap
                  markers={fleetMarkers.map((m: any) => ({
                    latitude: m.coordinate.latitude,
                    longitude: m.coordinate.longitude,
                    title: m.title,
                  }))}
                  origin={
                    fleetMarkers.length > 0
                      ? fleetMarkers[0].coordinate
                      : undefined
                  }
                  destination={
                    fleetMarkers.length > 1
                      ? fleetMarkers[fleetMarkers.length - 1].coordinate
                      : undefined
                  }
                  style={styles.mapCanvas}
                />
              )}
            </TouchableOpacity>

            <View style={styles.mapFooter}>
              <View style={styles.mapStat}>
                <Text
                  style={[styles.mapStatValue, { color: colors.text.primary }]}
                >
                  {onScheduleCount}
                </Text>
                <Text
                  style={[styles.mapStatLabel, { color: colors.text.tertiary }]}
                >
                  On schedule
                </Text>
              </View>
              <View style={styles.mapStat}>
                <Text
                  style={[styles.mapStatValue, { color: colors.text.primary }]}
                >
                  {delayedCount}
                </Text>
                <Text
                  style={[styles.mapStatLabel, { color: colors.text.tertiary }]}
                >
                  Delayed
                </Text>
              </View>
              <View style={styles.mapStat}>
                <Text
                  style={[styles.mapStatValue, { color: colors.text.primary }]}
                >
                  {needsAttentionRoutes}
                </Text>
                <Text
                  style={[styles.mapStatLabel, { color: colors.text.tertiary }]}
                >
                  Needs attention
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Active Routes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Active Routes
            </Text>
            <View
              style={[
                styles.routeBadge,
                { flexDirection: "row", alignItems: "center", gap: 6 },
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor:
                      activeRoutes.length > 0 ? "#0284C7" : "#CCC",
                  },
                ]}
              />
              <Text style={[styles.routeBadgeText]}>
                {activeRoutes.length > 0
                  ? `${activeRoutes.length} live`
                  : "No live routes"}
              </Text>
            </View>
          </View>
          {loadingRoutes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2B81FF" />
            </View>
          ) : activeRoutes.length > 0 ? (
            <FlatList
              data={activeRoutes.slice(0, 5)}
              renderItem={renderRoute}
              keyExtractor={(item, index) => item.id || `route-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="route" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No active routes</Text>
            </View>
          )}
        </View>

        {/* Weekly Trips Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Weekly Trips
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendDotMorning} />
                <Text
                  style={[styles.legendText, { color: colors.text.tertiary }]}
                >
                  Morning
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendDotAfternoon} />
                <Text
                  style={[styles.legendText, { color: colors.text.tertiary }]}
                >
                  Afternoon
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Morning vs afternoon routes</Text>
          <View
            style={[
              styles.chartContainer,
              {
                backgroundColor: colors.surface,
                shadowColor: shadows.md.shadowColor,
              },
            ]}
          >
            <View style={styles.chartBarsRow}>
              {weeklyTrips.map((item: any) => (
                <View key={item.day} style={styles.chartColumn}>
                  <View style={styles.barStack}>
                    <View
                      style={[
                        styles.bar,
                        styles.morningBar,
                        { height: item.morning * 10 },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.afternoonBar,
                        { height: item.afternoon * 10 },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.dayLabel, { color: colors.text.tertiary }]}
                  >
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Revenue Trend Chart */}
        <View style={[styles.section, { marginBottom: 80 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Revenue Trend
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendDotMorning} />
                <Text
                  style={[styles.legendText, { color: colors.text.tertiary }]}
                >
                  Actual
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendDotAfternoon} />
                <Text
                  style={[styles.legendText, { color: colors.text.tertiary }]}
                >
                  Target
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Actual vs target (KSh)</Text>
          <View
            style={[
              styles.chartContainer,
              {
                backgroundColor: colors.surface,
                shadowColor: shadows.md.shadowColor,
              },
            ]}
          >
            <View style={styles.revenueChartRow}>
              {revenueTrend.map((item: any) => (
                <View key={item.month} style={styles.revenueChartColumn}>
                  <View style={styles.revenueBarStack}>
                    <View
                      style={[
                        styles.revenueBar,
                        styles.actualBar,
                        { height: item.actual * 1.2 },
                      ]}
                    />
                    <View
                      style={[
                        styles.revenueBar,
                        styles.targetBar,
                        { height: item.target * 1.2 },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.dayLabel, { color: colors.text.tertiary }]}
                  >
                    {item.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isMapExpanded}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsMapExpanded(false)}
      >
        <View style={styles.fullScreenMapContainer}>
          <View style={styles.fullScreenMapHeader}>
            <Text
              style={[
                styles.fullScreenMapTitle,
                { color: colors.text.primary },
              ]}
            >
              Live Fleet Map
            </Text>
            <TouchableOpacity onPress={() => setIsMapExpanded(false)}>
              <Text style={styles.fullScreenMapClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <MapView
            style={styles.fullScreenMap}
            initialRegion={mapRegion}
            showsCompass={false}
            showsScale={false}
            showsTraffic={false}
          >
            {fleetMarkers.map((marker: any) => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinate}
                title={marker.title}
              >
                <View
                  style={[styles.mapPin, { backgroundColor: marker.color }]}
                />
              </Marker>
            ))}
          </MapView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
