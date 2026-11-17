import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomMap from "../../../components/map";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useTheme } from "../../../styles/theme";
import { resolveWorkingBaseUrl } from "../../../url";
import { client } from "../../../supabaseConfig/supabaseConfig";
import { unsubscribeFromRealtime } from "../../../store/subscriptions/realtimeUtils";

type AssignedTrip = {
  id: string;
  trip_id: string;
  driver_admin_id: string | null;
  coordinator_admin_id: string | null;
  learner_count: number;
  trip: {
    name: string;
    destination: string;
    destination_latitude?: number | null;
    destination_longitude?: number | null;
    departure_at: string;
    return_at: string;
    status: string;
    missed_at?: string | null;
  };
  vehicle?: {
    name?: string;
    registration_number?: string;
    passenger_capacity?: number;
  } | null;
  tracking?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
    shared_by?: { first_name?: string; last_name?: string } | null;
  } | null;
  journey_phase: "outbound" | "at_destination" | "returning" | "completed";
  journey_phase_updated_at?: string;
  trip_status?: string;
};
type TripStartAlert = {
  id: string;
  title: string;
  message: string;
  related_school_trip_id: string | null;
  is_read: boolean;
};
type AssignedTripsCache = {
  trips: AssignedTrip[];
  alerts: TripStartAlert[];
};

const assignedTripsCacheKey = (userId: string) =>
  `school-assigned-trips-v1:${userId}`;
const assignedTripsMemoryCache = new Map<string, AssignedTripsCache>();

export default function SchoolTrips() {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const userId = user?.userData?.id || user?.userData?.user_id || "";
  const initialCache = userId ? assignedTripsMemoryCache.get(userId) : null;
  const [trips, setTrips] = useState<AssignedTrip[]>(initialCache?.trips || []);
  const [alerts, setAlerts] = useState<TripStartAlert[]>(
    initialCache?.alerts || [],
  );
  const [loading, setLoading] = useState(!initialCache);
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [onlineAssignmentId, setOnlineAssignmentId] = useState<string | null>(
    null,
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState("");
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const watchAssignmentIdRef = useRef<string | null>(null);
  const hasFreshTripsRef = useRef(false);
  const cacheReadyRef = useRef(Boolean(initialCache));

  const loadTrips = useCallback(async (isActive: () => boolean = () => true) => {
    if (!user?.token) {
      if (isActive()) setLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const headers = { Authorization: `Bearer ${user.token}` };
      const [tripsResponse, notificationsResponse] = await Promise.all([
        fetch(`${baseUrl}/school/trips/assigned`, { headers }),
        fetch(`${baseUrl}/school/notifications?limit=50`, { headers }),
      ]);
      const [tripsData, notificationsData] = await Promise.all([
        tripsResponse.json(),
        notificationsResponse.json(),
      ]);
      if (!tripsResponse.ok) {
        throw new Error(tripsData.error || "Unable to load assigned trips.");
      }
      const nextTrips = Array.isArray(tripsData) ? tripsData : [];
      if (!isActive()) return;
      setTrips(nextTrips);
      hasFreshTripsRef.current = true;
      cacheReadyRef.current = true;
      const activeTripIds = new Set(
        nextTrips.map((trip) => trip.trip_id),
      );
      setAlerts(
        notificationsResponse.ok && Array.isArray(notificationsData)
          ? notificationsData.filter(
              (notification) =>
                notification.title === "Trip starting now — go online" &&
                activeTripIds.has(notification.related_school_trip_id),
            )
          : [],
      );
      setError("");
    } catch (requestError) {
      if (isActive()) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load assigned trips.",
        );
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const hydrateCache = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const rawCache = await AsyncStorage.getItem(
          assignedTripsCacheKey(userId),
        );
        if (!active || !rawCache) return;
        const parsed: unknown = JSON.parse(rawCache);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !Array.isArray((parsed as AssignedTripsCache).trips) ||
          !Array.isArray((parsed as AssignedTripsCache).alerts)
        ) {
          return;
        }
        const cached = parsed as AssignedTripsCache;
        assignedTripsMemoryCache.set(userId, cached);
        if (!hasFreshTripsRef.current) {
          setTrips(cached.trips);
          setAlerts(cached.alerts);
          setLoading(false);
        }
        cacheReadyRef.current = true;
      } catch (cacheError) {
        console.error("Could not load cached assigned school trips:", cacheError);
      }
    };
    void hydrateCache();
    const initialLoadTimeout = setTimeout(
      () => void loadTrips(() => active),
      0,
    );

    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => void loadTrips(() => active), 250);
    };
    const channel = userId
      ? client
          .channel(`school-assigned-trips:${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "school_trips" },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "school_trip_vehicles" },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "school_trip_tracking" },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "school_trip_learners" },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "school_vehicles" },
            scheduleRefresh,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            scheduleRefresh,
          )
          .subscribe((status: string) => {
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn("Assigned school trips realtime unavailable:", status);
            }
          })
      : null;

    return () => {
      active = false;
      clearTimeout(initialLoadTimeout);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (channel) void unsubscribeFromRealtime(channel);
      watchRef.current?.remove();
      watchRef.current = null;
      watchAssignmentIdRef.current = null;
    };
  }, [loadTrips, userId]);

  useEffect(() => {
    if (!userId || !cacheReadyRef.current) return;
    const cache = { trips, alerts };
    assignedTripsMemoryCache.set(userId, cache);
    void AsyncStorage.setItem(
      assignedTripsCacheKey(userId),
      JSON.stringify(cache),
    ).catch((cacheError) =>
      console.error("Could not save cached assigned school trips:", cacheError),
    );
  }, [alerts, trips, userId]);

  const sendLocation = useCallback(
    async (assignment: AssignedTrip, position: Location.LocationObject) => {
      if (!user?.token) return;
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/trips/${assignment.trip_id}/vehicles/${assignment.id}/location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to share trip location.");
      }
      setTrips((current) =>
        current.map((item) =>
          item.id === assignment.id ? { ...item, tracking: data } : item,
        ),
      );
    },
    [user],
  );

  const goOnline = async (assignment: AssignedTrip) => {
    if (!user?.token || busyAssignmentId) return;
    if (
      assignment.trip.status !== "in_progress" ||
      !["outbound", "returning"].includes(assignment.journey_phase)
    ) {
      setError("Location sharing is only available while the trip is travelling.");
      return;
    }
    setBusyAssignmentId(assignment.id);
    setError("");
    try {
      if (watchAssignmentIdRef.current !== assignment.id) goOffline();
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error(
          "Allow location access to share this trip's live location.",
        );
      }
      const firstLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await sendLocation(assignment, firstLocation);
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: 10000,
        },
        (position) => {
          void sendLocation(assignment, position).catch((trackingError) =>
            setError(
              trackingError instanceof Error
                ? trackingError.message
                : "Unable to share trip location.",
            ),
          );
        },
      );
      watchAssignmentIdRef.current = assignment.id;
      setOnlineAssignmentId(assignment.id);
      const startAlert = alerts.find(
        (alert) => alert.related_school_trip_id === assignment.trip_id,
      );
      if (startAlert) {
        try {
          const baseUrl = await resolveWorkingBaseUrl();
          const readResponse = await fetch(
            `${baseUrl}/school/notifications/${startAlert.id}/read`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${user.token}` },
            },
          );
          if (readResponse.ok) {
            setAlerts((current) =>
              current.filter((alert) => alert.id !== startAlert.id),
            );
          }
        } catch {
          // Location sharing is already running; leave the alert for retry.
        }
      }
    } catch (trackingError) {
      setError(
        trackingError instanceof Error
          ? trackingError.message
          : "Unable to start trip tracking.",
      );
    } finally {
      setBusyAssignmentId(null);
    }
  };

  const goOffline = () => {
    watchRef.current?.remove();
    watchRef.current = null;
    watchAssignmentIdRef.current = null;
    setOnlineAssignmentId(null);
  };

  const updateJourneyPhase = async (
    assignment: AssignedTrip,
    phase: "at_destination" | "returning" | "completed",
  ) => {
    if (!user?.token || busyAssignmentId) return null;
    setBusyAssignmentId(assignment.id);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/trips/${assignment.trip_id}/vehicles/${assignment.id}/journey-phase`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ phase }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update trip progress.");
      }
      setTrips((current) =>
        current.map((item) =>
          item.id === assignment.id
            ? {
                ...item,
                journey_phase: data.journey_phase,
                journey_phase_updated_at: data.journey_phase_updated_at,
                trip: {
                  ...item.trip,
                  status: data.trip_status || item.trip.status,
                },
              }
            : item,
        ),
      );
      return data;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update trip progress.",
      );
      return null;
    } finally {
      setBusyAssignmentId(null);
    }
  };

  const canDeleteTrips = ["full", "management"].includes(
    user?.userData?.admin_profile?.access_level,
  );
  const deleteTrip = async (assignment: AssignedTrip) => {
    if (!user?.token || deletingTripId) return;
    setDeletingTripId(assignment.trip_id);
    setError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/trips/${assignment.trip_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete school trip.");
      }
      setSelectedAssignmentId(null);
      await loadTrips();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete school trip.",
      );
    } finally {
      setDeletingTripId(null);
    }
  };
  const confirmDeleteTrip = (assignment: AssignedTrip) => {
    if (
      !canDeleteTrips ||
      assignment.trip.status === "in_progress" ||
      deletingTripId
    ) {
      return;
    }
    Alert.alert(
      "Delete school trip?",
      `Delete "${assignment.trip.name}"? This removes the trip and its registrations, assignments and tracking history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete trip",
          style: "destructive",
          onPress: () => void deleteTrip(assignment),
        },
      ],
    );
  };

  const liveAssignments = trips.filter(
    (assignment) =>
      assignment.trip.status === "in_progress" &&
      assignment.journey_phase !== "completed",
  );
  const selectedLiveAssignment =
    liveAssignments.find((item) => item.id === selectedAssignmentId) ||
    liveAssignments[0] ||
    null;
  const nonLiveAssignments = trips.filter(
    (assignment) =>
      assignment.trip.status !== "in_progress" ||
      assignment.journey_phase === "completed",
  );
  const isLocationFresh = (recordedAt?: string) => {
    if (!recordedAt) return false;
    const age = currentTime - new Date(recordedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 120_000;
  };

  useEffect(() => {
    const timeout = setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = setInterval(() => setCurrentTime(Date.now()), 15_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!onlineAssignmentId) return;
    const current = trips.find((item) => item.id === onlineAssignmentId);
    if (
      !current ||
      current.trip.status !== "in_progress" ||
      !["outbound", "returning"].includes(current.journey_phase)
    ) {
      goOffline();
    }
  }, [onlineAssignmentId, trips]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <MaterialIcons name="directions-bus" size={23} color="#FFFFFF" />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              School trips
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Go online to share your live location
            </Text>
          </View>
        </View>

        <View style={styles.prompt}>
          <MaterialIcons name="info-outline" size={20} color="#7C3AED" />
          <Text style={styles.promptText}>
            Location is shared while the vehicle is travelling. Mark arrival at
            the destination to pause sharing, then start the return journey
            when ready.
          </Text>
        </View>

        {alerts.map((alert) => (
          <View key={alert.id} style={styles.startAlert}>
            <MaterialIcons
              name="notifications-active"
              size={19}
              color="#166534"
            />
            <View style={styles.startAlertCopy}>
              <Text style={styles.startAlertTitle}>{alert.title}</Text>
              <Text style={styles.startAlertMessage}>{alert.message}</Text>
            </View>
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#6D45D8" />
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              Checking your assigned trips…
            </Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="event-available" size={30} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No trips assigned</Text>
            <Text style={styles.muted}>
              Trips assigned to you will appear here when the school confirms
              them.
            </Text>
          </View>
        ) : selectedLiveAssignment ? (
          <View style={styles.liveTripScreen}>
            {liveAssignments.length > 1 ? (
              <View style={styles.assignmentSelector}>
                {liveAssignments.map((assignment) => (
                  <TouchableOpacity
                    key={assignment.id}
                    onPress={() => setSelectedAssignmentId(assignment.id)}
                    style={[
                      styles.assignmentOption,
                      assignment.id === selectedLiveAssignment.id &&
                        styles.assignmentOptionActive,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.assignmentOptionText,
                        assignment.id === selectedLiveAssignment.id &&
                          styles.assignmentOptionTextActive,
                      ]}
                    >
                      {assignment.vehicle?.name || assignment.trip.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <View style={styles.liveTripCard}>
              <View style={styles.liveTripHeader}>
                <View style={styles.liveTripIcon}>
                  <MaterialIcons
                    name="directions-bus"
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.tripCopy}>
                  <Text style={styles.liveTripEyebrow}>LIVE TRIP</Text>
                  <Text style={styles.liveTripName}>
                    {selectedLiveAssignment.trip.name}
                  </Text>
                  <Text style={styles.tripDestination}>
                    {selectedLiveAssignment.trip.destination}
                  </Text>
                </View>
                <View style={styles.liveBadge}>
                  <View
                    style={[
                      styles.dot,
                      onlineAssignmentId === selectedLiveAssignment.id &&
                        isLocationFresh(
                          selectedLiveAssignment.tracking?.recorded_at,
                        ) &&
                        styles.dotLive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveText,
                      onlineAssignmentId === selectedLiveAssignment.id &&
                        styles.liveTextActive,
                    ]}
                  >
                    {onlineAssignmentId === selectedLiveAssignment.id &&
                    isLocationFresh(
                      selectedLiveAssignment.tracking?.recorded_at,
                    )
                      ? "Sharing"
                      : "Not sharing"}
                  </Text>
                </View>
              </View>
              <View style={styles.phaseBanner}>
                <MaterialIcons
                  name={
                    selectedLiveAssignment.journey_phase === "at_destination"
                      ? "place"
                      : selectedLiveAssignment.journey_phase === "returning"
                        ? "undo"
                        : "near-me"
                  }
                  size={19}
                  color="#3730A3"
                />
                <View style={styles.phaseCopy}>
                  <Text style={styles.phaseTitle}>
                    {selectedLiveAssignment.journey_phase === "at_destination"
                      ? "At destination"
                      : selectedLiveAssignment.journey_phase === "returning"
                        ? "Returning to school"
                        : "On the way to destination"}
                  </Text>
                  <Text style={styles.phaseSubtitle}>
                    {selectedLiveAssignment.journey_phase === "at_destination"
                      ? "Location sharing is paused until the return journey starts."
                      : "The trip remains active until the vehicle returns to school."}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="directions-bus"
                  size={17}
                  color="#667085"
                />
                <Text style={styles.infoText}>
                  {selectedLiveAssignment.vehicle?.name || "School vehicle"} ·{" "}
                  {selectedLiveAssignment.vehicle?.registration_number ||
                    "Registration unavailable"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="groups" size={17} color="#667085" />
                <Text style={styles.infoText}>
                  {selectedLiveAssignment.learner_count} learners assigned
                </Text>
              </View>
              {selectedLiveAssignment.tracking ? (
                <Text
                  style={[
                    styles.lastLocation,
                    !isLocationFresh(
                      selectedLiveAssignment.tracking.recorded_at,
                    ) && styles.staleLocation,
                  ]}
                >
                  {isLocationFresh(
                    selectedLiveAssignment.tracking.recorded_at,
                  )
                    ? "Last location update"
                    : "Last known location"}
                  {" "}
                  {new Date(
                    selectedLiveAssignment.tracking.recorded_at,
                  ).toLocaleTimeString()}
                  {selectedLiveAssignment.tracking.shared_by
                    ? " - " +
                      [
                        selectedLiveAssignment.tracking.shared_by.first_name,
                        selectedLiveAssignment.tracking.shared_by.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : ""}
                </Text>
              ) : (
                <Text style={styles.staleLocation}>
                  No GPS location has been shared yet.
                </Text>
              )}
              {(() => {
                const markers = [];
                const tracking = selectedLiveAssignment.tracking;
                if (
                  tracking &&
                  isLocationFresh(tracking.recorded_at) &&
                  ["outbound", "returning"].includes(
                    selectedLiveAssignment.journey_phase,
                  )
                ) {
                  markers.push({
                    latitude: Number(tracking.latitude),
                    longitude: Number(tracking.longitude),
                    title:
                      selectedLiveAssignment.vehicle?.name ||
                      "School trip vehicle",
                    type: "driver" as const,
                  });
                }
                const destinationLatitude = Number(
                  selectedLiveAssignment.trip.destination_latitude,
                );
                const destinationLongitude = Number(
                  selectedLiveAssignment.trip.destination_longitude,
                );
                if (
                  Number.isFinite(destinationLatitude) &&
                  Number.isFinite(destinationLongitude)
                ) {
                  markers.push({
                    latitude: destinationLatitude,
                    longitude: destinationLongitude,
                    title: selectedLiveAssignment.trip.destination,
                    type: "end" as const,
                  });
                }
                return markers.length ? (
                  <CustomMap
                    markers={markers}
                    requestLocationPermission={false}
                    style={styles.liveMap}
                  />
                ) : (
                  <View style={styles.mapUnavailable}>
                    <MaterialIcons
                      name="location-off"
                      size={20}
                      color="#64748B"
                    />
                    <Text style={styles.mapUnavailableText}>
                      {selectedLiveAssignment.journey_phase === "at_destination"
                        ? "Location sharing is paused at the destination."
                        : "The map will show the vehicle after a fresh GPS update."}
                    </Text>
                  </View>
                );
              })()}
              {["outbound", "returning"].includes(
                selectedLiveAssignment.journey_phase,
              ) ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busyAssignmentId !== null}
                  onPress={() =>
                    onlineAssignmentId === selectedLiveAssignment.id
                      ? goOffline()
                      : void goOnline(selectedLiveAssignment)
                  }
                  style={[
                    styles.onlineButton,
                    onlineAssignmentId === selectedLiveAssignment.id &&
                      styles.offlineButton,
                    busyAssignmentId === selectedLiveAssignment.id &&
                      styles.buttonBusy,
                  ]}
                >
                  {busyAssignmentId === selectedLiveAssignment.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <MaterialIcons
                      name={
                        onlineAssignmentId === selectedLiveAssignment.id
                          ? "location-disabled"
                          : "my-location"
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.onlineButtonText}>
                    {onlineAssignmentId === selectedLiveAssignment.id
                      ? "Go offline"
                      : "Go online and share location"}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {selectedLiveAssignment.journey_phase === "outbound" ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busyAssignmentId !== null}
                  onPress={async () => {
                    const updated = await updateJourneyPhase(
                      selectedLiveAssignment,
                      "at_destination",
                    );
                    if (updated && onlineAssignmentId === selectedLiveAssignment.id) {
                      goOffline();
                    }
                  }}
                  style={styles.secondaryAction}
                >
                  <MaterialIcons
                    name="place"
                    size={18}
                    color="#3730A3"
                  />
                  <Text style={styles.secondaryActionText}>
                    Arrived at destination
                  </Text>
                </TouchableOpacity>
              ) : selectedLiveAssignment.journey_phase === "at_destination" ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busyAssignmentId !== null}
                  onPress={async () => {
                    const updated = await updateJourneyPhase(
                      selectedLiveAssignment,
                      "returning",
                    );
                    if (updated) {
                      const returningAssignment = {
                        ...selectedLiveAssignment,
                        journey_phase: "returning" as const,
                      };
                      await goOnline(returningAssignment);
                    }
                  }}
                  style={styles.onlineButton}
                >
                  <MaterialIcons
                    name="undo"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.onlineButtonText}>
                    Start return journey
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busyAssignmentId !== null}
                  onPress={async () => {
                    const updated = await updateJourneyPhase(
                      selectedLiveAssignment,
                      "completed",
                    );
                    if (updated) {
                      if (onlineAssignmentId === selectedLiveAssignment.id) {
                        goOffline();
                      }
                      await loadTrips();
                    }
                  }}
                  style={styles.completeAction}
                >
                  <MaterialIcons
                    name="check-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.onlineButtonText}>
                    Complete trip · returned to school
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {nonLiveAssignments.length > 0 ? (
              <View style={styles.upcomingNote}>
                <Text style={styles.upcomingTitle}>Other assigned trips</Text>
                {nonLiveAssignments.map((assignment) => (
                  <Text key={assignment.id} style={styles.upcomingText}>
                    {assignment.trip.name} ·{" "}
                    {assignment.journey_phase === "completed"
                      ? "This vehicle has returned"
                      : assignment.trip.status.replaceAll("_", " ")}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          nonLiveAssignments.map((assignment) => {
            return (
              <View key={assignment.id} style={styles.tripCard}>
                <View style={styles.cardTop}>
                  <View style={styles.tripIcon}>
                    <MaterialIcons name="route" size={20} color="#6D45D8" />
                  </View>
                  <View style={styles.tripCopy}>
                    <Text style={styles.tripName}>{assignment.trip.name}</Text>
                    <Text style={styles.tripDestination}>
                      {assignment.trip.destination}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.liveBadge,
                      assignment.trip.status === "missed" && styles.missedBadge,
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        assignment.trip.status === "missed" && styles.dotMissed,
                      ]}
                    />
                    <Text
                      style={[
                        styles.liveText,
                        assignment.trip.status === "missed" && styles.missedText,
                      ]}
                    >
                      {assignment.journey_phase === "completed"
                        ? "Returned"
                        : assignment.trip.status.replaceAll("_", " ")}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="directions-bus"
                    size={17}
                    color="#667085"
                  />
                  <Text style={styles.infoText}>
                    {assignment.vehicle?.name || "Vehicle"} ·{" "}
                    {assignment.vehicle?.registration_number ||
                      "Registration unavailable"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="schedule" size={17} color="#667085" />
                  <Text style={styles.infoText}>
                    {new Date(assignment.trip.departure_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="groups" size={17} color="#667085" />
                  <Text style={styles.infoText}>
                    {assignment.learner_count} learners assigned
                  </Text>
                </View>
                {assignment.tracking && (
                  <Text style={styles.lastLocation}>
                    Last location shared{" "}
                    {new Date(
                      assignment.tracking.recorded_at,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
                <Text style={styles.upcomingText}>
                  {assignment.trip.status === "missed"
                    ? "This trip was marked missed because no vehicle location was shared within 15 minutes of departure."
                    : assignment.journey_phase === "completed"
                    ? "This vehicle has returned. The overall trip remains active until all assigned vehicles return."
                    : "Location sharing becomes available when the trip is active."}
                </Text>
                {canDeleteTrips && assignment.trip.status !== "in_progress" ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${assignment.trip.name}`}
                    disabled={deletingTripId === assignment.trip_id}
                    onPress={() => confirmDeleteTrip(assignment)}
                    style={styles.deleteTripButton}
                  >
                    {deletingTripId === assignment.trip_id ? (
                      <ActivityIndicator color="#B42318" size="small" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="delete-outline"
                          size={18}
                          color="#B42318"
                        />
                        <Text style={styles.deleteTripText}>Delete trip</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 120, gap: 14 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 3,
  },
  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#6D45D8",
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1 },
  title: { fontSize: 23, fontWeight: "800" },
  subtitle: { marginTop: 3, fontSize: 12 },
  prompt: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F5F1FF",
    borderWidth: 1,
    borderColor: "#E9DFFF",
  },
  promptText: { flex: 1, color: "#534276", fontSize: 11, lineHeight: 17 },
  startAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  startAlertCopy: { flex: 1, gap: 4 },
  startAlertTitle: { color: "#166534", fontSize: 11, fontWeight: "800" },
  startAlertMessage: { color: "#3F644C", fontSize: 10, lineHeight: 15 },
  loading: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 30,
  },
  muted: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  error: {
    padding: 12,
    borderRadius: 10,
    color: "#991B1B",
    backgroundColor: "#FEF2F2",
    fontSize: 12,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    padding: 28,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },
  emptyTitle: { color: "#1F2937", fontSize: 15, fontWeight: "800" },
  tripCard: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECF2",
    gap: 11,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  liveTripScreen: { gap: 12 },
  assignmentSelector: { flexDirection: "row", gap: 8 },
  assignmentOption: {
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  assignmentOptionActive: {
    borderColor: "#6D45D8",
    backgroundColor: "#F3EFFF",
  },
  assignmentOptionText: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700",
  },
  assignmentOptionTextActive: { color: "#5B36C8" },
  liveTripCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECF2",
    gap: 13,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  liveTripHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  liveTripIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#6D45D8",
    alignItems: "center",
    justifyContent: "center",
  },
  liveTripEyebrow: {
    color: "#6D45D8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  liveTripName: { color: "#172033", fontSize: 16, fontWeight: "800" },
  phaseBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
  },
  phaseCopy: { flex: 1, gap: 3 },
  phaseTitle: { color: "#3730A3", fontSize: 12, fontWeight: "800" },
  phaseSubtitle: { color: "#5B5A80", fontSize: 10, lineHeight: 15 },
  lastLocation: { color: "#15803D", fontSize: 10, lineHeight: 15 },
  staleLocation: { color: "#B45309", fontSize: 10, lineHeight: 15 },
  liveMap: {
    width: "100%",
    height: 240,
    borderRadius: 14,
    overflow: "hidden",
  },
  mapUnavailable: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
  },
  mapUnavailableText: { flex: 1, color: "#64748B", fontSize: 10, lineHeight: 15 },
  secondaryAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
  },
  secondaryActionText: { color: "#3730A3", fontSize: 11, fontWeight: "800" },
  completeAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#15803D",
  },
  upcomingNote: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECF2",
    gap: 6,
  },
  upcomingTitle: { color: "#344054", fontSize: 11, fontWeight: "800" },
  upcomingText: { color: "#667085", fontSize: 10, lineHeight: 15 },
  deleteTripButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 10,
    backgroundColor: "#FEF3F2",
  },
  deleteTripText: { color: "#B42318", fontSize: 13, fontWeight: "700" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  tripIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F3EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  tripCopy: { flex: 1 },
  tripName: { color: "#172033", fontSize: 14, fontWeight: "800" },
  tripDestination: { marginTop: 3, color: "#667085", fontSize: 11 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  missedBadge: { backgroundColor: "#FEF3F2" },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#98A2B3" },
  dotMissed: { backgroundColor: "#D92D20" },
  dotLive: { backgroundColor: "#16A34A" },
  liveText: { color: "#667085", fontSize: 9, fontWeight: "800" },
  missedText: { color: "#B42318" },
  liveTextActive: { color: "#15803D" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { flex: 1, color: "#475467", fontSize: 11 },
  onlineButton: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    borderRadius: 12,
    backgroundColor: "#6D45D8",
  },
  offlineButton: { backgroundColor: "#475467" },
  buttonBusy: { opacity: 0.7 },
  onlineButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
