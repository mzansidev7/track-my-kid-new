import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AppNotification from "../../../../components/Notification";
import ClientHeader from "../../components/ClientHeader";
import {
  Child,
  useChildren,
} from "@/app-support/client/clientHelpers/hooks/useChildren";
import { useClientProfile } from "@/app-support/client/clientHelpers/hooks/useClientProfile";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { CLIENT_COLORS } from "../../../../styles/theme";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  subscribeToRouteStopUpdates,
  unsubscribeFromRealtime,
} from "../../../../store/subscriptions/clientRealtime";
import {
  getTodayRouteStops,
  isStopBoardedToday,
  isStopCompletedToday,
} from "@/app-support/client/clientHelpers/utils/routeStops";

const getLocalDateKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const formatTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return value;
};

const formatLastLocation = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const isLongOffline = (value?: string | null, timestamp = Date.now()) => {
  const recordedAt = new Date(value || "").getTime();
  return Number.isFinite(recordedAt) && timestamp - recordedAt >= 10 * 60_000;
};

const hasAssignedVehicle = (child: Child) =>
  Boolean(child.vehicle_id || child.vehicle?.id);

type RouteStop = {
  route_id?: string;
  stop_type?: "pickup" | "dropoff";
  status?: "pending" | "in_progress" | "completed" | "skipped";
  schedule_date?: string | null;
  status_updated_at?: string | null;
  boarded_at?: string | null;
  handoff_verified_at?: string | null;
};

const toMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getNextScheduledRouteNote = (
  child: Child,
  now: Date,
  pickupMinutes: number | null,
  dropoffMinutes: number | null,
  dropoffStop: RouteStop | undefined,
) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const formatTripTime = (date: Date, minutes: number, label: string) => {
    const scheduled = new Date(date);
    scheduled.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return `Next trip: ${label} at ${scheduled.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  if (
    dropoffMinutes !== null &&
    dropoffMinutes > currentMinutes &&
    !isStopCompletedToday(dropoffStop, now)
  ) {
    return formatTripTime(now, dropoffMinutes, "today");
  }

  const operatingDays = child.route?.operating_days?.length
    ? new Set(child.route.operating_days)
    : new Set([1, 2, 3, 4, 5]);
  const nextPickupMinutes = pickupMinutes ?? dropoffMinutes;
  if (nextPickupMinutes === null) return "Next trip is not scheduled";

  for (let offset = 1; offset <= 14; offset += 1) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + offset);
    if (
      operatingDays.has(nextDate.getDay()) &&
      !child.absence_dates?.includes(getLocalDateKey(nextDate))
    ) {
      return formatTripTime(nextDate, nextPickupMinutes, "next scheduled day");
    }
  }
  return "Next trip is not scheduled";
};

const deriveChildStatus = (
  child: Child,
  stops: RouteStop[] = [],
  timestamp = Date.now(),
  trackingState?: {
    isTracking: boolean;
    isOnline: boolean;
    recordedAt: string | null;
  },
) => {
  const route = child.route;
  if (!route || !hasAssignedVehicle(child)) {
    return {
      label: "Upcoming",
      accent: CLIENT_COLORS.textMuted,
      note: "Awaiting vehicle assignment",
    };
  }

  const now = new Date(timestamp);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const pickupStart = route.pickup_start_time || route.departure_time;
  const pickupStartMinutes = toMinutes(pickupStart);
  const pickupEndMinutes = toMinutes(route.pickup_end_time);
  const dropoffStartMinutes = toMinutes(route.dropoff_start_time);
  const dropoffEndMinutes = toMinutes(route.dropoff_end_time);
  const pickupStop = stops.find((stop) => stop.stop_type === "pickup");
  const dropoffStop = stops.find((stop) => stop.stop_type === "dropoff");
  const isDropoffFinished =
    isStopCompletedToday(dropoffStop, now) &&
    Boolean(dropoffStop?.handoff_verified_at);
  const isPickupCompleteToday = isStopCompletedToday(pickupStop, now);
  const boardedToday =
    isPickupCompleteToday || isStopBoardedToday(dropoffStop, now);
  const activeStop = stops.find((stop) => stop.status === "in_progress");
  const inPickupWindow =
    pickupStartMinutes !== null &&
    !["completed", "skipped"].includes(pickupStop?.status || "") &&
    currentMinutes >= pickupStartMinutes &&
    (pickupEndMinutes === null || currentMinutes <= pickupEndMinutes);
  const inDropoffWindow =
    dropoffStartMinutes !== null &&
    !["completed", "skipped"].includes(dropoffStop?.status || "") &&
    currentMinutes >= dropoffStartMinutes &&
    (dropoffEndMinutes === null || currentMinutes <= dropoffEndMinutes);

  if (isDropoffFinished) {
    return {
      label: "Completed",
      accent: CLIENT_COLORS.textMuted,
      note: "Today's trip is complete",
    };
  }

  if (boardedToday) {
    if (dropoffStop?.status === "in_progress") {
      return {
        label: "Arrived at Destination",
        accent: CLIENT_COLORS.success,
        note: "Driver arrived · verified handoff pending",
      };
    }
    const lastLocation = formatLastLocation(trackingState?.recordedAt);
    const longOffline = isLongOffline(trackingState?.recordedAt, timestamp);
    return {
      label: "On a Trip",
      accent: CLIENT_COLORS.success,
      note:
        trackingState?.isTracking && !trackingState.isOnline
          ? `${longOffline ? "Warning · no driver location for 10+ min" : "Trip active · driver connection lost"}${lastLocation ? ` · last location ${lastLocation}` : ""}`
          : inPickupWindow
            ? "Picked up · on the way to school"
            : "Picked up · on the way home",
    };
  }

  if (activeStop) {
    const lastLocation = formatLastLocation(trackingState?.recordedAt);
    const longOffline = isLongOffline(trackingState?.recordedAt, timestamp);
    return {
      label: "Driver Arrived",
      accent: CLIENT_COLORS.warning,
      note:
        trackingState?.isTracking && !trackingState.isOnline
          ? `${longOffline ? "Warning · no driver location for 10+ min" : "Driver connection lost"}${lastLocation ? ` · last location ${lastLocation}` : ""}`
          : "Driver arrived · waiting for pickup confirmation",
    };
  }

  if (trackingState?.isTracking) {
    const lastLocation = formatLastLocation(trackingState.recordedAt);
    const longOffline = isLongOffline(trackingState.recordedAt, timestamp);
    return {
      label: "Driver En Route",
      accent: CLIENT_COLORS.success,
      note: trackingState.isOnline
        ? "Driver en route · pickup not confirmed"
        : `${longOffline ? "Warning · no driver location for 10+ min" : "Route active · driver connection lost"}${lastLocation ? ` · last location ${lastLocation}` : ""}`,
    };
  }

  if (inPickupWindow || inDropoffWindow) {
    return {
      label: "Awaiting Update",
      accent: CLIENT_COLORS.warning,
      note: "Active schedule window · waiting for driver update",
    };
  }

  if (pickupStartMinutes !== null && currentMinutes < pickupStartMinutes) {
    return {
      label: "Upcoming",
      accent: CLIENT_COLORS.textMuted,
      note: `Pickup at ${formatTime(pickupStart)}`,
    };
  }

  return {
    label: "Upcoming",
    accent: CLIENT_COLORS.textMuted,
    note: getNextScheduledRouteNote(
      child,
      now,
      pickupStartMinutes,
      dropoffStartMinutes,
      dropoffStop,
    ),
  };
};

const ChildrenScreen = () => {
  const router = useRouter();
  const { children: existingChildren, childrenLoading } = useChildren();
  const { refreshClient } = useClientProfile();
  const { user } = useContext(AuthContext);
  const [unpaidChildIds, setUnpaidChildIds] = useState<string[]>([]);
  const [paymentAccessVerified, setPaymentAccessVerified] = useState(false);
  const [paymentAccessError, setPaymentAccessError] = useState<string | null>(
    null,
  );
  const [paymentRetryCount, setPaymentRetryCount] = useState(0);
  const [scheduledTrips, setScheduledTrips] = useState<Record<string, any[]>>(
    {},
  );
  const [routeStopsByChild, setRouteStopsByChild] = useState<
    Record<string, RouteStop[]>
  >({});
  const [trackingByChild, setTrackingByChild] = useState<
    Record<
      string,
      { isTracking: boolean; isOnline: boolean; recordedAt: string | null }
    >
  >({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [profileNotification, setProfileNotification] = React.useState({
    visible: false,
    message: "",
    type: "warning" as const,
  });
  const getChildStopsForToday = (child: Child) =>
    getTodayRouteStops(
      routeStopsByChild[child.id] || [],
      new Date(currentTime),
    );

  useFocusEffect(
    useCallback(() => {
      void refreshClient();
    }, [refreshClient]),
  );

  useEffect(() => {
    if (!user?.token) {
      setPaymentAccessVerified(false);
      setPaymentAccessError("Unable to verify payment status.");
      return;
    }

    let active = true;
    const refreshPaymentAccess = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/client/transport-access`, {
          headers: { Authorization: "Bearer " + user.token },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to verify payment status.");
        }
        const unpaidIds = Array.isArray(data?.unpaid_child_ids)
          ? data.unpaid_child_ids.filter(
              (id: unknown): id is string => typeof id === "string",
            )
          : [];
        if (active) {
          setUnpaidChildIds(unpaidIds);
          setPaymentAccessError(null);
          setPaymentAccessVerified(true);
        }
      } catch (error) {
        if (active) {
          setPaymentAccessVerified(false);
          setPaymentAccessError(
            error instanceof Error
              ? error.message
              : "Unable to verify payment status.",
          );
          console.error(
            "Failed to verify child transport payment access:",
            error,
          );
        }
      }
    };

    void refreshPaymentAccess();
    const interval = setInterval(() => void refreshPaymentAccess(), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paymentRetryCount, user?.token]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.token) return;

    let active = true;
    const loadRouteStops = async () => {
      const routedChildren = existingChildren.filter(
        (child) =>
          paymentAccessVerified &&
          !unpaidChildIds.includes(child.id) &&
          child.route?.id &&
          hasAssignedVehicle(child),
      );
      if (routedChildren.length === 0) {
        setRouteStopsByChild({});
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const entries = await Promise.all(
          routedChildren.map(async (child) => {
            const response = await fetch(
              `${baseUrl}/client/children/${child.id}/route-stops`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            if (!response.ok) {
              throw new Error(
                `Unable to load route stops for child ${child.id} (${response.status}).`,
              );
            }
            const data = await response.json();
            const stops = (Array.isArray(data) ? data : []).filter(
              (stop: RouteStop) => stop.route_id === child.route?.id,
            );
            return [child.id, stops] as const;
          }),
        );
        if (active) setRouteStopsByChild(Object.fromEntries(entries));
      } catch (error) {
        console.error("Failed to refresh child route statuses", error);
      }
    };

    void loadRouteStops();
    const channel = subscribeToRouteStopUpdates(() => {
      if (active) void loadRouteStops();
    });
    const interval = setInterval(() => void loadRouteStops(), 10_000);
    return () => {
      active = false;
      clearInterval(interval);
      void unsubscribeFromRealtime(channel);
    };
  }, [existingChildren, paymentAccessVerified, unpaidChildIds, user?.token]);

  useEffect(() => {
    if (!user?.token) return undefined;

    let active = true;
    const routedChildren = existingChildren.filter(
      (child) =>
        paymentAccessVerified &&
        !unpaidChildIds.includes(child.id) &&
        child.route?.id &&
        hasAssignedVehicle(child) &&
        child.vehicle?.driver?.id,
    );
    if (routedChildren.length === 0) {
      setTrackingByChild({});
      return undefined;
    }

    const refreshTrackingSessions = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const entries = await Promise.all(
          routedChildren.map(async (child) => {
            const routeId = child.route?.id;
            const driverId = child.vehicle?.driver?.id;
            if (!routeId || !driverId) {
              return [
                child.id,
                { isTracking: false, isOnline: false, recordedAt: null },
              ] as const;
            }
            try {
              const response = await fetch(
                `${baseUrl}/driver/location/${driverId}?child_id=${child.id}&route_id=${encodeURIComponent(routeId)}`,
                { headers: { Authorization: `Bearer ${user.token}` } },
              );
              if (!response.ok) {
                throw new Error(
                  `Unable to read tracking status for child ${child.id} (${response.status}).`,
                );
              }
              const data = await response.json();
              const isTracking =
                data?.is_tracking === true &&
                data?.tracking_route_id === routeId;
              return [
                child.id,
                {
                  isTracking,
                  isOnline: isTracking && data?.is_online === true,
                  recordedAt: data?.recorded_at || null,
                },
              ] as const;
            } catch (error) {
              console.error("Failed to refresh child tracking status", error);
              return [
                child.id,
                { isTracking: false, isOnline: false, recordedAt: null },
              ] as const;
            }
          }),
        );
        if (active) setTrackingByChild(Object.fromEntries(entries));
      } catch (error) {
        if (active) {
          setTrackingByChild({});
          console.error("Failed to refresh driver tracking sessions", error);
        }
      }
    };

    void refreshTrackingSessions();
    const interval = setInterval(() => void refreshTrackingSessions(), 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [existingChildren, paymentAccessVerified, unpaidChildIds, user?.token]);

  useEffect(() => {
    if (!user?.token || existingChildren.length === 0) return;

    const loadScheduledTrips = async () => {
      const baseUrl = await resolveWorkingBaseUrl();
      const entries = await Promise.all(
        existingChildren
          .filter(
            (child) =>
              paymentAccessVerified && !unpaidChildIds.includes(child.id),
          )
          .map(async (child) => {
            try {
              const response = await fetch(
                `${baseUrl}/client/children/${child.id}/scheduled-trips`,
                { headers: { Authorization: `Bearer ${user.token}` } },
              );
              const data = await response.json();
              return [
                child.id,
                response.ok && Array.isArray(data) ? data : [],
              ] as const;
            } catch {
              return [child.id, []] as const;
            }
          }),
      );
      setScheduledTrips(Object.fromEntries(entries));
    };

    if (!paymentAccessVerified) {
      setScheduledTrips({});
      return;
    }
    loadScheduledTrips();
  }, [existingChildren, paymentAccessVerified, unpaidChildIds, user?.token]);

  const openAddChild = async () => {
    const refreshedClient = await refreshClient();
    if (!refreshedClient) {
      setProfileNotification({
        visible: true,
        message:
          "Unable to refresh your personal information. Please try again.",
        type: "warning",
      });
      return;
    }

    const phone = (refreshedClient.phone || "").replace(/[\s()-]/g, "");
    const latitude = Number(refreshedClient.home_latitude);
    const longitude = Number(refreshedClient.home_longitude);
    const profileComplete = Boolean(
      /^\+?[0-9]{7,15}$/.test(phone) &&
        refreshedClient.first_name?.trim() &&
        refreshedClient.last_name?.trim() &&
        refreshedClient.relationship &&
        refreshedClient.home_address?.trim() &&
        refreshedClient.home_latitude !== null &&
        refreshedClient.home_latitude !== undefined &&
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        refreshedClient.home_longitude !== null &&
        refreshedClient.home_longitude !== undefined &&
        Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180,
    );
    if (!profileComplete) {
      setProfileNotification({
        visible: true,
        message:
          "Please complete your personal information before adding a child. Routing to the profile page",
        type: "warning",
      });
      setTimeout(() => {
        router.push({
          pathname: "/(client)/(tabs)/profile",
        } as never);
      }, 4000);
      return;
    }

    router.push({
      pathname: "/(client)/(tabs)/children/add-child",
    } as never);
  };

  const overviewCards = [
    {
      count: existingChildren.filter(
        (child) =>
          paymentAccessVerified &&
          !unpaidChildIds.includes(child.id) &&
          deriveChildStatus(
            child,
            getChildStopsForToday(child),
            currentTime,
            trackingByChild[child.id],
          ).label === "On a Trip",
      ).length,
      label: "On a Trip",
      sub: "View live location",
      icon: "directions-bus" as const,
      color: CLIENT_COLORS.surfaceElevated,
      iconColor: CLIENT_COLORS.primaryBright,
    },
    {
      count: existingChildren.filter(
        (child) =>
          paymentAccessVerified &&
          !unpaidChildIds.includes(child.id) &&
          deriveChildStatus(
            child,
            getChildStopsForToday(child),
            currentTime,
            trackingByChild[child.id],
          ).label === "Completed",
      ).length,
      label: "Completed",
      sub: "Dropped off safely",
      icon: "check-circle" as const,
      color: CLIENT_COLORS.surfaceElevated,
      iconColor: CLIENT_COLORS.success,
    },
    {
      count: existingChildren.filter(
        (child) =>
          paymentAccessVerified &&
          !unpaidChildIds.includes(child.id) &&
          deriveChildStatus(
            child,
            getChildStopsForToday(child),
            currentTime,
            trackingByChild[child.id],
          ).label === "Upcoming",
      ).length,
      label: "Upcoming",
      sub: "Later today",
      icon: "schedule" as const,
      color: CLIENT_COLORS.surfaceElevated,
      iconColor: CLIENT_COLORS.textSecondary,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader
        title="My Children"
        subtitle="Track and manage your children"
      />
      <View style={styles.container}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryIconContainer}>
              <Ionicons
                name="people"
                size={26}
                color={CLIENT_COLORS.primaryBright}
              />
            </View>
            <View style={styles.summaryMeta}>
              <Text style={styles.summaryCount}>
                {(existingChildren && existingChildren.length) || 0} Children
              </Text>
              <Text style={styles.summaryInfo}>
                {overviewCards[0].count} On a trip · {overviewCards[1].count} At
                school
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddChild}>
            <MaterialIcons
              name="add"
              size={22}
              color={CLIENT_COLORS.primaryBright}
            />
            <Text style={styles.addText}>Add Child</Text>
          </TouchableOpacity>
        </View>

        {paymentAccessError ||
        !paymentAccessVerified ||
        unpaidChildIds.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#F59E0B",
              backgroundColor: "#2A1B0A",
            }}
          >
            <MaterialIcons name="payments" size={20} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FDE68A", fontWeight: "800" }}>
                {paymentAccessError
                  ? "Transport details are hidden"
                  : !paymentAccessVerified
                    ? "Checking payment status"
                    : "Transport services paused"}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: "#FCD34D",
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                {paymentAccessError
                  ? "Payment status could not be verified. School information remains available."
                  : !paymentAccessVerified
                    ? "School information remains available while payment status is checked."
                    : "Children with outstanding owner payments cannot access transport routes or trip tracking. School information remains available."}
              </Text>
              {paymentAccessVerified && unpaidChildIds.length > 0 ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push("/(client)/pages/payments" as never)
                  }
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: "#F59E0B",
                  }}
                >
                  <Text style={{ color: "#1C1205", fontWeight: "800" }}>
                    View payments
                  </Text>
                </TouchableOpacity>
              ) : paymentAccessError ? (
                <TouchableOpacity
                  onPress={() => setPaymentRetryCount((count) => count + 1)}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: "#F59E0B",
                  }}
                >
                  <Text style={{ color: "#1C1205", fontWeight: "800" }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Children Overview</Text>
        <View style={styles.overviewGrid}>
          {/*  */}
          {overviewCards.map((card) => (
            <TouchableOpacity
              key={card.label}
              style={[
                styles.overviewCard,
                {
                  backgroundColor: card.color,
                  borderColor: CLIENT_COLORS.border,
                  shadowColor: CLIENT_COLORS.overlay,
                },
              ]}
            >
              <View
                style={[
                  styles.overviewIcon,
                  { backgroundColor: `${card.iconColor}1A` },
                ]}
              >
                <MaterialIcons
                  name={card.icon}
                  size={18}
                  color={card.iconColor}
                />
                <Text style={styles.overviewCount}>{card.count}</Text>
              </View>
              <Text style={styles.overviewLabel}>{card.label}</Text>
              <Text style={styles.overviewSub}>{card.sub}</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={CLIENT_COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitleLarge}>My Children</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {childrenLoading && existingChildren.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator
                size="small"
                color={CLIENT_COLORS.primaryBright}
              />
              <Text style={styles.loadingText}>Loading children...</Text>
            </View>
          ) : existingChildren.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialIcons
                  name="people-outline"
                  size={28}
                  color={CLIENT_COLORS.primaryBright}
                />
              </View>
              <Text style={styles.emptyTitle}>No children yet</Text>
              <Text style={styles.emptyText}>
                Add your first child to start tracking their school trip.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddChild}
              >
                <Text style={styles.emptyButtonText}>Add Child</Text>
              </TouchableOpacity>
            </View>
          ) : (
            existingChildren.map((child: Child) => {
              const transportBlocked =
                !paymentAccessVerified || unpaidChildIds.includes(child.id);
              const status = transportBlocked
                ? {
                    label: "Transport paused",
                    note: paymentAccessVerified
                      ? "Owner payment outstanding"
                      : "Checking payment status",
                    accent: "#D97706",
                  }
                : deriveChildStatus(
                    child,
                    getChildStopsForToday(child),
                    currentTime,
                    trackingByChild[child.id],
                  );
              const childTrips = scheduledTrips[child.id] || [];
              const today = getLocalDateKey();
              const weekendTrip =
                childTrips.find((trip) => trip.schedule_date === today) ||
                childTrips.find((trip) => trip.schedule_date > today);
              const vehicleAssigned = hasAssignedVehicle(child);
              const routeName = transportBlocked
                ? paymentAccessVerified
                  ? "Transport paused"
                  : "Checking payment status"
                : !vehicleAssigned
                  ? "Vehicle not assigned"
                  : weekendTrip
                    ? "Weekend transport"
                    : child.route?.route_name || "Route";
              const pickupTime = formatTime(
                weekendTrip?.pickup_time ||
                  child.route?.pickup_start_time ||
                  child.route?.departure_time,
              );
              const dropoffTime = formatTime(
                weekendTrip?.dropoff_time ||
                  child.route?.dropoff_start_time ||
                  child.route?.dropoff_end_time,
              );

              return (
                <View key={child.id || child.name} style={styles.childCard}>
                  <View style={styles.childHeader}>
                    <View style={styles.avatarWrap}>
                      {child.avatar ? (
                        <Image
                          source={{ uri: child.avatar }}
                          style={{ width: 50, height: 50, borderRadius: 23 }}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(child.name || "C").charAt(0)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>
                        {child.name} {child.lastname || ""}
                      </Text>
                      <Text style={styles.childMeta}>
                        {child.grade || "Grade not set"} •{" "}
                        {child.school_name || "School not set"}
                      </Text>

                      <View style={styles.statusRow}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: CLIENT_COLORS.textSecondary,
                            fontWeight: "600",
                          }}
                        >
                          {routeName}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.trackButton]}
                      onPress={() => {
                        if (transportBlocked) {
                          router.push({
                            pathname: "/(client)/(tabs)/children/[childId]",
                            params: { childId: child.id },
                          } as never);
                          return;
                        }
                        if (!vehicleAssigned || !child.route?.id) {
                          router.push({
                            pathname: "/(client)/(tabs)/children/[childId]",
                            params: { childId: child.id },
                          });
                          return;
                        }
                        router.push({
                          pathname: "/(client)/(tabs)/trips",
                          params: {
                            childId: child.id,
                            routeId: child.route.id,
                          },
                        } as never);
                      }}
                    >
                      <Ionicons
                        name={
                          transportBlocked
                            ? "person-outline"
                            : vehicleAssigned
                              ? "location-outline"
                              : "create-outline"
                        }
                        size={22}
                        color={CLIENT_COLORS.primaryBright}
                      />
                      <Text style={[styles.trackText]}>
                        {transportBlocked
                          ? "View child"
                          : vehicleAssigned
                            ? "Track"
                            : "Update"}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={CLIENT_COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inlineStatusCard}>
                    <Ionicons
                      name={
                        status.label === "At School" ||
                        status.label === "Completed"
                          ? "checkmark-circle"
                          : "navigate-circle"
                      }
                      size={18}
                      color={status.accent}
                    />
                    <Text style={styles.inlineStatusText}>{status.label}</Text>
                    <Text style={styles.inlineTimeText}>
                      {transportBlocked
                        ? status.note
                        : !vehicleAssigned ||
                            status.label === "On a Trip" ||
                            status.label === "At School" ||
                            status.label === "Completed" ||
                            status.label === "Awaiting Update"
                          ? status.note
                          : status.label === "Upcoming" && weekendTrip
                            ? `${weekendTrip.schedule_date === today ? "Today" : "Scheduled"} · ${pickupTime} · ${dropoffTime}`
                            : status.label === "Upcoming"
                              ? status.note
                              : weekendTrip
                                ? `${weekendTrip.schedule_date === today ? "Today" : "Scheduled"} · ${pickupTime} · ${dropoffTime}`
                                : `${pickupTime} • ${dropoffTime}`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {!childrenLoading && existingChildren.length > 0 && (
            <View style={styles.safetyBanner}>
              <View style={styles.safetyIconWrap}>
                <MaterialIcons name="security" size={32} color="#fff" />
              </View>
              <Text style={styles.safetyText}>
                We&apos;ll notify you if your child is picked up, dropped off or
                if there are any changes.
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={26}
                color={CLIENT_COLORS.textSecondary}
              />
            </View>
          )}
        </ScrollView>
        <AppNotification
          message={profileNotification.message}
          type={profileNotification.type}
          visible={profileNotification.visible}
          onHide={() =>
            setProfileNotification((current) => ({
              ...current,
              visible: false,
            }))
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default ChildrenScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CLIENT_COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: CLIENT_COLORS.background,
    paddingHorizontal: 14,
  },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },

  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: CLIENT_COLORS.textPrimary,
  },

  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 25,
    lineHeight: 36,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 1,
    fontSize: 10,
    color: CLIENT_COLORS.textSecondary,
  },

  bellButton: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CLIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  clientAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },

  clientAvatar: {
    width: "100%",
    height: "100%",
  },

  clientAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },

  badge: {
    position: "absolute",
    right: 1,
    top: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: CLIENT_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
  },

  /* SUMMARY */
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    marginBottom: 12,
  },

  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  summaryMeta: {
    flex: 1,
  },

  summaryCount: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },

  summaryInfo: {
    fontSize: 10,
    color: CLIENT_COLORS.textSecondary,
    marginTop: 1,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1.2,
    borderColor: CLIENT_COLORS.primary,
    backgroundColor: CLIENT_COLORS.surface,
  },

  addText: {
    marginLeft: 3,
    color: CLIENT_COLORS.primaryBright,
    fontWeight: "700",
    fontSize: 11,
  },

  /* SECTION TITLES */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    marginTop: 3,
    marginBottom: 7,
  },

  sectionTitleLarge: {
    fontSize: 15,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 7,
  },

  /* OVERVIEW */
  overviewGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 7,
  },

  overviewCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    minHeight: 78,
    alignItems: "flex-start",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  overviewIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 15,
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 5,
  },

  overviewCount: {
    fontSize: 15,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    lineHeight: 20,
  },

  overviewLabel: {
    fontSize: 11,
    color: CLIENT_COLORS.textPrimary,
    fontWeight: "700",
    marginTop: 1,
  },

  overviewSub: {
    fontSize: 9,
    color: CLIENT_COLORS.textSecondary,
    marginTop: 0,
    marginBottom: 1,
  },

  /* LIST */
  list: {
    flex: 1,
    marginTop: 3,
  },

  loadingState: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: CLIENT_COLORS.textSecondary,
    fontWeight: "700",
  },

  emptyState: {
    minHeight: 220,
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    padding: 24,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 11,
    lineHeight: 18,
    color: CLIENT_COLORS.textSecondary,
    maxWidth: 260,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: CLIENT_COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  emptyButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  /* CHILD CARD */
  childCard: {
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 14,
    padding: 9,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },

  childHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrap: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: CLIENT_COLORS.primaryBright,
  },

  childInfo: {
    flex: 1,
  },

  childName: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },

  childMeta: {
    fontSize: 10,
    color: CLIENT_COLORS.textSecondary,
    marginTop: 2,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  extraMeta: {
    fontSize: 9,
    color: CLIENT_COLORS.textMuted,
    fontWeight: "600",
  },

  /* TRACK BUTTON */
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },

  trackButtonDisabled: {
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    borderColor: CLIENT_COLORS.border,
  },

  trackText: {
    marginLeft: 3,
    fontSize: 10,
    color: CLIENT_COLORS.primaryBright,
    fontWeight: "700",
  },

  trackTextDisabled: {
    color: CLIENT_COLORS.textMuted,
  },

  /* INLINE STATUS */
  inlineStatusCard: {
    marginTop: 8,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  inlineStatusText: {
    fontSize: 10,
    color: CLIENT_COLORS.textPrimary,
    fontWeight: "700",
  },

  inlineTimeText: {
    fontSize: 9,
    color: CLIENT_COLORS.textSecondary,
    marginLeft: 1,
  },

  /* SAFETY */
  safetyBanner: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },

  safetyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: CLIENT_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  safetyText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: CLIENT_COLORS.textPrimary,
    fontWeight: "600",
  },

  /* BOTTOM NAV */
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CLIENT_COLORS.background,
    paddingTop: 7,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: CLIENT_COLORS.border,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    marginTop: 4,
    fontSize: 10,
    color: CLIENT_COLORS.textMuted,
    fontWeight: "600",
  },

  navTextActive: {
    color: CLIENT_COLORS.primaryBright,
    fontWeight: "800",
  },
});
