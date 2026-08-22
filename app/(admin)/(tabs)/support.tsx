import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useTheme } from "../../../styles/theme";

const stats = [
  {
    label: "Open",
    value: 18,
    tone: "#FEE2E2",
    accent: "#EF4444",
    subtitle: "Requires attention",
  },
  {
    label: "In Progress",
    value: 7,
    tone: "#FEF3C7",
    accent: "#F59E0B",
    subtitle: "Being handled",
  },
  {
    label: "Waiting",
    value: 4,
    tone: "#EEF2FF",
    accent: "#3B82F6",
    subtitle: "Waiting for reply",
  },
  {
    label: "Resolved",
    value: 126,
    tone: "#DCFCE7",
    accent: "#10B981",
    subtitle: "This month",
  },
];

const urgentTickets = [
  {
    id: "TK-4582",
    title: "Unable to track my child",
    owner: "Naledi M.",
    tag: "High",
    time: "5 min ago",
  },
  {
    id: "TK-4581",
    title: "Driver not showing on route",
    owner: "Thabo Dlamini",
    tag: "High",
    time: "18 min ago",
  },
  {
    id: "TK-4580",
    title: "Vehicle has not arrived",
    owner: "Lerato Khumalo",
    tag: "High",
    time: "25 min ago",
  },
];

const allTickets = [
  {
    id: "TK-4579",
    title: "Driver verification issue",
    owner: "Sipho Mokoena",
    status: "In Progress",
    time: "1 hour ago",
  },
  {
    id: "TK-4578",
    title: "App not sending notifications",
    owner: "Jabulile N.",
    status: "Waiting",
    time: "2 hours ago",
  },
  {
    id: "TK-4577",
    title: "Subscription payment failed",
    owner: "Michelle Govender",
    status: "Open",
    time: "3 hours ago",
  },
  {
    id: "TK-4576",
    title: "Request to add new driver",
    owner: "Greenfield College",
    status: "In Progress",
    time: "5 hours ago",
  },
  {
    id: "TK-4575",
    title: "Vehicle documents upload issue",
    owner: "Kabelo M.",
    status: "Waiting",
    time: "1 day ago",
  },
];

export default function AdminSupport() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Support</Text>
            <Text style={styles.subtitle}>Support Tickets</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconRound}>
              <MaterialIcons
                name="notifications-none"
                size={22}
                color="#0F172A"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarRound}>
              <MaterialIcons name="account-circle" size={36} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: s.tone }]}
            >
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.accent }]}>
                {s.value}
              </Text>
              <Text style={styles.statSubtitle}>{s.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search tickets..."
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: colors.surface }]}
          >
            <MaterialIcons name="filter-list" size={18} color="#374151" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newTicketBtn}>
            <Text style={styles.newTicketText}>+ New Ticket</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Urgent Tickets</Text>
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>3</Text>
            </View>
          </View>

          {urgentTickets.map((t) => (
            <TouchableOpacity key={t.id} style={styles.ticketRow}>
              <View style={styles.ticketLeft}>
                <View style={styles.urgentIcon}>
                  <MaterialIcons
                    name="error-outline"
                    size={18}
                    color="#EF4444"
                  />
                </View>
                <View style={styles.ticketTextWrap}>
                  <Text style={styles.ticketTitle}>{t.title}</Text>
                  <Text style={styles.ticketMeta}>Parent • {t.owner}</Text>
                </View>
              </View>
              <View style={styles.ticketRight}>
                <View style={styles.tagHigh}>
                  <Text style={styles.tagHighText}>{t.tag}</Text>
                </View>
                <Text style={styles.ticketId}>#{t.id}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.viewAllUrgent}>
            <Text style={styles.viewAllUrgentText}>
              View All Urgent Tickets
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderSpace}>
            <Text style={styles.sectionTitle}>All Tickets</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {allTickets.map((t) => (
            <TouchableOpacity key={t.id} style={styles.ticketRowSimple}>
              <View style={styles.ticketLeftSimple}>
                <View style={styles.circleIcon}>
                  <MaterialIcons name="assignment" size={18} color="#fff" />
                </View>
                <View style={styles.ticketTextWrap}>
                  <Text style={styles.ticketTitle}>{t.title}</Text>
                  <Text style={styles.ticketMeta}>{t.owner}</Text>
                </View>
              </View>
              <View style={styles.ticketRight}>
                <View
                  style={[
                    styles.statusPill,
                    t.status === "In Progress"
                      ? { backgroundColor: "#DCFCE7" }
                      : t.status === "Waiting"
                        ? { backgroundColor: "#EEF2FF" }
                        : { backgroundColor: "#FEF3C7" },
                  ]}
                >
                  <Text style={styles.statusText}>{t.status}</Text>
                </View>
                <Text style={styles.ticketId}>#{t.id}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All Tickets</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 140 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconRound: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    elevation: 2,
  },
  avatarRound: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: { flex: 1, padding: 14, borderRadius: 12, marginHorizontal: 6 },
  statLabel: { fontSize: 13, color: "#374151", fontWeight: "700" },
  statValue: { fontSize: 22, fontWeight: "900" },
  statSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 6 },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  searchInput: { marginLeft: 8, flex: 1, height: 20 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  filterText: { marginLeft: 8, color: "#374151", fontWeight: "700" },
  newTicketBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newTicketText: { color: "#fff", fontWeight: "800" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeaderSpace: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  badgeSmall: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSmallText: { color: "#EF4444", fontWeight: "800" },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  ticketLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  urgentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF1F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ticketTextWrap: { flex: 1 },
  ticketTitle: { fontSize: 15, fontWeight: "700" },
  ticketMeta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  ticketRight: { alignItems: "flex-end" },
  tagHigh: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  tagHighText: { color: "#EF4444", fontWeight: "700" },
  ticketId: { color: "#94A3B8", marginBottom: 6 },
  viewAllUrgent: { paddingVertical: 12, alignItems: "center" },
  viewAllUrgentText: { color: "#EF4444", fontWeight: "700" },
  ticketRowSimple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  ticketLeftSimple: { flexDirection: "row", alignItems: "center", flex: 1 },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: { color: "#065F46", fontWeight: "700" },
  viewAllBtn: { paddingVertical: 12, alignItems: "center" },
  viewAllText: { color: "#10B981", fontWeight: "700" },
  seeAll: { color: "#10B981", fontWeight: "700" },
});
