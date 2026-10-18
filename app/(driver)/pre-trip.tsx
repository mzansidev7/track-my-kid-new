import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DriverHeader from "./components/DriverHeader";
import { AuthContext } from "@/context/authContext/auth-context";
import { useDriverRoutes } from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import { useDriverTracking } from "@/app-support/driver/driverHelpers/hooks/useDriverTracking";
import { resolveWorkingBaseUrl } from "@/url";
import { DRIVER_COLORS, useTheme } from "@/styles/theme";

const checklistItems = [
  { key: "tyres", label: "Tyres and wheels" },
  { key: "brakes", label: "Brakes" },
  { key: "lights", label: "Lights" },
  { key: "indicators", label: "Indicators" },
  { key: "seatbelts", label: "Seatbelts" },
  { key: "first_aid_kit", label: "First-aid kit" },
  { key: "doors", label: "Doors and emergency exits" },
  { key: "mirrors", label: "Mirrors" },
  { key: "horn", label: "Horn" },
] as const;

type ChecklistKey = (typeof checklistItems)[number]["key"];
type Checklist = Partial<Record<ChecklistKey, boolean>>;
type Inspection = {
  id: string;
  checklist: Checklist;
  notes: string | null;
  has_safety_issue: boolean;
  created_at: string;
};

const getParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export default function DriverPreTripInspection() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    routeId?: string | string[];
    routeType?: string | string[];
  }>();
  const routeId = getParam(params.routeId);
  const requestedRouteType = getParam(params.routeType);
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const { colors } = useTheme();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutes();
  const route = useMemo(
    () => routes.find((candidate) => candidate.id === routeId) || null,
    [routeId, routes],
  );
  const routeType = requestedRouteType === "dropoff" ? "dropoff" : "pickup";
  const { online, busy, error: trackingError, goOnline } = useDriverTracking(
    routeId,
    routeType,
  );

  const [checklist, setChecklist] = useState<Checklist>({});
  const [notes, setNotes] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loadingInspection, setLoadingInspection] = useState(
    () => Boolean(routeId && token),
  );
  const [saving, setSaving] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!routeId || !token) return;
    let active = true;

    const loadInspection = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/driver/pretrip-inspections?route_id=${encodeURIComponent(routeId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Unable to load today's inspection.");
        }

        if (!active) return;
        const currentInspection = data.inspection || null;
        setInspection(currentInspection);
        setInspectionError(null);
        if (currentInspection) {
          setChecklist(currentInspection.checklist || {});
          setNotes(currentInspection.notes || "");
        }
      } catch (requestError) {
        if (active) {
          setInspectionError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load today's inspection.",
          );
        }
      } finally {
        if (active) setLoadingInspection(false);
      }
    };

    void loadInspection();
    return () => {
      active = false;
    };
  }, [routeId, token]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentDate = new Date(now);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const windowStart = timeToMinutes(
    routeType === "pickup"
      ? route?.pickup_start_time
      : route?.dropoff_start_time,
  );
  const windowEnd = timeToMinutes(
    routeType === "pickup"
      ? route?.pickup_end_time
      : route?.dropoff_end_time,
  );
  const isInRouteWindow =
    windowStart !== null &&
    windowEnd !== null &&
    currentMinutes >= windowStart &&
    currentMinutes <= windowEnd;
  const inspectionPassed =
    Boolean(inspection) && inspection?.has_safety_issue === false;
  const checklistComplete = checklistItems.every(
    ({ key }) => typeof checklist[key] === "boolean",
  );

  const saveInspection = async () => {
    if (!routeId || !user?.token || !checklistComplete) {
      setInspectionError("Complete every inspection item before submitting.");
      return;
    }

    setSaving(true);
    setInspectionError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/pretrip-inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          route_id: routeId,
          checklist,
          notes: notes.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to save the inspection.");
      }

      const savedInspection = data.inspection as Inspection;
      setInspection(savedInspection);
      if (savedInspection.has_safety_issue) {
        Alert.alert(
          "Vehicle safety issue recorded",
          "Do not start this route until the issue has been fixed. Complete a new inspection after repairs.",
        );
        return;
      }

      await startRoute(true);
    } catch (requestError) {
      setInspectionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the inspection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startRoute = async (inspectionHasPassed = inspectionPassed) => {
    if (!routeId) return;
    if (!inspectionHasPassed) {
      setInspectionError("Complete and pass the inspection before starting.");
      return;
    }
    if (!isInRouteWindow) {
      setInspectionError(
        "Inspection saved. You can start the route when its scheduled time window opens.",
      );
      return;
    }

    const started = await goOnline(routeId);
    if (started) {
      router.replace("/(driver)/(tabs)/trips");
    }
  };

  const isSubmitting = saving || busy;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: DRIVER_COLORS.background }]}
      edges={["top", "bottom"]}
    >
      <DriverHeader
        title="Pre-trip inspection"
        subtitle="Complete this safety check before starting"
        showBackButton
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.routeCard,
            {
              backgroundColor: DRIVER_COLORS.card,
              borderColor: DRIVER_COLORS.cardBorder,
            },
          ]}
        >
          <MaterialIcons
            name="directions-bus"
            size={24}
            color={colors.primary}
          />
          <View style={styles.routeText}>
            <Text style={[styles.routeLabel, { color: colors.text.secondary }]}>
              {routeType === "pickup" ? "Pickup route" : "Drop-off route"}
            </Text>
            <Text style={[styles.routeName, { color: colors.text.primary }]}>
              {route?.route_name ||
                (routesLoading ? "Loading route…" : "Route unavailable")}
            </Text>
            {route?.vehicle ? (
              <Text style={[styles.routeLabel, { color: colors.text.secondary }]}>
                {route.vehicle.name || "Assigned vehicle"}
                {route.vehicle.license_plate
                  ? ` · ${route.vehicle.license_plate}`
                  : ""}
              </Text>
            ) : null}
          </View>
        </View>

        {inspectionPassed ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setInspection(null);
              setChecklist({});
              setNotes("");
              setInspectionError(null);
            }}
            style={styles.reinspectButton}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Reinspect vehicle
            </Text>
          </TouchableOpacity>
        ) : null}

        {routesError ? (
          <TouchableOpacity
            onPress={() => void refreshRoutes(true)}
            style={styles.message}
          >
            <Text style={{ color: colors.error }}>
              Could not load assigned routes: {routesError}
            </Text>
            <Text style={{ color: colors.primary, marginTop: 4 }}>
              Tap to retry
            </Text>
          </TouchableOpacity>
        ) : null}
        {!routeId ? (
          <Text style={[styles.message, { color: colors.error }]}>
            No route was selected. Return to My Route and select your assigned route.
          </Text>
        ) : null}
        {routeId && !routesLoading && !route ? (
          <Text style={[styles.message, { color: colors.error }]}>
            This route is not available in your assigned routes. Refresh routes and try again.
          </Text>
        ) : null}

        <View
          style={[
            styles.notice,
            {
              backgroundColor: inspectionPassed ? "#ECFDF5" : "#FFFBEB",
              borderColor: inspectionPassed ? "#86EFAC" : "#FCD34D",
            },
          ]}
        >
          <MaterialIcons
            name={inspectionPassed ? "check-circle" : "health-and-safety"}
            size={22}
            color={inspectionPassed ? "#15803D" : "#B45309"}
          />
          <Text
            style={[
              styles.noticeText,
              { color: inspectionPassed ? "#166534" : "#92400E" },
            ]}
          >
            {inspectionPassed
              ? "A passing inspection is on file for today."
              : "Check each item on the vehicle. Mark any defect as an issue; a failed inspection blocks route start."}
          </Text>
        </View>

        {loadingInspection ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color={colors.primary}
          />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Vehicle safety checklist
            </Text>
            {checklistItems.map(({ key, label }) => {
              const checked = checklist[key];
              return (
                <View
                  key={key}
                  style={[
                    styles.checkItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.checkLabelWrap}>
                    <MaterialIcons
                      name={
                        checked === true
                          ? "check-circle"
                          : checked === false
                            ? "error"
                            : "radio-button-unchecked"
                      }
                      size={21}
                      color={
                        checked === true
                          ? "#16A34A"
                          : checked === false
                            ? "#DC2626"
                            : colors.text.secondary
                      }
                    />
                    <Text style={[styles.checkLabel, { color: colors.text.primary }]}>
                      {label}
                    </Text>
                  </View>
                  <View style={styles.options}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: no issue`}
                      disabled={inspectionPassed || isSubmitting}
                      onPress={() =>
                        setChecklist((current) => ({ ...current, [key]: true }))
                      }
                      style={[
                        styles.choice,
                        checked === true && styles.safeChoiceSelected,
                        (inspectionPassed || isSubmitting) &&
                          styles.disabledChoice,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          checked === true && styles.safeChoiceTextSelected,
                        ]}
                      >
                        OK
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: issue found`}
                      disabled={inspectionPassed || isSubmitting}
                      onPress={() =>
                        setChecklist((current) => ({ ...current, [key]: false }))
                      }
                      style={[
                        styles.choice,
                        checked === false && styles.issueChoiceSelected,
                        (inspectionPassed || isSubmitting) &&
                          styles.disabledChoice,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          checked === false && styles.issueChoiceTextSelected,
                        ]}
                      >
                        Issue
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <Text style={[styles.label, { color: colors.text.primary }]}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add details about defects or repairs"
              placeholderTextColor={colors.text.secondary}
              multiline
              textAlignVertical="top"
              style={[
                styles.notes,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text.primary,
                },
              ]}
            />

            {inspectionError || trackingError ? (
              <Text style={[styles.message, { color: colors.error }]}>
                {inspectionError || trackingError}
              </Text>
            ) : null}

            {inspectionPassed ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isSubmitting || !route || online}
                onPress={() => void startRoute(inspectionPassed)}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      isSubmitting || !route || online
                        ? colors.text.secondary
                        : colors.primary,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                    <Text style={styles.submitText}>
                      {online
                        ? "Route already active"
                        : isInRouteWindow
                          ? "Start route"
                          : "Start when route window opens"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={
                  isSubmitting ||
                  loadingInspection ||
                  routesLoading ||
                  !route ||
                  !checklistComplete
                }
                onPress={() => void saveInspection()}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      isSubmitting || !route || !checklistComplete
                        ? colors.text.secondary
                        : colors.primary,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="fact-check" size={21} color="#FFFFFF" />
                    <Text style={styles.submitText}>Submit inspection</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <Text style={[styles.footer, { color: colors.text.secondary }]}>
              Inspection is required once per route per day. If you find an issue,
              report it to your fleet owner and do not drive an unsafe vehicle.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 116 },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 16,
  },
  routeText: { marginLeft: 12, flex: 1 },
  routeLabel: { fontSize: 12, marginBottom: 3 },
  routeName: { fontSize: 16, fontWeight: "700" },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  reinspectButton: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  checkItem: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  checkLabelWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  options: { flexDirection: "row", gap: 6 },
  choice: {
    minWidth: 54,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    alignItems: "center",
  },
  choiceText: { color: DRIVER_COLORS.muted, fontSize: 12, fontWeight: "700" },
  safeChoiceSelected: { backgroundColor: "#E2F2E9", borderColor: DRIVER_COLORS.success },
  safeChoiceTextSelected: { color: DRIVER_COLORS.primaryDark },
  issueChoiceSelected: { backgroundColor: "#FEE2E2", borderColor: "#DC2626" },
  issueChoiceTextSelected: { color: "#991B1B" },
  disabledChoice: { opacity: 0.65 },
  label: { fontSize: 14, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  notes: {
    minHeight: 92,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
  },
  message: { marginTop: 12, fontSize: 13, lineHeight: 19 },
  submitButton: {
    minHeight: 52,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  footer: { marginTop: 12, fontSize: 12, lineHeight: 18, textAlign: "center" },
  loader: { marginVertical: 32 },
});
