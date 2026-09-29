import React, {
  useCallback,
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
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

type ReporterRole = "client" | "driver" | "owner";
type RelatedRoute = {
  id: string;
  route_name?: string;
  route_children?: any[];
  children?: any[];
};
type RelatedChild = { id: string; name: string; lastname?: string };

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
  const { user } = useContext(AuthContext);
  const [routes, setRoutes] = useState<RelatedRoute[]>([]);
  const [children, setChildren] = useState<RelatedChild[]>([]);
  const [routeId, setRouteId] = useState(initialRouteId || "");
  const [childId, setChildId] = useState(initialChildId || "");
  const [incidentType, setIncidentType] = useState("safety_concern");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState(false);

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
        headers: { Authorization: `Bearer ${user.token}` },
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
        if (!initialRouteId && nextRoutes.length === 1) setRouteId(nextRoutes[0].id);
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
  }, [initialRouteId, role, user?.token]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOptions(), 0);
    return () => clearTimeout(timer);
  }, [loadOptions]);

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
    if (!user?.token || saving) return;
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
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incident_type: incidentType,
          description: description.trim(),
          severity,
          location: location.trim() || null,
          child_id: childId || null,
          route_id: routeId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to submit incident report.");
      setSuccess(true);
      Alert.alert(
        "Report submitted",
        "Your incident report was sent to the school.",
        [{ text: "Done", onPress: () => router.back() }],
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

  const title =
    role === "client"
      ? "Report a transport incident"
      : role === "driver"
        ? "Report a route incident"
        : "Report an incident";
  const childOptions = role === "client" ? children : routeChildren;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SAFETY & SUPPORT</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <Text style={styles.intro}>
        Send a report to the school team. High and critical reports are
        highlighted for faster follow-up.
      </Text>

      {loadingOptions ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.muted}>Loading your routes and students…</Text>
        </View>
      ) : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {role !== "client" && !loadingOptions ? (
        <View style={styles.field}>
          <Text style={styles.label}>Route *</Text>
          <View style={styles.picker}>
            <Picker
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
        <View style={styles.field}>
          <Text style={styles.label}>
            {role === "client" ? "Child *" : "Related child (optional)"}
          </Text>
          <View style={styles.picker}>
            <Picker
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

      <View style={styles.field}>
        <Text style={styles.label}>Incident type *</Text>
        <View style={styles.picker}>
          <Picker
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
        <Text style={styles.label}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Address or location details"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>What happened? *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the incident and any action already taken…"
          multiline
          textAlignVertical="top"
          maxLength={3000}
        />
        <Text style={styles.counter}>{description.length}/3000</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.submit,
          (saving || success || loadingOptions) && styles.disabled,
        ]}
        onPress={submit}
        disabled={saving || success || loadingOptions}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitText}>Submit incident report</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.footnote}>
        Your report is shared with the school associated with the selected
        student or route.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  back: { color: "#2563EB", fontSize: 34, lineHeight: 38 },
  eyebrow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: "#172554", fontSize: 22, fontWeight: "800", marginTop: 3 },
  intro: { color: "#64748B", fontSize: 13, lineHeight: 19, marginBottom: 18 },
  field: { marginBottom: 15 },
  label: { color: "#334155", fontSize: 13, fontWeight: "700", marginBottom: 7 },
  picker: {
    overflow: "hidden",
    minHeight: 52,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9E2EF",
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9E2EF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    color: "#172554",
    fontSize: 14,
  },
  multiline: { minHeight: 130 },
  counter: { marginTop: 4, color: "#94A3B8", fontSize: 10, textAlign: "right" },
  submit: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2563EB",
    marginTop: 6,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  footnote: {
    marginTop: 12,
    color: "#64748B",
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
  muted: { color: "#64748B", fontSize: 11, marginTop: 5 },
  error: { marginBottom: 14, color: "#DC2626", fontSize: 12 },
});
