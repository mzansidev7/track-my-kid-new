import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useTheme } from "../../../styles/theme";
import { resolveWorkingBaseUrl } from "../../../url";

type AssignedTrip = {
  id: string;
  trip_id: string;
  driver_admin_id: string | null;
  coordinator_admin_id: string | null;
  learner_count: number;
  trip: {
    name: string;
    destination: string;
    departure_at: string;
    return_at: string;
    status: string;
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
  } | null;
};
type TripStartAlert = {
  id: string;
  title: string;
  message: string;
  related_school_trip_id: string | null;
  is_read: boolean;
};

export default function SchoolTrips() {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [trips, setTrips] = useState<AssignedTrip[]>([]);
  const [alerts, setAlerts] = useState<TripStartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [onlineAssignmentId, setOnlineAssignmentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const loadTrips = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
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
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      const activeTripIds = new Set(
        (Array.isArray(tripsData) ? tripsData : []).map((trip) => trip.trip_id),
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load assigned trips.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTrips();
    const interval = setInterval(() => void loadTrips(), 15000);
    return () => {
      clearInterval(interval);
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [loadTrips]);

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
    setBusyAssignmentId(assignment.id);
    setError("");
    try {
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
    setOnlineAssignmentId(null);
  };

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
          <MaterialIcons
            name="notifications-active"
            size={20}
            color="#7C3AED"
          />
          <Text style={styles.promptText}>
            When a scheduled trip starts, open it here and tap Go online. Keep
            the app open and location permission enabled while sharing.
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
            <Text style={styles.emptyTitle}>No active trips assigned</Text>
            <Text style={styles.muted}>
              Trips assigned to you will appear here when their scheduled start
              time arrives.
            </Text>
          </View>
        ) : (
          trips.map((assignment) => {
            const isOnline = onlineAssignmentId === assignment.id;
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
                  <View style={styles.liveBadge}>
                    <View style={[styles.dot, isOnline && styles.dotLive]} />
                    <Text
                      style={[
                        styles.liveText,
                        isOnline && styles.liveTextActive,
                      ]}
                    >
                      {isOnline ? "Online" : "Ready"}
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
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busyAssignmentId !== null && !isOnline}
                  onPress={() =>
                    isOnline ? goOffline() : void goOnline(assignment)
                  }
                  style={[
                    styles.onlineButton,
                    isOnline && styles.offlineButton,
                    busyAssignmentId === assignment.id && styles.buttonBusy,
                  ]}
                >
                  {busyAssignmentId === assignment.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <MaterialIcons
                      name={isOnline ? "location-disabled" : "my-location"}
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.onlineButtonText}>
                    {busyAssignmentId === assignment.id
                      ? "Starting…"
                      : isOnline
                        ? "Go offline"
                        : "Go online and share location"}
                  </Text>
                </TouchableOpacity>
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
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#98A2B3" },
  dotLive: { backgroundColor: "#16A34A" },
  liveText: { color: "#667085", fontSize: 9, fontWeight: "800" },
  liveTextActive: { color: "#15803D" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { flex: 1, color: "#475467", fontSize: 11 },
  lastLocation: { color: "#15803D", fontSize: 10 },
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
