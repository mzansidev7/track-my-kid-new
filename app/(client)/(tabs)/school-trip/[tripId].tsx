import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import CustomMap from "../../../../components/map";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import { useTheme } from "../../../../styles/theme";
import ClientHeader from "../../components/ClientHeader";

type TripVehicle = {
  id: string;
  vehicle?: { name?: string; registration_number?: string } | null;
  driver?: { first_name?: string; last_name?: string; phone?: string } | null;
  coordinator?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
  tracking?: {
    latitude: number;
    longitude: number;
    recorded_at?: string;
  } | null;
};
type SchoolTrip = {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  destination: string;
  destination_address?: string;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  departure_at: string;
  return_at: string;
  status: string;
  is_free?: boolean;
  price?: number;
  deposit?: number;
  currency?: string;
  payment_deadline?: string | null;
  payment_notes?: string | null;
  emergency_contact?: string | null;
  emergency_notes?: string | null;
  learners?: {
    child_id: string;
    attendance_status?: string;
    payment_status?: string;
    registration_status?: string;
    child?: { name?: string; lastname?: string; grade?: string } | null;
  }[];
  vehicles?: TripVehicle[];
};

const displayDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not set";
const fullName = (
  person?: { first_name?: string; last_name?: string } | null,
) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ") ||
  "Not assigned";
const ago = (value?: string) => {
  if (!value) return "No GPS updates yet";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Last update time unavailable";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

export default function SchoolTripDetails() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const { colors: themeColors } = useTheme();
  const colors = {
    ...themeColors,
    primary: "#159B3A",
    primaryDark: "#087C2B",
    background: "#F4F9FF",
    surface: "#FFFFFF",
    surfaceHover: "#EDF7FF",
    border: "#DCEAF8",
    divider: "#DCEAF8",
    text: {
      ...themeColors.text,
      primary: "#17365E",
      secondary: "#607A98",
      tertiary: "#607A98",
    },
  };
  const [trips, setTrips] = useState<SchoolTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrips = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/school-trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Unable to load trip details.");
      setTrips(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load trip details.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadTrips(), 0);
    return () => clearTimeout(timeout);
  }, [loadTrips]);

  const trip = trips.find((item) => item.id === tripId);
  useEffect(() => {
    const interval = setInterval(
      () => void loadTrips(),
      trip?.status === "in_progress" ? 10000 : 30000,
    );
    return () => clearInterval(interval);
  }, [loadTrips, trip?.status]);

  const markers = useMemo(() => {
    if (!trip) return [];
    const vehicleMarkers: {
      latitude: number;
      longitude: number;
      title: string;
      type: "driver" | "end";
    }[] = (trip.vehicles || [])
      .filter((assignment) => {
        const latitude = Number(assignment.tracking?.latitude);
        const longitude = Number(assignment.tracking?.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude);
      })
      .map((assignment) => ({
        latitude: Number(assignment.tracking?.latitude),
        longitude: Number(assignment.tracking?.longitude),
        title: assignment.vehicle?.name || "School trip vehicle",
        type: "driver" as const,
      }));
    const latitude = Number(trip.destination_latitude);
    const longitude = Number(trip.destination_longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      vehicleMarkers.push({
        latitude,
        longitude,
        title: trip.destination,
        type: "end" as const,
      });
    }
    return vehicleMarkers;
  }, [trip]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.muted, { color: colors.text.secondary }]}>
            Loading trip details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <ClientHeader
          title="School trip"
          subtitle="Trip details"
          showBackButton
        />
        <View style={styles.center}>
          <MaterialIcons
            name="event-busy"
            size={28}
            color={colors.text.secondary}
          />
          <Text style={[styles.muted, { color: colors.text.secondary }]}>
            {error ||
              "This trip is unavailable or is not linked to your children."}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tripLearners = trip.learners || [];
  const assignments = trip.vehicles || [];
  const liveAssignments = assignments.filter((item) => item.tracking);
  const liveOrigin = liveAssignments[0]?.tracking
    ? {
        latitude: Number(liveAssignments[0].tracking.latitude),
        longitude: Number(liveAssignments[0].tracking.longitude),
      }
    : null;
  const destinationPoint =
    trip.destination_latitude != null && trip.destination_longitude != null
      ? {
          latitude: Number(trip.destination_latitude),
          longitude: Number(trip.destination_longitude),
        }
      : null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ClientHeader title="School trip" subtitle={trip.name} showBackButton />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroTop}>
            <View
              style={[styles.icon, { backgroundColor: `${colors.primary}18` }]}
            >
              <MaterialIcons name="school" size={22} color={colors.primary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {trip.name}
              </Text>
              <Text style={[styles.subTitle, { color: colors.text.secondary }]}>
                {trip.destination} ·{" "}
                {trip.category?.replaceAll("_", " ") || "School activity"}
              </Text>
            </View>
            <Text
              style={[
                styles.status,
                trip.status === "in_progress" && styles.liveStatus,
              ]}
            >
              {trip.status.replaceAll("_", " ")}
            </Text>
          </View>
          {!!trip.description && (
            <Text
              style={[styles.description, { color: colors.text.secondary }]}
            >
              {trip.description}
            </Text>
          )}
          <View style={styles.facts}>
            <Fact label="Departure" value={displayDate(trip.departure_at)} />
            <Fact label="Return" value={displayDate(trip.return_at)} />
            <Fact
              label="Price"
              value={
                trip.is_free
                  ? "Free"
                  : `${trip.currency || "ZAR"} ${Number(trip.price || 0).toFixed(2)}`
              }
            />
            {trip.deposit ? (
              <Fact
                label="Deposit"
                value={`${trip.currency || "ZAR"} ${Number(trip.deposit).toFixed(2)}`}
              />
            ) : null}
            {trip.payment_deadline ? (
              <Fact
                label="Payment deadline"
                value={new Date(trip.payment_deadline).toLocaleDateString()}
              />
            ) : null}
          </View>
          {!!trip.payment_notes && (
            <Text style={[styles.notes, { color: colors.text.secondary }]}>
              {trip.payment_notes}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Transport & live tracking
          </Text>
          {assignments.map((assignment) => (
            <View
              key={assignment.id}
              style={[styles.vehicleCard, { borderColor: colors.border }]}
            >
              <View style={styles.vehicleHead}>
                <MaterialIcons
                  name="directions-bus"
                  size={21}
                  color={colors.primary}
                />
                <View style={styles.vehicleCopy}>
                  <Text
                    style={[styles.vehicleName, { color: colors.text.primary }]}
                  >
                    {assignment.vehicle?.name || "School vehicle"}
                  </Text>
                  <Text
                    style={[styles.muted, { color: colors.text.secondary }]}
                  >
                    {assignment.vehicle?.registration_number ||
                      "Registration unavailable"}
                  </Text>
                </View>
                {trip.status === "in_progress" && (
                  <Text
                    style={[
                      styles.livePill,
                      liveAssignments.some(
                        (item) => item.id === assignment.id,
                      ) && styles.livePillOn,
                    ]}
                  >
                    {assignment.tracking ? "LIVE" : "GPS unavailable"}
                  </Text>
                )}
              </View>
              <Text style={[styles.muted, { color: colors.text.secondary }]}>
                Driver: {fullName(assignment.driver)}
                {assignment.driver?.phone
                  ? ` · ${assignment.driver.phone}`
                  : ""}
              </Text>
              {assignment.coordinator && (
                <Text style={[styles.muted, { color: colors.text.secondary }]}>
                  Coordinator: {fullName(assignment.coordinator)}
                  {assignment.coordinator.phone
                    ? ` · ${assignment.coordinator.phone}`
                    : ""}
                </Text>
              )}
              {trip.status === "in_progress" && (
                <Text style={[styles.muted, { color: colors.text.secondary }]}>
                  {assignment.tracking
                    ? `Last updated ${ago(assignment.tracking.recorded_at)}`
                    : "Location unavailable · No current GPS update"}
                </Text>
              )}
            </View>
          ))}
          {trip.status === "in_progress" && markers.length > 0 && (
            <CustomMap
              markers={markers}
              origin={liveOrigin}
              destination={destinationPoint}
              style={styles.map}
            />
          )}
          {trip.status === "in_progress" && markers.length === 0 && (
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              Live location is not available yet. The map will appear when the
              assigned vehicle sends GPS coordinates.
            </Text>
          )}
          {trip.status !== "in_progress" && (
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              Live vehicle tracking is available when the trip starts.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Your participating learners
          </Text>
          {tripLearners.length ? (
            tripLearners.map((item) => (
              <View
                key={item.child_id}
                style={[styles.learnerRow, { borderColor: colors.border }]}
              >
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.vehicleCopy}>
                  <Text
                    style={[styles.vehicleName, { color: colors.text.primary }]}
                  >
                    {item.child?.name} {item.child?.lastname || ""}
                  </Text>
                  <Text
                    style={[styles.muted, { color: colors.text.secondary }]}
                  >
                    {item.child?.grade || "Grade not set"} · Attendance{" "}
                    {item.attendance_status?.replaceAll("_", " ") ||
                      "not checked"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.paymentStatus,
                    { color: colors.text.secondary },
                  ]}
                >
                  {item.payment_status?.replaceAll("_", " ")}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              No participating learners found.
            </Text>
          )}
        </View>

        {(trip.emergency_contact || trip.emergency_notes) && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Safety & emergency
            </Text>
            {!!trip.emergency_contact && (
              <Text style={[styles.muted, { color: colors.text.secondary }]}>
                School / coordinator contact: {trip.emergency_contact}
              </Text>
            )}
            {!!trip.emergency_notes && (
              <Text style={[styles.muted, { color: colors.text.secondary }]}>
                {trip.emergency_notes}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors: themeColors } = useTheme();
  const colors = {
    ...themeColors,
    text: {
      ...themeColors.text,
      primary: "#17365E",
      secondary: "#607A98",
    },
  };
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.factValue, { color: colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  hero: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  subTitle: { marginTop: 4, fontSize: 12 },
  status: {
    overflow: "hidden",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#EDF7FF",
    color: "#17365E",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  liveStatus: { backgroundColor: "#E9F8EE", color: "#087C2B" },
  description: { fontSize: 13, lineHeight: 19 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: {
    minWidth: "45%",
    flexGrow: 1,
    borderRadius: 10,
    backgroundColor: "#EDF7FF",
    padding: 10,
  },
  factLabel: { fontSize: 10 },
  factValue: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  notes: { fontSize: 12, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  vehicleCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 7 },
  vehicleHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  vehicleCopy: { flex: 1 },
  vehicleName: { fontSize: 13, fontWeight: "700" },
  muted: { fontSize: 11, lineHeight: 16 },
  livePill: {
    borderRadius: 99,
    backgroundColor: "#EDF7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#607A98",
    fontSize: 9,
    fontWeight: "800",
  },
  livePillOn: { backgroundColor: "#E9F8EE", color: "#087C2B" },
  map: {
    width: "100%",
    height: 270,
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  learnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  paymentStatus: { fontSize: 10, textTransform: "capitalize" },
  backButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#159B3A",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
