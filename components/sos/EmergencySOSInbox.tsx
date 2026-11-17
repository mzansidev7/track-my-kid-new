import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "@/context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "@/url";
import { client as supabaseClient } from "@/supabaseConfig/supabaseConfig";
import {
  CachedSOSAlert,
  CachedSOSMessage,
  getMemorySOSCache,
  loadSOSCache,
  saveSOSCache,
} from "@/components/sos/sosCache";
import DriverHeader from "@/app/(driver)/components/DriverHeader";

type AlertRecord = CachedSOSAlert;
type ConversationMessage = CachedSOSMessage;

type Props = { role: "client" | "driver" };

const normalizeMessages = (value: unknown): ConversationMessage[] =>
  Array.isArray(value)
    ? value.flatMap((item): ConversationMessage[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return [];
        }
        const record = item as Record<string, unknown>;
        if (
          typeof record.id !== "string" ||
          typeof record.author_user_id !== "string" ||
          typeof record.body !== "string" ||
          typeof record.created_at !== "string" ||
          !Number.isFinite(Date.parse(record.created_at))
        ) {
          return [];
        }
        const author =
          record.users && typeof record.users === "object"
            ? (record.users as Record<string, unknown>)
            : null;
        return [
          {
            id: record.id,
            author_user_id: record.author_user_id,
            body: record.body,
            created_at: record.created_at,
            users:
              author && typeof author.name === "string"
                ? {
                    name: author.name,
                    ...(typeof author.role === "string"
                      ? { role: author.role }
                      : {}),
                  }
                : null,
          },
        ];
      })
    : [];

const EmergencySOSInbox = ({ role }: Props) => {
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const currentUserId = user?.userData?.id || user?.id;
  const apiPath = role === "client" ? "/client" : "/driver";
  const memoryCache = currentUserId
    ? getMemorySOSCache(currentUserId, role)
    : null;
  const [alerts, setAlerts] = useState<AlertRecord[]>(
    memoryCache?.alerts || [],
  );
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(!memoryCache);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const selectedAlertId = selectedAlert?.id;
  const selectedAlertIdRef = useRef<string | undefined>(selectedAlertId);
  const loadedMessageAlertRef = useRef<string | undefined>(undefined);
  const alertsRef = useRef(alerts);

  useEffect(() => {
    selectedAlertIdRef.current = selectedAlertId;
    alertsRef.current = alerts;
  }, [alerts, selectedAlertId]);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!userToken)
        throw new Error("Please sign in again to view SOS messages.");
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${userToken}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to load SOS messages.");
      }
      return result;
    },
    [userToken],
  );

  const loadAlerts = useCallback(
    async (pullToRefresh = false) => {
      if (pullToRefresh) setRefreshing(true);
      setError("");
      try {
        const result = await request(`${apiPath}/emergency-alerts`);
        if (!Array.isArray(result)) {
          throw new Error("The SOS alert list returned an invalid response.");
        }
        setAlerts(result);
        setSelectedAlert((current) =>
          current
            ? result.find((alert) => alert.id === current.id) || current
            : null,
        );
        if (currentUserId) {
          const cached =
            getMemorySOSCache(currentUserId, role) ||
            (await loadSOSCache(currentUserId, role));
          await saveSOSCache(currentUserId, role, {
            alerts: result,
            conversations: cached?.conversations || {},
          });
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load SOS alerts.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiPath, currentUserId, request, role],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAlerts();
    }, [loadAlerts]),
  );

  useEffect(() => {
    if (!currentUserId || memoryCache) return undefined;
    let active = true;
    const restore = setTimeout(() => {
      void loadSOSCache(currentUserId, role).then((cached) => {
        if (!active || !cached) return;
        setAlerts((current) => (current.length ? current : cached.alerts));
        setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(restore);
    };
  }, [currentUserId, memoryCache, role]);

  const loadMessages = useCallback(
    async (alertId: string) => {
      try {
        const result = await request(
          `${apiPath}/emergency-alerts/${alertId}/messages`,
        );
        if (!Array.isArray(result?.messages)) {
          throw new Error("The SOS conversation returned an invalid response.");
        }
        const safeMessages = normalizeMessages(result.messages);
        if (selectedAlertIdRef.current === alertId) {
          loadedMessageAlertRef.current = alertId;
          setMessages(safeMessages);
        }
        setSelectedAlert((current) =>
          current?.id === alertId ? { ...current, ...result.alert } : current,
        );
        if (currentUserId) {
          const cached =
            getMemorySOSCache(currentUserId, role) ||
            (await loadSOSCache(currentUserId, role));
          await saveSOSCache(currentUserId, role, {
            alerts: cached?.alerts || alertsRef.current,
            conversations: {
              ...(cached?.conversations || {}),
              [alertId]: safeMessages,
            },
          });
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the SOS conversation.",
        );
      }
    },
    [apiPath, currentUserId, request, role],
  );

  useEffect(() => {
    if (!selectedAlertId) return;
    loadedMessageAlertRef.current = undefined;
  }, [selectedAlertId]);

  useEffect(() => {
    if (!selectedAlertId) return undefined;
    const initialLoad = setTimeout(() => void loadMessages(selectedAlertId), 0);
    return () => clearTimeout(initialLoad);
  }, [loadMessages, selectedAlertId]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabaseClient
      .channel(
        `sos-inbox-${role}-${currentUserId}-${selectedAlertId || "list"}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            void loadAlerts();
            if (selectedAlertId) void loadMessages(selectedAlertId);
          }, 250);
        },
      );
    if (selectedAlertId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alert_messages",
          filter: `alert_id=eq.${selectedAlertId}`,
        },
        () => {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(
            () => void loadMessages(selectedAlertId),
            250,
          );
        },
      );
    }
    channel.subscribe((status, subscriptionError) => {
      if (subscriptionError) {
        console.warn("SOS realtime subscription issue:", subscriptionError);
      }
      if (status !== "SUBSCRIBED") return;
      void loadAlerts();
      if (selectedAlertId) void loadMessages(selectedAlertId);
    });
    const fallback = setInterval(() => {
      void loadAlerts();
      if (selectedAlertId) void loadMessages(selectedAlertId);
    }, 30_000);
    return () => {
      clearTimeout(refreshTimer);
      clearInterval(fallback);
      void supabaseClient.removeChannel(channel);
    };
  }, [currentUserId, loadAlerts, loadMessages, role, selectedAlertId]);

  const sendReply = async () => {
    if (!selectedAlert || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await request(
        `${apiPath}/emergency-alerts/${selectedAlert.id}/messages`,
        { method: "POST", body: JSON.stringify({ body: draft.trim() }) },
      );
      const [sentMessage] = normalizeMessages([result]);
      if (!sentMessage) {
        throw new Error("The SOS reply returned an invalid response.");
      }
      setMessages((current) =>
        normalizeMessages([...current, sentMessage]).filter(
          (message, index, list) =>
            list.findIndex((candidate) => candidate.id === message.id) ===
            index,
        ),
      );
      if (currentUserId) {
        const cached =
          getMemorySOSCache(currentUserId, role) ||
          (await loadSOSCache(currentUserId, role));
        await saveSOSCache(currentUserId, role, {
          alerts: cached?.alerts || alertsRef.current,
          conversations: {
            ...(cached?.conversations || {}),
            [selectedAlert.id]: normalizeMessages([
              ...(cached?.conversations[selectedAlert.id] || messages),
              sentMessage,
            ]),
          },
        });
      }
      setDraft("");
      await loadMessages(selectedAlert.id);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send your SOS reply.",
      );
    } finally {
      setSending(false);
    }
  };

  const senderRole = role === "client" ? "parent / guardian" : "driver";
  const openAlert = async (alert: AlertRecord) => {
    const memoryMessages = currentUserId
      ? getMemorySOSCache(currentUserId, role)?.conversations[alert.id]
      : undefined;
    setMessages(normalizeMessages(memoryMessages));
    selectedAlertIdRef.current = alert.id;
    loadedMessageAlertRef.current = undefined;
    setSelectedAlert(alert);
    if (!currentUserId || memoryMessages) return;

    const cached = await loadSOSCache(currentUserId, role);
    if (selectedAlertIdRef.current === alert.id) {
      setMessages(normalizeMessages(cached?.conversations[alert.id]));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>

      <DriverHeader
        title={selectedAlert ? "SOS conversation" : "SOS messages"}
        subtitle={
          selectedAlert
            ? "Messages with the support team"
            : "Your emergency alerts and support responses"
        }
        showBackButton={true}
        rightComponent={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() =>
              selectedAlert
                ? void loadMessages(selectedAlert.id)
                : void loadAlerts(true)
            }
            accessibilityRole="button"
            accessibilityLabel={
              selectedAlert ? "Refresh SOS conversation" : "Refresh SOS alerts"
            }
          >
            <MaterialIcons name="refresh" size={21} color="#B91C1C" />
          </TouchableOpacity>
        }
      />

      {error ? (
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={19} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() =>
              selectedAlert
                ? void loadMessages(selectedAlert.id)
                : void loadAlerts(true)
            }
          >
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#B91C1C" />
          <Text style={styles.mutedText}>Loading your SOS alerts...</Text>
        </View>
      ) : selectedAlert ? (
        <KeyboardAvoidingView
          style={styles.thread}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 85 : 0}
        >
          <View
            style={[
              styles.alertSummary,
              {
                borderLeftColor: getStatusColors(selectedAlert).foreground,
              },
            ]}
          >
            <View style={styles.summaryTopLine}>
              <View style={styles.summaryIcon}>
                <MaterialIcons
                  name="sos"
                  size={21}
                  color={getStatusColors(selectedAlert).foreground}
                />
              </View>
              <View style={styles.summaryBody}>
                <Text style={styles.summaryEyebrow}>EMERGENCY ALERT</Text>
                <Text style={styles.summaryTitle}>
                  {selectedAlert.status === "resolved"
                    ? "Alert resolved"
                    : "Your SOS"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: getStatusColors(selectedAlert).background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        getStatusColors(selectedAlert).foreground,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: getStatusColors(selectedAlert).foreground },
                  ]}
                >
                  {getStatusLabel(selectedAlert)}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryMessage}>
              {selectedAlert.message || "Emergency assistance requested"}
            </Text>
            <View style={styles.summaryFooter}>
              <MaterialIcons name="schedule" size={14} color="#94A3B8" />
              <Text style={styles.summaryMeta}>
                Sent{" "}
                {new Date(selectedAlert.created_at).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
            </View>
          </View>
          {selectedAlert.status !== "resolved" &&
          !selectedAlert.attending_at ? (
            <View style={styles.waitingBanner}>
              <View style={styles.bannerIcon}>
                <MaterialIcons name="hourglass-top" size={17} color="#A16207" />
              </View>
              <Text style={styles.waitingText}>
                <Text style={styles.bannerTitle}>
                  Waiting for support{"\n"}
                </Text>
                You can reply here as soon as a support member starts the
                conversation.
              </Text>
            </View>
          ) : selectedAlert.status === "resolved" ? (
            <View style={styles.resolvedBanner}>
              <MaterialIcons name="check-circle" size={19} color="#15803D" />
              <Text style={styles.resolvedText}>
                This SOS has been marked resolved. The conversation is
                read-only.
              </Text>
            </View>
          ) : (
            <View style={styles.attendingBanner}>
              <View style={styles.bannerIconAttending}>
                <MaterialIcons name="support-agent" size={18} color="#1D4ED8" />
              </View>
              <Text style={styles.attendingText}>
                <Text style={styles.attendingTitle}>
                  Support is attending{"\n"}
                </Text>
                You can send additional details to the support team below.
              </Text>
            </View>
          )}
          <ScrollView
            style={[
              styles.messageList,
              {
                borderColor: "#E2E8F0",
                backgroundColor: "#F1F5F9",
              },
            ]}
            contentContainerStyle={styles.messageListContent}
          >
            {messages.length ? (
              messages.map((item) => {
                if (
                  !item ||
                  typeof item.id !== "string" ||
                  typeof item.author_user_id !== "string" ||
                  typeof item.body !== "string" ||
                  typeof item.created_at !== "string"
                ) {
                  return null;
                }
                const isSender = item.author_user_id === currentUserId;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isSender ? styles.messageRowMine : undefined,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isSender ? styles.messageMine : styles.messageSupport,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageAuthor,
                          isSender && styles.messageAuthorMine,
                        ]}
                      >
                        {isSender ? `You (${senderRole})` : "Support"}
                      </Text>
                      <Text
                        style={[
                          styles.messageBody,
                          isSender && styles.messageBodyMine,
                        ]}
                      >
                        {item.body}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isSender && styles.messageTimeMine,
                        ]}
                      >
                        {new Date(item.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyConversation}>
                <View style={styles.emptyConversationIcon}>
                  <MaterialIcons name="forum" size={22} color="#64748B" />
                </View>
                <Text style={styles.emptyConversationTitle}>
                  {selectedAlert.attending_at
                    ? "Start the conversation"
                    : "Your SOS is on its way"}
                </Text>
                <Text style={styles.emptyConversationText}>
                  {selectedAlert.attending_at
                    ? "Send a message if you need to share more details with support."
                    : "Support messages will appear here when a team member responds."}
                </Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              style={[styles.input]}
              value={draft}
              onChangeText={setDraft}
              placeholder={
                selectedAlert.attending_at
                  ? "Write a message to support..."
                  : "Waiting for support to respond"
              }
              multiline
              maxLength={3000}
              editable={
                Boolean(selectedAlert.attending_at) &&
                selectedAlert.status !== "resolved" &&
                !sending
              }
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!draft.trim() ||
                  !selectedAlert.attending_at ||
                  selectedAlert.status === "resolved" ||
                  sending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={() => void sendReply()}
              disabled={
                !draft.trim() ||
                !selectedAlert.attending_at ||
                selectedAlert.status === "resolved" ||
                sending
              }
              accessibilityLabel="Send SOS message"
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialIcons name="send" size={19} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadAlerts(true)}
              tintColor="#B91C1C"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.alertCard,
                { borderLeftColor: getStatusColors(item).foreground },
              ]}
              activeOpacity={0.8}
              onPress={() => void openAlert(item)}
            >
              <View
                style={[
                  styles.alertCardIcon,
                  { backgroundColor: getStatusColors(item).background },
                ]}
              >
                <MaterialIcons
                  name="sos"
                  size={20}
                  color={getStatusColors(item).foreground}
                />
              </View>
              <View style={styles.alertCardBody}>
                <View style={styles.titleLine}>
                  <Text
                    style={[
                      styles.listStatusTitle,
                      { color: getStatusColors(item).foreground },
                    ]}
                  >
                    {getStatusLabel(item)}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#64748B"
                  />
                </View>
                <Text style={styles.alertPreview} numberOfLines={2}>
                  {item.message || "Emergency assistance requested"}
                </Text>
                <Text style={styles.summaryTime}>
                  {new Date(item.created_at).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialIcons name="sos" size={38} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No SOS messages yet</Text>
              <Text style={styles.mutedText}>
                Messages about your emergency alerts will be listed here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default EmergencySOSInbox;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E8EDF3",
  },
  heading: { flex: 1 },
  title: { color: "#0F172A", fontWeight: "800", fontSize: 17 },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 3 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { flex: 1, color: "#991B1B", fontSize: 11 },
  retry: { color: "#991B1B", fontWeight: "800", fontSize: 11 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 28,
  },
  mutedText: { color: "#64748B", fontSize: 12, textAlign: "center" },
  thread: { flex: 1 },
  alertSummary: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDF3",
    borderLeftWidth: 4,
    borderRadius: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  summaryBody: { flex: 1 },
  summaryEyebrow: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  summaryTitle: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 16,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "45%",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700", flexShrink: 1 },
  summaryMessage: {
    color: "#334155",
    fontSize: 13,
    marginTop: 13,
    lineHeight: 19,
  },
  alertPreview: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  summaryMeta: { color: "#94A3B8", fontSize: 10 },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  bannerIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#FEF3C7",
  },
  waitingText: { flex: 1, color: "#854D0E", fontSize: 11, lineHeight: 16 },
  bannerTitle: { color: "#713F12", fontWeight: "800" },
  attendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bannerIconAttending: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#DBEAFE",
  },
  attendingText: { flex: 1, color: "#1E40AF", fontSize: 11, lineHeight: 16 },
  attendingTitle: { color: "#1E3A8A", fontWeight: "800" },
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resolvedText: { flex: 1, color: "#166534", fontSize: 11, lineHeight: 16 },
  messageList: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  messageListContent: { padding: 14, gap: 11, flexGrow: 1, justifyContent: "flex-end" },
  messageRow: { flexDirection: "row", justifyContent: "flex-start" },
  messageRowMine: { justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  messageSupport: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 6,
  },
  messageMine: {
    backgroundColor: "#B91C1C",
    borderColor: "#B91C1C",
    borderBottomRightRadius: 6,
  },
  messageAuthor: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 5,
  },
  messageAuthorMine: { color: "#FEE2E2" },
  messageBody: { color: "#1E293B", fontSize: 13, lineHeight: 19 },
  messageBodyMine: { color: "#FFFFFF" },
  messageTime: {
    color: "#94A3B8",
    fontSize: 9,
    textAlign: "right",
    marginTop: 7,
  },
  messageTimeMine: { color: "#FECACA" },
  emptyConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyConversationIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  emptyConversationTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyConversationText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 260,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EDF3",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    fontSize: 13,
  },
  sendButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#B91C1C",
  },
  sendButtonDisabled: { backgroundColor: "#FDA4AF" },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  alertCardIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },
  alertCardBody: { flex: 1 },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listStatusTitle: { fontSize: 12, fontWeight: "800", flexShrink: 1 },
  summaryTime: { color: "#94A3B8", fontSize: 10, marginTop: 7 },
  emptyTitle: { color: "#1E293B", fontSize: 15, fontWeight: "800" },
});

const getStatusLabel = (alert: AlertRecord) => {
  if (alert.status === "resolved") return "Resolved";
  if (alert.status === "in_progress" || alert.attending_at) {
    return "Support is attending";
  }
  return "Sent · waiting for support";
};

const getStatusColors = (alert: AlertRecord) => {
  if (alert.status === "resolved") {
    return {
      foreground: "#166534",
      background: "#F0FDF4",
      border: "#86EFAC",
    };
  }
  if (alert.status === "in_progress" || alert.attending_at) {
    return {
      foreground: "#1D4ED8",
      background: "#EFF6FF",
      border: "#93C5FD",
    };
  }
  return {
    foreground: "#92400E",
    background: "#FFFBEB",
    border: "#FCD34D",
  };
};
