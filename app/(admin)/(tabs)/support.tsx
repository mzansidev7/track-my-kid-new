import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useTheme } from "../../../styles/theme";

type Ticket = {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  users?: { name?: string; email?: string; role?: string } | null;
};
const statusOrder: Ticket["status"][] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];
const formatStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const formatWhen = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function AdminSupport() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadTickets = useCallback(
    async (isRefresh = false) => {
      if (!user?.token) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/admin/support-tickets?limit=100`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error || "Unable to load support tickets.");
        setTickets(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load support tickets.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadTickets(), 0);
      return () => clearTimeout(timer);
    }, [loadTickets]),
  );

  const counts = useMemo(
    () => ({
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress")
        .length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      urgent: tickets.filter(
        (ticket) =>
          ticket.priority === "urgent" &&
          !["resolved", "closed"].includes(ticket.status),
      ).length,
    }),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const text =
        `${ticket.subject} ${ticket.message} ${ticket.category} ${ticket.users?.name || ""} ${ticket.users?.email || ""}`.toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (statusFilter === "all" || ticket.status === statusFilter)
      );
    });
  }, [search, statusFilter, tickets]);

  const advanceStatus = async (ticket: Ticket) => {
    if (!user?.token || updatingId) return;
    const nextStatus =
      statusOrder[
        (statusOrder.indexOf(ticket.status) + 1) % statusOrder.length
      ];
    setUpdatingId(ticket.id);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/admin/support-tickets/${ticket.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const updated = await response.json();
      if (!response.ok)
        throw new Error(updated?.error || "Unable to update ticket status.");
      setTickets((current) =>
        current.map((item) =>
          item.id === ticket.id ? { ...item, ...updated } : item,
        ),
      );
    } catch (updateError) {
      Alert.alert(
        "Ticket update failed",
        updateError instanceof Error
          ? updateError.message
          : "Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadTickets(true)}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PLATFORM OPERATIONS</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Support tickets
            </Text>
            <Text style={styles.subtitle}>
              Manage requests submitted by app users.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => void loadTickets(true)}
            accessibilityLabel="Refresh tickets"
          >
            <MaterialIcons name="refresh" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadTickets(true)}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat label="Open" value={counts.open} color="#DC2626" bg="#FEF2F2" />
          <Stat
            label="In progress"
            value={counts.inProgress}
            color="#D97706"
            bg="#FFF7ED"
          />
          <Stat
            label="Resolved"
            value={counts.resolved}
            color="#059669"
            bg="#ECFDF5"
          />
          <Stat
            label="Urgent"
            value={counts.urgent}
            color="#7C3AED"
            bg="#F5F3FF"
          />
        </View>

        <View style={[styles.toolbar, { backgroundColor: colors.surface }]}>
          <View style={styles.search}>
            <MaterialIcons name="search" size={19} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search subject, requester, or category"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {["all", "open", "in_progress", "resolved", "closed"].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === status && styles.filterTextSelected,
                    ]}
                  >
                    {status === "all" ? "All" : formatStatus(status)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.subtitle}>Loading current tickets…</Text>
          </View>
        ) : null}
        {!loading && !error && filteredTickets.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="support-agent" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching tickets</Text>
            <Text style={styles.subtitle}>
              {tickets.length
                ? "Change the search or status filter."
                : "No support tickets have been submitted yet."}
            </Text>
          </View>
        ) : null}

        {filteredTickets.map((ticket) => {
          const requester = Array.isArray(ticket.users)
            ? ticket.users[0]
            : ticket.users;
          return (
            <View
              key={ticket.id}
              style={[styles.ticketCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.ticketTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketCategory}>
                    {ticket.category.toUpperCase()} ·{" "}
                    {ticket.priority.toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.ticketTitle, { color: colors.text.primary }]}
                  >
                    {ticket.subject}
                  </Text>
                </View>
                <View
                  style={[
                    styles.status,
                    ticket.status === "open"
                      ? styles.statusOpen
                      : ticket.status === "in_progress"
                        ? styles.statusProgress
                        : styles.statusResolved,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {formatStatus(ticket.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketMessage}>{ticket.message}</Text>
              <View style={styles.ticketMeta}>
                <Text style={styles.metaText}>
                  {requester?.name || requester?.email || "Unknown user"} ·{" "}
                  {requester?.role || "User"}
                </Text>
                <Text style={styles.metaText}>
                  {formatWhen(ticket.created_at)}
                </Text>
              </View>
              {!["resolved", "closed"].includes(ticket.status) ? (
                <TouchableOpacity
                  style={styles.advanceButton}
                  onPress={() => void advanceStatus(ticket)}
                  disabled={updatingId !== null}
                >
                  <MaterialIcons
                    name="published-with-changes"
                    size={17}
                    color="#2563EB"
                  />
                  <Text style={styles.advanceText}>
                    {updatingId === ticket.id
                      ? "Updating…"
                      : `Move to ${formatStatus(statusOrder[(statusOrder.indexOf(ticket.status) + 1) % statusOrder.length])}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.closedText}>
                  This ticket is {formatStatus(ticket.status).toLowerCase()}.
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  kicker: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 23, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#64748B", fontSize: 11, marginTop: 4 },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
    borderRadius: 11,
    padding: 10,
  },
  statValue: { fontSize: 19, fontWeight: "900" },
  statLabel: { color: "#475569", fontSize: 9, marginTop: 2 },
  toolbar: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 9,
    paddingHorizontal: 9,
  },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 12 },
  filters: { gap: 6, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterChipSelected: { backgroundColor: "#DBEAFE" },
  filterText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  filterTextSelected: { color: "#1D4ED8" },
  ticketCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 13,
    gap: 9,
  },
  ticketTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ticketCategory: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  ticketTitle: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  status: { borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5 },
  statusOpen: { backgroundColor: "#FEF2F2" },
  statusProgress: { backgroundColor: "#FFF7ED" },
  statusResolved: { backgroundColor: "#ECFDF5" },
  statusText: { color: "#334155", fontSize: 9, fontWeight: "800" },
  ticketMessage: { color: "#475569", fontSize: 11, lineHeight: 16 },
  ticketMeta: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  metaText: { color: "#94A3B8", fontSize: 9, flexShrink: 1 },
  advanceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  advanceText: { color: "#2563EB", fontSize: 10, fontWeight: "800" },
  closedText: { color: "#059669", fontSize: 10, fontWeight: "700" },
  center: { padding: 30, alignItems: "center", gap: 10 },
  empty: { borderRadius: 12, padding: 22, alignItems: "center", gap: 8 },
  emptyTitle: { color: "#1E293B", fontSize: 14, fontWeight: "800" },
  error: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
  },
  errorText: { color: "#B91C1C", fontSize: 11, flex: 1 },
  retry: { color: "#B91C1C", fontSize: 11, fontWeight: "800" },
});
