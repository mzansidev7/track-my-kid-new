import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { AuthContext } from "../context/authContext/auth-context";
import { DRIVER_COLORS, useTheme } from "../styles/theme";
import { resolveWorkingBaseUrl } from "../url";
import { useOwnerPageHeader } from "@/app-support/owner/ownerHelpers/hooks/useOwnerPageHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { client as supabase } from "../supabaseConfig/supabaseConfig";
import {
  loadIncidentReportsCache,
  saveIncidentReportsCache,
} from "../store/asyncStorage/incidentReportsCache";

const authHeaderKey = "Authorization";

type ReporterRole = "client" | "driver" | "owner";
type RelatedRoute = {
  id: string;
  route_name?: string;
  route_children?: any[];
  children?: any[];
};
type RelatedChild = { id: string; name: string; lastname?: string };
type IncidentReport = {
  id: string;
  recipient_type: "school" | "support";
  status: "open" | "in_progress" | "resolved";
  incident_type: string;
  description: string;
  created_at: string;
  is_escalated?: boolean;
};
type IncidentReply = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  users?: { name?: string; role?: string } | null;
};
type IncidentPalette = {
  background: string;
  surface: string;
  border: string;
  divider: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
};

const labels: Record<string, string> = {
  safety_concern: "Safety concern",
  vehicle_issue: "Vehicle issue",
  route_issue: "Route issue",
  student_welfare: "Student welfare",
  behavior: "Behaviour concern",
  other: "Other",
};
const displayChild = (child: RelatedChild) =>
  [child.name, child.lastname].filter(Boolean).join(" ") || "Student";

export default function IncidentReportForm({
  role,
  initialRouteId,
  initialChildId,
}: {
  role: ReporterRole;
  initialRouteId?: string;
  initialChildId?: string;
}) {
  const router = useRouter();
  const { colors, getBrandColors } = useTheme();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const brandColors = getBrandColors(role) as Record<
    string,
    string | undefined
  >;
  const palette: IncidentPalette = {
    background:
      role === "client"
        ? "#F4F9FF"
        : brandColors.background || colors.background,
    surface:
      role === "client"
        ? "#FFFFFF"
        : brandColors.card || brandColors.surface || colors.surface,
    border:
      role === "client"
        ? "#DCEAF8"
        : brandColors.cardBorder || brandColors.border || colors.border,
    divider:
      role === "client" ? "#DCEAF8" : brandColors.divider || colors.divider,
    accent:
      role === "client" ? "#159B3A" : brandColors.primary || colors.primary,
    textPrimary:
      role === "client"
        ? "#17365E"
        : role === "driver"
          ? DRIVER_COLORS.text
          : colors.text.primary,
    textSecondary:
      role === "client"
        ? "#607A98"
        : role === "driver"
          ? DRIVER_COLORS.muted
          : colors.text.secondary,
    error: colors.error,
  };
  const styles = createStyles(palette);
  const [routes, setRoutes] = useState<RelatedRoute[]>([]);
  const [children, setChildren] = useState<RelatedChild[]>([]);
  const [routeId, setRouteId] = useState(initialRouteId || "");
  const [childId, setChildId] = useState(initialChildId || "");
  const [incidentType, setIncidentType] = useState("safety_concern");
  const [recipientType, setRecipientType] = useState<"school" | "support">(
    "school",
  );
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [replies, setReplies] = useState<IncidentReply[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportError, setReportError] = useState("");
  const [cacheReady, setCacheReady] = useState(false);
  const userId = String(user?.userData?.id || user?.id || "");
  const repliesByIncidentId = useRef<Record<string, IncidentReply[]>>({});

  const { renderHeader } = useOwnerPageHeader({
    title: "SAFETY & SUPPORT",
    subtitle: "Report an incident and follow up on responses.",
    actionLabel: "+ Add New Driver",
    onBackPress:
      role === "owner"
        ? () => router.push("/(owner)/(tabs)/profile")
        : role === "driver"
          ? () => router.push("/(driver)/(tabs)/profile")
          : role === "client"
            ? () => router.push("/(client)/(tabs)/profile")
            : undefined,
    headerColors:
      role === "client" ? (["#159B3A", "#087C2B"] as const) : undefined,
  });

  const loadOptions = useCallback(async () => {
    if (!user?.token) {
      setLoadingOptions(false);
      return;
    }
    const endpoint =
      role === "client"
        ? "/client/children"
        : role === "driver"
          ? "/driver/routes"
          : "/owner/routes";
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: { [authHeaderKey]: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Unable to load related students and routes.",
        );

      if (role === "client") {
        setChildren(Array.isArray(data) ? data : []);
      } else {
        const nextRoutes: RelatedRoute[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.routes)
            ? data.routes
            : data?.id
              ? [data]
              : [];
        setRoutes(nextRoutes);
        const routeChildren = nextRoutes.flatMap((route) =>
          (route.route_children || route.children || []).map(
            (entry: any) => entry.children || entry.child || entry,
          ),
        );
        const uniqueChildren = new Map<string, RelatedChild>();
        routeChildren.forEach((child: any) => {
          const id = child?.id;
          if (id)
            uniqueChildren.set(String(id), {
              id: String(id),
              name: child.name || "Student",
              lastname: child.lastname,
            });
        });
        setChildren(Array.from(uniqueChildren.values()));
        if (!initialRouteId && nextRoutes.length === 1)
          setRouteId(nextRoutes[0].id);
      }
    } catch (requestError) {
      setLoadError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load related students and routes.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }, [initialRouteId, role, user]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOptions(), 0);
    return () => clearTimeout(timer);
  }, [loadOptions]);

  const loadReports = useCallback(
    async (background = false) => {
      if (!token) return;
      if (!background) setLoadingReports(true);
      if (!background) setReportError("");
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/${role}/incidents`, {
          headers: { [authHeaderKey]: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(
            data.error || "Unable to load your incident reports.",
          );
        }
        setReports(data);
        const validIds = new Set(
          data.map((report: IncidentReport) => report.id),
        );
        repliesByIncidentId.current = Object.fromEntries(
          Object.entries(repliesByIncidentId.current).filter(([id]) =>
            validIds.has(id),
          ),
        );
        setSelectedReportId((current) =>
          data.some((report: IncidentReport) => report.id === current)
            ? current
            : data[0]?.id || "",
        );
      } catch (requestError) {
        setReportError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your incident reports.",
        );
      } finally {
        setLoadingReports(false);
      }
    },
    [role, token],
  );

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      let hasCachedData = false;
      if (userId) {
        const cached = await loadIncidentReportsCache(role, userId);
        if (active && cached) {
          hasCachedData = true;
          const cachedReports = cached.reports as IncidentReport[];
          const cachedReplies = cached.repliesByIncidentId as Record<
            string,
            IncidentReply[]
          >;
          repliesByIncidentId.current = cachedReplies;
          setReports(cachedReports);
          setSelectedReportId(cachedReports[0]?.id || "");
          setReplies(cachedReplies[cachedReports[0]?.id || ""] || []);
        }
      }
      if (active) setCacheReady(true);
      if (active) await loadReports(hasCachedData);
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [loadReports, role, userId]);

  useEffect(() => {
    if (!userId || !cacheReady) return;
    void saveIncidentReportsCache(role, userId, {
      reports,
      repliesByIncidentId: repliesByIncidentId.current,
    });
  }, [cacheReady, reports, replies, role, userId]);

  const loadReplies = useCallback(
    async (incidentId: string) => {
      if (!incidentId || !token) return;
      const cachedReplies = repliesByIncidentId.current[incidentId];
      if (cachedReplies) setReplies(cachedReplies);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/${role}/incidents/${incidentId}/replies`,
          { headers: { [authHeaderKey]: `Bearer ${token}` } },
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data.error || "Unable to load incident responses.");
        }
        repliesByIncidentId.current[incidentId] = data;
        setReplies(data);
      } catch (requestError) {
        setReportError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load incident responses.",
        );
      }
    },
    [role, token],
  );

  useEffect(() => {
    if (!selectedReportId) return;
    void loadReplies(selectedReportId);
  }, [loadReplies, selectedReportId]);

  useEffect(() => {
    if (!token || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let active = true;
    const refreshTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!active) return;
        void loadReports(true);
        if (selectedReportId) void loadReplies(selectedReportId);
      }, 300);
    };
    const channel = supabase
      .channel(`incident-reports-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_dashboard_events" },
        (payload) => {
          const resource =
            payload.new &&
            typeof payload.new === "object" &&
            "resource_type" in payload.new
              ? payload.new.resource_type
              : undefined;
          if (
            resource === "incident_reports" ||
            resource === "incident_report_replies"
          ) {
            refreshTimer();
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "Incident realtime unavailable; periodic refresh remains active.",
          );
        }
      });
    interval = setInterval(() => {
      void loadReports(true);
      if (selectedReportId) void loadReplies(selectedReportId);
    }, 30_000);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadReplies, loadReports, role, selectedReportId, token, userId]);

  const selectedRoute = routes.find(
    (route) => String(route.id) === String(routeId),
  );
  const routeChildren = useMemo(() => {
    if (!selectedRoute) return children;
    const linked = (
      selectedRoute.route_children ||
      selectedRoute.children ||
      []
    )
      .map((entry: any) => entry.children || entry.child || entry)
      .filter((child: any) => child?.id)
      .map((child: any) => ({
        id: String(child.id),
        name: child.name || "Student",
        lastname: child.lastname,
      }));
    return linked.length ? linked : children;
  }, [children, selectedRoute]);

  const submit = async () => {
    if (!token || saving) return;
    if (role === "client" && !childId) {
      Alert.alert("Select a student", "Choose the child this report is about.");
      return;
    }
    if (role !== "client" && !routeId) {
      Alert.alert(
        "Select a route",
        "Choose the route this report is related to.",
      );
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        "Add details",
        "Describe what happened before submitting the report.",
      );
      return;
    }

    setSaving(true);
    setLoadError("");
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/${role}/incidents`, {
        method: "POST",
        headers: {
          [authHeaderKey]: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident_type: incidentType,
          description: description.trim(),
          severity,
          recipient_type: recipientType,
          location: location.trim() || null,
          child_id: childId || null,
          route_id: routeId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to submit incident report.");
      setDescription("");
      setLocation("");
      await loadReports();
      Alert.alert(
        "Report submitted",
        recipientType === "support"
          ? "Your report was sent to Support and remains visible to the related school."
          : "Your report was sent to the related school.",
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to submit report",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedReport = reports.find(
    (report) => report.id === selectedReportId,
  );

  const childOptions = role === "client" ? children : routeChildren;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {renderHeader()}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {loadingOptions ? (
          <View style={[styles.loading, { marginTop: 20 }]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading your routes and students…</Text>
          </View>
        ) : null}
        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {role !== "client" && !loadingOptions ? (
          <View style={[styles.field, { marginTop: 20 }]}>
            <Text style={styles.label}>Route *</Text>
            <View style={styles.picker}>
              <Picker
                style={{ color: palette.textPrimary }}
                selectedValue={routeId}
                onValueChange={(value) => {
                  setRouteId(String(value || ""));
                  setChildId("");
                }}
              >
                <Picker.Item label="Select a route" value="" />
                {routes.map((route) => (
                  <Picker.Item
                    key={route.id}
                    label={route.route_name || "Route"}
                    value={route.id}
                  />
                ))}
              </Picker>
            </View>
            {routes.length === 0 ? (
              <Text style={styles.muted}>
                No routes are currently assigned to your account.
              </Text>
            ) : null}
          </View>
        ) : null}

        {!loadingOptions && childOptions.length > 0 ? (
          <View style={[styles.field, { marginTop: 20 }]}>
            <Text style={styles.label}>
              {role === "client" ? "Child *" : "Related child (optional)"}
            </Text>
            <View style={styles.picker}>
              <Picker
                style={{ color: palette.textPrimary }}
                selectedValue={childId}
                onValueChange={(value) => setChildId(String(value || ""))}
              >
                <Picker.Item
                  label={
                    role === "client" ? "Select a child" : "No specific child"
                  }
                  value=""
                />
                {childOptions.map((child) => (
                  <Picker.Item
                    key={child.id}
                    label={displayChild(child)}
                    value={child.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        ) : null}

        <View style={[styles.field, { marginTop: 20 }]}>
          <Text style={styles.label}>Incident type *</Text>
          <View style={styles.picker}>
            <Picker
              style={{ color: palette.textPrimary }}
              selectedValue={incidentType}
              onValueChange={(value) => setIncidentType(String(value))}
            >
              {Object.entries(labels).map(([value, label]) => (
                <Picker.Item key={value} label={label} value={value} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Severity *</Text>
          <View style={styles.picker}>
            <Picker
              style={{ color: palette.textPrimary }}
              selectedValue={severity}
              onValueChange={(value) => setSeverity(String(value))}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
              <Picker.Item label="Critical" value="critical" />
            </Picker>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Send report to *</Text>
          <View style={styles.picker}>
            <Picker
              style={{ color: palette.textPrimary }}
              selectedValue={recipientType}
              onValueChange={(value) => setRecipientType(value)}
            >
              <Picker.Item label="Related school" value="school" />
              <Picker.Item label="Support team" value="support" />
            </Picker>
          </View>
          <Text style={styles.muted}>
            Support-routed reports are also visible to the related school.
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Address or location details"
            placeholderTextColor={palette.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>What happened? *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the incident and any action already taken…"
            placeholderTextColor={palette.textSecondary}
            multiline
            textAlignVertical="top"
            maxLength={3000}
          />
          <Text style={styles.counter}>{description.length}/3000</Text>
        </View>

        <TouchableOpacity
          style={[styles.submit, (saving || loadingOptions) && styles.disabled]}
          onPress={submit}
          disabled={saving || loadingOptions}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Submit incident report</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.footnote}>
          You can follow status updates and continue the conversation below.
        </Text>
        <View style={styles.history}>
          <Text style={styles.historyTitle}>My incident reports</Text>
          {reportError ? <Text style={styles.error}>{reportError}</Text> : null}
          {loadingReports ? (
            <ActivityIndicator color={palette.accent} />
          ) : reports.length ? (
            <>
              <View style={styles.picker}>
                <Picker
                  style={{ color: palette.textPrimary }}
                  selectedValue={selectedReportId}
                  onValueChange={(value) => {
                    setReplies([]);
                    setSelectedReportId(String(value));
                  }}
                >
                  {reports.map((report) => (
                    <Picker.Item
                      key={report.id}
                      label={`${labels[report.incident_type] || report.incident_type} · ${
                        report.status === "resolved"
                          ? "Closed"
                          : report.status === "in_progress"
                            ? "In progress"
                            : "Open"
                      }`}
                      value={report.id}
                    />
                  ))}
                </Picker>
              </View>
              {selectedReport ? (
                <View style={styles.reportSummary}>
                  <Text style={styles.reportMeta}>
                    To{" "}
                    {selectedReport.recipient_type === "support"
                      ? "Support"
                      : "school"}{" "}
                    ·{" "}
                    {selectedReport.status === "resolved"
                      ? "Closed"
                      : selectedReport.status.replaceAll("_", " ")}
                    {selectedReport.is_escalated ? " · Escalated" : ""}
                  </Text>
                  <Text style={styles.reportDescription}>
                    {selectedReport.description}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.label}>Responses</Text>
              {replies.length ? (
                replies.map((reply) => (
                  <View key={reply.id} style={styles.reply}>
                    <Text style={styles.replyAuthor}>
                      {reply.users?.name || "Incident team"} ·{" "}
                      {new Date(reply.created_at).toLocaleString()}
                    </Text>
                    <Text style={styles.replyBody}>{reply.body}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No responses yet.</Text>
              )}
              {selectedReport?.status === "resolved" ? (
                <Text style={styles.muted}>This report is closed.</Text>
              ) : (
                <Text style={styles.muted}>
                  {selectedReport?.recipient_type === "support"
                    ? "Only Support will respond here."
                    : "The school and Support team can respond here."}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>
              Your submitted reports will appear here.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (palette: IncidentPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: 18, paddingBottom: 40 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    back: { color: palette.accent, fontSize: 34, lineHeight: 38 },
    eyebrow: {
      color: palette.accent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    title: {
      color: palette.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      marginTop: 3,
    },
    intro: {
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 18,
    },
    field: { marginBottom: 15 },
    label: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 7,
    },
    picker: {
      overflow: "hidden",
      minHeight: 52,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      backgroundColor: palette.surface,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      backgroundColor: palette.surface,
      color: palette.textPrimary,
      fontSize: 14,
    },
    multiline: { minHeight: 130 },
    counter: {
      marginTop: 4,
      color: palette.textSecondary,
      fontSize: 10,
      textAlign: "right",
    },
    submit: {
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: palette.accent,
      marginTop: 6,
    },
    submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
    disabled: { opacity: 0.6 },
    footnote: {
      marginTop: 12,
      color: palette.textSecondary,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
    },
    loading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 16,
    },
    muted: { color: palette.textSecondary, fontSize: 11, marginTop: 5 },
    error: { marginBottom: 14, color: palette.error, fontSize: 12 },
    history: {
      marginTop: 24,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      gap: 10,
    },
    historyTitle: {
      color: palette.textPrimary,
      fontSize: 17,
      fontWeight: "800",
    },
    reportSummary: { paddingVertical: 8 },
    reportMeta: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    reportDescription: {
      color: palette.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    reply: {
      padding: 10,
      borderRadius: 9,
      backgroundColor: palette.background,
    },
    replyAuthor: {
      color: palette.textSecondary,
      fontSize: 10,
      fontWeight: "700",
    },
    replyBody: {
      color: palette.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
  });
