import React from "react";
import {
  Alert,
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DRIVER_COLORS, useTheme } from "../../../styles/theme";
import useDriverRoutes from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import {
  useDriverTracking,
  type DriverStopAction,
} from "@/app-support/driver/driverHelpers/hooks/useDriverTracking";
import CustomMap from "../../../components/map";
import { GOOGLE_API_KEY } from "../../../url";
import DriverHeader from "../components/DriverHeader";

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const distanceInMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) => {
  const earthRadius = 6371000;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(firstLatitude) *
      Math.cos(secondLatitude);
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const formatDistance = (meters: number | null) => {
  if (meters === null) return "--";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "--";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
};

type DriverMapMarker = {
  latitude: number;
  longitude: number;
  stopId?: string;
  title?: string;
  type: "pickup" | "dropoff" | "driver" | "start" | "end";
  endpoint?: "start" | "end";
};

const Trips = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId?: string | string[] }>();
  const { colors } = useTheme();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutes();
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(
    null,
  );
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const [mapFullScreen, setMapFullScreen] = React.useState(false);
  const [selectedRouteTab, setSelectedRouteTab] = React.useState<
    "map" | "stops" | "children" | "info"
  >("map");
  const [handoffStop, setHandoffStop] = React.useState<any | null>(null);
  const [recipientName, setRecipientName] = React.useState("");
  const [safetyPin, setSafetyPin] = React.useState("");
  const [handoffBusy, setHandoffBusy] = React.useState(false);
  const [selectedStopWindow, setSelectedStopWindow] = React.useState<
    "pickup" | "dropoff"
  >("pickup");
  const [navigation, setNavigation] = React.useState({
    distanceMeters: null as number | null,
    durationSeconds: null as number | null,
    instruction: "Follow the route to the next stop.",
  });
  const requestedRouteId = Array.isArray(params.routeId)
    ? params.routeId[0]
    : params.routeId;

  React.useEffect(() => {
    if (
      requestedRouteId &&
      routes.some((candidate) => candidate.id === requestedRouteId)
    ) {
      setSelectedRouteId(requestedRouteId);
    }
  }, [requestedRouteId, routes]);
  const currentDate = new Date(currentTime);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const route = React.useMemo(() => {
    if (!routes.length) return null;

    if (selectedRouteId) {
      return (
        routes.find((candidate) => candidate.id === selectedRouteId) ||
        routes[0]
      );
    }

    const activeRoute = routes.find((candidate) => {
      const candidatePickupStart = timeToMinutes(candidate.pickup_start_time);
      const candidatePickupEnd = timeToMinutes(candidate.pickup_end_time);
      const candidateDropoffStart = timeToMinutes(candidate.dropoff_start_time);
      const candidateDropoffEnd = timeToMinutes(candidate.dropoff_end_time);
      const candidateInPickupWindow =
        candidatePickupStart !== null &&
        candidatePickupEnd !== null &&
        currentMinutes >= candidatePickupStart &&
        currentMinutes <= candidatePickupEnd;
      const candidateInDropoffWindow =
        candidateDropoffStart !== null &&
        candidateDropoffEnd !== null &&
        currentMinutes >= candidateDropoffStart &&
        currentMinutes <= candidateDropoffEnd;

      return candidateInPickupWindow || candidateInDropoffWindow;
    });

    return activeRoute || routes[0];
  }, [currentMinutes, routes, selectedRouteId]);
  const stops = React.useMemo(() => route?.route_stops || [], [route]);
  const routeSummary = React.useMemo(
    () => ({
      completed: stops.filter((stop) => stop.status === "completed").length,
      skipped: stops.filter((stop) => stop.status === "skipped").length,
      pending: stops.filter(
        (stop) => !["completed", "skipped"].includes(stop.status || ""),
      ).length,
    }),
    [stops],
  );
  const pickupStart = timeToMinutes(route?.pickup_start_time);
  const pickupEnd = timeToMinutes(route?.pickup_end_time);
  const dropoffStart = timeToMinutes(route?.dropoff_start_time);
  const dropoffEnd = timeToMinutes(route?.dropoff_end_time);
  const inPickupWindow =
    pickupStart !== null &&
    pickupEnd !== null &&
    currentMinutes >= pickupStart &&
    currentMinutes <= pickupEnd;
  const inDropoffWindow =
    dropoffStart !== null &&
    dropoffEnd !== null &&
    currentMinutes >= dropoffStart &&
    currentMinutes <= dropoffEnd;
  const pickupLeadIn =
    pickupStart !== null &&
    currentMinutes >= pickupStart - 5 &&
    currentMinutes < pickupStart;
  const dropoffLeadIn =
    dropoffStart !== null &&
    currentMinutes >= dropoffStart - 5 &&
    currentMinutes < dropoffStart;
  const activeStopType = inDropoffWindow
    ? ("dropoff" as const)
    : inPickupWindow
      ? ("pickup" as const)
      : pickupLeadIn
        ? ("pickup" as const)
        : dropoffLeadIn
          ? ("dropoff" as const)
          : null;
  const routeType =
    activeStopType ||
    (dropoffStart !== null && currentMinutes >= dropoffStart
      ? ("dropoff" as const)
      : ("pickup" as const));
  const canGoOnline = inPickupWindow || inDropoffWindow;
  const shouldShowStopWindowTabs = !pickupLeadIn && !dropoffLeadIn;
  const activeWindowStart = routeType === "pickup" ? pickupStart : dropoffStart;
  const activeWindowEnd = routeType === "pickup" ? pickupEnd : dropoffEnd;
  const activeWindowStarted =
    activeWindowStart !== null && currentMinutes >= activeWindowStart;
  const activeWindowEnded =
    activeWindowEnd !== null && currentMinutes > activeWindowEnd;
  const activeWindowStops = stops.filter(
    (stop) => stop.stop_type === routeType,
  );
  const allActiveWindowStopsCompleted =
    activeWindowStops.length > 0 &&
    activeWindowStops.every((stop) =>
      ["completed", "skipped"].includes(stop.status || ""),
    );
  const { online, busy, error, lastLocation, endRoute, updateStop } =
    useDriverTracking(route?.id, routeType);

  const shouldBlink = canGoOnline && !online;

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (
      !online ||
      busy ||
      !activeWindowStarted ||
      (!activeWindowEnded && !allActiveWindowStopsCompleted)
    ) {
      return;
    }
    endRoute();
  }, [
    activeWindowEnded,
    activeWindowStarted,
    allActiveWindowStopsCompleted,
    busy,
    endRoute,
    online,
  ]);

  const pickupStops = [...stops].filter((stop) => stop.stop_type === "pickup");
  const dropoffStops = [...stops].filter(
    (stop) => stop.stop_type === "dropoff",
  );
  const visibleStops = stops.filter(
    (stop) => stop.stop_type === selectedStopWindow,
  );

  const orderStops = (items: any[]) => {
    const driverCoordinate = lastLocation
      ? {
          latitude: lastLocation.coords.latitude,
          longitude: lastLocation.coords.longitude,
        }
      : null;

    return [...items].sort((first, second) => {
      const firstDone = ["completed", "skipped"].includes(first.status);
      const secondDone = ["completed", "skipped"].includes(second.status);
      if (firstDone !== secondDone) return firstDone ? 1 : -1;
      if (!driverCoordinate)
        return (first.stop_order || 0) - (second.stop_order || 0);
      if (!Number.isFinite(Number(first.latitude))) return 1;
      if (!Number.isFinite(Number(second.latitude))) return -1;
      return (
        distanceInMeters(driverCoordinate, {
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
        }) -
        distanceInMeters(driverCoordinate, {
          latitude: Number(second.latitude),
          longitude: Number(second.longitude),
        })
      );
    });
  };

  const orderedPickupStops = orderStops(pickupStops);
  const orderedDropoffStops = orderStops(dropoffStops);
  const selectedStops =
    selectedStopWindow === "pickup" ? orderedPickupStops : orderedDropoffStops;
  const driverLatitude = lastLocation?.coords.latitude;
  const driverLongitude = lastLocation?.coords.longitude;
  const driverCoordinate = React.useMemo(
    () =>
      driverLatitude !== undefined && driverLongitude !== undefined
        ? {
            latitude: driverLatitude,
            longitude: driverLongitude,
          }
        : null,
    [driverLatitude, driverLongitude],
  );
  const orderedStops = orderStops(visibleStops);
  const nextStop = orderedStops.find(
    (stop) => !["completed", "skipped"].includes(stop.status),
  );

  const mapStops = [...stops].sort(
    (first, second) => (first.stop_order || 0) - (second.stop_order || 0),
  );
  const activeMapStops = mapStops.filter(
    (stop) => stop.stop_type === (activeStopType || selectedStopWindow),
  );
  const mapNextStop = orderStops(activeMapStops).find(
    (stop) => !["completed", "skipped"].includes(stop.status),
  );
  const mapStopMarkers = mapStops
    .map((stop) => {
      const latitude = Number(stop.latitude);
      const longitude = Number(stop.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        return null;
      const child = route?.route_children?.find(
        (routeChild) => routeChild.child_id === stop.child_id,
      )?.children;
      const childName = [child?.name, child?.lastname]
        .filter(Boolean)
        .join(" ");
      return {
        stopId: stop.id,
        latitude,
        longitude,
        title: `${stop.stop_type === "pickup" ? "Home pickup" : "Home drop-off"}${childName ? ` · ${childName}` : ""}${mapNextStop?.id === stop.id ? " · NEXT" : ""}`,
        type: stop.stop_type,
      };
    })
    .filter(Boolean) as {
    latitude: number;
    longitude: number;
    stopId: string;
    title: string;
    type: "pickup" | "dropoff" | "driver" | "start" | "end";
  }[] as DriverMapMarker[];
  const nextStopMarker = mapStopMarkers.find(
    (marker) => marker.stopId === mapNextStop?.id,
  );

  const school = route?.route_children?.find(
    (routeChild) => routeChild.children?.schools,
  )?.children?.schools;
  const schoolMarker =
    Number.isFinite(Number(school?.latitude)) &&
    Number.isFinite(Number(school?.longitude))
      ? {
          latitude: Number(school?.latitude),
          longitude: Number(school?.longitude),
          title: school?.name || school?.address || "School",
          type: "end" as const,
          endpoint: "end" as const,
        }
      : null;

  const startMarker =
    Number.isFinite(Number(route?.start_latitude)) &&
    Number.isFinite(Number(route?.start_longitude))
      ? {
          latitude: Number(route?.start_latitude),
          longitude: Number(route?.start_longitude),
          title: route?.start_location || "Route start",
          type: "start" as const,
          endpoint: "start" as const,
        }
      : null;
  const endMarker =
    Number.isFinite(Number(route?.end_latitude)) &&
    Number.isFinite(Number(route?.end_longitude))
      ? {
          latitude: Number(route?.end_latitude),
          longitude: Number(route?.end_longitude),
          title: route?.end_location || "Route end",
          type: "end" as const,
          endpoint: "end" as const,
        }
      : null;
  const driverMarker = driverCoordinate
    ? {
        ...driverCoordinate,
        title: "You are here",
        type: "driver" as const,
      }
    : null;
  const pickupMapStops = mapStopMarkers.filter(
    (marker) => marker.type === "pickup",
  );
  const dropoffMapStops = mapStopMarkers.filter(
    (marker) => marker.type === "dropoff",
  );
  const activeMapStopMarkers = mapStopMarkers.filter(
    (marker) => marker.type === (activeStopType || selectedStopWindow),
  );
  const mapOrigin: DriverMapMarker | null =
    activeStopType === "pickup"
      ? activeMapStopMarkers[0] || startMarker
      : schoolMarker || startMarker || dropoffMapStops[0] || null;
  const mapDestination: DriverMapMarker | null =
    activeStopType === "pickup"
      ? schoolMarker ||
        endMarker ||
        activeMapStopMarkers[activeMapStopMarkers.length - 1] ||
        null
      : activeMapStopMarkers[activeMapStopMarkers.length - 1] || endMarker;
  const mapWaypoints =
    activeStopType === "pickup"
      ? activeMapStopMarkers.slice(1)
      : activeMapStopMarkers.slice(0, -1);
  const directionsOrigin = driverCoordinate || mapOrigin;
  const directionsDestination = driverCoordinate
    ? mapDestination
    : mapDestination;
  const pendingMapStops = mapStopMarkers.filter((marker) => {
    const stop = activeMapStops.find((item) => item.id === marker.stopId);
    return stop && !["completed", "skipped"].includes(stop.status || "");
  });
  const navigationStops = nextStopMarker
    ? [
        nextStopMarker,
        ...pendingMapStops.filter(
          (marker) => marker.stopId !== nextStopMarker.stopId,
        ),
      ]
    : pendingMapStops;
  const directionsWaypoints = driverCoordinate ? [] : mapWaypoints;
  const liveDirectionsWaypoints = driverCoordinate
    ? navigationStops.filter(
        (marker) => marker.stopId !== directionsDestination?.stopId,
      )
    : directionsWaypoints;
  const routeMapMarkers = activeStopType
    ? ([
        mapOrigin,
        ...pickupMapStops,
        ...dropoffMapStops,
        mapDestination,
        schoolMarker,
        driverMarker,
      ].filter(Boolean) as DriverMapMarker[])
    : [];
  const distanceLeft =
    driverCoordinate &&
    mapNextStop &&
    Number.isFinite(Number(mapNextStop.latitude)) &&
    Number.isFinite(Number(mapNextStop.longitude))
      ? distanceInMeters(driverCoordinate, {
          latitude: Number(mapNextStop.latitude),
          longitude: Number(mapNextStop.longitude),
        })
      : null;

  const nextStopChild = nextStop
    ? route?.route_children?.find(
        (routeChild) => routeChild.child_id === nextStop.child_id,
      )?.children
    : null;
  const nextStopChildName = [nextStopChild?.name, nextStopChild?.lastname]
    .filter(Boolean)
    .join(" ");

  React.useEffect(() => {
    if (!driverCoordinate || !mapNextStop || !GOOGLE_API_KEY) return;
    const latitude = Number(mapNextStop.latitude);
    const longitude = Number(mapNextStop.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    let active = true;
    const fetchNavigation = async () => {
      try {
        const origin = `${driverCoordinate.latitude},${driverCoordinate.longitude}`;
        const destination = `${latitude},${longitude}`;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_API_KEY}`,
        );
        const data = await response.json();
        const leg = data?.routes?.[0]?.legs?.[0];
        if (!active || !leg) return;
        const instruction = String(
          leg.steps?.[0]?.html_instructions || "Continue to the next stop.",
        ).replace(/<[^>]+>/g, "");
        setNavigation({
          distanceMeters: leg.distance?.value ?? distanceLeft,
          durationSeconds: leg.duration?.value ?? null,
          instruction,
        });
      } catch (navigationError) {
        console.error("Unable to load next-stop directions", navigationError);
      }
    };
    fetchNavigation();
    return () => {
      active = false;
    };
  }, [
    driverCoordinate?.latitude,
    driverCoordinate?.longitude,
    mapNextStop?.id,
    distanceLeft,
    driverCoordinate,
    mapNextStop,
  ]);

  const handleStop = async (stop: any, action: DriverStopAction) => {
    if (action === "incident") {
      router.push({
        pathname: "/(driver)/incident-report",
        params: {
          routeId: route?.id || "",
          childId: stop?.child_id || "",
        },
      });
      return;
    }

    try {
      if (action === "dropped_off") {
        setHandoffStop(stop);
        setRecipientName("");
        setSafetyPin("");
        return;
      }
      await updateStop(stop.id, action);
      await refreshRoutes(true);
    } catch (stopError: any) {
      console.error("Unable to update route stop", stopError);
      Alert.alert(
        "Unable to update stop",
        stopError?.message || "Please try again.",
      );
    }
  };

  const confirmDropoff = async () => {
    if (!handoffStop || handoffBusy) return;
    if (!recipientName.trim() || !/^\d{4,6}$/.test(safetyPin)) {
      Alert.alert(
        "Handoff details required",
        "Enter the recipient's name and the parent's 4–6 digit safety PIN.",
      );
      return;
    }

    setHandoffBusy(true);
    try {
      await updateStop(handoffStop.id, "dropped_off", {
        recipientName: recipientName.trim(),
        safetyPin,
      });
      setHandoffStop(null);
      setRecipientName("");
      setSafetyPin("");
      await refreshRoutes(true);
    } catch (handoffError: any) {
      Alert.alert(
        "Drop-off not completed",
        handoffError?.message || "Check the safety PIN and try again.",
      );
    } finally {
      setHandoffBusy(false);
    }
  };

  const handleOnlinePress = async () => {
    if (!canGoOnline) {
      Alert.alert(
        "Route is not active",
        "Online is available only during the configured pickup or drop-off window.",
      );
      return;
    }
    const freshRoute = route;
    console.log("[driver-trips] online route selected", {
      routeId: freshRoute?.id || null,
    });
    if (!freshRoute) {
      Alert.alert(
        "Route unavailable",
        "Your assigned route could not be loaded.",
      );
      return;
    }
    router.push({
      pathname: "/(driver)/pre-trip",
      params: { routeId: freshRoute.id, routeType },
    } as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DRIVER_COLORS.background }}>
      <DriverHeader title="My Route" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {routesError ? (
          <TouchableOpacity
            onPress={() => void refreshRoutes(true)}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              backgroundColor: DRIVER_COLORS.card,
            }}
          >
            <Text style={{ color: colors.error }}>{routesError}</Text>
            <Text
              style={{
                color: colors.primary,
                fontWeight: "700",
                marginTop: 4,
              }}
            >
              Tap to retry
            </Text>
          </TouchableOpacity>
        ) : null}
        {/* Hero card */}
        <LinearGradient
          colors={[
            DRIVER_COLORS.primaryDark,
            DRIVER_COLORS.primary,
            "#28775A",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ margin: 16, borderRadius: 22, padding: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.14)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialIcons name="directions-bus" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Current Route
              </Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                {route?.route_name || "No route assigned"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 6 }}>
                {route?.start_location || "Route start"} →{" "}
                {route?.end_location || "Route end"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View
                style={{
                  backgroundColor: "#fff",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: DRIVER_COLORS.primary, fontWeight: "800" }}>
                  {online ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>
            </View>
          </View>

          {/* divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.12)",
              marginVertical: 14,
            }}
          />

          {/* stats row */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Children Onboard
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 16,
                  marginTop: 6,
                }}
              >
                {
                  visibleStops.filter((stop) => stop.status === "completed")
                    .length
                }{" "}
                / {visibleStops.length}
              </Text>
            </View>
            <View
              style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Next{" "}
                {inPickupWindow
                  ? "Pickup"
                  : inDropoffWindow
                    ? "Drop-off"
                    : "Window"}
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 16,
                  marginTop: 6,
                }}
              >
                {inPickupWindow
                  ? route?.pickup_start_time || "--:--"
                  : inDropoffWindow
                    ? route?.dropoff_start_time || "--:--"
                    : "--:--"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Active window
              </Text>
            </View>
            <View
              style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Distance Left
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 16,
                  marginTop: 6,
                }}
              >
                {online ? formatDistance(distanceLeft) : "--"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Location
              </Text>
            </View>
            <View
              style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Route Progress
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 16,
                  marginTop: 6,
                }}
              >
                {visibleStops.length
                  ? Math.round(
                      (visibleStops.filter(
                        (stop) => stop.status === "completed",
                      ).length /
                        visibleStops.length) *
                        100,
                    )
                  : 0}
                %
              </Text>
            </View>
          </View>
        </LinearGradient>

        {routes.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: colors.text.secondary,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              Assigned routes · {routes.length}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {routes.map((routeOption) => {
                const isSelected = routeOption.id === route?.id;
                return (
                  <TouchableOpacity
                    key={routeOption.id}
                    onPress={() => setSelectedRouteId(routeOption.id)}
                    style={{
                      width: 190,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? DRIVER_COLORS.primary
                        : DRIVER_COLORS.cardBorder,
                      backgroundColor: isSelected
                        ? "#EAF2ED"
                        : DRIVER_COLORS.card,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? DRIVER_COLORS.primary
                          : DRIVER_COLORS.text,
                        fontWeight: "700",
                      }}
                      numberOfLines={1}
                    >
                      {routeOption.route_name || "Route"}
                    </Text>
                    <Text
                      style={{
                        color: DRIVER_COLORS.muted,
                        fontSize: 11,
                        marginTop: 5,
                      }}
                      numberOfLines={1}
                    >
                      {routeOption.route_children?.length || 0} students ·{" "}
                      {routeOption.route_stops?.length || 0} stops
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
          }}
        >
          <Text
            style={{
              color: colors.text.secondary,
              fontSize: 12,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Route summary
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.text.primary, fontWeight: "700" }}>
              {routeSummary.completed} completed
            </Text>
            <Text style={{ color: colors.text.secondary }}>
              {routeSummary.pending} remaining
            </Text>
            <Text style={{ color: colors.text.secondary }}>
              {routeSummary.skipped} skipped
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: 16,
            marginTop: 4,
            marginBottom: 8,
            padding: 4,
            borderRadius: 15,
            backgroundColor: "#E7EFEA",
          }}
        >
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("map")}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 4,
              alignItems: "center",
              borderRadius: 11,
              backgroundColor:
                selectedRouteTab === "map" ? DRIVER_COLORS.card : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "map"
                    ? DRIVER_COLORS.primary
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "map" ? "800" : "600",
                fontSize: 12,
              }}
            >
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("stops")}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 4,
              alignItems: "center",
              borderRadius: 11,
              backgroundColor:
                selectedRouteTab === "stops" ? DRIVER_COLORS.card : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "stops"
                    ? DRIVER_COLORS.primary
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "stops" ? "800" : "600",
                fontSize: 12,
              }}
            >
              Stops
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("children")}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 4,
              alignItems: "center",
              borderRadius: 11,
              backgroundColor:
                selectedRouteTab === "children" ? DRIVER_COLORS.card : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "children"
                    ? DRIVER_COLORS.primary
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "children" ? "800" : "600",
                fontSize: 12,
              }}
            >
              Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("info")}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 4,
              alignItems: "center",
              borderRadius: 11,
              backgroundColor:
                selectedRouteTab === "info" ? DRIVER_COLORS.card : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "info"
                    ? DRIVER_COLORS.primary
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "info" ? "800" : "600",
                fontSize: 12,
              }}
            >
              Details
            </Text>
          </TouchableOpacity>
        </View>

        {selectedRouteTab === "map" ? <View
          style={{
            margin: 16,
            borderRadius: 12,
            height: 200,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              position: "absolute",
              top: 10,
              left: 12,
              zIndex: 1,
              color: colors.text.secondary,
              backgroundColor: colors.background,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              fontWeight: "700",
            }}
          >
            {activeStopType === "pickup"
              ? "Morning pickup route"
              : activeStopType === "dropoff"
                ? "Afternoon drop-off route"
                : "No active stop window"}
          </Text>
          {routeMapMarkers.length > 0 ? (
            <CustomMap
              markers={routeMapMarkers}
              origin={directionsOrigin}
              destination={directionsDestination}
              waypoints={liveDirectionsWaypoints}
              showMarkerLabels
              style={{ flex: 1, width: "100%" }}
            />
          ) : (
            <Text style={{ color: colors.text.secondary }}>
              No stop coordinates available
            </Text>
          )}
          {routeMapMarkers.length > 0 ? (
            <TouchableOpacity
              accessibilityLabel="Open route map fullscreen"
              onPress={() => setMapFullScreen(true)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: "rgba(15, 23, 42, 0.82)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="fullscreen" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View> : null}

        <Modal
          visible={mapFullScreen}
          animationType="slide"
          onRequestClose={() => setMapFullScreen(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CustomMap
              markers={routeMapMarkers}
              origin={directionsOrigin}
              destination={directionsDestination}
              waypoints={liveDirectionsWaypoints}
              showMarkerLabels
              style={{ flex: 1 }}
            />
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 28,
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Text style={{ color: "#94A3B8", fontSize: 12 }}>NEXT STOP</Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                {nextStopChildName || "Next stop"}
              </Text>
              <Text style={{ color: "#CBD5E1", marginTop: 5 }}>
                {nextStop?.stop_type === "pickup"
                  ? "Home pickup"
                  : "School drop-off"}{" "}
                · {formatDistance(navigation.distanceMeters ?? distanceLeft)} ·{" "}
                {formatDuration(navigation.durationSeconds)}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <MaterialIcons name="turn-right" size={20} color="#22C55E" />
                <Text style={{ color: "#FFFFFF", marginLeft: 6, flex: 1 }}>
                  {navigation.instruction}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close fullscreen route map"
              onPress={() => setMapFullScreen(false)}
              style={{
                position: "absolute",
                top: 52,
                right: 18,
                width: 42,
                height: 42,
                borderRadius: 8,
                backgroundColor: "rgba(15, 23, 42, 0.82)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Modal>

        {selectedRouteTab === "children" ? (
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Children on this route
            </Text>
            {(route?.route_children || []).length ? (
              route?.route_children?.map((routeChild) => {
                const child = routeChild.children;
                const childStops = stops.filter(
                  (stop) => stop.child_id === routeChild.child_id,
                );
                const completedStops = childStops.filter(
                  (stop) => stop.status === "completed",
                ).length;
                return (
                  <View
                    key={routeChild.child_id}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text.primary,
                        fontWeight: "700",
                      }}
                    >
                      {[child?.name, child?.lastname]
                        .filter(Boolean)
                        .join(" ") || "Child"}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 3 }}>
                      {child?.school_name || child?.schools?.name || "School not specified"}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 3 }}>
                      {completedStops} of {childStops.length} stops completed
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: colors.text.secondary }}>
                No children are assigned to this route.
              </Text>
            )}
          </View>
        ) : null}

        {selectedRouteTab === "info" ? (
          <View
            style={{
              margin: 16,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={{
                color: colors.text.primary,
                fontSize: 18,
                fontWeight: "800",
                marginBottom: 12,
              }}
            >
              {route?.route_name || "Route information"}
            </Text>
            {[
              ["Start", route?.start_location || "Not set"],
              ["Destination", route?.end_location || "Not set"],
              ["Vehicle", route?.vehicle?.name || "Not assigned"],
              ["Registration", route?.vehicle?.license_plate || "Not available"],
              ["Pickup window", `${route?.pickup_start_time || "--:--"} – ${route?.pickup_end_time || "--:--"}`],
              ["Drop-off window", `${route?.dropoff_start_time || "--:--"} – ${route?.dropoff_end_time || "--:--"}`],
              ["Stops", `${stops.length}`],
              ["Progress", `${routeSummary.completed} completed · ${routeSummary.pending} remaining · ${routeSummary.skipped} skipped`],
            ].map(([label, value]) => (
              <View
                key={label}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                  {label}
                </Text>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: 14,
                    fontWeight: "600",
                    marginTop: 3,
                  }}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {selectedRouteTab === "stops" ? (
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text.primary,
              marginBottom: 8,
            }}
          >
            Route Stops
          </Text>

          {shouldShowStopWindowTabs ? (
            <View
              style={{
                flexDirection: "row",
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            >
              {(
                [
                  { key: "pickup", label: "Morning" },
                  { key: "dropoff", label: "Afternoon" },
                ] as const
              ).map((tab) => {
                const isActive = selectedStopWindow === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setSelectedStopWindow(tab.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.background,
                      borderRightWidth: tab.key === "pickup" ? 1 : 0,
                      borderRightColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "700",
                        color: isActive ? "#FFFFFF" : colors.text.primary,
                      }}
                    >
                      {tab.label} (
                      {tab.key === "pickup"
                        ? orderedPickupStops.length
                        : orderedDropoffStops.length}
                      )
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {routesLoading ? (
            <Text style={{ color: colors.text.secondary }}>
              Loading route...
            </Text>
          ) : selectedStops.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>
              No {selectedStopWindow === "pickup" ? "morning" : "afternoon"}{" "}
              stops available.
            </Text>
          ) : (
            selectedStops.map((s, index) => (
              <View
                key={s.id}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: ["completed", "skipped"].includes(s.status)
                    ? "#F3F4F6"
                    : "transparent",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 44, alignItems: "center" }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: ["completed", "skipped"].includes(
                          s.status,
                        )
                          ? "#9CA3AF"
                          : s.status === "in_progress"
                            ? colors.primary
                            : "#F59E0B",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        {index + 1}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 40,
                        width: 2,
                        backgroundColor: colors.border,
                        marginTop: 6,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.text.primary,
                        marginBottom: 3,
                      }}
                    >
                      {(() => {
                        const child = route?.route_children?.find(
                          (routeChild) => routeChild.child_id === s.child_id,
                        )?.children;
                        return (
                          [child?.name, child?.lastname]
                            .filter(Boolean)
                            .join(" ") || "Child"
                        );
                      })()}
                    </Text>
                    <Text
                      style={{ fontWeight: "700", color: colors.text.primary }}
                    >
                      {s.stop_type === "pickup" ? "Pickup" : "Drop-off"}
                    </Text>
                    <Text
                      style={{ color: colors.text.secondary, marginTop: 4 }}
                    >
                      {s.address || "Address unavailable"}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    marginLeft: 44,
                    marginTop: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                  }}
                >
                  {s.status === "in_progress" && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 8,
                      }}
                    >
                      <MaterialIcons
                        name="check-circle"
                        size={17}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: "700",
                        }}
                      >
                        Arrived
                      </Text>
                    </View>
                  )}
                  {["completed", "skipped"].includes(s.status) ? (
                    <Text
                      style={{
                        color: "#6B7280",
                        marginTop: 6,
                        fontWeight: "700",
                      }}
                    >
                      {s.stop_type === "pickup"
                        ? s.status === "completed"
                          ? "Picked up"
                          : "Skipped"
                        : s.status === "completed"
                          ? "Dropped off"
                          : "Skipped"}
                    </Text>
                  ) : (
                    <View style={{ alignItems: "flex-start", gap: 8 }}>
                      {s.status !== "in_progress" && (
                        <TouchableOpacity
                          onPress={() => handleStop(s, "arrived")}
                          disabled={!online || busy}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            opacity: !online || busy ? 0.45 : 1,
                          }}
                        >
                          <MaterialIcons
                            name="location-on"
                            size={17}
                            color={colors.primary}
                          />
                          <Text
                            style={{
                              color: colors.primary,
                              fontWeight: "700",
                            }}
                          >
                            Arrived
                          </Text>
                        </TouchableOpacity>
                      )}

                      {s.stop_type === "pickup" ? (
                        <TouchableOpacity
                          onPress={() => handleStop(s, "picked_up")}
                          disabled={!online || busy}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            opacity: !online || busy ? 0.45 : 1,
                          }}
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={17}
                            color="#2563EB"
                          />
                          <Text
                            style={{
                              color: "#2563EB",
                              fontWeight: "700",
                            }}
                          >
                            Picked up
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleStop(s, "dropped_off")}
                          disabled={!online || busy}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            opacity: !online || busy ? 0.45 : 1,
                          }}
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={17}
                            color="#16A34A"
                          />
                          <Text
                            style={{
                              color: "#16A34A",
                              fontWeight: "700",
                            }}
                          >
                            Dropped off
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => handleStop(s, "child_not_present")}
                        disabled={!online || busy}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          opacity: !online || busy ? 0.45 : 1,
                        }}
                      >
                        <MaterialIcons
                          name="person-off"
                          size={17}
                          color="#DC2626"
                        />
                        <Text
                          style={{
                            color: "#DC2626",
                            fontWeight: "700",
                          }}
                        >
                          Child not present
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleStop(s, "skipped")}
                        disabled={!online || busy}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          opacity: !online || busy ? 0.45 : 1,
                        }}
                      >
                        <MaterialIcons
                          name="do-not-disturb-on"
                          size={17}
                          color="#F97316"
                        />
                        <Text
                          style={{
                            color: "#F97316",
                            fontWeight: "700",
                          }}
                        >
                          Skip stop
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleStop(s, "incident")}
                        disabled={!online || busy}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          opacity: !online || busy ? 0.45 : 1,
                        }}
                      >
                        <MaterialIcons
                          name="warning"
                          size={17}
                          color="#B91C1C"
                        />
                        <Text
                          style={{
                            color: "#B91C1C",
                            fontWeight: "700",
                          }}
                        >
                          Report incident
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
        ) : null}

        {/* Start Route CTA */}
        <View style={{ margin: 16, marginTop: 22 }}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={[
              { borderRadius: 12 },
              shouldBlink && { borderWidth: 2, borderColor: "#DC2626" },
            ]}
          >
            <TouchableOpacity
              style={{
                padding: 18,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                backgroundColor: shouldBlink ? "#FF8C42" : "transparent",
                borderRadius: 10,
              }}
              onPress={handleOnlinePress}
              disabled={
                busy ||
                routesLoading ||
                Boolean(routesError) ||
                !route ||
                (!online && !canGoOnline) ||
                (online && activeWindowStarted)
              }
            >
              <MaterialIcons
                name={online ? "stop" : "play-arrow"}
                size={24}
                color="#fff"
              />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  marginLeft: 12,
                  fontSize: 16,
                }}
              >
                {busy
                  ? "Updating..."
                  : online
                    ? activeWindowStarted
                      ? "Route ends automatically"
                      : "End Route"
                    : canGoOnline
                      ? "Online"
                      : "Outside route window"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
          {error ? (
            <Text style={{ color: "#DC2626", marginTop: 8 }}>{error}</Text>
          ) : null}
        </View>

        <Modal
          visible={Boolean(handoffStop)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!handoffBusy) setHandoffStop(null);
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 20,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
            }}
          >
            <View
              style={{
                padding: 20,
                borderRadius: 16,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                Verify child handoff
              </Text>
              <Text
                style={{
                  color: colors.text.secondary,
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                Confirm who received the child and enter the parent’s safety PIN
                before completing drop-off.
              </Text>
              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Recipient full name"
                placeholderTextColor={colors.text.secondary}
                editable={!handoffBusy}
                autoCapitalize="words"
                style={{
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  color: colors.text.primary,
                  backgroundColor: colors.background,
                }}
              />
              <TextInput
                value={safetyPin}
                onChangeText={(value) =>
                  setSafetyPin(value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Parent safety PIN"
                placeholderTextColor={colors.text.secondary}
                editable={!handoffBusy}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  color: colors.text.primary,
                  backgroundColor: colors.background,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <TouchableOpacity
                  disabled={handoffBusy}
                  onPress={() => setHandoffStop(null)}
                  style={{ paddingVertical: 12, paddingHorizontal: 14 }}
                >
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontWeight: "700",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={handoffBusy}
                  onPress={() => void confirmDropoff()}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 9,
                    backgroundColor: colors.primary,
                    opacity: handoffBusy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                    {handoffBusy ? "Verifying…" : "Verify & complete"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Trips;
