import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { client as supabase } from "../../../supabaseConfig/supabaseConfig";
import {
  loadIncidentReportsCache,
  saveIncidentReportsCache,
} from "../../../store/asyncStorage/incidentReportsCache";

const authHeaderKey = "Authorization";

type SchoolIncident = {
  id: string;
  source_id: string;
  source: string;
  title: string;
  description: string;
  category: string;
  reporter: string;
  reporter_role: string;
  child_name: string;
  route_name?: string | null;
  location: string;
  severity: string;
  status: string;
  recipient_type?: "school" | "support";
  is_escalated?: boolean;
  reported_at: string;
};

type IncidentReply = {
  id: string;
  body: string;
  created_at: string;
  users?: { name?: string; role?: string } | null;
};

const statusValue = (status: string) =>
  status === "Closed" || status === "Resolved"
    ? "resolved"
    : status === "In Progress"
      ? "in_progress"
      : "open";

export default function SchoolIncidents() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const userId = String(user?.userData?.id || user?.id || "");
  const [incidents, setIncidents] = useState<SchoolIncident[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [replies, setReplies] = useState<IncidentReply[]>([]);
  const [draft, setDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("open");
  const selectedIdRef = useRef("");
  const repliesByIncidentId = useRef<Record<string, IncidentReply[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          [authHeaderKey]: `Bearer ${token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "School incident request failed.");
      return data;
    },
    [token],
  );

  const loadIncidents = useCallback(async (background = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!background) setLoading(true);
    if (!background) setError("");
    try {
      const data = await request("/school/incidents");
      const items = Array.isArray(data)
        ? data.filter((item: SchoolIncident) => item.source === "incident_report")
        : [];
      setIncidents(items);
      repliesByIncidentId.current = Object.fromEntries(
        Object.entries(repliesByIncidentId.current).filter(([id]) =>
          items.some((item: SchoolIncident) => item.source_id === id),
        ),
      );
      const selected =
        items.find((item: SchoolIncident) => item.source_id === selectedIdRef.current) ||
        items[0];
      const nextId = selected?.source_id || "";
      selectedIdRef.current = nextId;
      setSelectedId(nextId);
      setStatusDraft(selected ? statusValue(selected.status) : "open");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      if (userId) {
        const cached = await loadIncidentReportsCache("school", userId);
        if (active && cached) {
          const cachedIncidents = cached.reports as SchoolIncident[];
          repliesByIncidentId.current =
            cached.repliesByIncidentId as Record<string, IncidentReply[]>;
          setIncidents(cachedIncidents);
          const selected =
            cachedIncidents.find(
              (item) => item.source_id === selectedIdRef.current,
            ) || cachedIncidents[0];
          selectedIdRef.current = selected?.source_id || "";
          setSelectedId(selectedIdRef.current);
          setReplies(
            repliesByIncidentId.current[selectedIdRef.current] || [],
          );
          setStatusDraft(selected ? statusValue(selected.status) : "open");
          setLoading(false);
        }
      }
      if (active) setCacheReady(true);
      if (active) await loadIncidents(true);
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [loadIncidents, userId]);

  useEffect(() => {
    if (!userId || !cacheReady) return;
    void saveIncidentReportsCache("school", userId, {
      reports: incidents,
      repliesByIncidentId: repliesByIncidentId.current,
    });
  }, [cacheReady, incidents, replies, userId]);

  const selected = incidents.find((incident) => incident.source_id === selectedId);

  const loadReplies = useCallback(async () => {
    if (!selectedId) {
      setReplies([]);
      return;
    }
    const cachedReplies = repliesByIncidentId.current[selectedId];
    if (cachedReplies) setReplies(cachedReplies);
    try {
      const data = await request(`/school/incidents/${selectedId}/replies`);
      if (!Array.isArray(data)) {
        throw new Error("Unable to load incident responses.");
      }
      repliesByIncidentId.current[selectedId] = data;
      setReplies(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load responses.");
    }
  }, [request, selectedId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadReplies(), 0);
    return () => clearTimeout(timer);
  }, [loadReplies]);

  useEffect(() => {
    if (!token || !userId) return;
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const queueRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!active) return;
        void loadIncidents(true);
        if (selectedIdRef.current) void loadReplies();
      }, 300);
    };
    const channel = supabase
      .channel(`school-incident-reports-${userId}`)
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
            queueRefresh();
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School incident realtime unavailable; polling remains active.");
        }
      });
    const interval = setInterval(() => {
      void loadIncidents(true);
      if (selectedIdRef.current) void loadReplies();
    }, 30_000);
    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadIncidents, loadReplies, token, userId]);

  const updateStatus = async () => {
    if (!selected || busy) return;
    const saveStatus = async () => {
      setBusy(true);
      setError("");
      try {
        await request(`/school/incidents/${selected.source_id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: statusDraft }),
        });
        await loadIncidents();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to update incident status.");
      } finally {
        setBusy(false);
      }
    };
    if (statusDraft === "resolved" && selected.status !== "Resolved") {
      Alert.alert(
        "Close this incident?",
        `Incident #${selected.source_id} will be automatically removed 48 hours after closing.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Close incident", onPress: () => void saveStatus() },
        ],
      );
      return;
    }
    await saveStatus();
  };

  const sendReply = async () => {
    if (!selected || !draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const reply = await request(`/school/incidents/${selected.source_id}/replies`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      const nextReplies = [...replies, reply];
      repliesByIncidentId.current[selected.source_id] = nextReplies;
      setReplies(nextReplies);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send response.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Incident reports</Text>
          <Text style={styles.subtitle}>Review, respond, and update report status</Text>
        </View>
        <TouchableOpacity onPress={() => void loadIncidents()} accessibilityLabel="Refresh incidents">
          <Text style={styles.refresh}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={styles.loading} />
        ) : incidents.length ? (
          incidents.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              style={[styles.incidentCard, selectedId === incident.source_id && styles.selectedCard]}
              onPress={() => {
                selectedIdRef.current = incident.source_id;
                setSelectedId(incident.source_id);
                setStatusDraft(statusValue(incident.status));
              }}
            >
              <View style={styles.cardHeading}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.statusPill}>
                  {incident.status === "Resolved" ? "Closed" : incident.status}
                </Text>
              </View>
              <Text style={styles.meta}>
                {incident.severity} · {incident.reporter_role} ·{" "}
                {new Date(incident.reported_at).toLocaleString()}
              </Text>
              {incident.is_escalated ? (
                <Text style={styles.escalated}>Escalated to Support leadership</Text>
              ) : null}
              <Text style={styles.description} numberOfLines={3}>{incident.description}</Text>
              <Text style={styles.meta}>
                {incident.child_name}
                {incident.route_name ? ` · ${incident.route_name}` : ""}
                {incident.recipient_type === "support" ? " · Also sent to Support" : ""}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No incident reports</Text>
            <Text style={styles.meta}>Reports linked to your school will appear here.</Text>
          </View>
        )}

        {selected ? (
          <View style={styles.detail}>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <Text style={styles.meta}>
              Reported by {selected.reporter} · {selected.location}
            </Text>
            <Text style={styles.description}>{selected.description}</Text>
            {selected.recipient_type === "support" ? (
              <Text style={styles.meta}>
                This report is assigned to Support. Only Support can respond or update its status.
              </Text>
            ) : (
              <>
                <Text style={styles.label}>Status</Text>
                <View style={styles.picker}>
                  <Picker selectedValue={statusDraft} onValueChange={(value) => setStatusDraft(value)}>
                    <Picker.Item label="Open" value="open" />
                    <Picker.Item label="In progress" value="in_progress" />
                    <Picker.Item label="Closed" value="resolved" />
                  </Picker>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={updateStatus} disabled={busy}>
                  <Text style={styles.buttonText}>{busy ? "Saving…" : "Update status"}</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Responses</Text>
            {replies.length ? replies.map((reply) => (
              <View key={reply.id} style={styles.reply}>
                <Text style={styles.meta}>
                  {reply.users?.name || "Incident team"} · {new Date(reply.created_at).toLocaleString()}
                </Text>
                <Text style={styles.description}>{reply.body}</Text>
              </View>
            )) : <Text style={styles.meta}>No responses yet.</Text>}
            {selected.recipient_type === "support" ? (
              <Text style={styles.meta}>
                Only Support can respond to this report.
              </Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Write a response to the reporter…"
                  multiline
                  maxLength={3000}
                  editable={selected.status !== "Closed" && selected.status !== "Resolved" && !busy}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, (!draft.trim() || busy || statusValue(selected.status) === "resolved") && styles.disabled]}
                  onPress={sendReply}
                  disabled={!draft.trim() || busy || statusValue(selected.status) === "resolved"}
                >
                  <Text style={styles.buttonText}>Send response</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" },
  back: { color: "#2563EB", fontSize: 34, lineHeight: 38 },
  headerCopy: { flex: 1 },
  title: { color: "#172B4D", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#718096", fontSize: 11, marginTop: 3 },
  refresh: { color: "#2563EB", fontWeight: "700", fontSize: 12 },
  content: { padding: 16, paddingBottom: 36, gap: 10 },
  loading: { marginTop: 40 },
  error: { color: "#B91C1C", fontSize: 12, marginBottom: 8 },
  incidentCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4EAF2", borderRadius: 12, padding: 13, gap: 6 },
  selectedCard: { borderColor: "#2563EB", borderWidth: 2 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  incidentTitle: { color: "#172B4D", fontSize: 15, fontWeight: "800", textTransform: "capitalize", flex: 1 },
  statusPill: { color: "#1D4ED8", fontSize: 10, fontWeight: "700" },
  escalated: { color: "#B91C1C", fontSize: 10, fontWeight: "800" },
  meta: { color: "#718096", fontSize: 11, lineHeight: 16 },
  description: { color: "#27364B", fontSize: 13, lineHeight: 19, marginTop: 4 },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, alignItems: "center" },
  emptyTitle: { color: "#172B4D", fontWeight: "800", marginBottom: 5 },
  detail: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4EAF2", borderRadius: 14, padding: 14, marginTop: 10, gap: 10 },
  detailTitle: { color: "#172B4D", fontSize: 18, fontWeight: "800", textTransform: "capitalize" },
  label: { color: "#172B4D", fontWeight: "800", fontSize: 13, marginTop: 8 },
  picker: { borderWidth: 1, borderColor: "#E4EAF2", borderRadius: 10, overflow: "hidden" },
  primaryButton: { backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 10 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  disabled: { opacity: 0.55 },
  reply: { padding: 10, borderRadius: 9, backgroundColor: "#F7F8FA" },
  input: { minHeight: 92, borderWidth: 1, borderColor: "#E4EAF2", borderRadius: 10, padding: 11, color: "#172B4D", textAlignVertical: "top" },
});
