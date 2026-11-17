import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSchoolDashboard } from "@/app-support/school/schoolHelpers/hooks/useSchoolDashboard";
import { usePresence } from "@/components/presence/PresenceProvider";
import { useTheme } from "../../../styles/theme";

const getParentName = (parent: any) =>
  [parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
  parent.users?.name ||
  "Unnamed parent";

const getParentUserId = (parent: any) =>
  parent.user_id || parent.users?.id || "";

const Parents = () => {
  const { colors } = useTheme();
  const {
    parents = [],
    students = [],
    loading,
    refresh,
  } = useSchoolDashboard();
  const { ready: presenceReady, onlineUserIds } = usePresence();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const parentRows = useMemo(
    () =>
      parents.map((parent: any) => {
        const linkedStudents = students.filter(
          (student: any) => String(student.client_id) === String(parent.id),
        );
        const name = getParentName(parent);
        const userId = getParentUserId(parent);
        const isOnline =
          presenceReady && userId && onlineUserIds.has(String(userId));
        return {
          ...parent,
          name,
          email: parent.users?.email || "No email",
          phone: parent.phone || parent.users?.phone || "No phone number",
          relationship: parent.relationship || "Guardian",
          status: parent.is_active === false ? "Inactive" : "Active",
          linkedStudents,
          isOnline: Boolean(isOnline),
        };
      }),
    [onlineUserIds, parents, presenceReady, students],
  );

  const onlineCount = parentRows.filter(
    (parent: any) => parent.isOnline,
  ).length;
  const offlineCount = Math.max(0, parentRows.length - onlineCount);
  const activeCount = parentRows.filter(
    (parent: any) => parent.status === "Active",
  ).length;
  const filteredParents = parentRows.filter((parent: any) => {
    const searchText = [
      parent.name,
      parent.email,
      parent.phone,
      ...parent.linkedStudents.map((student: any) =>
        [student.name, student.lastname].filter(Boolean).join(" "),
      ),
    ]
      .join(" ")
      .toLowerCase();
    return (
      searchText.includes(query.trim().toLowerCase()) &&
      (filter === "all" || parent.status.toLowerCase() === filter)
    );
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FAMILY DIRECTORY</Text>
            <Text style={styles.title}>Parents</Text>
            <Text style={styles.subtitle}>
              View parent and guardian contact details and live presence.
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="family-restroom" size={23} color="#6D3BD1" />
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewTitle}>Parent overview</Text>
              <Text style={styles.overviewSubtitle}>Live account status</Text>
            </View>
            <View style={styles.totalPill}>
              <Text style={styles.totalValue}>{parentRows.length}</Text>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
          </View>
          <View style={styles.presenceStats}>
            <View style={styles.presenceStat}>
              <View style={styles.statLabelRow}>
                <View style={[styles.dot, styles.onlineDot]} />
                <Text style={styles.statLabel}>Online</Text>
              </View>
              <Text style={styles.presenceValue}>
                {presenceReady ? onlineCount : "—"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.presenceStat}>
              <View style={styles.statLabelRow}>
                <View style={[styles.dot, styles.offlineDot]} />
                <Text style={styles.statLabel}>Offline</Text>
              </View>
              <Text style={styles.presenceValue}>
                {presenceReady ? offlineCount : "—"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.presenceStat}>
              <View style={styles.statLabelRow}>
                <View style={[styles.dot, styles.activeDot]} />
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <Text style={styles.presenceValue}>{activeCount}</Text>
            </View>
          </View>
          {!presenceReady && (
            <Text style={styles.presenceNote}>
              Connecting to live presence…
            </Text>
          )}
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Parent directory</Text>
            <Text style={styles.listSubtitle}>
              {filteredParents.length}{" "}
              {filteredParents.length === 1 ? "family" : "families"}
            </Text>
          </View>
          <MaterialIcons name="people-outline" size={21} color="#64748B" />
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search parents or students"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search parents or students"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              accessibilityLabel="Clear search"
            >
              <MaterialIcons name="close" size={19} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filters}>
          {(["all", "active", "inactive"] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setFilter(option)}
              style={[
                styles.filterChip,
                filter === option && styles.filterChipActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === option && styles.filterTextActive,
                ]}
              >
                {option === "all"
                  ? `All (${parentRows.length})`
                  : option === "active"
                    ? `Active (${activeCount})`
                    : `Inactive (${parentRows.length - activeCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && parentRows.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#6D3BD1" />
            <Text style={styles.emptyText}>Loading parent directory…</Text>
          </View>
        ) : filteredParents.length ? (
          filteredParents.map((parent: any) => {
            const initials = parent.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part: string) => part[0]?.toUpperCase())
              .join("");
            return (
              <TouchableOpacity
                key={parent.id}
                style={styles.parentCard}
                activeOpacity={0.82}
                onPress={() => setSelectedParent(parent)}
                accessibilityRole="button"
                accessibilityLabel={`View ${parent.name}'s profile`}
              >
                <View style={styles.parentTop}>
                  <View style={styles.identity}>
                    <View style={styles.avatarWrap}>
                      {parent.avatar ? (
                        <Image
                          source={{ uri: parent.avatar }}
                          style={styles.avatar}
                        />
                      ) : (
                        <Text style={styles.avatarInitials}>
                          {initials || "P"}
                        </Text>
                      )}
                      {presenceReady && (
                        <View
                          style={[
                            styles.avatarPresence,
                            parent.isOnline
                              ? styles.onlineDot
                              : styles.offlineDot,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.identityCopy}>
                      <Text numberOfLines={1} style={styles.parentName}>
                        {parent.name}
                      </Text>
                      <Text style={styles.parentMeta}>
                        {parent.relationship}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={21}
                      color="#94A3B8"
                    />
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      parent.status === "Active"
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        parent.status === "Active"
                          ? styles.statusActiveText
                          : styles.statusInactiveText,
                      ]}
                    >
                      {parent.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.presenceLine}>
                  <View
                    style={[
                      styles.dot,
                      parent.isOnline ? styles.onlineDot : styles.offlineDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.presenceText,
                      parent.isOnline && styles.onlineText,
                    ]}
                  >
                    {!presenceReady
                      ? "Presence connecting"
                      : parent.isOnline
                        ? "Online"
                        : "Offline"}
                  </Text>
                </View>
                <View style={styles.contactRows}>
                  <View style={styles.contactRow}>
                    <MaterialIcons name="phone" size={16} color="#64748B" />
                    <Text numberOfLines={1} style={styles.contactText}>
                      {parent.phone}
                    </Text>
                  </View>
                  <View style={styles.contactRow}>
                    <MaterialIcons
                      name="mail-outline"
                      size={16}
                      color="#64748B"
                    />
                    <Text numberOfLines={1} style={styles.contactText}>
                      {parent.email}
                    </Text>
                  </View>
                </View>
                <View style={styles.childrenBlock}>
                  <Text style={styles.childrenTitle}>
                    Linked students ({parent.linkedStudents.length})
                  </Text>
                  <Text style={styles.childrenNames} numberOfLines={2}>
                    {parent.linkedStudents.length
                      ? parent.linkedStudents
                          .map((student: any) =>
                            [student.name, student.lastname]
                              .filter(Boolean)
                              .join(" "),
                          )
                          .join(", ")
                      : "No linked students"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="people-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {parentRows.length
                ? "No parents match your search or filter."
                : "No parents are linked to this school yet."}
            </Text>
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
      <Modal
        visible={Boolean(selectedParent)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedParent(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            {selectedParent && (
              <ScrollView
                contentContainerStyle={styles.profileContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sheetHandle} />
                <View style={styles.profileHeader}>
                  <View style={styles.identity}>
                    <View style={styles.profileAvatar}>
                      {selectedParent.avatar ? (
                        <Image
                          source={{ uri: selectedParent.avatar }}
                          style={styles.profileAvatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarInitials}>
                          {selectedParent.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part: string) => part[0]?.toUpperCase())
                            .join("") || "P"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.identityCopy}>
                      <Text style={styles.profileName}>
                        {selectedParent.name}
                      </Text>
                      <Text style={styles.parentMeta}>
                        Parent profile · {selectedParent.relationship}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedParent(null)}
                    accessibilityLabel="Close parent profile"
                  >
                    <MaterialIcons name="close" size={21} color="#475569" />
                  </TouchableOpacity>
                </View>

                <View style={styles.profilePresence}>
                  <View
                    style={[
                      styles.dot,
                      selectedParent.isOnline
                        ? styles.onlineDot
                        : styles.offlineDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.profilePresenceText,
                      selectedParent.isOnline && styles.onlineText,
                    ]}
                  >
                    {!presenceReady
                      ? "Presence connecting"
                      : selectedParent.isOnline
                        ? "Online"
                        : "Offline"}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      selectedParent.status === "Active"
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        selectedParent.status === "Active"
                          ? styles.statusActiveText
                          : styles.statusInactiveText,
                      ]}
                    >
                      {selectedParent.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>
                    Profile overview
                  </Text>
                  <ProfileDetail
                    label="Parent ID"
                    value={`PAR-${selectedParent.id.slice(0, 8)}`}
                  />
                  <ProfileDetail label="Email" value={selectedParent.email} />
                  <ProfileDetail label="Phone" value={selectedParent.phone} />
                  <ProfileDetail
                    label="Relationship"
                    value={selectedParent.relationship}
                  />
                  <ProfileDetail
                    label="Joined on"
                    value={
                      selectedParent.created_at
                        ? new Date(
                            selectedParent.created_at,
                          ).toLocaleDateString()
                        : "Not available"
                    }
                  />
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>
                    Linked students ({selectedParent.linkedStudents.length})
                  </Text>
                  {selectedParent.linkedStudents.length ? (
                    selectedParent.linkedStudents.map((student: any) => {
                      const studentName =
                        [student.name, student.lastname]
                          .filter(Boolean)
                          .join(" ") || "Unnamed student";
                      return (
                        <View key={student.id} style={styles.profileStudent}>
                          <View style={styles.studentAvatar}>
                            <MaterialIcons
                              name="school"
                              size={18}
                              color="#6D3BD1"
                            />
                          </View>
                          <View style={styles.studentCopy}>
                            <Text style={styles.studentName}>
                              {studentName}
                            </Text>
                            <Text style={styles.studentMeta}>
                              {student.grade || "Grade not assigned"} ·{" "}
                              {student.is_active === false
                                ? "Inactive"
                                : "Active"}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noStudents}>
                      No students linked to this parent.
                    </Text>
                  )}
                </View>

                <View style={styles.profileActions}>
                  {selectedParent.email !== "No email" && (
                    <TouchableOpacity
                      style={styles.profileAction}
                      onPress={() =>
                        void Linking.openURL(`mailto:${selectedParent.email}`)
                      }
                    >
                      <MaterialIcons
                        name="mail-outline"
                        size={18}
                        color="#6D3BD1"
                      />
                      <Text style={styles.profileActionText}>Email</Text>
                    </TouchableOpacity>
                  )}
                  {selectedParent.phone !== "No phone number" && (
                    <TouchableOpacity
                      style={styles.profileAction}
                      onPress={() =>
                        void Linking.openURL(
                          `tel:${selectedParent.phone.replace(/\s+/g, "")}`,
                        )
                      }
                    >
                      <MaterialIcons name="phone" size={18} color="#6D3BD1" />
                      <Text style={styles.profileActionText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ProfileDetail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.profileDetail}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default Parents;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: {
    color: "#6D3BD1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    color: "#172033",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: { marginTop: 4, color: "#64748B", fontSize: 12, lineHeight: 17 },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F0E9FF",
  },
  overviewCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewTitle: { color: "#172033", fontSize: 16, fontWeight: "800" },
  overviewSubtitle: { marginTop: 3, color: "#64748B", fontSize: 11 },
  totalPill: {
    minWidth: 56,
    alignItems: "center",
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
  },
  totalValue: { color: "#6D3BD1", fontSize: 17, fontWeight: "800" },
  totalLabel: { color: "#7C6AA7", fontSize: 9, fontWeight: "700" },
  presenceStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },
  presenceStat: { flex: 1, alignItems: "center", gap: 6 },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statLabel: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  presenceValue: { color: "#172033", fontSize: 21, fontWeight: "800" },
  statDivider: { width: 1, height: 34, backgroundColor: "#E8EDF5" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineDot: { backgroundColor: "#16A34A" },
  offlineDot: { backgroundColor: "#94A3B8" },
  activeDot: { backgroundColor: "#6D3BD1" },
  presenceNote: {
    marginTop: 12,
    color: "#94A3B8",
    textAlign: "center",
    fontSize: 10,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listTitle: { color: "#172033", fontSize: 17, fontWeight: "800" },
  listSubtitle: { marginTop: 2, color: "#64748B", fontSize: 11 },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInput: { flex: 1, paddingVertical: 10, color: "#172033", fontSize: 13 },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginTop: 11,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: { borderColor: "#6D3BD1", backgroundColor: "#F5F3FF" },
  filterText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#6D3BD1" },
  parentCard: {
    marginBottom: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 1,
  },
  parentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F0E9FF",
  },
  avatar: { width: 44, height: 44, borderRadius: 15 },
  avatarInitials: { color: "#6D3BD1", fontSize: 13, fontWeight: "800" },
  avatarPresence: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 13,
    height: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 7,
  },
  identityCopy: { flex: 1 },
  parentName: { color: "#172033", fontSize: 14, fontWeight: "800" },
  parentMeta: { marginTop: 3, color: "#64748B", fontSize: 11 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  statusActive: { backgroundColor: "#EAF8F0" },
  statusInactive: { backgroundColor: "#F1F5F9" },
  statusText: { fontSize: 10, fontWeight: "800" },
  statusActiveText: { color: "#16834A" },
  statusInactiveText: { color: "#64748B" },
  presenceLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  presenceText: { color: "#64748B", fontSize: 10, fontWeight: "600" },
  onlineText: { color: "#16834A" },
  contactRows: {
    gap: 8,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { flex: 1, color: "#475569", fontSize: 11 },
  childrenBlock: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  childrenTitle: { color: "#475569", fontSize: 10, fontWeight: "800" },
  childrenNames: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
  },
  loading: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  empty: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyText: { color: "#64748B", fontSize: 12, textAlign: "center" },
  bottomSpace: { height: 12 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  profileSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#F7F8FA",
    overflow: "hidden",
  },
  profileContent: { paddingHorizontal: 18, paddingBottom: 32 },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#F0E9FF",
  },
  profileAvatarImage: { width: 52, height: 52, borderRadius: 17 },
  profileName: { color: "#172033", fontSize: 16, fontWeight: "800" },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E9EDF3",
  },
  profilePresence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  profilePresenceText: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  profileSection: {
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  profileSectionTitle: {
    marginBottom: 8,
    color: "#172033",
    fontSize: 13,
    fontWeight: "800",
  },
  profileDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailLabel: { color: "#64748B", fontSize: 11 },
  detailValue: {
    flex: 1,
    color: "#172033",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  profileStudent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  studentAvatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F0E9FF",
  },
  studentCopy: { flex: 1 },
  studentName: { color: "#172033", fontSize: 12, fontWeight: "700" },
  studentMeta: { marginTop: 3, color: "#64748B", fontSize: 10 },
  noStudents: { color: "#64748B", fontSize: 11, paddingVertical: 8 },
  profileActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  profileAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: "#F0E9FF",
  },
  profileActionText: { color: "#6D3BD1", fontSize: 12, fontWeight: "800" },
});
