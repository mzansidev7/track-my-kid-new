import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import CustomMap from "../../../../components/map";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import { useClientTheme } from "../../../../styles/theme";
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
    shared_by?: { first_name?: string; last_name?: string } | null;
  } | null;
  journey_phase: "outbound" | "at_destination" | "returning" | "completed";
  journey_phase_updated_at?: string;
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
  registration_closes_at?: string | null;
  status: string;
  missed_at?: string | null;
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
    parent_response?: "pending" | "accepted" | "declined";
    payment_method?: "cash" | "online" | null;
    cash_payment_request?: "deposit" | "full" | null;
    cash_payment_amount?: number | null;
    cash_payment_status?: "not_requested" | "pending" | "confirmed" | "rejected";
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
const isFreshTracking = (value?: string) => {
  if (!value) return false;
  const age = Date.now() - new Date(value).getTime();
  return Number.isFinite(age) && age >= 0 && age <= 120_000;
};
const journeyPhaseLabel = (phase?: string) =>
  ({
    outbound: "On the way to destination",
    at_destination: "At destination · sharing paused",
    returning: "Returning to school",
    completed: "Returned to school",
  })[phase || "outbound"] || "Trip underway";

export default function SchoolTripDetails() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const { colors } = useClientTheme();
  const [trips, setTrips] = useState<SchoolTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [learnerActionId, setLearnerActionId] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

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

  const updateLearner = useCallback(
    async (
      childId: string,
      action: "response" | "cash-payment",
      body: Record<string, string>,
    ) => {
      if (!token || !tripId) return;
      setLearnerActionId(childId);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/client/school-trips/${tripId}/learners/${childId}/${action}`,
          {
            method: action === "response" ? "PATCH" : "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "Unable to update trip response.");
        }
        setTrips((current) =>
          current.map((currentTrip) =>
            currentTrip.id !== tripId
              ? currentTrip
              : {
                  ...currentTrip,
                  learners: currentTrip.learners?.map((learner) =>
                    learner.child_id === childId
                      ? { ...learner, ...result }
                      : learner,
                  ),
                },
          ),
        );
        await loadTrips();
        Alert.alert(
          "Trip updated",
          action === "response"
            ? body.response === "accepted"
              ? "You accepted this trip invitation."
              : "You declined this trip invitation."
            : "Cash payment request sent to the school for confirmation.",
        );
      } catch (requestError) {
        Alert.alert(
          "Could not update trip",
          requestError instanceof Error
            ? requestError.message
            : "Please try again.",
        );
      } finally {
        setLearnerActionId("");
      }
    },
    [loadTrips, token, tripId],
  );

  useEffect(() => {
    const timeout = setTimeout(() => void loadTrips(), 0);
    return () => clearTimeout(timeout);
  }, [loadTrips]);
  useEffect(() => {
    const timeout = setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

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
        if (
          !["outbound", "returning"].includes(assignment.journey_phase) ||
          !isFreshTracking(assignment.tracking?.recorded_at)
        ) {
          return false;
        }
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
  const registrationIsOpen =
    trip.status === "registration_open" &&
    Boolean(trip.registration_closes_at) &&
    new Date(trip.registration_closes_at || "").getTime() > currentTime &&
    new Date(trip.departure_at).getTime() > currentTime;
  const assignments = trip.vehicles || [];
  const allVehiclesReturned =
    assignments.length > 0 &&
    assignments.every((assignment) => assignment.journey_phase === "completed");
  const liveAssignments = assignments.filter(
    (item) =>
      ["outbound", "returning"].includes(item.journey_phase) &&
      isFreshTracking(item.tracking?.recorded_at),
  );
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
                trip.status === "missed" && styles.missedStatus,
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
            {trip.registration_closes_at ? (
              <Fact
                label="Registration closes"
                value={displayDate(trip.registration_closes_at)}
              />
            ) : null}
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
          {trip.status === "missed" && (
            <Text style={[styles.notes, { color: "#B42318" }]}>
              This trip was marked missed because no vehicle location was shared
              within 15 minutes of scheduled departure. The school has been
              notified.
            </Text>
          )}
          {trip.status === "registration_open" && !registrationIsOpen && (
            <Text style={[styles.notes, { color: colors.text.secondary }]}>
              Registration is closed. Parent responses and payment requests are
              no longer available.
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
                    {isFreshTracking(assignment.tracking?.recorded_at) &&
                    ["outbound", "returning"].includes(assignment.journey_phase)
                      ? "LIVE"
                      : "PAUSED"}
                  </Text>
                )}
              </View>
              {["in_progress", "completed"].includes(trip.status) && (
                <View style={styles.journeyPhase}>
                  <MaterialIcons
                    name={
                      assignment.journey_phase === "at_destination"
                        ? "place"
                        : assignment.journey_phase === "returning"
                          ? "undo"
                          : assignment.journey_phase === "completed"
                            ? "check-circle"
                            : "near-me"
                    }
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.journeyPhaseText,
                      { color: colors.text.primary },
                    ]}
                  >
                    {journeyPhaseLabel(assignment.journey_phase)}
                  </Text>
                </View>
              )}
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
                    ? `${isFreshTracking(assignment.tracking.recorded_at) &&
                      ["outbound", "returning"].includes(
                        assignment.journey_phase,
                      )
                        ? "Last updated"
                        : "Last known location"} ${ago(
                        assignment.tracking.recorded_at,
                      )}${
                        assignment.tracking.shared_by
                          ? ` · Shared by ${fullName(
                              assignment.tracking.shared_by,
                            )}`
                          : ""
                      }`
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
              requestLocationPermission={false}
              style={styles.map}
            />
          )}
          {trip.status === "in_progress" && liveAssignments.length === 0 && (
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              {allVehiclesReturned
                ? "Your child's assigned vehicle has returned. The trip remains active until every assigned vehicle is back."
                : assignments.some(
                (assignment) =>
                  assignment.journey_phase === "at_destination",
              )
                ? "The vehicle is at its destination. Location sharing is paused until the return journey starts."
                : "No fresh location is available. The last GPS update is not shown as live."}
            </Text>
          )}
          {trip.status === "completed" && (
            <Text style={[styles.muted, { color: colors.text.secondary }]}>
              The trip has returned and is complete.
            </Text>
          )}
          {!["in_progress", "completed"].includes(trip.status) && (
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
                  <Text style={[styles.muted, { color: colors.text.secondary }]}>
                    Parent response ·{" "}
                    {item.parent_response === "accepted"
                      ? "Attending"
                      : item.parent_response === "declined"
                        ? "Not attending"
                        : "Awaiting your response"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.paymentStatus,
                    { color: colors.text.secondary },
                  ]}
                >
                  {trip.is_free
                    ? "Free"
                    : (item.payment_status || "unpaid").replaceAll("_", " ")}
                </Text>
                {registrationIsOpen && (
                  <View style={styles.learnerActions}>
                    {item.parent_response !== "accepted" && (
                      <TouchableOpacity
                        disabled={learnerActionId === item.child_id}
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() =>
                          void updateLearner(item.child_id, "response", {
                            response: "accepted",
                          })
                        }
                      >
                        <Text style={styles.actionButtonText}>
                          {learnerActionId === item.child_id
                            ? "Saving…"
                            : "Accept trip"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.parent_response !== "declined" &&
                      item.payment_status !== "paid" &&
                      item.payment_status !== "waived" &&
                      item.cash_payment_status !== "pending" && (
                        <TouchableOpacity
                          disabled={learnerActionId === item.child_id}
                          style={[
                            styles.actionButton,
                            { backgroundColor: "#1C1026" },
                          ]}
                          onPress={() =>
                            void updateLearner(item.child_id, "response", {
                              response: "declined",
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: "#475569" },
                            ]}
                          >
                            Decline
                          </Text>
                        </TouchableOpacity>
                      )}
                    {item.parent_response === "accepted" &&
                      !trip.is_free &&
                      item.payment_status !== "paid" && (
                        <View style={styles.cashPaymentActions}>
                          {item.cash_payment_status === "pending" ? (
                            <Text
                              style={[
                                styles.muted,
                                { color: colors.text.secondary },
                              ]}
                            >
                              Cash{" "}
                              {item.cash_payment_request === "deposit"
                                ? "deposit request"
                                : item.payment_status === "deposit_paid"
                                  ? "balance request"
                                  : "payment request"}{" "}
                              {item.cash_payment_amount != null
                                ? `${trip.currency || "ZAR"} ${Number(
                                    item.cash_payment_amount,
                                  ).toFixed(2)} `
                                : ""}
                              awaiting school confirmation
                            </Text>
                          ) : (
                            <>
                              {item.cash_payment_status === "rejected" && (
                                <Text
                                  style={[
                                    styles.muted,
                                    { color: "#B91C1C" },
                                  ]}
                                >
                                  The school did not confirm the previous cash
                                  request. You can submit it again after paying.
                                </Text>
                              )}
                              {Number(trip.deposit || 0) > 0 &&
                                Number(trip.deposit) < Number(trip.price) &&
                                item.payment_status !== "deposit_paid" && (
                                  <TouchableOpacity
                                    disabled={
                                      learnerActionId === item.child_id
                                    }
                                    style={[
                                      styles.actionButton,
                                      { backgroundColor: "#1C1026" },
                                    ]}
                                    onPress={() =>
                                      void updateLearner(
                                        item.child_id,
                                        "cash-payment",
                                        { payment_request: "deposit" },
                                      )
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.actionButtonText,
                                        { color: "#C14BFF" },
                                      ]}
                                    >
                                      Request cash deposit (
                                      {trip.currency || "ZAR"}{" "}
                                      {Number(trip.deposit).toFixed(2)})
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              <TouchableOpacity
                                disabled={learnerActionId === item.child_id}
                                style={[
                                  styles.actionButton,
                                  { backgroundColor: "#1C1026" },
                                ]}
                                onPress={() =>
                                  void updateLearner(
                                    item.child_id,
                                    "cash-payment",
                                    { payment_request: "full" },
                                  )
                                }
                              >
                                <Text
                                  style={[
                                    styles.actionButtonText,
                                    { color: "#C14BFF" },
                                  ]}
                                >
                                  Request cash{" "}
                                  {item.payment_status === "deposit_paid"
                                    ? "balance"
                                    : "payment"}
                                  {item.payment_status === "deposit_paid"
                                    ? ` (${trip.currency || "ZAR"} ${Math.max(
                                        0,
                                        Number(trip.price || 0) -
                                          Number(trip.deposit || 0),
                                      ).toFixed(2)})`
                                    : ` (${trip.currency || "ZAR"} ${Number(
                                        trip.price || 0,
                                      ).toFixed(2)})`}
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                          <Text
                            style={[
                              styles.muted,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Online payment will be available after the school
                            configures its payout account.
                          </Text>
                        </View>
                      )}
                  </View>
                )}
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
  const { colors } = useClientTheme();
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
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  subTitle: { marginTop: 4, fontSize: 10 },
  status: {
    overflow: "hidden",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#1C1026",
    color: "#FBF8FF",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  liveStatus: { backgroundColor: "#1C1026", color: "#C14BFF" },
  missedStatus: { backgroundColor: "#35151D", color: "#FF7777" },
  description: { fontSize: 12, lineHeight: 19 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: {
    minWidth: "45%",
    flexGrow: 1,
    borderRadius: 10,
    backgroundColor: "#1C1026",
    padding: 10,
  },
  factLabel: { fontSize: 10 },
  factValue: { marginTop: 4, fontSize: 11, fontWeight: "700" },
  notes: { fontSize: 11, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  vehicleCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 7 },
  vehicleHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  vehicleCopy: { flex: 1 },
  vehicleName: { fontSize: 12, fontWeight: "700" },
  muted: { fontSize: 11, lineHeight: 16 },
  livePill: {
    borderRadius: 99,
    backgroundColor: "#1C1026",
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#B9AFC4",
    fontSize: 9,
    fontWeight: "800",
  },
  livePillOn: { backgroundColor: "#1C1026", color: "#C14BFF" },
  journeyPhase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 9,
    borderRadius: 10,
    backgroundColor: "#1C1026",
  },
  journeyPhaseText: { flex: 1, fontSize: 10, fontWeight: "700" },
  map: {
    width: "100%",
    height: 270,
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  learnerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  learnerActions: {
    width: "100%",
    paddingLeft: 30,
    gap: 8,
  },
  cashPaymentActions: {
    gap: 7,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  paymentStatus: { fontSize: 10, textTransform: "capitalize" },
  backButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#9B2BE7",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
