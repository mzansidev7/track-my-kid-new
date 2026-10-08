import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import AppNotification from "../../../components/Notification";
import { resolveWorkingBaseUrl } from "../../../url";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { useNotifications } from "../ownerHelpers/hooks/useNotifications";
import { useOwnerProfile } from "../ownerHelpers/hooks/useOwnerProfile";
import { useOwnerVehicles } from "../ownerHelpers/hooks/useOwnerVehicles";
import { useActiveRoutes, useRoutes } from "../ownerHelpers/hooks/useRoutes";
import { getRouteStatus } from "../ownerHelpers/actionHelpers/actions";
import { ForceProfileUpdate } from "../ownerHelpers/components/Modals";
import {
  subscribeToPaymentUpdates,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/clientRealtime";

const homeDashboardStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5FAFF",
  },
  brandHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#173F70",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  brandIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#1683F8",
  },
  brandCopy: {
    flex: 1,
    marginLeft: 10,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  brandSubtitle: {
    marginTop: 2,
    color: "#C5D8EC",
    fontSize: 10,
    fontWeight: "500",
  },
  notificationButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  liveMapButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  liveMapScreen: {
    flex: 1,
    backgroundColor: "#F0F6FB",
  },
  liveMapHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#173F70",
  },
  liveMapHeaderButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMapTitle: {
    flex: 1,
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  liveVehicleMarker: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 4,
  },
  liveMapRetry: {
    marginTop: 9,
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "700",
  },
  liveMapContent: {
    flex: 1,
    overflow: "hidden",
  },
  liveMapCanvas: {
    ...StyleSheet.absoluteFill,
  },
  liveMapLegend: {
    position: "absolute",
    top: 12,
    right: 10,
    minWidth: 88,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.96)",
    elevation: 3,
  },
  liveMapLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveMapLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveMapLegendText: {
    color: "#35516B",
    fontSize: 9,
    fontWeight: "600",
  },
  liveMapControls: {
    position: "absolute",
    right: 10,
    top: "35%",
    overflow: "hidden",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    elevation: 3,
  },
  liveMapControlButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMapControlDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D8E2EC",
  },
  liveFleetSummary: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 12,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0EAF2",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.97)",
    elevation: 4,
  },
  liveFleetSummaryIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderRadius: 16,
    backgroundColor: "#E8F8EF",
  },
  liveFleetSummaryCopy: {
    flex: 1,
  },
  liveFleetSummaryTitle: {
    color: "#174574",
    fontSize: 11,
    fontWeight: "800",
  },
  liveFleetSummarySubtitle: {
    marginTop: 2,
    color: "#68829A",
    fontSize: 9,
  },
  liveMapEmpty: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "42%",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  liveMapEmptyText: {
    marginTop: 5,
    color: "#5A7188",
    fontSize: 11,
    textAlign: "center",
  },
  liveMapFilterMenu: {
    position: "absolute",
    top: 12,
    right: 10,
    minWidth: 135,
    padding: 5,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    elevation: 5,
  },
  liveMapFilterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 8,
  },
  liveMapFilterOptionText: {
    flex: 1,
    color: "#35516B",
    fontSize: 10,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greetingCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#A9BED4",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  greetingCopy: {
    flex: 1,
    marginLeft: 11,
  },
  greetingTitle: {
    color: "#164A86",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  greetingSubtitle: {
    maxWidth: 230,
    marginTop: 3,
    color: "#64809C",
    fontSize: 10,
    lineHeight: 14,
  },
  pendingPaymentCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
  },
  pendingPaymentIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
  },
  pendingPaymentCopy: {
    flex: 1,
    minWidth: 0,
  },
  pendingPaymentTitle: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800",
  },
  pendingPaymentSubtitle: {
    marginTop: 3,
    color: "#78350F",
    fontSize: 9,
    lineHeight: 13,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 7,
    marginBottom: 12,
  },
  metricCard: {
    width: "49%",
    minHeight: 103,
    padding: 8,
    borderWidth: 1,
    borderColor: "#D8EAF9",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  metricIcon: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    borderRadius: 14,
  },
  metricLabel: {
    color: "#20517F",
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 1,
    color: "#174574",
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "800",
  },
  metricSubtextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  metricSubtext: {
    flexShrink: 1,
    color: "#159B5A",
    fontSize: 8,
    fontWeight: "600",
  },
  alertSubtext: {
    color: "#DC4545",
  },
  sectionTitle: {
    marginTop: 1,
    marginBottom: 7,
    color: "#174574",
    fontSize: 12,
    fontWeight: "800",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 7,
  },
  actionCard: {
    width: "49%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#D8EAF9",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  actionIcon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#EDF6FF",
  },
  actionLabel: {
    flex: 1,
    marginLeft: 7,
    color: "#20517F",
    fontSize: 9,
    fontWeight: "700",
  },
});

export default function Home({ user }: any) {
  const router = useRouter();
  const mapRef = React.useRef<MapView | null>(null);
  const hasAutoFitLiveMap = React.useRef(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [mapStatusFilter, setMapStatusFilter] = useState<
    "all" | "on_route" | "stopped" | "offline"
  >("all");
  const [liveLocations, setLiveLocations] = useState<
    {
      id: string;
      routeName: string;
      vehicleName: string;
      driverName: string;
      latitude: number | null;
      longitude: number | null;
      status: "on_route" | "stopped" | "offline";
    }[]
  >([]);
  const [liveMapError, setLiveMapError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -1.2921,
    longitude: 36.8219,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [profileNotice, setProfileNotice] = useState({
    visible: false,
    message: "",
    type: "warning" as "warning",
  });

  const { drivers, refreshDrivers } = useDrivers();
  const { owner } = useOwnerProfile();
  const { vehicles, fetchVehicles } = useOwnerVehicles();
  const { allRoutes, refreshRoutes } = useRoutes();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { unreadCount, refreshUnreadCount } = useNotifications();
  // Filter routes into active and inactive
  const activeRoutes = useActiveRoutes(allRoutes);
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

  useEffect(() => {
    if (!owner?.id || !user?.token) return undefined;
    const paymentChannel = subscribeToPaymentUpdates(
      "owner_id",
      owner.id,
      fetchOwnerDashboard,
    );
    return () => {
      void unsubscribeFromRealtime(paymentChannel);
    };
  }, [fetchOwnerDashboard, owner?.id, user?.token]);

  const refreshLiveLocations = useCallback(async () => {
    if (!user?.token) return;

    try {
      const routesToTrack = allRoutes.filter((route: any) => {
        const hasDirectAssignment =
          route.vehicle_id && route.driver_id && route.vehicles && route.drivers;
        const hasRouteAssignment = route.route_assignments?.some(
          (assignment: any) =>
            assignment.vehicle_id &&
            assignment.driver_id &&
            assignment.vehicles &&
            assignment.drivers,
        );
        return hasDirectAssignment || hasRouteAssignment;
      });
      const uniqueRoutes = new Map<string, any>();
      routesToTrack.forEach((route: any) => {
        const assignment = route.route_assignments?.find(
          (item: any) =>
            item.vehicle_id &&
            item.driver_id &&
            item.vehicles &&
            item.drivers,
        );
        const driverId = route.driver_id || assignment?.driver_id;
        if (driverId && !uniqueRoutes.has(String(driverId))) {
          uniqueRoutes.set(String(driverId), {
            ...route,
            trackingDriver:
              route.drivers || assignment?.drivers || null,
            trackingVehicle:
              route.vehicles || assignment?.vehicles || null,
          });
        }
      });

      const baseUrl = await resolveWorkingBaseUrl();
      const locations = await Promise.all(
        Array.from(uniqueRoutes.entries()).map(
          async ([driverId, route]: any) => {
            const driverName =
              route.trackingDriver?.users?.name ||
              route.trackingDriver?.name ||
              "Assigned driver";
            const vehicleName =
              route.trackingVehicle?.name ||
              route.trackingVehicle?.license_plate ||
              "Assigned vehicle";
            const routeName = route.route_name || "Active route";

            try {
              const response = await fetch(
                `${baseUrl}/driver/location/${driverId}`,
                {
                  headers: { Authorization: `Bearer ${user.token}` },
                },
              );
              if (!response.ok) {
                throw new Error(
                  `Location request failed (${response.status}) for ${driverName}`,
                );
              }

              const data = await response.json();
              const latitude = Number(data?.latitude);
              const longitude = Number(data?.longitude);
              const hasCoordinates =
                Number.isFinite(latitude) && Number.isFinite(longitude);
              const recordedAt = data?.recorded_at
                ? new Date(data.recorded_at).getTime()
                : null;
              const ageMs =
                recordedAt != null && Number.isFinite(recordedAt)
                  ? Date.now() - recordedAt
                  : null;
              const isRecent = ageMs != null && ageMs <= 3 * 60 * 1000;
              const isRecentlyStopped =
                ageMs != null && ageMs <= 30 * 60 * 1000;
              const status =
                data?.is_online === true && (isRecent || ageMs == null)
                  ? "on_route"
                  : isRecentlyStopped && hasCoordinates
                    ? "stopped"
                    : "offline";

              return {
                id: driverId,
                routeName,
                vehicleName,
                driverName,
                latitude: hasCoordinates ? latitude : null,
                longitude: hasCoordinates ? longitude : null,
                status,
              } as const;
            } catch (error) {
              console.warn(
                `Unable to load live location for ${driverName}:`,
                error,
              );
              return {
                id: driverId,
                routeName,
                vehicleName,
                driverName,
                latitude: null,
                longitude: null,
                status: "offline",
              } as const;
            }
        }),
      );

      setLiveLocations(locations);
      setLiveMapError(null);
    } catch (error) {
      console.error("Failed to refresh live fleet locations:", error);
      setLiveMapError("Live fleet locations could not be loaded. Try again.");
    }
  }, [allRoutes, user?.token]);

  useEffect(() => {
    if (!showLiveMap) return;
    refreshLiveLocations();
    const interval = setInterval(refreshLiveLocations, 10000);
    return () => clearInterval(interval);
  }, [refreshLiveLocations, showLiveMap]);

  const visibleLiveLocations = useMemo(
    () =>
      liveLocations.filter(
        (location) =>
          mapStatusFilter === "all" || location.status === mapStatusFilter,
      ),
    [liveLocations, mapStatusFilter],
  );
  const mappableLiveLocations = useMemo(
    () =>
      visibleLiveLocations.filter(
        (location): location is typeof location & {
          latitude: number;
          longitude: number;
        } => location.latitude != null && location.longitude != null,
      ),
    [visibleLiveLocations],
  );
  const onlineVehicleCount = liveLocations.filter(
    (location) => location.status === "on_route",
  ).length;

  useEffect(() => {
    if (!showLiveMap) {
      hasAutoFitLiveMap.current = false;
      return;
    }
    if (
      hasAutoFitLiveMap.current ||
      mappableLiveLocations.length === 0
    ) {
      return;
    }
    const coordinates = mappableLiveLocations.map((location) => ({
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        400,
      );
      setMapRegion({
        ...coordinates[0],
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
      hasAutoFitLiveMap.current = true;
      return;
    }
    const latitudes = coordinates.map((coordinate) => coordinate.latitude);
    const longitudes = coordinates.map((coordinate) => coordinate.longitude);
    const fittedRegion = {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      latitudeDelta: Math.max(
        0.04,
        (Math.max(...latitudes) - Math.min(...latitudes)) * 1.6,
      ),
      longitudeDelta: Math.max(
        0.04,
        (Math.max(...longitudes) - Math.min(...longitudes)) * 1.6,
      ),
    };
    setMapRegion(fittedRegion);
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 80, right: 55, bottom: 100, left: 45 },
      animated: true,
    });
    hasAutoFitLiveMap.current = true;
  }, [mappableLiveLocations, showLiveMap]);

  const zoomLiveMap = (direction: "in" | "out") => {
    const factor = direction === "in" ? 0.6 : 1.7;
    const nextRegion = {
      ...mapRegion,
      latitudeDelta: Math.min(80, Math.max(0.005, mapRegion.latitudeDelta * factor)),
      longitudeDelta: Math.min(80, Math.max(0.005, mapRegion.longitudeDelta * factor)),
    };
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  useFocusEffect(
    useCallback(() => {
      refreshDrivers(true);
      refreshRoutes(true);
      refreshUnreadCount();
      fetchVehicles();
      fetchOwnerDashboard();
      const paymentRefreshTimer = setInterval(fetchOwnerDashboard, 30_000);
      return () => clearInterval(paymentRefreshTimer);
    }, [
      fetchVehicles,
      refreshDrivers,
      refreshRoutes,
      refreshUnreadCount,
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

  const totalVehicles =
    dashboardData?.summary?.totalVehicles ?? vehicles?.length ?? 0;

  const totalDrivers =
    dashboardData?.summary?.totalDrivers ??
    (drivers || []).filter(
      (driver) => driver.status === "active" || driver.hasAssignedVehicle,
    ).length;
  const readyRoutes =
    dashboardData?.summary?.readyRoutes ??
    activeRoutes.filter((route: any) => getRouteStatus(route).text === "Ready")
      .length;

  const needsAttentionRoutes =
    dashboardData?.summary?.needsAttentionRoutes ??
    Math.max(activeRoutes.length - readyRoutes, 0);

  const delayedCount = dashboardData?.summary?.delayedCount ?? 0;
  const pendingCashApprovalCount =
    dashboardData?.summary?.pendingCashApprovalCount ?? 0;

  if (shouldForceProfileUpdate) {
    return <ForceProfileUpdate missingOwnerFields={missingOwnerFields} />;
  }

  const dashboardMetrics = [
    {
      label: "Total Vehicles",
      value: totalVehicles,
      subtext: `${vehicles.length} in your fleet`,
      icon: "directions-car",
      color: "#1683F8",
    },
    {
      label: "Active Drivers",
      value: totalDrivers,
      subtext: `${new Set(activeRoutes.map((route: any) => route.driver_id || route.drivers?.id).filter(Boolean)).size} on route`,
      icon: "person",
      color: "#159B5A",
    },
    {
      label: "Active Routes",
      value: activeRoutes.length,
      subtext: `${readyRoutes} ready to go`,
      icon: "alt-route",
      color: "#7C3AED",
    },
    {
      label: "Issues / Alerts",
      value: needsAttentionRoutes,
      subtext: `${delayedCount} delayed`,
      icon: "warning",
      color: "#F28A0A",
    },
  ];
  const quickActions = [
    {
      label: "View Fleet",
      icon: "directions-car",
      color: "#1683F8",
      onPress: () => router.push("/(owner)/(tabs)/vehicles"),
    },
    {
      label: "Create Route",
      icon: "place",
      color: "#1677F8",
      onPress: () => router.push("/(owner)/createRoutes"),
    },
    {
      label: "View Messages",
      icon: "message",
      color: "#1677F8",
      onPress: () => router.push("/(owner)/(tabs)/messages"),
    },
    {
      label: "Reports",
      icon: "analytics",
      color: "#1677F8",
      onPress: () => router.push("/(owner)/incident-report"),
    },
  ];
  const ownerName = String(owner?.name || user?.userData?.name || "there")
    .trim()
    .split(/\s+/)[0];
  const ownerAvatar =
    typeof owner?.avatar === "string" ? owner.avatar : owner?.avatar?.url;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  if (showLiveMap) {
    const filterOptions = [
      { key: "all", label: "All vehicles", color: "#1683F8" },
      { key: "on_route", label: "On Route", color: "#16A66A" },
      { key: "stopped", label: "Stopped", color: "#F59E0B" },
      { key: "offline", label: "Offline", color: "#EF4444" },
    ] as const;

    return (
      <SafeAreaView
        style={homeDashboardStyles.liveMapScreen}
        edges={["top", "bottom"]}
      >
        <View style={homeDashboardStyles.liveMapHeader}>
          <TouchableOpacity
            style={homeDashboardStyles.liveMapHeaderButton}
            onPress={() => setShowLiveMap(false)}
            accessibilityLabel="Back to owner dashboard"
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={homeDashboardStyles.liveMapTitle}>Live Fleet Map</Text>
          <TouchableOpacity
            style={homeDashboardStyles.liveMapHeaderButton}
            onPress={() => setShowMapFilters((visible) => !visible)}
            accessibilityLabel="Filter live fleet markers"
          >
            <MaterialIcons name="filter-list" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={homeDashboardStyles.liveMapContent}>
          <MapView
            ref={mapRef}
            style={homeDashboardStyles.liveMapCanvas}
            initialRegion={mapRegion}
            mapType="standard"
            loadingEnabled
            loadingBackgroundColor="#F0F6FB"
            loadingIndicatorColor="#1769D2"
            showsCompass={false}
            showsTraffic={false}
            toolbarEnabled={false}
          >
            {mappableLiveLocations.map((location) => {
              const color =
                location.status === "on_route"
                  ? "#1683F8"
                  : location.status === "stopped"
                    ? "#F59E0B"
                    : "#EF4444";
              return (
                <Marker
                  key={location.id}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title={location.vehicleName}
                  description={`${location.routeName} · ${location.driverName}`}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View
                    style={[
                      homeDashboardStyles.liveVehicleMarker,
                      { backgroundColor: color },
                    ]}
                  >
                    <MaterialIcons
                      name="directions-car"
                      size={17}
                      color="#FFFFFF"
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {showMapFilters ? (
            <View style={homeDashboardStyles.liveMapFilterMenu}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={homeDashboardStyles.liveMapFilterOption}
                  onPress={() => {
                    setMapStatusFilter(option.key);
                    setShowMapFilters(false);
                  }}
                >
                  <View
                    style={[
                      homeDashboardStyles.liveMapLegendDot,
                      { backgroundColor: option.color },
                    ]}
                  />
                  <Text style={homeDashboardStyles.liveMapFilterOptionText}>
                    {option.label}
                  </Text>
                  {mapStatusFilter === option.key ? (
                    <MaterialIcons
                      name="check"
                      size={15}
                      color="#1683F8"
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={homeDashboardStyles.liveMapLegend}>
              {filterOptions.slice(1).map((option) => (
                <View
                  key={option.key}
                  style={homeDashboardStyles.liveMapLegendRow}
                >
                  <View
                    style={[
                      homeDashboardStyles.liveMapLegendDot,
                      { backgroundColor: option.color },
                    ]}
                  />
                  <Text style={homeDashboardStyles.liveMapLegendText}>
                    {option.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={homeDashboardStyles.liveMapControls}>
            <TouchableOpacity
              style={homeDashboardStyles.liveMapControlButton}
              onPress={() => zoomLiveMap("in")}
              accessibilityLabel="Zoom in"
            >
              <MaterialIcons name="add" size={21} color="#24415D" />
            </TouchableOpacity>
            <View style={homeDashboardStyles.liveMapControlDivider} />
            <TouchableOpacity
              style={homeDashboardStyles.liveMapControlButton}
              onPress={() => zoomLiveMap("out")}
              accessibilityLabel="Zoom out"
            >
              <MaterialIcons name="remove" size={21} color="#24415D" />
            </TouchableOpacity>
            <View style={homeDashboardStyles.liveMapControlDivider} />
            <TouchableOpacity
              style={homeDashboardStyles.liveMapControlButton}
              onPress={() => {
                if (mappableLiveLocations.length === 1) {
                  const location = mappableLiveLocations[0];
                  const region = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  };
                  setMapRegion(region);
                  mapRef.current?.animateToRegion(region, 300);
                } else if (mappableLiveLocations.length > 1) {
                  mapRef.current?.fitToCoordinates(
                    mappableLiveLocations.map((location) => ({
                      latitude: location.latitude,
                      longitude: location.longitude,
                    })),
                    {
                      edgePadding: { top: 80, right: 55, bottom: 100, left: 45 },
                      animated: true,
                    },
                  );
                }
              }}
              accessibilityLabel="Center on fleet"
            >
              <MaterialIcons name="my-location" size={18} color="#24415D" />
            </TouchableOpacity>
          </View>

          {mappableLiveLocations.length === 0 ? (
            <View style={homeDashboardStyles.liveMapEmpty}>
              <MaterialIcons
                name={liveMapError ? "location-off" : "location-searching"}
                size={25}
                color={liveMapError ? "#D97706" : "#1683F8"}
              />
              <Text style={homeDashboardStyles.liveMapEmptyText}>
                {liveMapError ||
                  (liveLocations.length === 0
                    ? "No assigned vehicles are sharing a location right now."
                    : visibleLiveLocations.length === 0
                      ? "No vehicles match this filter."
                      : "No current GPS coordinates are available for these vehicles.")}
              </Text>
              {liveMapError ? (
                <TouchableOpacity onPress={refreshLiveLocations}>
                  <Text style={homeDashboardStyles.liveMapRetry}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={homeDashboardStyles.liveFleetSummary}>
            <View style={homeDashboardStyles.liveFleetSummaryIcon}>
              <MaterialIcons name="wifi" size={19} color="#16A66A" />
            </View>
            <View style={homeDashboardStyles.liveFleetSummaryCopy}>
              <Text style={homeDashboardStyles.liveFleetSummaryTitle}>
                Live Fleet
              </Text>
              <Text style={homeDashboardStyles.liveFleetSummarySubtitle}>
                {onlineVehicleCount}{" "}
                {onlineVehicleCount === 1 ? "vehicle" : "vehicles"} online
                {liveLocations.length > onlineVehicleCount
                  ? ` · ${liveLocations.length - onlineVehicleCount} stopped or offline`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={refreshLiveLocations}
              accessibilityLabel="Refresh live fleet locations"
            >
              <MaterialIcons name="refresh" size={19} color="#68829A" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={homeDashboardStyles.screen} edges={["top", "bottom"]}>
      <View style={homeDashboardStyles.brandHeader}>
        <View style={homeDashboardStyles.brandIcon}>
          <MaterialIcons name="directions-car" size={22} color="#FFFFFF" />
        </View>
        <View style={homeDashboardStyles.brandCopy}>
          <Text style={homeDashboardStyles.brandName}>FleetManager</Text>
          <Text style={homeDashboardStyles.brandSubtitle}>Owner Dashboard</Text>
        </View>
        <TouchableOpacity
          style={homeDashboardStyles.liveMapButton}
          onPress={() => {
            setShowMapFilters(false);
            setShowLiveMap(true);
          }}
          accessibilityLabel="Open live fleet map"
        >
          <MaterialIcons name="map" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={homeDashboardStyles.notificationButton}
          onPress={() => router.push("/(owner)/notifications")}
          accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <MaterialIcons
            name="notifications-none"
            size={22}
            color="#FFFFFF"
          />
          {unreadCount > 0 && (
            <View style={homeDashboardStyles.notificationBadge}>
              <Text style={homeDashboardStyles.notificationBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={homeDashboardStyles.scroll}
        contentContainerStyle={homeDashboardStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={homeDashboardStyles.greetingCard}>
          <View style={homeDashboardStyles.profileAvatar}>
            {ownerAvatar ? (
              <Image
                source={{ uri: ownerAvatar }}
                style={homeDashboardStyles.profileAvatarImage}
              />
            ) : (
              <MaterialIcons name="person" size={30} color="#FFFFFF" />
            )}
          </View>
          <View style={homeDashboardStyles.greetingCopy}>
            <Text style={homeDashboardStyles.greetingTitle}>
              {greeting},{"\n"}
              {ownerName} 👋
            </Text>
            <Text style={homeDashboardStyles.greetingSubtitle}>
              Here&apos;s what&apos;s happening with your fleet today.
            </Text>
          </View>
        </View>

        {pendingCashApprovalCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.82}
            style={homeDashboardStyles.pendingPaymentCard}
            onPress={() => router.push("/(owner)/payments" as never)}
            accessibilityRole="button"
            accessibilityLabel={`${pendingCashApprovalCount} cash payment${pendingCashApprovalCount === 1 ? "" : "s"} waiting for approval. Open payment history.`}
          >
            <View style={homeDashboardStyles.pendingPaymentIcon}>
              <MaterialIcons
                name="hourglass-top"
                size={18}
                color="#B45309"
              />
            </View>
            <View style={homeDashboardStyles.pendingPaymentCopy}>
              <Text style={homeDashboardStyles.pendingPaymentTitle}>
                {pendingCashApprovalCount} cash payment
                {pendingCashApprovalCount === 1 ? "" : "s"} waiting for approval
              </Text>
              <Text style={homeDashboardStyles.pendingPaymentSubtitle}>
                Review reported cash and confirm receipt to update the child&apos;s payment status.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={21} color="#92400E" />
          </TouchableOpacity>
        )}

        <View style={homeDashboardStyles.metricsGrid}>
          {dashboardMetrics.map((metric) => (
            <View
              key={metric.label}
              style={homeDashboardStyles.metricCard}
            >
              <View
                style={[
                  homeDashboardStyles.metricIcon,
                  { backgroundColor: metric.color },
                ]}
              >
                <MaterialIcons
                  name={metric.icon as keyof typeof MaterialIcons.glyphMap}
                  size={19}
                  color="#FFFFFF"
                />
              </View>
              <Text style={homeDashboardStyles.metricLabel}>
                {metric.label}
              </Text>
              <Text style={homeDashboardStyles.metricValue}>
                {metric.value}
              </Text>
              <View style={homeDashboardStyles.metricSubtextRow}>
                <MaterialIcons
                  name={
                    metric.color === "#F28A0A"
                      ? "error-outline"
                      : "check-circle-outline"
                  }
                  size={11}
                  color={metric.color === "#F28A0A" ? "#EF4444" : "#16A66A"}
                />
                <Text
                  style={[
                    homeDashboardStyles.metricSubtext,
                    metric.color === "#F28A0A" &&
                      homeDashboardStyles.alertSubtext,
                  ]}
                  numberOfLines={1}
                >
                  {metric.subtext}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={homeDashboardStyles.sectionTitle}>Quick Actions</Text>
        <View style={homeDashboardStyles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={homeDashboardStyles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.75}
            >
              <View style={homeDashboardStyles.actionIcon}>
                <MaterialIcons
                  name={action.icon as keyof typeof MaterialIcons.glyphMap}
                  size={19}
                  color={action.color}
                />
              </View>
              <Text
                style={homeDashboardStyles.actionLabel}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AppNotification
        visible={profileNotice.visible}
        message={profileNotice.message}
        type={profileNotice.type}
        onHide={() => setProfileNotice({ ...profileNotice, visible: false })}
      />
    </SafeAreaView>
  );

}
