import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { resolveWorkingBaseUrl } from "../../url";
import PresenceStatus from "../presence/PresenceStatus";

type GroupParticipant = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type GroupConversation = {
  id: string;
  conversation_type?: string;
  group_name?: string | null;
  anchor_user_id?: string | null;
  can_manage_group?: boolean;
  participants?: GroupParticipant[];
};

type GroupCandidate = GroupParticipant;
type AppRole = "client" | "school" | "driver" | "owner" | "admin";

type GroupChatMenuProps = {
  conversation: GroupConversation;
  role: AppRole;
  token: string;
  currentUserId: string;
  onRemoved: () => void;
  onUpdated?: () => void;
  iconColor?: string;
};

const endpointRootForRole = (role: AppRole) =>
  role === "admin" ? "/admin" : `/${role}`;

const GroupChatMenu = ({
  conversation,
  role,
  token,
  currentUserId,
  onRemoved,
  onUpdated,
  iconColor = "#52657C",
}: GroupChatMenuProps) => {
  const [mode, setMode] = useState<"closed" | "menu" | "participants" | "add">(
    "closed",
  );
  const [candidates, setCandidates] = useState<GroupCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addedParticipants, setAddedParticipants] = useState<GroupParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const canManage = Boolean(conversation.can_manage_group);
  const participants = useMemo(
    () => [
      ...(conversation.participants || []),
      ...addedParticipants.filter(
        (added) =>
          !(conversation.participants || []).some(
            (participant) => String(participant.id) === String(added.id),
          ),
      ),
    ],
    [addedParticipants, conversation.participants],
  );
  const existingIds = useMemo(
    () => new Set(participants.map((participant) => String(participant.id))),
    [participants],
  );
  const root = endpointRootForRole(role);

  const request = async (path: string, method = "GET", body?: unknown) => {
    const baseUrl = (await resolveWorkingBaseUrl()).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        result?.message || result?.error || "The request could not be completed.",
      );
    }
    return result;
  };

  const openAddParticipants = async () => {
    if (!canManage || !token) return;
    setLoading(true);
    setMode("add");
    try {
      const path =
        role === "admin"
          ? `${root}/users/${encodeURIComponent(conversation.anchor_user_id || "")}/group-candidates`
          : `${root}/group-conversation-candidates`;
      const result = await request(path);
      const available = Array.isArray(result)
        ? result
        : Array.isArray(result?.linkedUsers)
          ? result.linkedUsers
          : null;
      if (!available) {
        throw new Error("The group member list could not be loaded.");
      }
      setCandidates(
        available.filter(
          (candidate: GroupCandidate) =>
            !existingIds.has(String(candidate.id)),
        ),
      );
    } catch (error) {
      setMode("menu");
      Alert.alert(
        "Could not load participants",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveParticipants = async () => {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await request(
        `${root}/group-conversations/${conversation.id}/members`,
        "POST",
        { memberUserIds: selectedIds },
      );
      setAddedParticipants((current) => [
        ...current,
        ...candidates.filter((candidate) =>
          selectedIds.includes(String(candidate.id)),
        ),
      ]);
      setSelectedIds([]);
      setMode("closed");
      onUpdated?.();
    } catch (error) {
      Alert.alert(
        "Could not add participants",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const leaveGroup = async () => {
    const path =
      role === "admin"
        ? `${root}/group-conversations/${conversation.id}/leave`
        : `${root}/conversations/${conversation.id}`;
    setSaving(true);
    try {
      await request(path, "DELETE");
      setMode("closed");
      onRemoved();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Could not leave group",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const deleteGroup = async () => {
    const path = `${root}/group-conversations/${conversation.id}`;
    setSaving(true);
    try {
      await request(path, "DELETE");
      setMode("closed");
      onRemoved();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Could not delete group",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const confirmLeave = () =>
    Alert.alert(
      "Leave group?",
      "You will no longer receive messages from this group.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave group", style: "destructive", onPress: () => void leaveGroup() },
      ],
    );

  const confirmDelete = () =>
    Alert.alert(
      "Delete group?",
      "This permanently deletes the group and its messages for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete group", style: "destructive", onPress: () => void deleteGroup() },
      ],
    );

  const toggleCandidate = (candidateId: string) =>
    setSelectedIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );

  const modalTitle =
    mode === "participants"
      ? "Participants"
      : mode === "add"
        ? "Add participants"
        : conversation.group_name || "Group options";

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Group chat options"
        onPress={() => setMode("menu")}
        style={styles.headerButton}
      >
        <MaterialIcons name="more-horiz" size={25} color={iconColor} />
      </TouchableOpacity>
      <Modal
        transparent
        animationType="fade"
        visible={mode !== "closed"}
        onRequestClose={() => setMode("closed")}
      >
        <Pressable style={styles.backdrop} onPress={() => setMode("closed")}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              {mode !== "menu" ? (
                <TouchableOpacity
                  accessibilityLabel="Back to group options"
                  onPress={() => setMode("menu")}
                  style={styles.backButton}
                >
                  <MaterialIcons name="arrow-back" size={21} color="#334155" />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.title}>{modalTitle}</Text>
              <TouchableOpacity
                accessibilityLabel="Close group options"
                onPress={() => setMode("closed")}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={21} color="#64748B" />
              </TouchableOpacity>
            </View>

            {mode === "menu" ? (
              <View style={styles.actions}>
                <Action
                  icon="people-outline"
                  title={`Participants (${participants.length})`}
                  onPress={() => setMode("participants")}
                />
                {canManage ? (
                  <Action
                    icon="person-add-alt"
                    title="Add participants"
                    onPress={() => void openAddParticipants()}
                  />
                ) : null}
                {!canManage ? (
                  <Action
                    icon="exit-to-app"
                    title="Leave group"
                    destructive
                    onPress={confirmLeave}
                  />
                ) : null}
                {canManage ? (
                  <Action
                    icon="delete-outline"
                    title="Delete group"
                    destructive
                    onPress={confirmDelete}
                  />
                ) : null}
              </View>
            ) : null}

            {mode === "participants" ? (
              <FlatList
                data={participants}
                keyExtractor={(participant) => String(participant.id)}
                ListEmptyComponent={
                  <Text style={styles.empty}>No participant details available.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.participantRow}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>
                        {(item.name || item.email || "?").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantName}>
                        {item.name || item.email || "Participant"}
                        {String(item.id) === String(currentUserId) ? " (You)" : ""}
                      </Text>
                      <Text style={styles.participantRole}>{item.role || "Member"}</Text>
                      {String(item.id) !== String(currentUserId) ? (
                        <PresenceStatus userId={item.id} />
                      ) : null}
                    </View>
                  </View>
                )}
              />
            ) : null}

            {mode === "add" ? (
              loading ? (
                <ActivityIndicator style={styles.loader} color="#2563EB" />
              ) : (
                <>
                  <FlatList
                    data={candidates}
                    keyExtractor={(candidate) => String(candidate.id)}
                    ListEmptyComponent={
                      <Text style={styles.empty}>No more people are available to add.</Text>
                    }
                    renderItem={({ item }) => {
                      const selected = selectedIds.includes(String(item.id));
                      return (
                        <TouchableOpacity
                          style={styles.participantRow}
                          onPress={() => toggleCandidate(String(item.id))}
                        >
                          <View style={styles.participantAvatar}>
                            <Text style={styles.participantInitial}>
                              {(item.name || item.email || "?").trim().charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.participantDetails}>
                            <Text style={styles.participantName}>
                              {item.name || item.email || "Participant"}
                            </Text>
                            <Text style={styles.participantRole}>{item.role || "Member"}</Text>
                          </View>
                          <MaterialIcons
                            name={selected ? "check-box" : "check-box-outline-blank"}
                            size={22}
                            color={selected ? "#2563EB" : "#94A3B8"}
                          />
                        </TouchableOpacity>
                      );
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, (!selectedIds.length || saving) && styles.disabledButton]}
                    disabled={!selectedIds.length || saving}
                    onPress={() => void saveParticipants()}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Add {selectedIds.length || ""} participant{selectedIds.length === 1 ? "" : "s"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const Action = ({
  icon,
  title,
  destructive = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  destructive?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.action} onPress={onPress}>
    <MaterialIcons
      name={icon}
      size={21}
      color={destructive ? "#B42318" : "#334155"}
    />
    <Text style={[styles.actionText, destructive && styles.destructiveText]}>
      {title}
    </Text>
    <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    maxHeight: "78%",
    minHeight: 180,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
  },
  sheetHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    color: "#172B4D",
    fontSize: 17,
    fontWeight: "800",
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  actions: {
    paddingTop: 4,
  },
  action: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  actionText: {
    flex: 1,
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  destructiveText: {
    color: "#B42318",
  },
  participantRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  participantAvatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#EAF2FC",
  },
  participantInitial: {
    color: "#245D9B",
    fontSize: 15,
    fontWeight: "800",
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    color: "#172B4D",
    fontSize: 14,
    fontWeight: "700",
  },
  participantRole: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    textTransform: "capitalize",
  },
  empty: {
    paddingVertical: 26,
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },
  loader: {
    marginVertical: 30,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "#2563EB",
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default GroupChatMenu;
