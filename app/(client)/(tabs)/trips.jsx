import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import ClientHeader from "../components/ClientHeader";
import { useChildren } from "@/app-support/client/clientHelpers/hooks/useChildren";
import {
  getTodayRouteStops,
  isStopBoardedToday,
  isStopCompletedToday,
  isStopFinishedToday,
} from "@/app-support/client/clientHelpers/utils/routeStops";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import CustomMap from "../../../components/map";
import {
  subscribeToClientTripHistoryUpdates,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/clientRealtime";

const formatTime = (value) => {
  if (!value) return "Not scheduled";
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatTripTimestamp = (value) => {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatTripDateTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (minutes) =>
  Number.isFinite(minutes) ? `${Math.max(1, Math.round(minutes))} min` : "—";

const formatElapsedDuration = (seconds) => {
  const durationSeconds = Number(seconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return null;
  if (durationSeconds < 60) return "<1 min";

  const totalMinutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${totalMinutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

const formatLastLocation = (value) => {
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

const LONG_OFFLINE_WARNING_MS = 10 * 60 * 1000;
const TRIPS_CACHE_VERSION = 1;

const isLongOffline = (value, now) => {
  const recordedAt = new Date(value || "").getTime();
  return (
    Number.isFinite(recordedAt) && now - recordedAt >= LONG_OFFLINE_WARNING_MS
  );
};

const formatDate = (value) => {
  const parsedDate = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  return {
    day: date.toLocaleDateString([], { month: "short" }),
    date: date.getDate().toString(),
    label: date.toLocaleDateString([], { weekday: "short" }),
  };
};

const getHistoryStatusLabel = (item) => {
  if (item.status === "completed") return "Completed";
  if (item.status === "driver_offline") return "Driver offline";
  if (["canceled", "cancelled"].includes(item.status)) return "Canceled";
  if (item.status === "failed") {
    return item.outcome === "failed_to_pick_up"
      ? "Pickup not completed"
      : item.outcome === "failed_to_drop_off"
        ? "Drop-off not completed"
        : "Not completed";
  }
  return "Not completed";
};

const getHistoryReason = (item) => {
  if (item.status === "completed") return null;
  if (
    item.status === "driver_offline" ||
    item.outcome === "driver_never_online"
  ) {
    return "The driver did not go online during the scheduled trip window, so the trip did not start and no pickups were recorded.";
  }
  if (item.outcome === "failed_to_pick_up") {
    return "The child was not picked up, so this trip could not be completed.";
  }
  if (item.outcome === "failed_to_drop_off") {
    return "The child was not recorded as dropped off, so this trip could not be completed.";
  }
  if (["canceled", "cancelled"].includes(item.status)) {
    return "The trip was canceled before it was marked complete.";
  }
  return "The trip was started, but no completed pickup or drop-off was recorded. Driver location tracking may have stopped before the trip was completed.";
};

const toMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getWindowDate = (time, baseDate = new Date()) => {
  const date = new Date(baseDate);
  const minutes = toMinutes(time);
  if (minutes !== null)
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

const getDateKey = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const getRouteOperatingDays = (route) => {
  const configuredDays = Array.isArray(route?.operating_days)
    ? route.operating_days.map(Number).filter((day) => day >= 0 && day <= 6)
    : [];
  return configuredDays.length
    ? new Set(configuredDays)
    : new Set([1, 2, 3, 4, 5]);
};

const isFreshTripLocation = (location, now) => {
  const age = now - new Date(location?.recorded_at || "").getTime();
  return Number.isFinite(age) && age >= 0 && age <= 120_000;
};

const getSchoolTripJourneyLabel = (phase) =>
  ({
    outbound: "On the way to destination",
    at_destination: "At destination · sharing paused",
    returning: "Returning to school",
    completed: "Returned to school",
  })[phase || "outbound"] || "Trip underway";

const isWindowActive = (trip, now) => {
  if (isTripFinished(trip, now)) return false;
  if (trip.windowDate > now) return false;
  if (trip.isCurrentOnboardTrip) return true;
  if (trip.stop?.status === "in_progress") return true;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    trip.startMinutes !== null &&
    currentMinutes >= trip.startMinutes &&
    (trip.endMinutes === null || currentMinutes <= trip.endMinutes)
  );
};

const isTripFinished = (trip, now) => {
  if (trip.isCurrentOnboardTrip) return false;
  if (isStopFinishedToday(trip.stop, now)) {
    return true;
  }
  return trip.endDate < now;
};

const Trips = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestedChildId = Array.isArray(params.childId)
    ? params.childId[0]
    : params.childId;
  const requestedRouteId = Array.isArray(params.routeId)
    ? params.routeId[0]
    : params.routeId;
  const [tab, setTab] = useState("upcoming");
  const { user } = React.useContext(AuthContext);
  const userToken = user?.token;
  const userId = user?.userData?.id || user?.id;
  const tripsCacheKey = userId ? `client-trips:${userId}` : null;
  const previousHistoryKey =
    user?.id && user.id !== userId
      ? `client-trip-history-${user.id}`
      : null;
  const { children, childrenLoading } = useChildren({
    includeWeekendRoutes: true,
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [unpaidChildIds, setUnpaidChildIds] = useState([]);
  const [paymentAccessLoading, setPaymentAccessLoading] = useState(true);
  const [paymentAccessError, setPaymentAccessError] = useState(null);
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [lastDriverLocation, setLastDriverLocation] = useState(null);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [trackingRouteId, setTrackingRouteId] = useState(null);
  const [trackingDriverId, setTrackingDriverId] = useState(null);
  const [stopsByChild, setStopsByChild] = useState({});
  const [stopsByRoute, setStopsByRoute] = useState({});
  const [schoolTrips, setSchoolTrips] = useState([]);
  const [schoolTripsLoading, setSchoolTripsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [ratingModal, setRatingModal] = useState({
    visible: false,
    trip: null,
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [tripsCacheReadyFor, setTripsCacheReadyFor] = useState(null);
  const tripsCacheReadyRef = React.useRef(null);
  const activeUserIdRef = React.useRef(userId);
  const refreshTripStopsRef = React.useRef(() => Promise.resolve());

  const refreshPaymentAccess = useCallback(async () => {
    if (!userToken) {
      setUnpaidChildIds([]);
      setPaymentAccessError("Unable to verify payment status.");
      setPaymentAccessLoading(false);
      return;
    }

    setPaymentAccessLoading(true);
    setPaymentAccessError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/payments/summary`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to verify payment status.");
      }

      const owingIds = Array.isArray(data?.unpaid_child_ids)
        ? data.unpaid_child_ids.filter((id) => typeof id === "string")
        : (data?.child_payment_statuses || [])
            .filter((status) => status.status === "unpaid")
            .map((status) => status.child_id)
            .filter(Boolean);
      setUnpaidChildIds(owingIds);

      const blockedIds = new Set(owingIds);
      if (blockedIds.size > 0) {
        setSelectedHistoryTrip(null);
        setIsMapFullScreen(false);
        setDriverLocation(null);
        setLastDriverLocation(null);
        setRouteMetrics(null);
        setTrackingRouteId(null);
        setTrackingDriverId(null);
        setStopsByRoute({});
      }
      setHistory((current) =>
        current.filter((entry) => {
          const childId =
            entry.child_id ||
            entry.child_ids?.find((id) => children.some((child) => child.id === id));
          return blockedIds.size === 0
            ? true
            : childId
              ? !blockedIds.has(childId)
              : false;
        }),
      );
      setStopsByChild((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([childId]) => !blockedIds.has(childId)),
        ),
      );
    } catch (error) {
      setSelectedHistoryTrip(null);
      setIsMapFullScreen(false);
      setDriverLocation(null);
      setLastDriverLocation(null);
      setRouteMetrics(null);
      setTrackingRouteId(null);
      setTrackingDriverId(null);
      setStopsByRoute({});
      console.error("Failed to verify client transport payment access:", error);
      setPaymentAccessError(
        error instanceof Error
          ? error.message
          : "Unable to verify payment status.",
      );
    } finally {
      setPaymentAccessLoading(false);
    }
  }, [children, userToken]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || tripsCacheReadyFor !== userId) return undefined;
      void refreshPaymentAccess();
      const interval = setInterval(() => void refreshPaymentAccess(), 30_000);
      return () => clearInterval(interval);
    }, [refreshPaymentAccess, tripsCacheReadyFor, userId]),
  );

  useEffect(() => {
    let active = true;
    activeUserIdRef.current = userId;
    tripsCacheReadyRef.current = null;
    Promise.resolve().then(() => {
      if (!active) return;
      setTripsCacheReadyFor(null);
      setHistory([]);
      setStopsByChild({});
      setStopsByRoute({});
      setSchoolTrips([]);
      setHistoryLoading(true);
      setSchoolTripsLoading(true);
      if (!tripsCacheKey) {
        tripsCacheReadyRef.current = "anonymous";
        setTripsCacheReadyFor("anonymous");
      }
    });

    if (!tripsCacheKey) {
      return () => {
        active = false;
      };
    }

    const hydrateTripsCache = async () => {
      try {
        const [cachedSnapshot, cachedHistory, previousHistory] =
          await Promise.all([
            AsyncStorage.getItem(tripsCacheKey),
            AsyncStorage.getItem(`client-trip-history-${userId}`),
            previousHistoryKey
              ? AsyncStorage.getItem(previousHistoryKey)
              : Promise.resolve(null),
          ]);
        if (!active) return;

        if (cachedSnapshot) {
          const parsed = JSON.parse(cachedSnapshot);
          if (parsed.version === TRIPS_CACHE_VERSION) {
            if (Array.isArray(parsed.history)) setHistory(parsed.history);
            if (parsed.stopsByChild) setStopsByChild(parsed.stopsByChild);
            if (parsed.stopsByRoute) setStopsByRoute(parsed.stopsByRoute);
            if (Array.isArray(parsed.schoolTrips))
              setSchoolTrips(parsed.schoolTrips);
            setHistoryLoading(false);
            setSchoolTripsLoading(false);
          }
        } else if (cachedHistory || previousHistory) {
          const parsedHistory = JSON.parse(cachedHistory || previousHistory);
          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory);
            setHistoryLoading(false);
          }
        }
      } catch (error) {
        console.error("Failed to load cached client trips:", error);
      } finally {
        if (active) {
          tripsCacheReadyRef.current = userId;
          setTripsCacheReadyFor(userId);
        }
      }
    };

    void hydrateTripsCache();
    return () => {
      active = false;
    };
  }, [previousHistoryKey, tripsCacheKey, userId]);

  useEffect(() => {
    if (
      !tripsCacheKey ||
      !userId ||
      tripsCacheReadyFor !== userId ||
      tripsCacheReadyRef.current !== userId
    ) {
      return;
    }

    AsyncStorage.setItem(
      tripsCacheKey,
      JSON.stringify({
        version: TRIPS_CACHE_VERSION,
        cachedAt: Date.now(),
        history,
        stopsByChild,
        stopsByRoute,
        schoolTrips,
      }),
    ).catch((error) =>
      console.error("Failed to save client trips cache:", error),
    );
  }, [
    history,
    schoolTrips,
    stopsByChild,
    stopsByRoute,
    tripsCacheKey,
    tripsCacheReadyFor,
    userId,
  ]);

  const loadSchoolTrips = useCallback(async () => {
    const requestUserId = userId;
    if (!userToken) {
      setSchoolTripsLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/school-trips`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load school trips.");
      }
      if (activeUserIdRef.current === requestUserId) {
        setSchoolTrips(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load school trips", error);
    } finally {
      if (activeUserIdRef.current === requestUserId) {
        setSchoolTripsLoading(false);
      }
    }
  }, [userId, userToken]);

  useEffect(() => {
    if (!userId || tripsCacheReadyFor !== userId) return undefined;
    const refreshTimeout = setTimeout(() => void loadSchoolTrips(), 0);
    const interval = setInterval(loadSchoolTrips, 30_000);
    return () => {
      clearTimeout(refreshTimeout);
      clearInterval(interval);
    };
  }, [loadSchoolTrips, tripsCacheReadyFor, userId]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStops = async () => {
      if (
        !user?.token ||
        !userId ||
        tripsCacheReadyFor !== userId ||
        childrenLoading
      ) {
        return;
      }
      const childrenWithRoutes = children.filter(
        (child) =>
          child.route?.id && !unpaidChildIds.includes(child.id),
      );
      if (childrenWithRoutes.length === 0) {
        setStopsByChild({});
        setStopsByRoute({});
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const childEntries = await Promise.all(
          childrenWithRoutes.map(async (child) => {
            const response = await fetch(
              `${baseUrl}/client/children/${child.id}/route-stops`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            if (!response.ok) {
              throw new Error(
                `Unable to load trip stops for child ${child.id} (${response.status}).`,
              );
            }
            const data = await response.json();
            const stops = (Array.isArray(data) ? data : []).filter(
              (stop) => stop.route_id === child.route.id,
            );
            return [child.id, stops];
          }),
        );
        const representativeChildByRoute = new Map();
        childrenWithRoutes.forEach((child) => {
          if (!representativeChildByRoute.has(child.route.id)) {
            representativeChildByRoute.set(child.route.id, child);
          }
        });
        const routeEntries = await Promise.all(
          [...representativeChildByRoute.entries()].map(
            async ([routeId, child]) => {
              const response = await fetch(
                `${baseUrl}/client/children/${child.id}/route-stops?include_route_stops=true&route_id=${encodeURIComponent(routeId)}`,
                { headers: { Authorization: "Bearer " + user.token } },
              );
              if (!response.ok) {
                throw new Error(
                  `Unable to load ordered route stops for route ${routeId} (${response.status}).`,
                );
              }
              const data = await response.json();
              return [routeId, Array.isArray(data) ? data : []];
            },
          ),
        );
        if (!cancelled) {
          setStopsByChild(Object.fromEntries(childEntries));
          setStopsByRoute(Object.fromEntries(routeEntries));
        }
      } catch (error) {
        console.error("Failed to load trip stops", error);
      }
    };

    refreshTripStopsRef.current = loadStops;
    void loadStops();
    const interval = setInterval(() => void loadStops(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    children,
    childrenLoading,
    unpaidChildIds,
    tripsCacheReadyFor,
    user?.token,
    userId,
  ]);

  const windowTrips = useMemo(() => {
    const trips = [];
    const now = new Date(currentTime);
    children.forEach((child) => {
      const route = child.route;
      if (!route?.id) return;
      const stops = getTodayRouteStops(
        stopsByChild[child.id] || [],
        new Date(currentTime),
      );
      const pickupStop = stops.find((stop) => stop.stop_type === "pickup");
      const dropoffStop = stops.find((stop) => stop.stop_type === "dropoff");
      const pickupBoarded = isStopCompletedToday(
        pickupStop,
        new Date(currentTime),
      );
      const schoolBoarded = isStopBoardedToday(
        dropoffStop,
        new Date(currentTime),
      );
      const onboardDirection = schoolBoarded
        ? "dropoff"
        : pickupBoarded
          ? "pickup"
          : null;
      const handoffComplete =
        isStopFinishedToday(dropoffStop, new Date(currentTime)) &&
        Boolean(dropoffStop?.handoff_verified_at);
      const operatingDays = getRouteOperatingDays(route);
      const windows = [
        {
          direction: "pickup",
          startTime: route.pickup_start_time || route.departure_time,
          endTime: route.pickup_end_time,
          start: route.start_location || child.pickup_address || "Home",
          end: route.end_location || child.school_name || "School",
          stop: stops.find((stop) => stop.stop_type === "pickup"),
        },
        {
          direction: "dropoff",
          startTime: route.dropoff_start_time,
          endTime: route.dropoff_end_time,
          start: route.end_location || child.school_name || "School",
          end: route.start_location || child.pickup_address || "Home",
          stop: stops.find((stop) => stop.stop_type === "dropoff"),
        },
      ];

      windows.forEach((window) => {
        if (!window.startTime) return;
        for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
          const serviceDate = new Date(now);
          serviceDate.setDate(serviceDate.getDate() + dayOffset);
          serviceDate.setHours(0, 0, 0, 0);
          if (child.absence_dates?.includes(getDateKey(serviceDate))) continue;
          if (!operatingDays.has(serviceDate.getDay())) continue;

          const windowDate = getWindowDate(window.startTime, serviceDate);
          const endDate = getWindowDate(
            window.endTime || window.startTime,
            serviceDate,
          );
          if (!window.endTime) endDate.setMinutes(endDate.getMinutes() + 30);
          const stop = dayOffset === 0 ? window.stop : null;
          const trip = {
            id: `${child.id}-${window.direction}-${serviceDate.toISOString().slice(0, 10)}`,
            child,
            route,
            ...window,
            stop,
            isCurrentOnboardTrip:
              window.direction === onboardDirection && !handoffComplete,
            windowDate,
            endDate,
            startMinutes: toMinutes(window.startTime),
            endMinutes: toMinutes(window.endTime),
            driver: child.vehicle?.driver,
          };
          if (dayOffset === 0 && isTripFinished(trip, now)) continue;
          if (
            dayOffset === 0 &&
            endDate < now &&
            stop?.status !== "in_progress"
          ) {
            continue;
          }
          trips.push(trip);
          break;
        }
      });
    });
    return trips.sort((first, second) => first.windowDate - second.windowDate);
  }, [children, currentTime, stopsByChild]);

  const todayTrips = useMemo(
    () =>
      windowTrips.filter(
        (trip) =>
          isWindowActive(trip, new Date(currentTime)) &&
          !isTripFinished(trip, new Date(currentTime)),
      ),
    [currentTime, windowTrips],
  );
  const requestedActiveTrip = todayTrips.find(
    (trip) =>
      (!requestedChildId || trip.child.id === requestedChildId) &&
      (!requestedRouteId || trip.route.id === requestedRouteId),
  );
  const activeTrip = requestedActiveTrip || todayTrips[0];
  const activeChild = activeTrip?.child;
  const activeRouteId = activeChild?.route?.id;
  const activeDriverId = activeChild?.vehicle?.driver?.id;
  const liveDriverLocation =
    driverLocation?.routeId === activeRouteId &&
    driverLocation?.driverId === activeDriverId
      ? driverLocation
      : null;
  const isTrackingActive =
    trackingRouteId === activeRouteId && trackingDriverId === activeDriverId;

  const activeTripConfirmed =
    activeTrip?.stop?.status === "in_progress" || isTrackingActive;
  const activeTripBoarded = Boolean(activeTrip?.isCurrentOnboardTrip);
  const activeTripArrived = activeTrip?.stop?.status === "in_progress";
  const activeTripMilestone = activeTripBoarded
    ? activeTripArrived
      ? "Arrived at destination · handoff pending"
      : "On board · on the way"
    : activeTripArrived
      ? "Driver arrived · pickup not confirmed"
      : activeTripConfirmed
        ? "Driver en route · pickup not confirmed"
        : "Awaiting driver update";
  const driverConnectionLost = isTrackingActive && !liveDriverLocation;
  const lastLocationLabel =
    lastDriverLocation &&
    activeRouteId &&
    activeDriverId &&
    lastDriverLocation.routeId === activeRouteId &&
    lastDriverLocation?.driverId === activeDriverId
      ? formatLastLocation(lastDriverLocation.recordedAt)
      : null;
  const longOfflineWarning =
    driverConnectionLost &&
    isLongOffline(lastDriverLocation?.recordedAt, currentTime);

  useEffect(() => {
    const driverId = activeChild?.vehicle?.driver?.id;
    const routeId = activeChild?.route?.id;
    if (!driverId || !routeId || !user?.token) return;
    let active = true;
    const fetchLocation = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/driver/location/${driverId}?child_id=${activeChild.id}&route_id=${encodeURIComponent(routeId)}`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        const data = await response.json();
        if (!active) return;
        const routeIsTracking =
          Boolean(data?.is_tracking) && data.tracking_route_id === routeId;
        setLastDriverLocation({
          routeId,
          driverId,
          recordedAt: data?.recorded_at || null,
        });
        setTrackingRouteId(routeIsTracking ? routeId : null);
        setTrackingDriverId(routeIsTracking ? driverId : null);
        if (!routeIsTracking || !data?.is_online) {
          setDriverLocation(null);
          return;
        }
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setDriverLocation({ routeId, driverId, latitude, longitude });
        } else {
          setDriverLocation(null);
        }
      } catch (error) {
        if (active) setDriverLocation(null);
        console.error("Failed to load driver location", error);
      }
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    activeChild?.id,
    activeChild?.route?.id,
    activeChild?.vehicle?.driver?.id,
    user?.token,
  ]);

  const getCoordinate = (latitude, longitude, title, type) => {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (
      latitude == null ||
      longitude == null ||
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude)
    ) {
      return null;
    }
    return {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      title,
      type,
    };
  };
  const plannedOrigin =
    activeTrip?.direction === "dropoff"
      ? getCoordinate(
          activeChild?.school_latitude ?? activeChild?.route?.end_latitude,
          activeChild?.school_longitude ?? activeChild?.route?.end_longitude,
          activeChild?.school_name || "School",
          "pickup",
        )
      : getCoordinate(
          activeChild?.pickup_latitude ?? activeChild?.route?.start_latitude,
          activeChild?.pickup_longitude ?? activeChild?.route?.start_longitude,
          "Pickup location",
          "pickup",
        );
  const plannedDestination =
    activeTrip?.direction === "dropoff"
      ? getCoordinate(
          activeChild?.pickup_latitude ?? activeChild?.route?.start_latitude,
          activeChild?.pickup_longitude ?? activeChild?.route?.start_longitude,
          "Home",
          "dropoff",
        )
      : getCoordinate(
          activeChild?.school_latitude ?? activeChild?.route?.end_latitude,
          activeChild?.school_longitude ?? activeChild?.route?.end_longitude,
          activeChild?.school_name || "School",
          "dropoff",
        );
  const todayRouteStops = getTodayRouteStops(
    stopsByRoute[activeRouteId] || [],
    new Date(currentTime),
  ).filter(
    (stop) =>
      !stop.schedule_date ||
      stop.schedule_date.slice(0, 10) === getDateKey(new Date(currentTime)),
  );
  const directionStops = todayRouteStops
    .filter((stop) => stop.stop_type === activeTrip?.direction)
    .sort(
      (first, second) => (first.stop_order || 0) - (second.stop_order || 0),
    );
  const nextRouteStop =
    directionStops.find((stop) => stop.status === "in_progress") ||
    directionStops.find(
      (stop) => !["completed", "skipped"].includes(stop.status),
    );
  const nextRouteStopCoordinate = nextRouteStop
    ? getCoordinate(
        nextRouteStop.latitude,
        nextRouteStop.longitude,
        "Next stop",
        activeTrip?.direction === "pickup" ? "pickup" : "dropoff",
      )
    : null;
  const nextStopChild = nextRouteStop
    ? children.find((child) => child.id === nextRouteStop.child_id)
    : null;
  const nextStopName = nextStopChild
    ? [nextStopChild.name, nextStopChild.lastname].filter(Boolean).join(" ")
    : null;
  const nextStopDescription =
    nextStopName ||
    nextRouteStop?.address ||
    (nextRouteStop
      ? `Stop ${nextRouteStop.stop_order || ""}`.trim()
      : plannedDestination?.title || "No upcoming stop");
  const tripDirectionLabel =
    activeTrip?.direction === "dropoff" ? "To home" : "To school";
  const routeStopMarkers = directionStops
    .map((stop) => {
      const isNextStop = stop.id === nextRouteStop?.id;
      const stopLabel = `Stop ${stop.stop_order}`;
      const label =
        stop.status === "in_progress"
          ? `Current · ${stopLabel}`
          : isNextStop
            ? `Next · ${stopLabel}`
            : stopLabel;
      return getCoordinate(
        stop.latitude,
        stop.longitude,
        label,
        stop.stop_type === "pickup" ? "pickup" : "dropoff",
      );
    })
    .filter(Boolean);
  const mapDestination = nextRouteStopCoordinate || plannedDestination;
  const mapMarkers = [
    plannedOrigin,
    ...routeStopMarkers,
    ...(nextRouteStopCoordinate ? [] : [plannedDestination]),
    liveDriverLocation
      ? { ...liveDriverLocation, title: "Driver live location", type: "driver" }
      : null,
  ].filter(Boolean);
  const distanceOrigin = liveDriverLocation || plannedOrigin;
  const hasMeasurableRoute =
    distanceOrigin &&
    mapDestination &&
    (distanceOrigin.latitude !== mapDestination.latitude ||
      distanceOrigin.longitude !== mapDestination.longitude);
  const routeMetricsKey = hasMeasurableRoute
    ? `${distanceOrigin.latitude},${distanceOrigin.longitude}:${mapDestination.latitude},${mapDestination.longitude}`
    : "";
  const currentRouteMetrics =
    routeMetrics?.key === routeMetricsKey ? routeMetrics : null;
  const handleRouteReady = useCallback(
    (metrics) => setRouteMetrics({ ...metrics, key: routeMetricsKey }),
    [routeMetricsKey],
  );

  const fetchHistory = useCallback(async () => {
    const requestUserId = userId;
    if (!userToken) {
      setHistoryLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/route-history`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load trip history.");
      }
      const nextHistory = Array.isArray(data) ? data : [];
      if (activeUserIdRef.current !== requestUserId) return;
      setHistory(nextHistory);
      if (userId) {
        try {
          await AsyncStorage.setItem(
            `client-trip-history-${userId}`,
            JSON.stringify(nextHistory),
          );
        } catch (error) {
          console.error("Failed to cache trip history", error);
        }
      }
    } catch (error) {
      console.error("Failed to load trip history", error);
    } finally {
      if (activeUserIdRef.current === requestUserId) {
        setHistoryLoading(false);
      }
    }
  }, [userId, userToken]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || tripsCacheReadyFor !== userId) return undefined;
      let active = true;
      let refreshTimeout;
      const clientId = userId;

      const loadCachedHistory = async () => {
        if (clientId) {
          try {
            const cached = await AsyncStorage.getItem(
              `client-trip-history-${clientId}`,
            );
            if (active && cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) setHistory(parsed);
            }
          } catch (error) {
            console.error("Failed to load cached trip history", error);
          }
        }
        if (active) void fetchHistory();
      };

      void loadCachedHistory();
      const historyChannel = clientId
        ? subscribeToClientTripHistoryUpdates(clientId, () => {
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => {
              if (active) {
                void fetchHistory();
                void refreshTripStopsRef.current();
              }
            }, 400);
          })
        : null;

      return () => {
        active = false;
        clearTimeout(refreshTimeout);
        void unsubscribeFromRealtime(historyChannel);
      };
    }, [fetchHistory, tripsCacheReadyFor, userId]),
  );

  const submitRating = useCallback(async () => {
    if (!ratingModal.trip || !rating || !userToken) {
      Alert.alert("Error", "Please provide a rating");
      return;
    }

    setSubmittingRating(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const historyId =
        ratingModal.trip.rating_history_id ??
        ratingModal.trip.id.split(":")[0];
      const response = await fetch(
        `${baseUrl}/client/route-history/${historyId}/rating`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            rating: parseInt(rating, 10),
            comment: comment || null,
          }),
        },
      );

      if (response.ok) {
        Alert.alert("Success", "Thank you for rating the driver!");
        setRatingModal({ visible: false, trip: null });
        setRating(0);
        setComment("");
      } else {
        const error = await response.json().catch(() => ({}));
        Alert.alert("Error", error.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Failed to submit rating", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  }, [ratingModal, rating, comment, userToken]);

  const upcomingTrips = useMemo(() => {
    const now = new Date(currentTime);
    return windowTrips
      .filter(
        (trip) =>
          !isTripFinished(trip, now) &&
          (trip.windowDate > now || isWindowActive(trip, now)),
      )
      .map((trip) => ({
        ...trip,
        ...formatDate(trip.windowDate),
        time: formatTime(trip.startTime),
        periodLabel:
          (toMinutes(trip.startTime) ?? 0) < 12 * 60
            ? "Morning trip"
            : "Afternoon trip",
        periodIcon:
          (toMinutes(trip.startTime) ?? 0) < 12 * 60
            ? "wb-sunny"
            : "wb-twilight",
        routeName: trip.route.route_name || "School route",
        childName: [trip.child.name, trip.child.lastname]
          .filter(Boolean)
          .join(" "),
        route: `${trip.start} → ${trip.end}`,
        driverLabel: trip.driver?.name
          ? `Driver ${trip.driver.name}`
          : "Driver not assigned",
        status: trip.isCurrentOnboardTrip
          ? trip.stop?.status === "in_progress"
            ? "Arrived at destination"
            : "In progress"
          : trip.stop?.status === "in_progress"
            ? "Driver arrived"
            : isWindowActive(trip, now) &&
                trip.route.id === trackingRouteId &&
                trip.driver?.id === trackingDriverId
              ? "Driver en route"
              : isWindowActive(trip, now)
                ? "Awaiting update"
                : "Scheduled",
      }))
      .sort((first, second) => {
        const firstRequested =
          (!requestedChildId || first.child.id === requestedChildId) &&
          (!requestedRouteId || first.route.id === requestedRouteId);
        const secondRequested =
          (!requestedChildId || second.child.id === requestedChildId) &&
          (!requestedRouteId || second.route.id === requestedRouteId);
        if (firstRequested !== secondRequested) {
          return firstRequested ? -1 : 1;
        }
        return first.windowDate - second.windowDate;
      });
  }, [
    currentTime,
    requestedChildId,
    requestedRouteId,
    trackingDriverId,
    trackingRouteId,
    windowTrips,
  ]);

  const historyTrips = useMemo(() => {
    const now = new Date(currentTime);
    const visibleHistory = history.filter((item) => {
      const childId =
        item.child_id ||
        item.child_ids?.find((id) => children.some((child) => child.id === id));
      if (
        unpaidChildIds.includes(childId) ||
        (!childId && unpaidChildIds.length > 0)
      ) {
        return false;
      }
      if (item.status !== "started") return true;

      const occurredAt = new Date(item.start_time || item.occurred_at || "");
      const direction = item.route_type || item.direction;
      if (
        Number.isNaN(occurredAt.getTime()) ||
        !["pickup", "dropoff"].includes(direction) ||
        !childId
      ) {
        return true;
      }

      const child = children.find((candidate) => candidate.id === childId);
      const route = child?.route;
      if (
        !route?.id ||
        (item.route_id && item.route_id !== route.id)
      ) {
        return true;
      }

      const startTime =
        direction === "pickup"
          ? route.pickup_start_time || route.departure_time
          : route.dropoff_start_time;
      const endTime =
        direction === "pickup"
          ? route.pickup_end_time
          : route.dropoff_end_time;
      if (!startTime) return true;

      const serviceDate = new Date(occurredAt);
      const serviceDateKey = getDateKey(serviceDate);
      const endDate = getWindowDate(endTime || startTime, serviceDate);
      if (!endTime) endDate.setMinutes(endDate.getMinutes() + 30);

      const stop = (stopsByChild[childId] || []).find(
        (candidate) =>
          candidate.stop_type === direction &&
          (!candidate.schedule_date ||
            candidate.schedule_date.slice(0, 10) === serviceDateKey),
      );
      const stopComplete = isStopFinishedToday(stop, serviceDate);

      return stopComplete || now > endDate;
    });

    return visibleHistory.map((item) => ({
      ...formatDate(item.start_time || item.occurred_at),
      time: formatTripTimestamp(item.start_time || item.occurred_at),
      route:
        item.route_snapshot?.start_location &&
        item.route_snapshot?.end_location
          ? `${item.route_snapshot.start_location} → ${item.route_snapshot.end_location}`
          : `${item.route_type === "dropoff" ? "School" : "Home"} route`,
      childName: item.child_name || "Child",
      driver: item.drivers?.users?.name
        ? `Driver ${item.drivers.users.name}`
        : "Driver",
      status: getHistoryStatusLabel(item),
      reason: getHistoryReason(item),
      duration: formatElapsedDuration(item.duration_seconds),
      rawData: item,
    }));
  }, [children, currentTime, history, stopsByChild, unpaidChildIds]);

  const routeTripsVisible =
    !paymentAccessLoading && !paymentAccessError;
  const visibleUpcomingTrips = useMemo(
    () =>
      routeTripsVisible
        ? upcomingTrips.filter(
            (trip) => !unpaidChildIds.includes(trip.child.id),
          )
        : [],
    [routeTripsVisible, unpaidChildIds, upcomingTrips],
  );
  const visibleHistoryTrips = useMemo(
    () => (routeTripsVisible ? historyTrips : []),
    [historyTrips, routeTripsVisible],
  );

  const trips = useMemo(
    () => (tab === "upcoming" ? visibleUpcomingTrips : visibleHistoryTrips),
    [tab, visibleHistoryTrips, visibleUpcomingTrips],
  );
  const activeWindowTrip = visibleUpcomingTrips.find((trip) =>
    isWindowActive(trip, new Date(currentTime)),
  );

  const messageDriver = async (driver) => {
    if (!driver?.user_id || !user?.token) {
      Alert.alert("Driver unavailable", "This trip has no linked driver yet.");
      return;
    }

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          otherUserId: driver.user_id,
          conversationType: "client_driver",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to start driver conversation.");
      }
      router.push("/(client)/(tabs)/messages");
    } catch (error) {
      Alert.alert(
        "Message failed",
        error?.message || "Unable to message the driver.",
      );
    }
  };

  const renderActiveMap = (interactive, style) => (
    <CustomMap
      markers={mapMarkers}
      origin={hasMeasurableRoute ? distanceOrigin : null}
      destination={hasMeasurableRoute ? mapDestination : null}
      focus={liveDriverLocation}
      interactive={interactive}
      showDistanceBadge={false}
      showMarkerLabels
      style={style}
      requestLocationPermission={false}
      onRouteReady={handleRouteReady}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ClientHeader
          title="My Trips"
          subtitle="Track and manage your trips"
          style={styles.header}
          accentColor="#C14BFF"
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentView}>
            {/* Upcoming / History */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.segmentButton,
                  tab === "upcoming" && styles.segmentButtonActive,
                ]}
                onPress={() => setTab("upcoming")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={tab === "upcoming" ? "#C14BFF" : "#B9AFC4"}
                />

                <Text
                  style={[
                    styles.segmentText,
                    tab === "upcoming" && styles.segmentTextActive,
                  ]}
                >
                  Upcoming
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.segmentButton,
                  tab === "history" && styles.segmentButtonActive,
                ]}
                onPress={() => setTab("history")}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={tab === "history" ? "#C14BFF" : "#B9AFC4"}
                />

                <Text
                  style={[
                    styles.segmentText,
                    tab === "history" && styles.segmentTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {paymentAccessLoading || paymentAccessError || unpaidChildIds.length > 0 ? (
              <View style={styles.transportAccessNotice}>
                <MaterialIcons
                  name={paymentAccessError ? "lock-outline" : "payments"}
                  size={20}
                  color="#B45309"
                />
                <View style={styles.transportAccessCopy}>
                  <Text style={styles.transportAccessTitle}>
                    {paymentAccessLoading
                      ? "Checking transport payment status"
                      : paymentAccessError
                        ? "Route information is temporarily hidden"
                        : "Transport services paused"}
                  </Text>
                  <Text style={styles.transportAccessText}>
                    {paymentAccessLoading
                      ? "School information remains available while we verify payment."
                      : paymentAccessError
                        ? "We couldn't verify payment status. Route information stays hidden until it can be checked. School information remains available."
                        : `${children
                            .filter((child) => unpaidChildIds.includes(child.id))
                            .map((child) => child.name)
                            .filter(Boolean)
                            .join(", ") || "A child"} has an outstanding owner payment. My Trips route details and tracking are hidden until the payment is settled. School information remains available.`}
                  </Text>
                  {paymentAccessError ? (
                    <TouchableOpacity
                      onPress={() => void refreshPaymentAccess()}
                      style={styles.transportAccessButton}
                    >
                      <Text style={styles.transportAccessButtonText}>
                        Retry
                      </Text>
                    </TouchableOpacity>
                  ) : !paymentAccessLoading && unpaidChildIds.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => router.push("/(client)/pages/payments")}
                      style={styles.transportAccessButton}
                    >
                      <Text style={styles.transportAccessButtonText}>
                        View payments
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {tab === "upcoming" && (
              <View style={styles.schoolTripsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>School Trips</Text>
                  <Text style={styles.tripCount}>
                    {schoolTrips.length} trips
                  </Text>
                </View>
                {schoolTripsLoading ? (
                  <Text style={styles.tripCount}>Loading school trips…</Text>
                ) : schoolTrips.length === 0 ? (
                  <View style={styles.schoolTripEmpty}>
                    <MaterialIcons name="school" size={22} color="#C14BFF" />
                    <Text style={styles.schoolTripEmptyText}>
                      No upcoming school trips for your children.
                    </Text>
                  </View>
                ) : (
                  schoolTrips.map((trip) => {
                    const tripVehicles = trip.vehicles || [];
                    const locations = tripVehicles
                      .filter(
                        (assignment) =>
                          ["outbound", "returning"].includes(
                            assignment.journey_phase,
                          ) &&
                          isFreshTripLocation(
                            assignment.tracking,
                            new Date(currentTime).getTime(),
                          ) &&
                          Number.isFinite(
                            Number(assignment.tracking?.latitude),
                          ) &&
                          Number.isFinite(
                            Number(assignment.tracking?.longitude),
                          ),
                      )
                      .map((assignment) => ({
                        ...assignment.tracking,
                        trip_vehicle_id: assignment.id,
                        vehicle: assignment.vehicle,
                      }));
                    const destination =
                      Number.isFinite(Number(trip.destination_latitude)) &&
                      Number.isFinite(Number(trip.destination_longitude))
                        ? {
                            latitude: Number(trip.destination_latitude),
                            longitude: Number(trip.destination_longitude),
                            title: trip.destination,
                            type: "end",
                          }
                        : null;
                    const markers = [
                      ...locations.map((location) => ({
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude),
                        title: "School trip vehicle",
                        type: "driver",
                      })),
                      ...(destination ? [destination] : []),
                    ];
                    return (
                      <View style={styles.schoolTripCard} key={trip.id}>
                        <View style={styles.schoolTripHeading}>
                          <View style={styles.schoolTripIcon}>
                            <MaterialIcons
                              name="school"
                              size={20}
                              color="#C14BFF"
                            />
                          </View>
                          <View style={styles.schoolTripHeadingText}>
                            <Text style={styles.schoolTripName}>
                              {trip.name}
                            </Text>
                            <Text style={styles.schoolTripDestination}>
                              {trip.destination}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.schoolTripStatus,
                              trip.status === "in_progress" &&
                                styles.schoolTripStatusLive,
                            ]}
                          >
                            {trip.status.replaceAll("_", " ")}
                          </Text>
                        </View>
                        <View style={styles.schoolTripFacts}>
                          <Text style={styles.schoolTripFact}>
                            Departure ·{" "}
                            {new Date(trip.departure_at).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </Text>
                          <Text style={styles.schoolTripFact}>
                            Return ·{" "}
                            {new Date(trip.return_at).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </Text>
                          <Text style={styles.schoolTripFact}>
                            Price ·{" "}
                            {trip.is_free
                              ? "Free"
                              : `${trip.currency || "ZAR"} ${Number(trip.price || 0).toFixed(2)}`}
                          </Text>
                          {trip.learners?.map((learner) => (
                            <Text
                              style={styles.schoolTripFact}
                              key={learner.child_id}
                            >
                              Child · {learner.child?.name}{" "}
                              {learner.child?.lastname} ·{" "}
                              {learner.parent_response === "accepted"
                                ? "Attending"
                                : learner.parent_response === "declined"
                                  ? "Declined"
                                  : "Response needed"}
                            </Text>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={styles.schoolTripDetailsButton}
                          onPress={() =>
                            router.push({
                              pathname: "/(client)/(tabs)/school-trip/[tripId]",
                              params: { tripId: trip.id },
                            })
                          }
                        >
                          <Text style={styles.schoolTripDetailsButtonText}>
                            View trip details
                          </Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={19}
                            color="#C14BFF"
                          />
                        </TouchableOpacity>
                        {tripVehicles.map((assignment) => (
                          <View
                            key={assignment.id}
                            style={styles.schoolTripVehicle}
                          >
                            <MaterialIcons
                              name="directions-bus"
                              size={18}
                              color="#C14BFF"
                            />
                            <View style={styles.schoolTripVehicleCopy}>
                              <Text style={styles.schoolTripVehicleText}>
                                {assignment.vehicle?.name || "School vehicle"} ·{" "}
                                {assignment.vehicle?.registration_number ||
                                  "Registration unavailable"}
                                {assignment.driver
                                  ? ` · Driver ${assignment.driver.first_name} ${assignment.driver.last_name || ""}`
                                  : ""}
                                {assignment.coordinator
                                  ? ` · Coordinator ${assignment.coordinator.first_name} ${assignment.coordinator.last_name || ""}`
                                  : ""}
                              </Text>
                              {["in_progress", "completed"].includes(
                                trip.status,
                              ) ? (
                                <Text style={styles.schoolTripJourney}>
                                  {getSchoolTripJourneyLabel(
                                    assignment.journey_phase,
                                  )}
                                  {assignment.tracking?.recorded_at
                                    ? ` · ${
                                        isFreshTripLocation(
                                          assignment.tracking,
                                          new Date(currentTime).getTime(),
                                        ) &&
                                        ["outbound", "returning"].includes(
                                          assignment.journey_phase,
                                        )
                                          ? "Updated"
                                          : "Last known"
                                      } ${new Date(
                                        assignment.tracking.recorded_at,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}${
                                        assignment.tracking.shared_by
                                          ? ` by ${[
                                              assignment.tracking.shared_by
                                                .first_name,
                                              assignment.tracking.shared_by
                                                .last_name,
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}`
                                          : ""
                                      }`
                                    : ""}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                        {trip.status === "in_progress" && (
                          <View style={styles.schoolTripLiveWrap}>
                            {markers.length && locations.length ? (
                              <CustomMap
                                markers={markers}
                                requestLocationPermission={false}
                                style={styles.schoolTripMap}
                              />
                            ) : (
                              <View
                                style={styles.schoolTripLocationUnavailable}
                              >
                                <MaterialIcons
                                  name="location-off"
                                  size={19}
                                  color="#B45309"
                                />
                                <Text style={styles.schoolTripLocationText}>
                                  {tripVehicles.some(
                                    (assignment) =>
                                      assignment.journey_phase ===
                                      "at_destination",
                                  )
                                    ? "At destination · location sharing is paused"
                                    : "No fresh GPS update · last known location is not shown as live"}
                                </Text>
                              </View>
                            )}
                            {locations.map((location, index) => (
                              <Text
                                style={styles.schoolTripLastSeen}
                                key={`${location.trip_vehicle_id}-${index}`}
                              >
                                Last updated{" "}
                                {new Date(
                                  location.recorded_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            ))}
                          </View>
                        )}
                        {trip.emergency_contact ? (
                          <Text style={styles.schoolTripEmergency}>
                            Emergency contact · {trip.emergency_contact}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Next Trip */}
            {tab === "upcoming" && (
              <>
                {upcomingTrips.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Next Trip</Text>

                      <View
                        style={[
                          styles.liveBadge,
                          upcomingTrips[0].status !== "In progress" &&
                            styles.scheduledWindowBadge,
                        ]}
                      >
                        <View
                          style={[
                            styles.liveDot,
                            upcomingTrips[0].status !== "In progress" &&
                              styles.scheduledWindowDot,
                          ]}
                        />
                        <Text
                          style={[
                            styles.liveText,
                            upcomingTrips[0].status !== "In progress" &&
                              styles.scheduledWindowText,
                          ]}
                        >
                          {upcomingTrips[0].status === "In progress"
                            ? "Child on board"
                            : upcomingTrips[0].status === "Driver arrived"
                              ? "Driver arrived"
                              : upcomingTrips[0].status === "Driver en route"
                                ? "Driver en route"
                                : upcomingTrips[0].status ===
                                    "Arrived at destination"
                                  ? "Handoff pending"
                                  : upcomingTrips[0].status ===
                                      "Awaiting update"
                                    ? "Awaiting driver update"
                                    : "Next scheduled window"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.nextTripCard}>
                      {/* Time */}
                      <View style={styles.nextTripTop}>
                        <View>
                          <Text style={styles.todayLabel}>
                            {upcomingTrips[0].day} {upcomingTrips[0].date}
                          </Text>
                          <Text style={styles.tripTime}>
                            {upcomingTrips[0].time}
                          </Text>
                          <Text style={styles.nextTripRouteName}>
                            {upcomingTrips[0].routeName}
                            {upcomingTrips[0].childName
                              ? ` · ${upcomingTrips[0].childName}`
                              : ""}
                          </Text>
                        </View>

                        <View style={styles.onTimeBadge}>
                          <MaterialIcons
                            name={upcomingTrips[0].periodIcon}
                            size={16}
                            color="#C14BFF"
                          />
                          <MaterialIcons
                            name={
                              upcomingTrips[0].status === "In progress"
                                ? "directions-bus"
                                : "schedule"
                            }
                            size={16}
                            color="#C14BFF"
                          />
                          <Text style={styles.onTimeText}>
                            {upcomingTrips[0].periodLabel} ·{" "}
                            {upcomingTrips[0].status}
                          </Text>
                        </View>
                      </View>

                      {/* Route */}
                      <View style={styles.routeContainer}>
                        <View style={styles.routeTimeline}>
                          <View style={styles.startPoint}>
                            <View style={styles.startPointInner} />
                          </View>

                          <View style={styles.timelineLine} />

                          <View style={styles.endPoint}>
                            <MaterialIcons
                              name="school"
                              size={15}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>

                        <View style={styles.routeContent}>
                          <View style={styles.locationBlock}>
                            <Text style={styles.locationTitle}>
                              {upcomingTrips[0].direction === "dropoff"
                                ? "School"
                                : "Home"}
                            </Text>
                            <Text style={styles.locationAddress}>
                              {upcomingTrips[0].start}
                            </Text>
                          </View>

                          <View style={styles.locationBlock}>
                            <Text style={styles.locationTitle}>
                              {upcomingTrips[0].direction === "dropoff"
                                ? "Home"
                                : "School"}
                            </Text>
                            <Text style={styles.locationAddress}>
                              {upcomingTrips[0].end}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Driver */}
                      <View style={styles.driverSection}>
                        <View style={styles.driverInfo}>
                          <View style={styles.driverAvatar}>
                            <Text style={styles.driverAvatarText}>J</Text>
                          </View>

                          <View>
                            <Text style={styles.driverName}>
                              {upcomingTrips[0].driverLabel}
                            </Text>

                            <View style={styles.ratingRow}>
                              <MaterialIcons
                                name="star"
                                size={15}
                                color="#F59E0B"
                              />

                              <Text style={styles.ratingText}>4.8</Text>

                              <Text style={styles.ratingLabel}>
                                • Your driver
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.messageButton}
                          onPress={() => messageDriver(upcomingTrips[0].driver)}
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color="#C14BFF"
                          />

                          <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}

                {/* Live Tracking */}
                {activeTrip &&
                  isWindowActive(activeTrip, new Date(currentTime)) && (
                    <>
                      <View
                        style={[
                          styles.sectionHeader,
                          { alignItems: "flex-start" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sectionTitle,
                            { flex: 1, paddingRight: 8 },
                          ]}
                        >
                          {activeTripMilestone}
                        </Text>

                        <TouchableOpacity
                          onPress={() => setIsMapFullScreen(true)}
                          accessibilityRole="button"
                          accessibilityLabel="View trip map full screen"
                          style={{ flexShrink: 0, paddingVertical: 2 }}
                        >
                          <Text style={styles.viewMapText}>View full map</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.trackingCard}>
                        <View style={styles.mapPlaceholder}>
                          {mapMarkers.length > 0
                            ? renderActiveMap(false, {
                                flex: 1,
                                width: "100%",
                              })
                            : null}
                          {/* Roads */}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.roadOne} />
                          ) : null}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.roadTwo} />
                          ) : null}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.roadThree} />
                          ) : null}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.roadFour} />
                          ) : null}

                          {/* Route */}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.mapRouteLine} />
                          ) : null}

                          {/* Start */}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.mapStartPoint}>
                              <View style={styles.mapStartInner} />
                            </View>
                          ) : null}

                          {/* Destination */}
                          {mapMarkers.length === 0 ? (
                            <View style={styles.mapEndPoint}>
                              <MaterialIcons
                                name="school"
                                size={20}
                                color="#FFFFFF"
                              />
                            </View>
                          ) : null}
                        </View>

                        <Text
                          style={{
                            color: activeTripBoarded
                              ? liveDriverLocation
                                ? "#C14BFF"
                                : "#B45309"
                              : "#B45309",
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 10,
                            textAlign: "center",
                          }}
                        >
                          {activeTripConfirmed
                            ? liveDriverLocation
                              ? `${activeTripMilestone} · live driver location`
                              : driverConnectionLost
                                ? `${longOfflineWarning ? "Warning · " : ""}${activeTripMilestone} · driver connection lost${lastLocationLabel ? ` · last location ${lastLocationLabel}` : ""}`
                                : `${activeTripMilestone} · live location unavailable${lastLocationLabel ? ` · last location ${lastLocationLabel}` : ""}`
                            : activeTripMilestone}
                        </Text>

                        {/* Tracking info */}
                        <View style={styles.trackingInfo}>
                          <View style={styles.trackingItem}>
                            <View
                              style={[
                                styles.trackingIcon,
                                { backgroundColor: "#1C1026" },
                              ]}
                            >
                              <MaterialIcons
                                name="schedule"
                                size={18}
                                color="#C14BFF"
                              />
                            </View>

                            <View>
                              <Text style={styles.trackingLabel}>ETA</Text>
                              <Text style={styles.trackingValue}>
                                {liveDriverLocation
                                  ? formatDuration(
                                      currentRouteMetrics?.durationMinutes,
                                    )
                                  : "—"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.trackingDivider} />

                          <View style={styles.trackingItem}>
                            <View
                              style={[
                                styles.trackingIcon,
                                { backgroundColor: "#1C1026" },
                              ]}
                            >
                              <MaterialIcons
                                name="straighten"
                                size={18}
                                color="#C14BFF"
                              />
                            </View>

                            <View>
                              <Text style={styles.trackingLabel}>Distance</Text>
                              <Text style={styles.trackingValue}>
                                {liveDriverLocation &&
                                Number.isFinite(currentRouteMetrics?.distanceKm)
                                  ? `${currentRouteMetrics.distanceKm.toFixed(1)} km`
                                  : "—"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.trackingDivider} />

                          <View style={styles.trackingItem}>
                            <View
                              style={[
                                styles.trackingIcon,
                                { backgroundColor: "#1C1026" },
                              ]}
                            >
                              <MaterialIcons
                                name="directions"
                                size={18}
                                color="#C14BFF"
                              />
                            </View>

                            <View>
                              <Text style={styles.trackingLabel}>Status</Text>
                              <Text style={styles.trackingValue}>
                                {activeTripBoarded
                                  ? activeTripArrived
                                    ? "Handoff pending"
                                    : "Child on board"
                                  : activeTripArrived
                                    ? "Driver arrived"
                                    : activeTripConfirmed
                                      ? liveDriverLocation
                                        ? "Driver en route"
                                        : driverConnectionLost
                                          ? longOfflineWarning
                                            ? "Offline 10+ min"
                                            : "Connection lost"
                                          : "GPS unavailable"
                                      : "Awaiting update"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </>
                  )}
              </>
            )}

            {tab === "history" && activeWindowTrip ? (
              <View
                style={{
                  marginTop: 16,
                  marginBottom: 18,
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#CFE8D6",
                  backgroundColor: "#1C1026",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialIcons
                    name="schedule"
                    size={19}
                    color="#16803C"
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: "#FBF8FF",
                      fontSize: 15,
                      fontWeight: "800",
                    }}
                  >
                    Active trip window
                  </Text>
                </View>
                <Text
                  style={{
                    color: "#FBF8FF",
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {activeWindowTrip.periodLabel} · {activeWindowTrip.childName}
                </Text>
                <Text
                  style={{
                    color: "#B9AFC4",
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  {formatTime(activeWindowTrip.startTime)}
                  {activeWindowTrip.endTime
                    ? ` – ${formatTime(activeWindowTrip.endTime)}`
                    : ""}
                  {" · "}
                  {activeWindowTrip.status}
                </Text>
                <Text
                  style={{
                    color: "#B9AFC4",
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  {activeWindowTrip.start} → {activeWindowTrip.end}
                </Text>
                <Text
                  style={{
                    color: "#B9AFC4",
                    fontSize: 11,
                    lineHeight: 16,
                    marginTop: 9,
                  }}
                >
                  This trip will appear in history when the window ends or the
                  stop is completed.
                </Text>
              </View>
            ) : null}

            {/* Trip List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {tab === "upcoming" ? "Upcoming Trips" : "Trip History"}
              </Text>

              <Text style={styles.tripCount}>{trips.length} trips</Text>
            </View>

            <View style={styles.tripList}>
              {(childrenLoading || historyLoading) && trips.length === 0 ? (
                <Text style={styles.tripCount}>Loading trips...</Text>
              ) : trips.length === 0 ? (
                <Text style={styles.tripCount}>No trips found</Text>
              ) : (
                trips.map((trip, index) => (
                  <View
                    key={`${trip.time}-${index}`}
                    style={styles.tripListItem}
                  >
                    <TouchableOpacity
                      style={styles.tripListItemContent}
                      activeOpacity={0.75}
                      disabled={tab !== "history"}
                      accessibilityRole="button"
                      accessibilityLabel={`View trip details for ${trip.childName || "child"}: ${trip.status}`}
                      onPress={() => setSelectedHistoryTrip(trip)}
                    >
                      {/* Date */}
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateMonth}>{trip.day}</Text>

                        <Text style={styles.dateNumber}>{trip.date}</Text>

                        <Text style={styles.dateLabel}>{trip.label}</Text>
                      </View>

                      <View style={styles.listDivider} />

                      {/* Trip info */}
                      <View style={styles.tripListContent}>
                        <View style={styles.listTimeRow}>
                          <Text
                            style={styles.tripListTime}
                            numberOfLines={1}
                          >
                            {trip.time}
                          </Text>

                          {tab === "upcoming" && trip.periodLabel ? (
                            <View style={styles.tripPeriodBadge}>
                              <MaterialIcons
                                name={trip.periodIcon}
                                size={13}
                                color="#C14BFF"
                              />
                              <Text style={styles.tripPeriodText}>
                                {trip.periodLabel}
                              </Text>
                            </View>
                          ) : null}

                          <View
                            style={[
                              styles.smallStatus,
                              trip.status === "Completed"
                                ? styles.completedStatus
                                : styles.incompleteStatus,
                            ]}
                          >
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.smallStatusText,
                                trip.status === "Completed"
                                  ? styles.completedText
                                  : styles.incompleteText,
                              ]}
                            >
                              {trip.status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.tripListRoute} numberOfLines={1}>
                          {trip.childName ? `${trip.childName} · ` : ""}
                          {trip.route}
                        </Text>

                        <View style={styles.tripMetaRow}>
                          <MaterialIcons
                            name="person-outline"
                            size={15}
                            color="#B9AFC4"
                          />

                          <Text style={styles.tripListMeta}>
                            {trip.driverLabel || trip.driver}
                          </Text>
                        </View>
                        {tab === "history" && trip.duration ? (
                          <View style={styles.tripMetaRow}>
                            <MaterialIcons
                              name="timer"
                              size={15}
                              color="#B9AFC4"
                            />
                            <Text style={styles.tripListMeta}>
                              Route duration · {trip.duration}
                            </Text>
                          </View>
                        ) : null}
                        {tab === "history" && trip.reason ? (
                          <Text
                            style={styles.tripHistoryReason}
                            numberOfLines={2}
                          >
                            {trip.reason}
                          </Text>
                        ) : null}
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={25}
                        color="#B9AFC4"
                      />
                    </TouchableOpacity>

                    {tab === "history" && trip.status === "Completed" && (
                      <TouchableOpacity
                        style={styles.rateDriverButton}
                        onPress={() => {
                          setRating(0);
                          setComment("");
                          setRatingModal({
                            visible: true,
                            trip: trip.rawData,
                          });
                        }}
                      >
                        <MaterialIcons
                          name="star-outline"
                          size={18}
                          color="#C14BFF"
                        />
                        <Text style={styles.rateDriverButtonText}>
                          Rate driver
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>

        <Modal
          visible={Boolean(selectedHistoryTrip && routeTripsVisible)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedHistoryTrip(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.historyDetailSheet}>
              <View style={styles.ratingModalHeader}>
                <View style={styles.historyDetailHeading}>
                  <Text style={styles.historyDetailTitle}>
                    Trip details
                  </Text>
                  <Text style={styles.historyDetailChild}>
                    {selectedHistoryTrip?.childName || "Child"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedHistoryTrip(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close trip details"
                >
                  <MaterialIcons name="close" size={24} color="#B9AFC4" />
                </TouchableOpacity>
              </View>

              {selectedHistoryTrip && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.historyDetailContent}
                >
                  <View
                    style={[
                      styles.historyDetailStatus,
                      selectedHistoryTrip.status === "Completed" &&
                        styles.completedStatus,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyDetailStatusText,
                        selectedHistoryTrip.status === "Completed" &&
                          styles.completedText,
                      ]}
                    >
                      {selectedHistoryTrip.status}
                    </Text>
                  </View>
                  {selectedHistoryTrip.reason ? (
                    <View style={styles.historyReasonPanel}>
                      <Text style={styles.historyReasonTitle}>
                        Why this trip was not completed
                      </Text>
                      <Text style={styles.historyReasonText}>
                        {selectedHistoryTrip.reason}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.historyDetailLabel}>Route</Text>
                  <Text style={styles.historyDetailValue}>
                    {selectedHistoryTrip.route}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Driver</Text>
                  <Text style={styles.historyDetailValue}>
                    {selectedHistoryTrip.driver}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Started</Text>
                  <Text style={styles.historyDetailValue}>
                    {formatTripDateTime(
                      selectedHistoryTrip.rawData?.start_time,
                    )}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Ended</Text>
                  <Text style={styles.historyDetailValue}>
                    {formatTripDateTime(
                      selectedHistoryTrip.rawData?.end_time,
                    )}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Route duration</Text>
                  <Text style={styles.historyDetailValue}>
                    {formatElapsedDuration(
                      selectedHistoryTrip.rawData?.duration_seconds,
                    ) || "Not recorded"}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Distance</Text>
                  <Text style={styles.historyDetailValue}>
                    {Number(selectedHistoryTrip.rawData?.distance_meters) > 0
                      ? `${(
                          Number(
                            selectedHistoryTrip.rawData.distance_meters,
                          ) / 1000
                        ).toFixed(1)} km`
                      : "Not recorded"}
                  </Text>
                  <Text style={styles.historyDetailLabel}>Location updates</Text>
                  <Text style={styles.historyDetailValue}>
                    {Array.isArray(
                      selectedHistoryTrip.rawData?.location_updates,
                    )
                      ? selectedHistoryTrip.rawData.location_updates.length
                      : 0}
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={isMapFullScreen && routeTripsVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsMapFullScreen(false)}
        >
          <View style={styles.fullScreenMapContainer}>
            {renderActiveMap(true, {
              flex: 1,
              width: "100%",
              height: "100%",
              borderRadius: 0,
            })}
            <View style={styles.fullScreenMapHeader}>
              <TouchableOpacity
                onPress={() => setIsMapFullScreen(false)}
                style={styles.fullScreenMapCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close full screen map"
              >
                <MaterialIcons name="close" size={22} color="#FBF8FF" />
              </TouchableOpacity>
              <Text style={styles.fullScreenMapTitle}>Today&apos;s Trip</Text>
            </View>
            <View style={styles.fullScreenTripInfo}>
              <View style={styles.fullScreenTripInfoHeader}>
                <View style={styles.fullScreenDirectionIcon}>
                  <MaterialIcons
                    name="directions-bus"
                    size={20}
                    color="#C14BFF"
                  />
                </View>
                <View style={styles.fullScreenDirectionCopy}>
                  <Text style={styles.fullScreenDirectionLabel}>
                    {tripDirectionLabel}
                  </Text>
                  <Text style={styles.fullScreenNextStop} numberOfLines={1}>
                    {nextStopDescription}
                  </Text>
                  {nextRouteStop?.address ? (
                    <Text
                      style={styles.fullScreenStopAddress}
                      numberOfLines={1}
                    >
                      {nextRouteStop.address}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.fullScreenLiveBadge,
                    driverConnectionLost && styles.fullScreenOfflineBadge,
                    longOfflineWarning && styles.fullScreenLongOfflineBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.fullScreenLiveBadgeText,
                      driverConnectionLost && styles.fullScreenOfflineBadgeText,
                      longOfflineWarning &&
                        styles.fullScreenLongOfflineBadgeText,
                    ]}
                  >
                    {liveDriverLocation
                      ? "LIVE"
                      : driverConnectionLost
                        ? longOfflineWarning
                          ? "OFFLINE 10+ MIN"
                          : "CONNECTION LOST"
                        : "GPS UNAVAILABLE"}
                  </Text>
                </View>
              </View>
              <View style={styles.fullScreenMetrics}>
                <View style={styles.fullScreenMetric}>
                  <MaterialIcons name="straighten" size={17} color="#B9AFC4" />
                  <Text style={styles.fullScreenMetricLabel}>Distance</Text>
                  <Text style={styles.fullScreenMetricValue}>
                    {liveDriverLocation &&
                    Number.isFinite(currentRouteMetrics?.distanceKm)
                      ? `${currentRouteMetrics.distanceKm.toFixed(1)} km`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.fullScreenMetricDivider} />
                <View style={styles.fullScreenMetric}>
                  <MaterialIcons name="schedule" size={17} color="#B9AFC4" />
                  <Text style={styles.fullScreenMetricLabel}>ETA</Text>
                  <Text style={styles.fullScreenMetricValue}>
                    {liveDriverLocation
                      ? formatDuration(currentRouteMetrics?.durationMinutes)
                      : "—"}
                  </Text>
                </View>
                <View style={styles.fullScreenMetricDivider} />
                <View style={styles.fullScreenMetric}>
                  <MaterialIcons name="alt-route" size={17} color="#B9AFC4" />
                  <Text style={styles.fullScreenMetricLabel}>Status</Text>
                  <Text style={styles.fullScreenMetricValue}>
                    {activeTripBoarded
                      ? activeTripArrived
                        ? "Handoff pending"
                        : "Child on board"
                      : activeTripArrived
                        ? "Driver arrived"
                        : activeTripConfirmed
                          ? liveDriverLocation
                            ? "Driver en route"
                            : driverConnectionLost
                              ? longOfflineWarning
                                ? "Offline 10+ min"
                                : "Connection lost"
                              : "GPS unavailable"
                          : "Awaiting update"}
                  </Text>
                </View>
              </View>
              {!liveDriverLocation && lastLocationLabel ? (
                <Text
                  style={[
                    styles.fullScreenLastLocation,
                    longOfflineWarning && styles.fullScreenLongOfflineLocation,
                  ]}
                >
                  Last location received {lastLocationLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Rating Modal */}
        <Modal
          visible={ratingModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setRatingModal({ visible: false, trip: null });
            setRating(0);
            setComment("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.ratingModal}>
              <View style={styles.ratingModalHeader}>
                <Text style={styles.ratingModalTitle}>Rate the driver</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRatingModal({ visible: false, trip: null });
                    setRating(0);
                    setComment("");
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#B9AFC4" />
                </TouchableOpacity>
              </View>

              {ratingModal.trip && (
                <>
                  <Text style={styles.ratingModalDriver}>
                    {ratingModal.trip.driver}
                  </Text>

                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                      >
                        <MaterialIcons
                          name="star"
                          size={40}
                          color={star <= rating ? "#FDB022" : "#E5E7EB"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.ratingComment}
                    placeholder="Add a comment (optional)"
                    placeholderTextColor="#A0AEC0"
                    multiline={true}
                    numberOfLines={4}
                    value={comment}
                    onChangeText={setComment}
                    editable={!submittingRating}
                  />

                  <TouchableOpacity
                    style={[
                      styles.ratingSubmitButton,
                      submittingRating && styles.ratingSubmitButtonDisabled,
                    ]}
                    onPress={submitRating}
                    disabled={submittingRating || !rating}
                  >
                    <Text style={styles.ratingSubmitButtonText}>
                      {submittingRating ? "Submitting..." : "Submit Rating"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Trips;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07040B",
  },

  container: {
    flex: 1,
    backgroundColor: "#07040B",
  },
  header: {
    backgroundColor: "#9B2BE7",
    borderBottomColor: "#C14BFF",
  },
  contentView: {
    paddingHorizontal: 20,
  },
  transportAccessNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 14,
    backgroundColor: "#2A1B0A",
  },
  transportAccessCopy: {
    flex: 1,
  },
  transportAccessTitle: {
    color: "#FDE68A",
    fontSize: 13,
    fontWeight: "800",
  },
  transportAccessText: {
    marginTop: 4,
    color: "#FCD34D",
    fontSize: 11,
    lineHeight: 16,
  },
  transportAccessButton: {
    alignSelf: "flex-start",
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
  },
  transportAccessButtonText: {
    color: "#1C1205",
    fontSize: 11,
    fontWeight: "800",
  },
  schoolTripsSection: {
    marginBottom: 22,
  },
  schoolTripEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 14,
    backgroundColor: "#1C1026",
  },
  schoolTripEmptyText: {
    flex: 1,
    color: "#B9AFC4",
    fontSize: 11,
  },
  schoolTripCard: {
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 17,
    backgroundColor: "#130D1A",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  schoolTripHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  schoolTripIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1C1026",
  },
  schoolTripHeadingText: {
    flex: 1,
  },
  schoolTripName: {
    color: "#FBF8FF",
    fontSize: 13,
    fontWeight: "800",
  },
  schoolTripDestination: {
    marginTop: 3,
    color: "#B9AFC4",
    fontSize: 11,
  },
  schoolTripStatus: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#1C1026",
    color: "#C14BFF",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  schoolTripStatusLive: {
    backgroundColor: "#1C1026",
    color: "#C14BFF",
  },
  schoolTripFacts: {
    gap: 5,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#352341",
  },
  schoolTripFact: {
    color: "#B9AFC4",
    fontSize: 10,
  },
  schoolTripDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#352341",
  },
  schoolTripDetailsButtonText: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "700",
  },
  schoolTripVehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 9,
    borderRadius: 10,
    backgroundColor: "#07040B",
  },
  schoolTripVehicleCopy: { flex: 1, gap: 4 },
  schoolTripVehicleText: {
    color: "#FBF8FF",
    fontSize: 10,
    lineHeight: 15,
  },
  schoolTripJourney: {
    color: "#526987",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
  },
  schoolTripLiveWrap: {
    marginTop: 11,
  },
  schoolTripMap: {
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  schoolTripLocationUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 9,
    backgroundColor: "#1C1026",
  },
  schoolTripLocationText: {
    flex: 1,
    color: "#92400E",
    fontSize: 10,
  },
  schoolTripLastSeen: {
    marginTop: 6,
    color: "#B9AFC4",
    fontSize: 9,
  },
  schoolTripEmergency: {
    marginTop: 9,
    color: "#B91C1C",
    fontSize: 10,
    fontWeight: "700",
  },

  scrollContent: {
    paddingBottom: 30,
  },

  /* Segmented control */

  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#1C1026",
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#352341",
  },

  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  segmentButtonActive: {
    backgroundColor: "#130D1A",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  segmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B9AFC4",
  },

  segmentTextActive: {
    color: "#C14BFF",
    fontWeight: "700",
  },

  /* Section */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FBF8FF",
    letterSpacing: -0.2,
  },

  viewMapText: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "700",
  },

  tripCount: {
    fontSize: 11,
    color: "#B9AFC4",
    fontWeight: "600",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1C1026",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9B2BE7",
  },

  liveText: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "700",
  },

  scheduledWindowBadge: {
    backgroundColor: "#1C1026",
  },

  scheduledWindowDot: {
    backgroundColor: "#3B82F6",
  },

  scheduledWindowText: {
    color: "#1D4ED8",
  },

  /* Next trip */

  nextTripCard: {
    backgroundColor: "#130D1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#352341",

    padding: 18,
    marginBottom: 24,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  nextTripTop: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 20,
  },

  todayLabel: {
    fontSize: 12,
    color: "#B9AFC4",
    fontWeight: "600",
    marginBottom: 3,
  },

  tripTime: {
    fontSize: 15,
    color: "#FBF8FF",
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  nextTripRouteName: {
    marginTop: 3,
    color: "#B9AFC4",
    fontSize: 11,
    fontWeight: "600",
  },

  onTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1C1026",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },

  onTimeText: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },

  /* Route */

  routeContainer: {
    flexDirection: "row",
    minHeight: 128,
  },

  routeTimeline: {
    width: 30,
    alignItems: "center",
    paddingTop: 5,
  },

  startPoint: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1C1026",
    borderWidth: 3,
    borderColor: "#C14BFF",
    alignItems: "center",
    justifyContent: "center",
  },

  startPointInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#9B2BE7",
  },

  timelineLine: {
    width: 2,
    height: 70,
    backgroundColor: "#C8EFD3",
    marginVertical: 5,
  },

  endPoint: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#9B2BE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  routeContent: {
    flex: 1,
    paddingLeft: 8,
  },

  locationBlock: {
    minHeight: 68,
  },

  locationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FBF8FF",
    marginBottom: 2,
  },

  locationAddress: {
    fontSize: 11,
    lineHeight: 15,
    color: "#B9AFC4",
  },

  /* Driver */

  driverSection: {
    borderTopWidth: 1,
    borderTopColor: "#352341",
    paddingTop: 15,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  driverAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C14BFF",
  },

  driverName: {
    fontSize: 12,
    color: "#FBF8FF",
    fontWeight: "700",
    marginBottom: 2,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  ratingText: {
    fontSize: 11,
    color: "#B9AFC4",
    fontWeight: "700",
  },

  ratingLabel: {
    fontSize: 11,
    color: "#B9AFC4",
    marginLeft: 2,
  },

  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    backgroundColor: "#1C1026",
    borderRadius: 12,

    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  messageButtonText: {
    fontSize: 11,
    color: "#C14BFF",
    fontWeight: "700",
  },

  /* Tracking */

  trackingCard: {
    backgroundColor: "#130D1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#352341",
    overflow: "hidden",
    marginBottom: 24,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  mapPlaceholder: {
    height: 190,
    backgroundColor: "#1C1026",
    position: "relative",
    overflow: "hidden",
  },

  roadOne: {
    position: "absolute",
    width: 500,
    height: 14,
    backgroundColor: "#130D1A",
    transform: [{ rotate: "17deg" }],
    top: 55,
    left: -80,
  },

  roadTwo: {
    position: "absolute",
    width: 500,
    height: 11,
    backgroundColor: "#130D1A",
    transform: [{ rotate: "-24deg" }],
    top: 105,
    left: -100,
  },

  roadThree: {
    position: "absolute",
    width: 11,
    height: 400,
    backgroundColor: "#130D1A",
    transform: [{ rotate: "21deg" }],
    left: 120,
    top: -100,
  },

  roadFour: {
    position: "absolute",
    width: 9,
    height: 400,
    backgroundColor: "#130D1A",
    transform: [{ rotate: "-35deg" }],
    right: 80,
    top: -80,
  },

  mapRouteLine: {
    position: "absolute",
    width: 170,
    height: 5,
    backgroundColor: "#9B2BE7",
    borderRadius: 5,
    transform: [{ rotate: "-22deg" }],
    left: 75,
    top: 100,
  },

  mapStartPoint: {
    position: "absolute",
    left: 38,
    bottom: 30,

    width: 22,
    height: 22,
    borderRadius: 11,

    backgroundColor: "#1C1026",
    borderWidth: 4,
    borderColor: "#C14BFF",

    alignItems: "center",
    justifyContent: "center",
  },

  mapStartInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9B2BE7",
  },

  busMarker: {
    position: "absolute",
    left: 132,
    top: 78,

    width: 44,
    height: 44,
    borderRadius: 22,

    backgroundColor: "#9B2BE7",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: "#FFFFFF",

    shadowColor: "#C14BFF",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  mapEndPoint: {
    position: "absolute",
    right: 32,
    top: 30,

    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#9B2BE7",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  trackingInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 8,
  },

  trackingItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  trackingIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  trackingLabel: {
    fontSize: 9,
    color: "#B9AFC4",
    fontWeight: "600",
    marginBottom: 2,
  },

  trackingValue: {
    fontSize: 8,
    color: "#FBF8FF",
    fontWeight: "800",
  },

  trackingDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#1C1026",
  },

  /* Trip list */

  tripList: {
    gap: 10,
  },

  tripListItem: {
    flexDirection: "column",
    alignItems: "stretch",

    backgroundColor: "#130D1A",

    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#352341",

    paddingVertical: 13,
    paddingHorizontal: 12,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  dateBlock: {
    width: 54,
    alignItems: "center",
  },

  dateMonth: {
    fontSize: 11,
    color: "#B9AFC4",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  dateNumber: {
    fontSize: 22,
    color: "#FBF8FF",
    fontWeight: "800",
    lineHeight: 28,
  },

  dateLabel: {
    fontSize: 9,
    color: "#B9AFC4",
    fontWeight: "600",
  },

  listDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#1C1026",
    marginHorizontal: 11,
  },

  tripListContent: {
    flex: 1,
    minWidth: 0,
  },

  listTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginBottom: 3,
  },

  tripPeriodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#1C1026",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
  },

  tripPeriodText: {
    color: "#C14BFF",
    fontSize: 9,
    fontWeight: "700",
  },

  tripListTime: {
    fontSize: 13,
    color: "#FBF8FF",
    fontWeight: "800",
    marginRight: 7,
    flexShrink: 1,
  },

  smallStatus: {
    maxWidth: 112,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 1,
  },

  scheduledStatus: {
    backgroundColor: "#1C1026",
  },

  completedStatus: {
    backgroundColor: "#1C1026",
  },

  incompleteStatus: {
    backgroundColor: "#1C1026",
  },

  smallStatusText: {
    fontSize: 9,
    fontWeight: "700",
    flexShrink: 1,
  },

  scheduledText: {
    color: "#C14BFF",
  },

  completedText: {
    color: "#C14BFF",
  },

  incompleteText: {
    color: "#B45309",
  },

  tripListRoute: {
    fontSize: 11,
    color: "#FBF8FF",
    fontWeight: "600",
    marginBottom: 5,
  },

  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  tripListMeta: {
    fontSize: 11,
    color: "#B9AFC4",
    fontWeight: "500",
    flexShrink: 1,
  },

  tripListItemContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  tripHistoryReason: {
    marginTop: 7,
    color: "#8A4B08",
    fontSize: 10,
    lineHeight: 14,
  },

  rateDriverButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1C1026",
    borderWidth: 1,
    borderColor: "#C14BFF",
  },

  rateDriverButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#C14BFF",
  },

  fullScreenMapContainer: {
    flex: 1,
    backgroundColor: "#07040B",
  },

  fullScreenMapHeader: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  fullScreenMapCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#130D1A",
    elevation: 3,
  },

  fullScreenMapTitle: {
    color: "#FBF8FF",
    backgroundColor: "#130D1A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: "700",
    elevation: 3,
  },

  fullScreenTripInfo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 24,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.97)",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },

  fullScreenTripInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF6",
  },

  fullScreenDirectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1026",
  },

  fullScreenDirectionCopy: {
    flex: 1,
    minWidth: 0,
  },

  fullScreenDirectionLabel: {
    color: "#C14BFF",
    fontSize: 11,
    fontWeight: "700",
  },

  fullScreenNextStop: {
    marginTop: 2,
    color: "#FBF8FF",
    fontSize: 14,
    fontWeight: "800",
  },

  fullScreenStopAddress: {
    marginTop: 2,
    color: "#B9AFC4",
    fontSize: 11,
  },

  fullScreenLiveBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#1C1026",
  },

  fullScreenOfflineBadge: {
    backgroundColor: "#1C1026",
  },

  fullScreenLiveBadgeText: {
    color: "#C14BFF",
    fontSize: 10,
    fontWeight: "800",
  },

  fullScreenOfflineBadgeText: {
    color: "#B45309",
  },

  fullScreenLongOfflineBadge: {
    backgroundColor: "#35151D",
  },

  fullScreenLongOfflineBadgeText: {
    color: "#B91C1C",
  },

  fullScreenMetrics: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
  },

  fullScreenMetric: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },

  fullScreenMetricLabel: {
    color: "#B9AFC4",
    fontSize: 10,
    fontWeight: "600",
  },

  fullScreenMetricValue: {
    color: "#FBF8FF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  fullScreenMetricDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#1C1026",
  },

  fullScreenLastLocation: {
    marginTop: 10,
    color: "#B45309",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  fullScreenLongOfflineLocation: {
    color: "#B91C1C",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  ratingModal: {
    backgroundColor: "#130D1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },

  historyDetailSheet: {
    width: "100%",
    maxHeight: "82%",
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#130D1A",
  },

  historyDetailHeading: {
    flex: 1,
  },

  historyDetailTitle: {
    color: "#FBF8FF",
    fontSize: 17,
    fontWeight: "800",
  },

  historyDetailChild: {
    marginTop: 3,
    color: "#B9AFC4",
    fontSize: 12,
  },

  historyDetailContent: {
    paddingBottom: 10,
  },

  historyDetailStatus: {
    alignSelf: "flex-start",
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1C1026",
  },

  historyDetailStatusText: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
  },

  historyReasonPanel: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1C1026",
    borderWidth: 1,
    borderColor: "#FDE2BD",
  },

  historyReasonTitle: {
    marginBottom: 4,
    color: "#8A4B08",
    fontSize: 12,
    fontWeight: "800",
  },

  historyReasonText: {
    color: "#68421D",
    fontSize: 12,
    lineHeight: 18,
  },

  historyDetailLabel: {
    marginTop: 12,
    color: "#B9AFC4",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  historyDetailValue: {
    marginTop: 3,
    color: "#FBF8FF",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  ratingModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  ratingModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FBF8FF",
  },

  ratingModalDriver: {
    fontSize: 13,
    color: "#B9AFC4",
    marginBottom: 20,
    fontWeight: "500",
  },

  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },

  ratingComment: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    fontSize: 12,
    color: "#FBF8FF",
    textAlignVertical: "top",
  },

  ratingSubmitButton: {
    backgroundColor: "#9B2BE7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  ratingSubmitButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },

  ratingSubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  bottomSpacer: {
    height: 20,
  },
});
