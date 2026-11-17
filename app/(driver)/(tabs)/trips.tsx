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
import { DRIVER_COLORS, useDriverTheme } from "../../../styles/theme";
import useDriverRoutes from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import { getSouthAfricaDateKey } from "@/app-support/client/clientHelpers/utils/routeStops";
import {
  useDriverTracking,
  type DriverStopAction,
  type PickupContactOption,
} from "@/app-support/driver/driverHelpers/hooks/useDriverTracking";
import CustomMap from "../../../components/map";
import { GOOGLE_API_KEY } from "../../../url";
import { getBearingDegrees } from "../../../utils/mapHeading";
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

const hasCoordinates = (latitude: unknown, longitude: unknown) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined &&
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude));

const groupNearbyLocations = (items: any[], radiusMeters = 50) => {
  const groups: { key: string; latitude: number; longitude: number; items: any[] }[] = [];
  for (const item of items) {
    if (!hasCoordinates(item.latitude, item.longitude)) continue;
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const existing = groups.find(
      (group) =>
        distanceInMeters(group, { latitude, longitude }) <= radiusMeters,
    );
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({
        key: String(item.id || item.stopId || `${latitude},${longitude}`),
        latitude,
        longitude,
        items: [item],
      });
    }
  }
  return groups;
};

const groupStopsForList = (items: any[], radiusMeters = 50) => {
  const groups: {
    key: string;
    latitude: number | null;
    longitude: number | null;
    items: any[];
  }[] = [];
  for (const item of items) {
    if (!hasCoordinates(item.latitude, item.longitude)) {
      groups.push({
        key: String(item.id),
        latitude: null,
        longitude: null,
        items: [item],
      });
      continue;
    }
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const existing = groups.find(
      (group) =>
        group.latitude !== null &&
        group.longitude !== null &&
        distanceInMeters(
          {
            latitude: group.latitude,
            longitude: group.longitude,
          },
          { latitude, longitude },
        ) <= radiusMeters,
    );
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({
        key: String(item.id),
        latitude,
        longitude,
        items: [item],
      });
    }
  }
  return groups;
};

const wasBoardedOnServiceDate = (
  stop: { boarded_at?: string | null } | undefined,
  serviceDateKey: string,
) => {
  if (!stop?.boarded_at) return false;
  const boardedDate = new Date(stop.boarded_at);
  return (
    !Number.isNaN(boardedDate.getTime()) &&
    getSouthAfricaDateKey(boardedDate) === serviceDateKey
  );
};

const getStopPhaseCoordinate = (
  stop: any,
  route: any,
  routeType: "pickup" | "dropoff",
  serviceDateKey: string,
) => {
  if (
    routeType === "dropoff" &&
    !wasBoardedOnServiceDate(stop, serviceDateKey)
  ) {
    const school = route?.route_children?.find(
      (routeChild: any) => routeChild.child_id === stop.child_id,
    )?.children?.schools;
    if (school && hasCoordinates(school.latitude, school.longitude)) {
      return {
        latitude: Number(school.latitude),
        longitude: Number(school.longitude),
      };
    }
  }
  return hasCoordinates(stop.latitude, stop.longitude)
    ? {
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      }
    : null;
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
  stopIds?: string[];
  title?: string;
  type: "pickup" | "dropoff" | "driver" | "start" | "end";
  endpoint?: "start" | "end";
};

const Trips = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId?: string | string[] }>();
  const { colors } = useDriverTheme();
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
  const [actionStop, setActionStop] = React.useState<any | null>(null);
  const [handoffStop, setHandoffStop] = React.useState<any | null>(null);
  const [recipientName, setRecipientName] = React.useState("");
  const [safetyPin, setSafetyPin] = React.useState("");
  const [pickupContacts, setPickupContacts] = React.useState<
    PickupContactOption[]
  >([]);
  const [selectedPickupContactId, setSelectedPickupContactId] =
    React.useState("");
  const [handoffVerificationType, setHandoffVerificationType] =
    React.useState<"parent" | "authorized_contact">("parent");
  const [pickupContactsLoading, setPickupContactsLoading] =
    React.useState(false);
  const [handoffBusy, setHandoffBusy] = React.useState(false);
  const [approachCard, setApproachCard] = React.useState<{
    key: string;
    stage: "home_pickup" | "school_pickup" | "home_dropoff";
    stopIds: string[];
    location: string;
  } | null>(null);
  const [approachModalVisible, setApproachModalVisible] = React.useState(false);
  const [approachBusy, setApproachBusy] = React.useState(false);
  const [notPresentStopId, setNotPresentStopId] = React.useState<string | null>(
    null,
  );
  const [notPresentReason, setNotPresentReason] = React.useState("");
  const promptedApproachKeys = React.useRef(new Set<string>());
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
  const serviceDateKey = getSouthAfricaDateKey(currentDate);
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
  const routeSummary = React.useMemo(() => {
    const windowStops = stops.filter((stop) => stop.stop_type === routeType);
    const completed = windowStops.filter(
      (stop) => stop.status === "completed",
    ).length;
    const skipped = windowStops.filter((stop) => {
      if (stop.status === "skipped") return true;
      if (stop.status === "completed") return false;

      const windowEnd = timeToMinutes(
        routeType === "pickup" ? route?.pickup_end_time : route?.dropoff_end_time,
      );
      return windowEnd !== null && currentMinutes > windowEnd;
    }).length;

    return {
      completed,
      skipped,
      pending: Math.max(0, windowStops.length - completed - skipped),
    };
  }, [currentMinutes, route, routeType, stops]);
  const activeStopWindowKey = routeType === "pickup" ? "pickup" : "dropoff";
  const canGoOnline = inPickupWindow || inDropoffWindow;
  const activeWindowStart = routeType === "pickup" ? pickupStart : dropoffStart;
  const currentRouteWindow = inPickupWindow
    ? {
        label: "Morning pickup",
      time: route?.pickup_start_time?.slice(0, 5) || "--:--",
      }
    : inDropoffWindow
      ? {
          label: "Afternoon drop-off",
          time: route?.dropoff_start_time?.slice(0, 5) || "--:--",
        }
      : null;
  const upcomingRouteWindow = [
    {
      label: "Morning pickup",
      start: pickupStart,
      time: route?.pickup_start_time?.slice(0, 5) || "--:--",
    },
    {
      label: "Afternoon drop-off",
      start: dropoffStart,
      time: route?.dropoff_start_time?.slice(0, 5) || "--:--",
    },
  ]
    .filter(
      (window) => window.start !== null && window.start > currentMinutes,
    )
    .sort((first, second) => (first.start ?? 0) - (second.start ?? 0))[0];
  const nextRouteWindow = currentRouteWindow || upcomingRouteWindow || null;
  const activeWindowStarted =
    activeWindowStart !== null && currentMinutes >= activeWindowStart;
  const activeWindowStops = stops.filter(
    (stop) => stop.stop_type === routeType,
  );
  const allActiveWindowStopsCompleted =
    activeWindowStops.length > 0 &&
    activeWindowStops.every((stop) =>
      ["completed", "skipped"].includes(stop.status || ""),
    );
  const activeWindowCompleted = allActiveWindowStopsCompleted;
  const {
    online,
    busy,
    error,
    lastLocation,
    updateStop,
    getPickupContacts,
  } = useDriverTracking(route?.id, routeType);

  const shouldBlink = canGoOnline && !activeWindowCompleted && !online;

  React.useEffect(() => {
    if (!handoffStop) return;
    let active = true;
    setPickupContactsLoading(true);
    getPickupContacts(handoffStop.id)
      .then((contacts) => {
        if (active) setPickupContacts(contacts);
      })
      .catch((contactsError: any) => {
        if (active) {
          setPickupContacts([]);
          Alert.alert(
            "Authorized contacts unavailable",
            contactsError?.message ||
              "Use the parent's safety PIN if it is available.",
          );
        }
      })
      .finally(() => {
        if (active) setPickupContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getPickupContacts, handoffStop]);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const pickupStops = [...stops].filter((stop) => stop.stop_type === "pickup");
  const dropoffStops = [...stops].filter(
    (stop) => stop.stop_type === "dropoff",
  );
  const visibleStops = stops.filter(
    (stop) => stop.stop_type === activeStopWindowKey,
  );
  const completedVisibleStops = visibleStops.filter(
    (stop) => stop.status === "completed",
  ).length;
  const boardedChildIds =
    routeType === "dropoff"
      ? dropoffStops
          .filter(
            (stop) =>
              wasBoardedOnServiceDate(stop, serviceDateKey) &&
              !["completed", "skipped"].includes(stop.status || ""),
          )
          .map((stop) => stop.child_id)
      : pickupStops
          .filter((stop) => stop.status === "completed")
          .map((stop) => stop.child_id);
  const childrenOnboardCount = new Set(boardedChildIds).size;
  const routeChildCount = route?.route_children?.length || 0;
  const routeProgress = visibleStops.length
    ? Math.round((completedVisibleStops / visibleStops.length) * 100)
    : 0;
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
  const unboardedSchoolStops = dropoffStops.filter(
    (stop) =>
      !["completed", "skipped"].includes(stop.status || "") &&
      !wasBoardedOnServiceDate(stop, serviceDateKey),
  );
  const eligibleDropoffStops = unboardedSchoolStops.length
    ? unboardedSchoolStops
    : dropoffStops.filter(
        (stop) =>
          wasBoardedOnServiceDate(stop, serviceDateKey) &&
          !["completed", "skipped"].includes(stop.status || ""),
      );
  const nearestFirstStopRef = React.useRef<{
    key: string;
    stopId: string | null;
  }>({ key: "", stopId: null });
  const [nearestFirstStopId, setNearestFirstStopId] = React.useState<
    string | null
  >(null);
  const phaseStops =
    routeType === "pickup" ? pickupStops : eligibleDropoffStops;
  const routeOrderKey = [
    route?.id || "",
    routeType,
    ...phaseStops
      .map((stop) =>
        [
          stop.id,
          ["completed", "skipped"].includes(stop.status || "")
            ? stop.status
            : wasBoardedOnServiceDate(stop, serviceDateKey)
              ? "boarded"
              : "pending",
        ].join(":"),
      )
      .sort(),
  ].join("|");

  React.useEffect(() => {
    if (!online || !driverCoordinate || nearestFirstStopRef.current.key === routeOrderKey) {
      return;
    }

    const nearestStop = phaseStops
      .filter(
        (stop) =>
          !["completed", "skipped"].includes(stop.status || "") &&
          getStopPhaseCoordinate(stop, route, routeType, serviceDateKey),
      )
      .sort(
        (first, second) => {
          const firstCoordinate = getStopPhaseCoordinate(
            first,
            route,
            routeType,
            serviceDateKey,
          );
          const secondCoordinate = getStopPhaseCoordinate(
            second,
            route,
            routeType,
            serviceDateKey,
          );
          if (!firstCoordinate) return 1;
          if (!secondCoordinate) return -1;
          return (
            distanceInMeters(driverCoordinate, firstCoordinate) -
            distanceInMeters(driverCoordinate, secondCoordinate)
          );
        },
      )[0];
    const stopId = nearestStop?.id || null;
    nearestFirstStopRef.current = { key: routeOrderKey, stopId };
    setNearestFirstStopId(stopId);
  }, [
    driverCoordinate,
    online,
    phaseStops,
    route,
    routeOrderKey,
    routeType,
    serviceDateKey,
  ]);

  const orderStops = (items: any[]) => {
    return [...items].sort((first, second) => {
      const firstDone = ["completed", "skipped"].includes(first.status);
      const secondDone = ["completed", "skipped"].includes(second.status);
      if (firstDone !== secondDone) return firstDone ? 1 : -1;
      if (first.id === nearestFirstStopId) return -1;
      if (second.id === nearestFirstStopId) return 1;
      return (first.stop_order || 0) - (second.stop_order || 0);
    });
  };

  const orderedPickupStops = orderStops(pickupStops);
  const orderedDropoffStops = orderStops(eligibleDropoffStops);
  const selectedStops =
    activeStopWindowKey === "pickup" ? orderedPickupStops : orderedDropoffStops;
  const selectedStopGroups = groupStopsForList(
    selectedStops.map((stop) => {
      if (
        routeType !== "dropoff" ||
        wasBoardedOnServiceDate(stop, serviceDateKey)
      ) {
        return stop;
      }
      const child = route?.route_children?.find(
        (routeChild) => routeChild.child_id === stop.child_id,
      )?.children;
      const school = child?.schools;
      return {
        ...stop,
        latitude: school?.latitude ?? stop.latitude,
        longitude: school?.longitude ?? stop.longitude,
        displayAddress:
          school?.name || school?.address || child?.school_name || "School",
      };
    }),
  );
  const orderedStops = orderStops(
    routeType === "pickup" ? pickupStops : eligibleDropoffStops,
  );
  const nextStop = orderedStops.find(
    (stop) => !["completed", "skipped"].includes(stop.status),
  );

  const mapStops = [...stops].sort(
    (first, second) => (first.stop_order || 0) - (second.stop_order || 0),
  );
  const stopMarkerRecords = mapStops
    .map((stop) => {
      if (!hasCoordinates(stop.latitude, stop.longitude)) return null;
      const child = route?.route_children?.find(
        (routeChild) => routeChild.child_id === stop.child_id,
      )?.children;
      const childName = [child?.name, child?.lastname]
        .filter(Boolean)
        .join(" ");
      return {
        stopId: stop.id,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        title: childName || "Student",
        type: stop.stop_type,
        stopOrder: stop.stop_order || 0,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
  const mapStopMarkers = (["pickup", "dropoff"] as const).flatMap((type) =>
    groupNearbyLocations(
      stopMarkerRecords.filter((marker) => marker.type === type),
    ).map((group) => {
      const students = [
        ...new Set(group.items.map((item) => item.title as string)),
      ];
      return {
        stopId: group.items[0].stopId,
        stopIds: group.items.map((item) => item.stopId),
        latitude: group.latitude,
        longitude: group.longitude,
        title: `${type === "pickup" ? "Pickup" : "Drop-off"} · ${students.join(", ")}`,
        type,
      } as DriverMapMarker;
    }),
  );
  const schoolStops =
    routeType === "dropoff"
      ? unboardedSchoolStops
      : pickupStops.filter(
          (stop) =>
            stop.status === "completed" ||
            wasBoardedOnServiceDate(stop, serviceDateKey),
        );
  const schoolStopRecords = schoolStops
    .map((stop) => {
      const child = route?.route_children?.find(
        (routeChild) => routeChild.child_id === stop.child_id,
      )?.children;
      const school = child?.schools;
      if (!school || !hasCoordinates(school.latitude, school.longitude)) {
        return null;
      }
      return {
        stopId: stop.id,
        latitude: Number(school.latitude),
        longitude: Number(school.longitude),
        title: child?.name || "Student",
        schoolName: school.name || school.address || "School",
        stopOrder: stop.stop_order || 0,
      };
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);
  const schoolMarkers = groupNearbyLocations(schoolStopRecords).map((group) => {
    const students = [...new Set(group.items.map((item) => item.title))];
    return {
      stopId: group.items[0].stopId,
      stopIds: group.items.map((item) => item.stopId),
      latitude: group.latitude,
      longitude: group.longitude,
      title: `${group.items[0].schoolName} · ${students.join(", ")}`,
      type: "end" as const,
      endpoint: "end" as const,
      stopOrder: Math.min(...group.items.map((item) => item.stopOrder)),
    };
  });
  const activeStopGroups =
    routeType === "pickup"
      ? [
          ...groupNearbyLocations(
            stopMarkerRecords.filter(
              (marker) =>
                marker.type === "pickup" &&
                pickupStops.some(
                  (stop) =>
                    stop.id === marker.stopId &&
                    !["completed", "skipped"].includes(stop.status || ""),
                ),
            ),
          ).map((group) => ({
            stopId: group.items[0].stopId,
            stopIds: group.items.map((item) => item.stopId),
            latitude: group.latitude,
            longitude: group.longitude,
            title: `Pickup · ${[...new Set(group.items.map((item) => item.title))].join(", ")}`,
            type: "pickup" as const,
            stopOrder: Math.min(...group.items.map((item) => item.stopOrder)),
          })),
          ...schoolMarkers,
        ]
      : unboardedSchoolStops.length
        ? schoolMarkers
        : groupNearbyLocations(
            stopMarkerRecords.filter(
              (marker) =>
                marker.type === "dropoff" &&
                eligibleDropoffStops.some((stop) => stop.id === marker.stopId),
            ),
          ).map((group) => ({
            stopId: group.items[0].stopId,
            stopIds: group.items.map((item) => item.stopId),
            latitude: group.latitude,
            longitude: group.longitude,
            title: `Drop-off · ${[...new Set(group.items.map((item) => item.title))].join(", ")}`,
            type: "dropoff" as const,
            stopOrder: Math.min(...group.items.map((item) => item.stopOrder)),
          }));
  const plannedStopGroups =
    routeType === "pickup"
      ? [
          ...activeStopGroups
            .filter((group) => group.type === "pickup")
            .sort((first, second) => first.stopOrder - second.stopOrder),
          ...activeStopGroups
            .filter((group) => group.type === "end")
            .sort((first, second) => first.stopOrder - second.stopOrder),
        ]
      : [...activeStopGroups].sort(
          (first, second) => first.stopOrder - second.stopOrder,
        );
  const nearestGroupIndex = plannedStopGroups.findIndex((group) =>
    group.stopIds?.includes(nearestFirstStopId || ""),
  );
  const navigationStops =
    nearestGroupIndex > 0
      ? [
          plannedStopGroups[nearestGroupIndex],
          ...plannedStopGroups.filter((_, index) => index !== nearestGroupIndex),
        ]
      : plannedStopGroups;
  const navigationNextStop = navigationStops[0] || null;
  const schoolMarker = schoolMarkers[0] || null;
  const needsSchoolPickup =
    routeType === "dropoff" && unboardedSchoolStops.length > 0;
  const nearbyApproachGroups = React.useMemo(() => {
    if (!online || !driverCoordinate) return [];
    const candidates = [];
    if (routeType === "pickup") {
      for (const stop of pickupStops) {
        if (
          ["completed", "skipped"].includes(stop.status || "") ||
          !hasCoordinates(stop.latitude, stop.longitude)
        ) {
          continue;
        }
        candidates.push({
          stop,
          stage: "home_pickup" as const,
          latitude: Number(stop.latitude),
          longitude: Number(stop.longitude),
          location: stop.address || "Pickup location",
        });
      }
    } else {
      for (const stop of dropoffStops) {
        if (["completed", "skipped"].includes(stop.status || "")) continue;
        const wasBoarded = wasBoardedOnServiceDate(stop, serviceDateKey);
        const isSchoolPickup = !wasBoarded;
        if (
          unboardedSchoolStops.length
            ? !isSchoolPickup
            : !wasBoarded
        ) {
          continue;
        }
        const child = route?.route_children?.find(
          (routeChild) => routeChild.child_id === stop.child_id,
        )?.children;
        const latitude = isSchoolPickup
          ? child?.schools?.latitude
          : stop.latitude;
        const longitude = isSchoolPickup
          ? child?.schools?.longitude
          : stop.longitude;
        if (!hasCoordinates(latitude, longitude)) continue;
        candidates.push({
          stop,
          stage: isSchoolPickup
            ? ("school_pickup" as const)
            : ("home_dropoff" as const),
          latitude: Number(latitude),
          longitude: Number(longitude),
          location: isSchoolPickup
            ? child?.schools?.name || child?.school_name || "School"
            : stop.address || "Drop-off location",
        });
      }
    }

    const groups: {
      key: string;
      stage: "home_pickup" | "school_pickup" | "home_dropoff";
      stopIds: string[];
      location: string;
      latitude: number;
      longitude: number;
    }[] = [];
    for (const candidate of candidates) {
      const group = groups.find(
        (existing) =>
          existing.stage === candidate.stage &&
          distanceInMeters(existing, candidate) <= 150,
      );
      if (group) {
        group.stopIds.push(candidate.stop.id);
      } else {
        groups.push({
          key: "",
          stage: candidate.stage,
          stopIds: [candidate.stop.id],
          location: candidate.location,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        });
      }
    }
    return groups
      .filter((group) => distanceInMeters(driverCoordinate, group) <= 150)
      .map((group) => ({
        ...group,
        key: `${serviceDateKey}:${route?.id}:${group.stage}:${[...group.stopIds].sort().join(",")}`,
      }));
  }, [
    driverCoordinate,
    dropoffStops,
    online,
    pickupStops,
    route?.id,
    route?.route_children,
    routeType,
    serviceDateKey,
    unboardedSchoolStops.length,
  ]);
  const approachStops = React.useMemo(
    () =>
      (approachCard?.stopIds || [])
        .map((stopId) => stops.find((stop) => stop.id === stopId))
        .filter((stop): stop is NonNullable<typeof stop> => stop !== undefined),
    [approachCard, stops],
  );

  React.useEffect(() => {
    const currentGroup = approachCard
      ? nearbyApproachGroups.find((group) => group.key === approachCard.key)
      : null;
    const completedStage =
      approachCard?.stage === "home_pickup"
        ? (stop: (typeof stops)[number]) =>
            ["completed", "skipped"].includes(stop.status || "")
        : approachCard?.stage === "school_pickup"
          ? (stop: (typeof stops)[number]) =>
              wasBoardedOnServiceDate(stop, serviceDateKey) ||
              ["completed", "skipped"].includes(stop.status || "")
          : (stop: (typeof stops)[number]) =>
              ["completed", "skipped"].includes(stop.status || "");
    if (
      approachCard &&
      approachStops.length > 0 &&
      approachStops.every(completedStage)
    ) {
      setApproachCard(null);
      setApproachModalVisible(false);
      return;
    }
    if (currentGroup && !promptedApproachKeys.current.has(currentGroup.key)) {
      promptedApproachKeys.current.add(currentGroup.key);
      setApproachCard(currentGroup);
      setApproachModalVisible(true);
    }
  }, [approachCard, approachStops, nearbyApproachGroups, stops]);

  React.useEffect(() => {
    setApproachCard(null);
    setApproachModalVisible(false);
    promptedApproachKeys.current.clear();
  }, [route?.id]);

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
  const gpsHeading = lastLocation?.coords.heading;
  const gpsSpeed = lastLocation?.coords.speed;
  const driverHeading =
    typeof gpsHeading === "number" &&
    Number.isFinite(gpsHeading) &&
    gpsHeading >= 0 &&
    typeof gpsSpeed === "number" &&
    gpsSpeed > 1
      ? gpsHeading
      : driverCoordinate && navigationNextStop
        ? getBearingDegrees(driverCoordinate, navigationNextStop)
        : null;
  const driverMarker = driverCoordinate
    ? {
        ...driverCoordinate,
        title: "You are here",
        type: "driver" as const,
        heading: driverHeading ?? 0,
      }
    : null;
  const dropoffMapStops = mapStopMarkers.filter(
    (marker) => marker.type === "dropoff",
  );
  const activeMapStopMarkers = mapStopMarkers.filter(
    (marker) => marker.type === (activeStopType || activeStopWindowKey),
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
  const directionsOrigin = driverCoordinate || navigationStops[0] || mapOrigin;
  const directionsDestination =
    navigationStops.length > 0
      ? navigationStops[navigationStops.length - 1]
      : mapDestination;
  const directionsWaypoints =
    navigationStops.length > 2 ? navigationStops.slice(1, -1) : [];
  const routeMapMarkers = activeStopType
    ? ([
        ...navigationStops.map((marker, index) => ({
          ...marker,
          title: `${index === 0 ? "NEXT" : `STOP ${index + 1}`} · ${marker.title || "Stop"}`,
        })),
        ...(navigationStops.length === 0 ? [mapOrigin, mapDestination] : []),
        driverMarker,
      ].filter(Boolean) as DriverMapMarker[])
    : [];
  const distanceLeft =
    driverCoordinate &&
    navigationNextStop &&
    hasCoordinates(navigationNextStop.latitude, navigationNextStop.longitude)
      ? distanceInMeters(driverCoordinate, {
          latitude: Number(navigationNextStop.latitude),
          longitude: Number(navigationNextStop.longitude),
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
    if (!driverCoordinate || !navigationNextStop || !GOOGLE_API_KEY) return;
    const latitude = Number(navigationNextStop.latitude);
    const longitude = Number(navigationNextStop.longitude);
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
    navigationNextStop?.title,
    navigationNextStop?.latitude,
    navigationNextStop?.longitude,
    distanceLeft,
    driverCoordinate,
    navigationNextStop,
  ]);

  const handleStop = async (stop: any, action: DriverStopAction) => {
    setActionStop(null);
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
    if (action === "child_not_present") {
      setNotPresentStopId(stop.id);
      setNotPresentReason("");
      setApproachModalVisible(false);
      return;
    }

    try {
      if (action === "dropped_off") {
        setHandoffStop(stop);
        setRecipientName("");
        setSafetyPin("");
        setPickupContacts([]);
        setSelectedPickupContactId("");
        setHandoffVerificationType("parent");
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

  const runApproachAction = async (
    stop: any,
    action: DriverStopAction,
    reason?: string,
  ) => {
    if (approachBusy) return;
    setApproachBusy(true);
    try {
      await updateStop(stop.id, action, { reason });
      await refreshRoutes(true);
    } catch (actionError: any) {
      Alert.alert(
        "Unable to update student",
        actionError?.message || "Please try again.",
      );
    } finally {
      setApproachBusy(false);
    }
  };

  const confirmNotPresent = async () => {
    if (!notPresentStopId || !notPresentReason.trim() || approachBusy) {
      Alert.alert("Reason required", "Enter why the student was not present.");
      return;
    }
    const stop = stops.find((candidate) => candidate.id === notPresentStopId);
    if (!stop) {
      Alert.alert("Stop unavailable", "Refresh the route and try again.");
      return;
    }
    setApproachBusy(true);
    try {
      await updateStop(stop.id, "child_not_present", {
        reason: notPresentReason.trim(),
      });
      setNotPresentStopId(null);
      setNotPresentReason("");
      await refreshRoutes(true);
    } catch (actionError: any) {
      Alert.alert(
        "Unable to record absence",
        actionError?.message || "Please try again.",
      );
    } finally {
      setApproachBusy(false);
    }
  };

  const pickUpAllApproachStudents = async () => {
    if (!approachCard || approachBusy || approachCard.stage === "home_dropoff") {
      return;
    }
    const action: DriverStopAction =
      approachCard.stage === "school_pickup" ? "boarded" : "picked_up";
    const remaining = approachStops.filter(
      (stop: any) =>
        !["completed", "skipped"].includes(stop.status || "") &&
        (action !== "boarded" ||
          !wasBoardedOnServiceDate(stop, serviceDateKey)),
    );
    if (!remaining.length) return;
    setApproachBusy(true);
    try {
      for (const stop of remaining) {
        await updateStop(stop.id, action);
      }
      setApproachModalVisible(false);
      await refreshRoutes(true);
    } catch (actionError: any) {
      Alert.alert(
        "Some students were not updated",
        actionError?.message || "Refresh the route and continue individually.",
      );
      await refreshRoutes(true);
    } finally {
      setApproachBusy(false);
    }
  };

  const confirmDropoff = async () => {
    if (!handoffStop || handoffBusy) return;
    const usingAuthorizedContact =
      handoffVerificationType === "authorized_contact";
    if (
      (usingAuthorizedContact &&
        (!selectedPickupContactId || !/^\d{6}$/.test(safetyPin))) ||
      (!usingAuthorizedContact &&
        (!recipientName.trim() || !/^\d{4,6}$/.test(safetyPin)))
    ) {
      Alert.alert(
        "Handoff details required",
        usingAuthorizedContact
          ? "Select an authorized contact and enter their six-digit pickup PIN."
          : "Enter the recipient's name and the parent's 4–6 digit safety PIN.",
      );
      return;
    }

    setHandoffBusy(true);
    try {
      await updateStop(handoffStop.id, "dropped_off", {
        recipientName: usingAuthorizedContact
          ? undefined
          : recipientName.trim(),
        safetyPin,
        pickupContactId: usingAuthorizedContact
          ? selectedPickupContactId
          : undefined,
      });
      setHandoffStop(null);
      setRecipientName("");
      setSafetyPin("");
      setSelectedPickupContactId("");
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
    if (activeWindowCompleted) {
      Alert.alert(
        "Route completed",
        `All ${routeType === "pickup" ? "morning pickup" : "afternoon drop-off"} stops are complete.`,
      );
      return;
    }

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

  const actionStopIsSchoolPickup =
    actionStop?.stop_type === "dropoff" &&
    !wasBoardedOnServiceDate(actionStop, serviceDateKey);
  const stopActionOptions: {
    action: DriverStopAction;
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    color: string;
  }[] = actionStop
    ? [
        ...(actionStop.status !== "in_progress"
          ? [
              {
                action: "arrived" as const,
                label: "Mark arrived",
                icon: "location-on" as const,
                color: colors.primary,
              },
            ]
          : []),
        {
          action: actionStopIsSchoolPickup
            ? "boarded"
            : actionStop.stop_type === "pickup"
              ? "picked_up"
              : "dropped_off",
          label:
            actionStopIsSchoolPickup
              ? "Confirm school pickup"
              : actionStop.stop_type === "pickup"
                ? "Confirm pickup"
                : "Complete drop-off",
          icon: "check-circle" as const,
          color: "#15803D",
        },
        {
          action: "child_not_present",
          label: "Child not present",
          icon: "person-off",
          color: "#DC2626",
        },
        {
          action: "skipped",
          label: "Skip stop",
          icon: "do-not-disturb-on",
          color: "#C2410C",
        },
        {
          action: "incident",
          label: "Report incident",
          icon: "warning",
          color: "#B91C1C",
        },
      ]
    : [];

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
        {(route?.route_absences || []).length > 0 ? (
          <View
            accessibilityRole="alert"
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: DRIVER_COLORS.dangerSurface,
              borderWidth: 1,
              borderColor: DRIVER_COLORS.danger,
            }}
          >
            <Text
              style={{
                color: DRIVER_COLORS.danger,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              Scheduled child absences
            </Text>
            {(route?.route_absences || []).map((absence) => (
              <Text
                key={`${absence.child_id}:${absence.absence_date}`}
                style={{ color: DRIVER_COLORS.text, marginTop: 3 }}
              >
                {absence.message}
              </Text>
            ))}
          </View>
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
          style={{ margin: 16, borderRadius: 20, padding: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                backgroundColor: "rgba(255,255,255,0.14)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <MaterialIcons name="directions-bus" size={21} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Current Route
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {route?.route_name || "No route assigned"}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {route?.start_location || "Route start"} →{" "}
                {route?.end_location || "Route end"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(5,9,11,0.3)",
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 999,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: online
                      ? DRIVER_COLORS.success
                      : DRIVER_COLORS.muted,
                    marginRight: 5,
                  }}
                />
                <Text
                  style={{
                    color: online ? DRIVER_COLORS.success : DRIVER_COLORS.muted,
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 0.4,
                  }}
                >
                  {online ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.16)",
              marginVertical: 12,
            }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 82,
                padding: 11,
                borderRadius: 14,
                backgroundColor: "rgba(5,9,11,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.76)",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Children onboard
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}
              >
                {childrenOnboardCount}
                <Text
                  style={{
                    color: "rgba(255,255,255,0.72)",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  / {routeChildCount}
                </Text>
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 82,
                padding: 11,
                borderRadius: 14,
                backgroundColor: "rgba(5,9,11,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.76)",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {currentRouteWindow ? "Active Window" : "Next Window"}
              </Text>
              {nextRouteWindow ? (
                <View>
                  <Text
                    numberOfLines={1}
                    style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}
                  >
                    {nextRouteWindow.time}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: "rgba(255,255,255,0.76)",
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    {nextRouteWindow.label}
                  </Text>
                </View>
              ) : (
                <Text
                  numberOfLines={1}
                  style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}
                >
                  No more today
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 82,
                padding: 11,
                borderRadius: 14,
                backgroundColor: "rgba(5,9,11,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.76)",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Distance to next stop
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}
              >
                {online ? formatDistance(distanceLeft) : "--"}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 82,
                padding: 11,
                borderRadius: 14,
                backgroundColor: "rgba(5,9,11,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.76)",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Window progress
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                  {routeProgress}%
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.76)",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {completedVisibleStops}/{visibleStops.length} stops
                </Text>
              </View>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <View
                  style={{
                    width: `${routeProgress}%`,
                    height: "100%",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </View>
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
                        ? DRIVER_COLORS.successSurface
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
            borderRadius: 16,
            backgroundColor: DRIVER_COLORS.card,
            borderWidth: 1,
            borderColor: DRIVER_COLORS.cardBorder,
            padding: 12,
          }}
        >
          <Text
            style={{
              color: DRIVER_COLORS.muted,
              fontSize: 11,
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            Route summary
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {[
              {
                label: "Completed",
                value: routeSummary.completed,
                color: DRIVER_COLORS.success,
              },
              {
                label: "Remaining",
                value: routeSummary.pending,
                color: DRIVER_COLORS.warning,
              },
              {
                label: "Skipped",
                value: routeSummary.skipped,
                color: DRIVER_COLORS.muted,
              },
            ].map((item, index) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  paddingVertical: 4,
                  borderRightWidth: index < 2 ? 1 : 0,
                  borderColor: DRIVER_COLORS.cardBorder,
                }}
              >
                <Text
                  style={{
                    color: item.color,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  {item.value}
                </Text>
                <Text
                  style={{
                    color: DRIVER_COLORS.text,
                    fontSize: 10,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
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
            borderRadius: 14,
            borderWidth: 1,
            borderColor: DRIVER_COLORS.cardBorder,
            backgroundColor: DRIVER_COLORS.card,
          }}
        >
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("map")}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRouteTab === "map" }}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 9,
              paddingHorizontal: 2,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor:
                selectedRouteTab === "map"
                  ? DRIVER_COLORS.primaryDark
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "map"
                    ? DRIVER_COLORS.cyan
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "map" ? "800" : "600",
                fontSize: 11,
              }}
            >
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("stops")}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRouteTab === "stops" }}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 9,
              paddingHorizontal: 2,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor:
                selectedRouteTab === "stops"
                  ? DRIVER_COLORS.primaryDark
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "stops"
                    ? DRIVER_COLORS.cyan
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "stops" ? "800" : "600",
                fontSize: 11,
              }}
            >
              Stops
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("children")}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRouteTab === "children" }}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 9,
              paddingHorizontal: 2,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor:
                selectedRouteTab === "children"
                  ? DRIVER_COLORS.primaryDark
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "children"
                    ? DRIVER_COLORS.cyan
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "children" ? "800" : "600",
                fontSize: 11,
              }}
            >
              Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteTab("info")}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedRouteTab === "info" }}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 9,
              paddingHorizontal: 2,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              backgroundColor:
                selectedRouteTab === "info"
                  ? DRIVER_COLORS.primaryDark
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedRouteTab === "info"
                    ? DRIVER_COLORS.cyan
                    : DRIVER_COLORS.muted,
                fontWeight: selectedRouteTab === "info" ? "800" : "600",
                fontSize: 11,
              }}
            >
              Details
            </Text>
          </TouchableOpacity>
        </View>

        {approachCard ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#F59E0B",
              backgroundColor: DRIVER_COLORS.warningSurface,
            }}
          >
            <Text
              style={{
                color: DRIVER_COLORS.warning,
                fontSize: 15,
                fontWeight: "800",
              }}
            >
              Within 150 metres · {approachCard.location}
            </Text>
            <Text style={{ color: DRIVER_COLORS.warning, marginTop: 5 }}>
              {approachStops.length} student
              {approachStops.length === 1 ? "" : "s"} at this stop. The
              arrival prompt stays here until the stop is handled.
            </Text>
            <TouchableOpacity
              onPress={() => setApproachModalVisible(true)}
              style={{
                marginTop: 10,
                paddingVertical: 10,
                borderRadius: 9,
                alignItems: "center",
                backgroundColor: DRIVER_COLORS.warning,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                Review students
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedRouteTab === "map" ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 4,
              marginBottom: 16,
              borderRadius: 18,
              height: 220,
              overflow: "hidden",
              backgroundColor: DRIVER_COLORS.card,
              borderWidth: 1,
              borderColor: DRIVER_COLORS.cardBorder,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 1,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: "rgba(5,9,11,0.82)",
                borderWidth: 1,
                borderColor: DRIVER_COLORS.cardBorder,
              }}
            >
              <MaterialIcons
                name={activeStopType ? "route" : "schedule"}
                size={14}
                color={activeStopType ? DRIVER_COLORS.cyan : DRIVER_COLORS.muted}
              />
              <Text
                style={{
                  marginLeft: 6,
                  color: DRIVER_COLORS.text,
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {activeStopType === "pickup"
                  ? "Morning pickup"
                  : activeStopType === "dropoff"
                    ? "Afternoon drop-off"
                    : "No active window"}
              </Text>
            </View>
            {routeMapMarkers.length > 0 ? (
              <CustomMap
                markers={routeMapMarkers}
                origin={directionsOrigin}
                destination={directionsDestination}
                waypoints={directionsWaypoints}
                showMarkerLabels
                style={{ flex: 1, width: "100%" }}
              />
            ) : (
              <View
                style={{
                  alignItems: "center",
                  paddingHorizontal: 24,
                  paddingTop: 20,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: DRIVER_COLORS.surfaceRaised,
                    marginBottom: 12,
                  }}
                >
                  <MaterialIcons
                    name="location-off"
                    size={23}
                    color={DRIVER_COLORS.muted}
                  />
                </View>
                <Text
                  style={{
                    color: DRIVER_COLORS.text,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Map unavailable
                </Text>
                <Text
                  style={{
                    color: DRIVER_COLORS.muted,
                    fontSize: 11,
                    lineHeight: 16,
                    marginTop: 5,
                    textAlign: "center",
                  }}
                >
                  Stop coordinates will appear here when available.
                </Text>
              </View>
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
                  borderRadius: 12,
                  backgroundColor: "rgba(5,9,11,0.82)",
                  borderWidth: 1,
                  borderColor: DRIVER_COLORS.cardBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="fullscreen" size={23} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Modal
          visible={approachModalVisible && Boolean(approachCard)}
          transparent
          animationType="slide"
          onRequestClose={() => setApproachModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 18,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
            }}
          >
            <View
              style={{
                maxHeight: "85%",
                padding: 18,
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
                {approachCard?.stage === "home_dropoff"
                  ? "Arrived near drop-off"
                  : approachCard?.stage === "school_pickup"
                    ? "School pickup"
                    : "Home pickup"}
              </Text>
              <Text style={{ color: colors.text.secondary, marginTop: 5 }}>
                {approachCard?.location} · within 150 metres
              </Text>
              <ScrollView style={{ marginTop: 12 }}>
                {approachStops.map((stop: any) => {
                  const child = route?.route_children?.find(
                    (routeChild) => routeChild.child_id === stop.child_id,
                  )?.children;
                  const childName =
                    [child?.name, child?.lastname].filter(Boolean).join(" ") ||
                    "Student";
                  const isHandled =
                    approachCard?.stage === "school_pickup"
                      ? wasBoardedOnServiceDate(stop, serviceDateKey)
                      : ["completed", "skipped"].includes(stop.status || "");
                  const rowAction: DriverStopAction =
                    approachCard?.stage === "home_pickup"
                      ? "picked_up"
                      : approachCard?.stage === "school_pickup"
                        ? "boarded"
                        : "arrived";
                  const rowActionLabel =
                    approachCard?.stage === "home_dropoff"
                      ? stop.status === "in_progress"
                        ? "Arrived · handoff pending"
                        : "Mark arrived"
                      : isHandled
                        ? "Confirmed"
                        : approachCard?.stage === "school_pickup"
                          ? "Mark boarded"
                          : "Mark picked up";
                  return (
                    <View
                      key={stop.id}
                      style={{
                        paddingVertical: 11,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text.primary,
                          fontWeight: "700",
                        }}
                      >
                        {childName}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        <TouchableOpacity
                          disabled={
                            approachBusy ||
                            isHandled ||
                            (approachCard?.stage === "home_dropoff" &&
                              stop.status === "in_progress")
                          }
                          onPress={() =>
                            void runApproachAction(stop, rowAction)
                          }
                          style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 8,
                            alignItems: "center",
                            backgroundColor: isHandled
                              ? "#DCFCE7"
                              : colors.primary,
                            opacity: approachBusy ? 0.6 : 1,
                          }}
                        >
                          <Text
                            style={{
                              color: isHandled ? "#166534" : "#FFFFFF",
                              fontSize: 12,
                              fontWeight: "800",
                            }}
                          >
                            {rowActionLabel}
                          </Text>
                        </TouchableOpacity>
                        {!isHandled ? (
                          <TouchableOpacity
                            disabled={approachBusy}
                            onPress={() => void handleStop(stop, "child_not_present")}
                            style={{ padding: 9, marginLeft: 6 }}
                          >
                            <Text
                              style={{
                                color: "#B91C1C",
                                fontSize: 12,
                                fontWeight: "700",
                              }}
                            >
                              Not present
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {approachCard?.stage !== "home_dropoff" ? (
                  <TouchableOpacity
                    disabled={approachBusy}
                    onPress={() => void pickUpAllApproachStudents()}
                    style={{
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderRadius: 9,
                      backgroundColor: colors.primary,
                      opacity: approachBusy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                      {approachBusy ? "Updating…" : "All remaining picked up"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  disabled={approachBusy}
                  onPress={() => setApproachModalVisible(false)}
                  style={{ paddingVertical: 11, paddingHorizontal: 12 }}
                >
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontWeight: "700",
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(notPresentStopId)}
          transparent
          animationType="fade"
          onRequestClose={() => setNotPresentStopId(null)}
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
                padding: 18,
                borderRadius: 14,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Record student not present
              </Text>
              <TextInput
                value={notPresentReason}
                onChangeText={setNotPresentReason}
                placeholder="Reason (required)"
                placeholderTextColor={colors.text.secondary}
                editable={!approachBusy}
                multiline
                style={{
                  minHeight: 72,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  color: colors.text.primary,
                  backgroundColor: colors.background,
                  textAlignVertical: "top",
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  disabled={approachBusy}
                  onPress={() => setNotPresentStopId(null)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: colors.text.secondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={approachBusy}
                  onPress={() => void confirmNotPresent()}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: "#B91C1C",
                    opacity: approachBusy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                    {approachBusy ? "Saving…" : "Save absence"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
              waypoints={directionsWaypoints}
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
                {navigationNextStop?.title ||
                  (needsSchoolPickup ? schoolMarker?.title : null) ||
                  nextStopChildName ||
                  "Next stop"}
              </Text>
              <Text style={{ color: "#CBD5E1", marginTop: 5 }}>
                {needsSchoolPickup
                  ? "Collect students at their assigned schools"
                  : nextStop?.stop_type === "pickup"
                    ? "Home pickup"
                    : "Continue to the next eligible stop"}{" "}
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
                      {routeChild.transport_restricted
                        ? "Not included in route"
                        : `${completedStops} of ${childStops.length} stops completed`}
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

          <View
            accessibilityRole="summary"
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor:
                activeStopWindowKey === "pickup" ? "#EAF7EF" : "#EEF5FF",
              borderWidth: 1,
              borderColor:
                activeStopWindowKey === "pickup" ? "#D5EBDD" : "#DCE9FA",
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  activeStopWindowKey === "pickup" ? "#D4F0DC" : "#DCEBFF",
              }}
            >
              <MaterialIcons
                name={
                  activeStopWindowKey === "pickup" ? "wb-sunny" : "wb-twilight"
                }
                size={22}
                color={
                  activeStopWindowKey === "pickup" ? "#16803C" : "#2563EB"
                }
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                {activeStopWindowKey === "pickup"
                  ? "Morning route"
                  : "Afternoon route"}
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  color: colors.text.secondary,
                  fontSize: 12,
                }}
              >
                {activeStopWindowKey === "pickup"
                  ? "Home pickups, then assigned schools"
                  : "Assigned school pickups, then home drop-offs"}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 12,
                backgroundColor: DRIVER_COLORS.surfaceRaised,
              }}
            >
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {selectedStopGroups.length} physical stops
              </Text>
            </View>
          </View>

          {routesLoading ? (
            <Text style={{ color: colors.text.secondary }}>
              Loading route...
            </Text>
          ) : selectedStops.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>
              No {activeStopWindowKey === "pickup" ? "morning" : "afternoon"}{" "}
              stops available.
            </Text>
          ) : (
            selectedStopGroups.map((group, index) => (
                <View
                  key={group.key}
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                    <Text
                      style={{
                        color: colors.text.primary,
                        fontSize: 14,
                        fontWeight: "800",
                        marginBottom: 8,
                      }}
                    >
                      Stop {index + 1} · {group.items.length} student
                      {group.items.length === 1 ? "" : "s"}
                    </Text>
                    <Text
                      style={{
                        color: colors.text.secondary,
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      {group.items[0].displayAddress ||
                        group.items[0].address ||
                        "Address unavailable"}
                    </Text>
                    {group.items.map((s: any) => {
                      const child = route?.route_children?.find(
                        (routeChild) => routeChild.child_id === s.child_id,
                      )?.children;
                      const isSchoolPickup =
                        routeType === "dropoff" &&
                        !wasBoardedOnServiceDate(s, serviceDateKey);
                      const stopAddress = isSchoolPickup
                        ? child?.schools?.name ||
                          child?.schools?.address ||
                          child?.school_name ||
                          "School"
                        : s.address || "Address unavailable";
                      return (
                        <View
                          key={s.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 9,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontWeight: "700",
                                color: colors.text.primary,
                              }}
                            >
                              {[child?.name, child?.lastname]
                                .filter(Boolean)
                                .join(" ") || "Child"}
                            </Text>
                            <Text
                              style={{
                                color: colors.text.secondary,
                                marginTop: 3,
                              }}
                            >
                              {isSchoolPickup
                                ? "School pickup"
                                : s.stop_type === "pickup"
                                  ? "Pickup"
                                  : "Drop-off"}{" "}
                              · {stopAddress}
                            </Text>
                            <Text
                              style={{
                                color: ["completed", "skipped"].includes(s.status)
                                  ? "#475569"
                                  : "#166534",
                                fontSize: 12,
                                fontWeight: "700",
                                marginTop: 5,
                              }}
                            >
                              {routeType === "dropoff" &&
                              wasBoardedOnServiceDate(s, serviceDateKey)
                                ? "Picked up · travelling to drop-off"
                                : s.status === "in_progress"
                                ? "Arrived"
                                : s.status === "completed"
                                  ? s.stop_type === "pickup"
                                    ? "Picked up"
                                    : "Dropped off"
                                  : s.status === "skipped"
                                    ? "Skipped"
                                    : "Awaiting stop action"}
                            </Text>
                          </View>
                          {!["completed", "skipped"].includes(s.status) ? (
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Actions for ${stopAddress}`}
                              onPress={() => setActionStop(s)}
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 13,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                              }}
                            >
                              <MaterialIcons
                                name="more-vert"
                                size={23}
                                color={colors.text.primary}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    })}
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
                opacity: activeWindowCompleted ? 0.72 : 1,
              }}
              onPress={handleOnlinePress}
              disabled={
                busy ||
                routesLoading ||
                Boolean(routesError) ||
                !route ||
                activeWindowCompleted ||
                (!online && !canGoOnline) ||
                (online && activeWindowStarted)
              }
            >
              <MaterialIcons
              name={
                activeWindowCompleted
                  ? "check-circle"
                  : online
                    ? "stop"
                    : "play-arrow"
              }
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
                {activeWindowCompleted
                  ? `${routeType === "pickup" ? "Morning" : "Afternoon"} completed`
                  : busy
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
          visible={Boolean(actionStop)}
          transparent
          animationType="slide"
          onRequestClose={() => setActionStop(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              padding: 12,
              backgroundColor: "rgba(15, 23, 42, 0.58)",
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close stop actions"
              onPress={() => setActionStop(null)}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <View
              style={{
                padding: 18,
                paddingBottom: 24,
                borderRadius: 24,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: 19,
                      fontWeight: "800",
                    }}
                  >
                    Stop actions
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{ color: colors.text.secondary, marginTop: 4 }}
                  >
                    {actionStop?.address || "Choose an action for this stop"}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close stop actions"
                  onPress={() => setActionStop(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.background,
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
              {!online ? (
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  Start the route to enable stop actions.
                </Text>
              ) : null}
              {stopActionOptions.map((option) => (
                <TouchableOpacity
                  key={option.action}
                  accessibilityRole="button"
                  disabled={!online || busy}
                  onPress={() => {
                    if (actionStop) void handleStop(actionStop, option.action);
                  }}
                  style={{
                    minHeight: 50,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    marginTop: 7,
                    borderRadius: 13,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: !online || busy ? 0.48 : 1,
                  }}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={20}
                    color={option.color}
                  />
                  <Text
                    style={{
                      marginLeft: 11,
                      color: colors.text.primary,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {option.label}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.text.secondary}
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

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
                Verify the recipient before completing this drop-off.
              </Text>
              {pickupContactsLoading && (
                <Text
                  style={{
                    color: colors.text.secondary,
                    marginTop: 12,
                  }}
                >
                  Checking authorized pickup contacts…
                </Text>
              )}
              {pickupContacts.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {(
                    [
                      ["parent", "Parent PIN"],
                      ["authorized_contact", "Authorized contact"],
                    ] as const
                  ).map(([method, label]) => (
                    <TouchableOpacity
                      key={method}
                      disabled={handoffBusy}
                      onPress={() => {
                        setHandoffVerificationType(method);
                        setSafetyPin("");
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor:
                          handoffVerificationType === method
                            ? colors.primary
                            : colors.border,
                        borderRadius: 999,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor:
                          handoffVerificationType === method
                            ? colors.primary
                            : colors.background,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            handoffVerificationType === method
                              ? "#FFFFFF"
                              : colors.text.primary,
                          fontWeight: "700",
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {handoffVerificationType === "authorized_contact" ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {pickupContacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      disabled={handoffBusy}
                      onPress={() => setSelectedPickupContactId(contact.id)}
                      style={{
                        borderWidth: 1,
                        borderColor:
                          selectedPickupContactId === contact.id
                            ? colors.primary
                            : colors.border,
                        borderRadius: 10,
                        padding: 12,
                        backgroundColor:
                          selectedPickupContactId === contact.id
                            ? colors.primary
                            : colors.background,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            selectedPickupContactId === contact.id
                              ? "#FFFFFF"
                              : colors.text.primary,
                          fontWeight: "700",
                        }}
                      >
                        {contact.name}
                      </Text>
                      <Text
                        style={{
                          color:
                            selectedPickupContactId === contact.id
                              ? "#FFFFFF"
                              : colors.text.secondary,
                          marginTop: 2,
                        }}
                      >
                        {contact.relationship}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
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
              )}
              <TextInput
                value={safetyPin}
                onChangeText={(value) =>
                  setSafetyPin(value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={
                  handoffVerificationType === "authorized_contact"
                    ? "Authorized contact pickup PIN"
                    : "Parent safety PIN"
                }
                placeholderTextColor={colors.text.secondary}
                editable={!handoffBusy}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={
                  handoffVerificationType === "authorized_contact" ? 6 : 6
                }
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
