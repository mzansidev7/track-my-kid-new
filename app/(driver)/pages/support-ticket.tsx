import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import { DRIVER_COLORS } from "@/styles/theme";
import { AuthContext } from "@/context/authContext/auth-context";
import { client } from "@/supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "@/url";
import {
  fetchSupportTicketsForUser,
  subscribeToSupportTickets,
} from "@/store/subscriptions/supportTicketsRealtime";

const categoryOptions = [
  "login",
  "otp",
  "account",
  "profile",
  "registration",
  "verification",
  "driver",
  "vehicle",
  "child",
  "school",
  "route",
  "trip",
  "attendance",
  "tracking",
  "gps",
  "notifications",
  "messages",
  "payment",
  "subscription",
  "technical",
  "app",
  "emergency",
  "safety",
  "other",
] as const;

const priorityOptions = ["low", "medium", "high", "urgent"] as const;

const SupportTicketPage = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>("technical");
  const [priority, setPriority] =
    useState<(typeof priorityOptions)[number]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [repliesByTicket, setRepliesByTicket] = useState<
    Record<string, any[]>
  >({});
  const [replyDraft, setReplyDraft] = useState("");
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const isMountedRef = useRef(true);

  const currentUserId = user?.userData?.id || user?.id;

  const safeSetTickets = (
    updater: any[] | ((currentTickets: any[]) => any[]),
  ) => {
    if (!isMountedRef.current) return;
    setTickets((currentTickets: any[]) => {
      const nextTickets =
        typeof updater === "function" ? updater(currentTickets) : updater;
      const seenTicketIds = new Set<string>();

      return nextTickets.filter((ticket) => {
        if (ticket?.id == null) return true;

        const ticketId = String(ticket.id);
        if (seenTicketIds.has(ticketId)) {
          console.warn("[support-tickets] Ignoring duplicate ticket", ticketId);
          return false;
        }

        seenTicketIds.add(ticketId);
        return true;
      });
    });
  };

  const fetchUserTickets = React.useCallback(async () => {
    if (!currentUserId) {
      safeSetTickets([]);
      return;
    }

    setLoadingTickets(true);

    try {
      const ticketsFromStore = await fetchSupportTicketsForUser(currentUserId);
      safeSetTickets(ticketsFromStore ?? []);
    } catch (error) {
      console.error("Fetch support tickets error:", error);
      safeSetTickets([]);
    } finally {
      if (isMountedRef.current) {
        setLoadingTickets(false);
      }
    }
  }, [currentUserId]);

  const toggleConversation = async (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      return;
    }

    setExpandedTicketId(ticketId);
    setLoadingReplies(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/support/tickets/${ticketId}/replies`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      const result = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(result.error || "Unable to load ticket replies.");
      }
      setRepliesByTicket((previous) => ({
        ...previous,
        [ticketId]: Array.isArray(result) ? result : [],
      }));
    } catch (error: any) {
      Alert.alert(
        "Unable to load conversation",
        error?.message || "Please try again.",
      );
      setExpandedTicketId(null);
    } finally {
      setLoadingReplies(false);
    }
  };

  const submitReply = async (ticketId: string) => {
    const body = replyDraft.trim();
    if (!body || submittingReply) return;

    setSubmittingReply(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/driver/support-tickets/${ticketId}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ body }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to send your reply.");
      }

      setRepliesByTicket((previous) => ({
        ...previous,
        [ticketId]: [...(previous[ticketId] || []), result],
      }));
      setReplyDraft("");
      if (!result.support_notification_sent)
        Alert.alert(
          "Reply saved",
          "Your reply was saved, but support could not be notified. Please contact support directly if this is urgent.",
        );
    } catch (error: any) {
      Alert.alert(
        "Unable to send reply",
        error?.message || "Please try again.",
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      safeSetTickets([]);
      return;
    }

    void fetchUserTickets();

    const channel = subscribeToSupportTickets(
      currentUserId,
      (updatedTickets) => {
        safeSetTickets(updatedTickets ?? []);
      },
    );

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, [currentUserId, fetchUserTickets]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDetails = details.trim();

    if (!trimmedTitle || !trimmedDetails) {
      Alert.alert(
        "Missing details",
        "Please add a title and a description before submitting.",
      );
      return;
    }

    if (!currentUserId) {
      Alert.alert(
        "Not signed in",
        "Please sign in again before submitting a ticket.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          subject: trimmedTitle,
          message: trimmedDetails,
          category,
          priority,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to submit support ticket.");
      }
      const insertedTicket = result.ticket;
      if (!insertedTicket?.id) {
        throw new Error("Support ticket was created without an ID.");
      }

      setTickets((prevTickets) => [insertedTicket, ...prevTickets]);

      Alert.alert(
        "Ticket submitted",
        result.support_notification_sent
          ? "Your ticket was sent to the support team."
          : "Your ticket was created and is in the support inbox. No active support recipients were available for an alert.",
      );
      setTitle("");
      setDetails("");
      setCategory("technical");
      setPriority("medium");
    } catch (error: any) {
      console.error("Support ticket submission error:", error);
      Alert.alert(
        "Unable to submit ticket",
        error?.message ||
          "Something went wrong while creating your support ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DriverHeader
        title="Lodge a Ticket"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Help us improve our app</Text>
        <Text style={styles.subtitle}>
          Tell us about a bug, issue, or idea to make the app better.
        </Text>

        <Text style={styles.label}>Ticket title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Describe the issue briefly"
          style={styles.input}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.optionGrid}>
          {categoryOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                category === option && styles.optionButtonSelected,
              ]}
              onPress={() => setCategory(option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  category === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionGrid}>
          {priorityOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                priority === option && styles.optionButtonSelected,
              ]}
              onPress={() => setPriority(option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  priority === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Details</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Please explain what happened and what you expected"
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={6}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Ticket"}
          </Text>
        </TouchableOpacity>

        <View style={styles.ticketSection}>
          <Text style={styles.sectionTitle}>Your tickets</Text>

          {loadingTickets ? (
            <Text style={styles.emptyState}>Loading your tickets...</Text>
          ) : tickets.length === 0 ? (
            <Text style={styles.emptyState}>
              No tickets yet. Your submitted tickets will appear here.
            </Text>
          ) : (
            tickets.map((ticket, index) => (
              <View
                key={`${ticket.id ?? "ticket"}-${index}`}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: getCategoryCardColor(ticket.category),
                    borderColor: getPriorityBackgroundColor(ticket.priority),
                    shadowColor: getPriorityBackgroundColor(ticket.priority),
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  },
                ]}
              >
                <View style={styles.ticketHeaderRow}>
                  <Text style={styles.ticketTitle}>{ticket.subject}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(ticket.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{ticket.status}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: getCategoryPillColor(ticket.category),
                      },
                    ]}
                  >
                    <Text style={styles.metaPillText}>{ticket.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.metaPill,
                      styles.priorityPill,
                      {
                        backgroundColor: getPriorityBackgroundColor(
                          ticket.priority,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.metaPillText}>{ticket.priority}</Text>
                  </View>
                </View>

                <Text style={styles.ticketDate}>
                  {ticket.created_at
                    ? new Date(ticket.created_at).toLocaleString()
                    : "Just now"}
                </Text>
                <Text style={styles.ticketMessage}>{ticket.message}</Text>
                <TouchableOpacity
                  style={styles.conversationButton}
                  onPress={() => toggleConversation(ticket.id)}
                >
                  <Text style={styles.conversationButtonText}>
                    {expandedTicketId === ticket.id
                      ? "Hide conversation"
                      : "View conversation"}
                  </Text>
                </TouchableOpacity>
                {expandedTicketId === ticket.id ? (
                  <View style={styles.conversation}>
                    {loadingReplies ? (
                      <Text style={styles.replyMeta}>Loading replies...</Text>
                    ) : (repliesByTicket[ticket.id] || []).length ? (
                      repliesByTicket[ticket.id].map((reply) => (
                        <View key={reply.id} style={styles.reply}>
                          <Text style={styles.replyMeta}>
                            {reply.author_user_id === currentUserId
                              ? "You"
                              : Array.isArray(reply.users)
                                ? reply.users[0]?.name || "Support"
                                : reply.users?.name || "Support"}
                            {reply.created_at
                              ? ` · ${new Date(reply.created_at).toLocaleString()}`
                              : ""}
                          </Text>
                          <Text style={styles.replyBody}>{reply.body}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.replyMeta}>
                        No replies yet. Add a message below to continue the
                        conversation.
                      </Text>
                    )}
                    <TextInput
                      value={replyDraft}
                      onChangeText={setReplyDraft}
                      placeholder="Write a reply..."
                      style={styles.replyInput}
                      multiline
                    />
                    <TouchableOpacity
                      style={[
                        styles.replyButton,
                        submittingReply && styles.submitButtonDisabled,
                      ]}
                      onPress={() => submitReply(ticket.id)}
                      disabled={submittingReply || !replyDraft.trim()}
                    >
                      <Text style={styles.submitButtonText}>
                        {submittingReply ? "Sending..." : "Send reply"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DRIVER_COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: DRIVER_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: DRIVER_COLORS.muted,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: DRIVER_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 18,
    fontSize: 14,
    color: DRIVER_COLORS.text,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
  },
  optionButtonSelected: {
    backgroundColor: DRIVER_COLORS.primary,
    borderColor: DRIVER_COLORS.primary,
  },
  optionButtonText: {
    color: DRIVER_COLORS.text,
    textTransform: "capitalize",
    fontSize: 12,
    fontWeight: "600",
  },
  optionButtonTextSelected: {
    color: "#fff",
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: DRIVER_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  ticketSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DRIVER_COLORS.text,
    marginBottom: 12,
  },
  ticketCard: {
    backgroundColor: DRIVER_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DRIVER_COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    textTransform: "capitalize",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityPill: {
    backgroundColor: "#E0F2FE",
  },
  metaPillText: {
    fontSize: 11,
    color: DRIVER_COLORS.text,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  ticketDate: {
    fontSize: 12,
    color: DRIVER_COLORS.muted,
    marginBottom: 10,
  },
  ticketMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: DRIVER_COLORS.text,
  },
  conversationButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 6,
  },
  conversationButtonText: {
    color: DRIVER_COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  conversation: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DRIVER_COLORS.cardBorder,
  },
  reply: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    marginBottom: 8,
  },
  replyMeta: {
    fontSize: 11,
    color: DRIVER_COLORS.muted,
    marginBottom: 5,
  },
  replyBody: {
    fontSize: 14,
    color: DRIVER_COLORS.text,
    lineHeight: 20,
  },
  replyInput: {
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    color: DRIVER_COLORS.text,
  },
  replyButton: {
    backgroundColor: DRIVER_COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 8,
  },
  emptyState: {
    fontSize: 14,
    color: DRIVER_COLORS.muted,
    lineHeight: 20,
  },
});

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "#2563EB";
    case "in_progress":
      return "#F59E0B";
    case "resolved":
      return "#10B981";
    case "closed":
      return "#6B7280";
    default:
      return DRIVER_COLORS.primary;
  }
};

const getPriorityBackgroundColor = (priority: string) => {
  switch (priority) {
    case "low":
      return "#10B981";
    case "medium":
      return "#F59E0B";
    case "high":
      return "#f16b6b";
    case "urgent":
      return "#DC2626";
    default:
      return DRIVER_COLORS.primary;
  }
};

const getCategoryCardColor = (category: string) => {
  switch (category) {
    case "technical":
    case "app":
      return "#EEF2FF";
    case "payment":
    case "subscription":
      return "#ECFDF5";
    case "emergency":
    case "safety":
      return "#FEF2F2";
    case "account":
    case "profile":
    case "verification":
      return "#F0FDF4";
    case "vehicle":
    case "route":
    case "trip":
      return "#E0F2FE";
    case "notifications":
    case "messages":
      return "#F5F3FF";
    default:
      return "#F9FAFB";
  }
};

const getCategoryPillColor = (category: string) => {
  switch (category) {
    case "technical":
    case "app":
      return "#DBEAFE";
    case "payment":
    case "subscription":
      return "#D1FAE5";
    case "emergency":
    case "safety":
      return "#FECACA";
    case "account":
    case "profile":
    case "verification":
      return "#DCFCE7";
    case "vehicle":
    case "route":
    case "trip":
      return "#BAE6FD";
    case "notifications":
    case "messages":
      return "#E9D5FF";
    default:
      return "#E5E7EB";
  }
};

export default SupportTicketPage;
