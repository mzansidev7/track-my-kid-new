import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  MessageAttachment,
  getMessagePreview,
  parseMessageAttachment,
} from "../../../components/messages/MessageAttachment";
import MessageComposer from "../../../components/messages/MessageComposer";
import MessageReactions from "../../../components/messages/MessageReactions";
import GroupChatMenu from "../../../components/messages/GroupChatMenu";
import GroupSenderAvatar from "../../../components/messages/GroupSenderAvatar";
import PresenceDot from "../../../components/presence/PresenceDot";
import PresenceStatus from "../../../components/presence/PresenceStatus";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import {
  ConversationData,
  fetchConversationsWithCache,
  fetchMessagesWithCache,
  MessageData,
  subscribeToConversations,
  subscribeToMessages,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/messagesRealtime";
import { BASE_URL } from "../../../url";
import {
  colors,
  formatTime,
  getInitials,
  getRoleLabel,
} from "@/app-support/school/schoolHelpers/actionHelpers/actions";

interface GroupCandidate {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  grades: string[];
  isSupport: boolean;
}

export default function Messages() {
  const { user } = useContext(AuthContext);
  const userId = user?.userData?.id || user?.userData?.user_id || "";
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [groupCandidates, setGroupCandidates] = useState<GroupCandidate[]>([]);
  const [loadingGroupCandidates, setLoadingGroupCandidates] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupGradeFilter, setGroupGradeFilter] = useState("All");
  const [includeSupport, setIncludeSupport] = useState(false);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>(
    [],
  );
  const supportUserIds = groupCandidates
    .filter((candidate) => candidate.isSupport)
    .map((candidate) => candidate.id);
  const groupGrades = [
    ...new Set(
      groupCandidates.flatMap((candidate) =>
        candidate.isSupport ? [] : candidate.grades || [],
      ),
    ),
  ].sort((first, second) =>
    first.localeCompare(second, undefined, { numeric: true }),
  );
  const selectedGroupCount =
    selectedGroupMemberIds.length +
    (includeSupport ? supportUserIds.length : 0);

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fresh = await fetchConversationsWithCache(
        userId,
        (cached) => {
          setConversations(cached);
          setLoading(false);
        },
        user?.token,
        "/school/conversations",
      );
      setConversations(fresh);
    } finally {
      setLoading(false);
    }
  }, [user?.token, userId]);

  useEffect(() => {
    loadConversations();
    const channel = userId
      ? subscribeToConversations(
          userId,
          setConversations,
          user?.token,
          "/school/conversations",
        )
      : null;
    return () => {
      if (channel) unsubscribeFromRealtime(channel);
    };
  }, [loadConversations, user?.token, userId]);

  const openGroupComposer = async () => {
    if (!user?.token) return;
    setGroupName("");
    setGroupSearch("");
    setGroupGradeFilter("All");
    setIncludeSupport(false);
    setSelectedGroupMemberIds([]);
    setGroupCandidates([]);
    setShowGroupComposer(true);
    setLoadingGroupCandidates(true);
    try {
      const response = await fetch(
        `${BASE_URL}/school/group-conversation-candidates`,
        { headers: {         Authorization: "Bearer " + user.token, } },
      );
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(payload?.error || "Unable to load school contacts.");
      }
      setGroupCandidates(payload);
    } catch (error: any) {
      setShowGroupComposer(false);
      Alert.alert("Could not load contacts", error.message);
    } finally {
      setLoadingGroupCandidates(false);
    }
  };

  const toggleGroupMember = (memberId: string) => {
    setSelectedGroupMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const createGroupConversation = async () => {
    if (!user?.token) return;
    if (selectedGroupCount < 2) {
      Alert.alert("Select more people", "Choose at least two people for the group.");
      return;
    }
    setCreatingGroup(true);
    try {
      const response = await fetch(`${BASE_URL}/school/group-conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          groupName: groupName.trim(),
          memberUserIds: [
            ...new Set([
              ...selectedGroupMemberIds,
              ...(includeSupport ? supportUserIds : []),
            ]),
          ],
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.conversation_id) {
        throw new Error(payload?.error || "Could not create the group chat.");
      }

      const fresh = await fetchConversationsWithCache(
        userId,
        undefined,
        user.token,
        "/school/conversations",
      );
      setConversations(fresh);
      const conversation = fresh.find(
        (item) => item.id === payload.conversation_id,
      );
      setShowGroupComposer(false);
      setGroupName("");
      setGroupSearch("");
      setGroupGradeFilter("All");
      setIncludeSupport(false);
      setSelectedGroupMemberIds([]);
      if (conversation) {
        await openConversation(conversation);
      } else {
        Alert.alert("Group created", "The new group is not available in your inbox yet.");
      }
    } catch (error: any) {
      Alert.alert("Could not create group", error.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const openConversation = async (conversation: ConversationData) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    try {
      const fresh = await fetchMessagesWithCache(conversation.id, (cached) => {
        setMessages(cached);
        setLoadingMessages(false);
      });
      setMessages(fresh);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation) return undefined;
    const channel = subscribeToMessages(selectedConversation.id, setMessages);
    return () => {
      if (channel) unsubscribeFromRealtime(channel);
    };
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? conversations.filter((item) =>
          item.other_participant?.name?.toLowerCase().includes(query),
        )
      : conversations;
  }, [conversations, search]);

  const sendMessage = async (content = draft.trim()) => {
    if (!content || !selectedConversation || sending || !user?.token)
      return false;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageData = {
      id: optimisticId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      sender_id: userId,
      users: user?.userData,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSending(true);
    try {
      const response = await fetch(`${BASE_URL}/school/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content,
        }),
      });
      if (response.ok) {
        setMessages(await fetchMessagesWithCache(selectedConversation.id));
        return true;
      }
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
      return false;
    } catch (err) {
      console.warn(err);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
      return false;
    } finally {
      setSending(false);
    }
  };

  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConversation(null)}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.chatIdentity}>
            <View style={{ position: "relative" }}>
              <Avatar
                name={selectedConversation.other_participant?.name}
                color={colors.purple}
                isSupport={
                  selectedConversation.other_participant?.role === "admin"
                }
                avatar={
                  selectedConversation.conversation_type === "school_group"
                    ? selectedConversation.other_participant?.avatar
                    : null
                }
              />
              {selectedConversation.other_participant?.role !== "group" ? (
                <PresenceDot
                  userId={selectedConversation.other_participant?.id}
                />
              ) : null}
            </View>
            <View>
              <Text style={styles.chatName}>
                {selectedConversation.other_participant?.name || "Contact"}
              </Text>
              <Text style={styles.chatRole}>
                {getRoleLabel(selectedConversation.other_participant?.role)}
              </Text>
              {selectedConversation.other_participant?.role !== "group" ? (
                <PresenceStatus
                  userId={selectedConversation.other_participant?.id}
                />
              ) : null}
            </View>
          </View>
          {["admin_group", "school_group"].includes(
            selectedConversation.conversation_type,
          ) ? (
            <GroupChatMenu
              key={selectedConversation.id}
              conversation={selectedConversation}
              role="school"
              token={user?.token || ""}
              currentUserId={userId}
              onRemoved={() => {
                setSelectedConversation(null);
                setMessages([]);
                void loadConversations();
              }}
              onUpdated={() => void loadConversations()}
              iconColor={colors.muted}
            />
          ) : null}
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
        {loadingMessages ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                title="No messages yet"
                subtitle="Send the first message to start this conversation."
                icon="chat-bubble-outline"
              />
            }
            renderItem={({ item }) => {
              const own = item.sender_id === userId;
              const isGroupChat = ["admin_group", "school_group"].includes(
                selectedConversation.conversation_type,
              );
              const attachment = parseMessageAttachment(item.content);
              return (
                <View style={[styles.messageRow, own && styles.messageRowOwn]}>
                  {!own && isGroupChat ? (
                    <GroupSenderAvatar
                      name={item.users?.name}
                      avatar={item.users?.avatar}
                      userId={item.sender_id}
                    />
                  ) : null}
                  <View
                    style={[
                      styles.messageGroup,
                      own && styles.messageGroupOwn,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        own ? styles.bubbleOwn : styles.bubbleOther,
                      ]}
                    >
                    <Pressable
                      onLongPress={() => {
                        if (!own) setReactionPickerMessageId(item.id);
                      }}
                      delayLongPress={250}
                    >
                      {attachment ? (
                        <MessageAttachment
                          content={item.content}
                          isOwn={own}
                        />
                      ) : (
                        <Text
                          style={
                            own ? styles.messageTextOwn : styles.messageText
                          }
                        >
                          {item.content}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.messageFooter,
                          own && styles.messageFooterOwn,
                        ]}
                      >
                        <Text style={own ? styles.timeOwn : styles.time}>
                          {formatTime(item.sent_at)}
                        </Text>
                      </View>
                      {item.deliveryError ? (
                        <Text style={styles.messageDeliveryError}>
                          Message not sent
                        </Text>
                      ) : null}
                    </Pressable>
                    {!item.deliveryError &&
                    (!own || item.reactions?.length) ? (
                      <MessageReactions
                        apiBaseUrl={BASE_URL}
                        role="school"
                        conversationId={selectedConversation.id}
                        messageId={item.id}
                        token={user?.token || ""}
                        currentUserId={userId}
                        accentColor="#159B3A"
                        reactions={item.reactions}
                        isOwn={own}
                        longPressToReact
                        pickerOpen={reactionPickerMessageId === item.id}
                        onPickerOpenChange={(open) =>
                          setReactionPickerMessageId(open ? item.id : "")
                        }
                      />
                    ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
          <MessageComposer
            apiBaseUrl={BASE_URL}
            role="school"
            conversationId={selectedConversation.id}
            token={user?.token || ""}
            accentColor={colors.blue}
            onSendText={sendMessage}
            onSent={async () =>
              setMessages(await fetchMessagesWithCache(selectedConversation.id))
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>SCHOOL PORTAL</Text>
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>
                  Stay connected with your school network
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.groupButton}
                  onPress={() => void openGroupComposer()}
                  accessibilityLabel="Create group chat"
                >
                  <MaterialIcons name="group-add" size={22} color={colors.blue} />
                </TouchableOpacity>
                <View style={styles.headerBadge}>
                  <MaterialIcons name="chat" size={22} color={colors.blue} />
                </View>
              </View>
            </View>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={21} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search conversations"
                placeholderTextColor="#9AA7B8"
                style={styles.searchInput}
              />
            </View>
            <Text style={styles.sectionTitle}>RECENT CONVERSATIONS</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.blue} />
            </View>
          ) : (
            <EmptyState
              title="Your inbox is quiet"
              subtitle="Messages from parents, drivers and fleet owners will appear here."
              icon="forum"
            />
          )
        }
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            userId={userId}
            onPress={() => openConversation(item)}
          />
        )}
      />
      <Modal
        visible={showGroupComposer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupComposer(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.groupModal}>
            <Text style={styles.groupModalTitle}>Create a group chat</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name (optional)"
              maxLength={80}
              style={styles.groupNameInput}
            />
            <TextInput
              value={groupSearch}
              onChangeText={setGroupSearch}
              placeholder="Search school contacts"
              style={styles.groupNameInput}
            />
            <Text style={styles.groupFieldLabel}>Show by grade</Text>
            <View style={styles.groupGradePicker}>
              <Picker
                selectedValue={groupGradeFilter}
                onValueChange={(value) => setGroupGradeFilter(value)}
                style={styles.groupGradePickerControl}
              >
                <Picker.Item label="All grades" value="All" />
                {groupGrades.map((grade) => (
                  <Picker.Item
                    key={grade}
                    label={grade}
                    value={grade}
                  />
                ))}
              </Picker>
            </View>
            <TouchableOpacity
              style={styles.groupSupportOption}
              onPress={() => setIncludeSupport((selected) => !selected)}
              disabled={supportUserIds.length === 0}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: includeSupport,
                disabled: supportUserIds.length === 0,
              }}
            >
              <MaterialIcons
                name={
                  includeSupport ? "check-box" : "check-box-outline-blank"
                }
                size={21}
                color={includeSupport ? colors.blue : colors.muted}
              />
              <View style={styles.groupCandidateCopy}>
                <Text style={styles.groupCandidateName}>Include support team</Text>
                <Text style={styles.groupCandidateRole}>
                  {supportUserIds.length
                    ? `${supportUserIds.length} available`
                    : "No support team members are available"}
                </Text>
              </View>
            </TouchableOpacity>
            {loadingGroupCandidates ? (
              <ActivityIndicator style={styles.groupLoading} color={colors.blue} />
            ) : (
              <FlatList
                data={groupCandidates.filter((candidate) => {
                  if (candidate.isSupport) return false;
                  const matchesSearch = `${candidate.name} ${candidate.role} ${candidate.email || ""}`
                    .toLowerCase()
                    .includes(groupSearch.trim().toLowerCase());
                  const matchesGrade =
                    groupGradeFilter === "All" ||
                    candidate.grades?.length === 0 ||
                    candidate.grades?.includes(groupGradeFilter);
                  return matchesSearch && matchesGrade;
                })}
                keyExtractor={(item) => item.id}
                style={styles.groupCandidateList}
                ListEmptyComponent={
                  <Text style={styles.groupEmpty}>
                    No linked school contacts are available.
                  </Text>
                }
                renderItem={({ item }) => {
                  const selected = selectedGroupMemberIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={styles.groupCandidate}
                      onPress={() => toggleGroupMember(item.id)}
                    >
                      <View style={styles.groupCandidateCopy}>
                        <Text style={styles.groupCandidateName}>{item.name}</Text>
                        <Text style={styles.groupCandidateRole}>
                          {item.role || "Contact"}
                          {item.grades?.length
                            ? ` · ${item.grades.join(", ")}`
                            : ""}
                        </Text>
                      </View>
                      <MaterialIcons
                        name={selected ? "check-box" : "check-box-outline-blank"}
                        size={22}
                        color={selected ? colors.blue : colors.muted}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <View style={styles.groupModalActions}>
              <TouchableOpacity
                style={styles.groupCancelButton}
                onPress={() => setShowGroupComposer(false)}
                disabled={creatingGroup}
              >
                <Text style={styles.groupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.groupCreateButton,
                  (creatingGroup || selectedGroupCount < 2) &&
                    styles.groupCreateButtonDisabled,
                ]}
                onPress={() => void createGroupConversation()}
                disabled={creatingGroup || selectedGroupCount < 2}
              >
                {creatingGroup ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.groupCreateText}>Create group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
    </SafeAreaView>
  );
}

function Avatar({
  name,
  color,
  isSupport = false,
  avatar,
}: {
  name?: string;
  color: string;
  isSupport?: boolean;
  avatar?: string | null;
}) {
  return (
    <View style={[styles.avatar, { backgroundColor: `${color}18` }]}>
      {isSupport ? (
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.avatarImage}
          resizeMode="contain"
        />
      ) : avatar ? (
        <Image
          source={{ uri: avatar }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarText, { color }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

function ConversationRow({
  item,
  userId,
  onPress,
}: {
  item: ConversationData;
  userId: string;
  onPress: () => void;
}) {
  const unread = Boolean(
    item.last_message &&
    !item.last_message.is_read &&
    item.last_message.sender_id !== userId,
  );
  return (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ position: "relative" }}>
        <Avatar
          name={item.other_participant?.name}
          color={colors.blue}
          isSupport={item.other_participant?.role === "admin"}
          avatar={
            item.conversation_type === "school_group"
              ? item.other_participant?.avatar
              : null
          }
        />
        {item.other_participant?.role !== "group" ? (
          <PresenceDot userId={item.other_participant?.id} showOffline />
        ) : null}
      </View>
      <View style={styles.conversationCopy}>
        <View style={styles.conversationTop}>
          <Text style={styles.name} numberOfLines={1}>
            {item.other_participant?.name || "Contact"}
          </Text>
          <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
        </View>
        <Text style={styles.role}>
          {getRoleLabel(item.other_participant?.role)}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {getMessagePreview(item.last_message?.content) || "Start a conversation"}
        </Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: any;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MaterialIcons name={icon} size={30} color={colors.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  groupButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  groupModal: {
    maxHeight: "85%",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
  },
  groupModalTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
  },
  groupNameInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink,
    marginBottom: 10,
  },
  groupFieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 5,
  },
  groupGradePicker: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  groupGradePickerControl: { color: colors.ink },
  groupSupportOption: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  groupCandidateList: { maxHeight: 320, marginTop: 2 },
  groupLoading: { paddingVertical: 40 },
  groupEmpty: {
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 13,
  },
  groupCandidate: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  groupCandidateCopy: { flex: 1 },
  groupCandidateName: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  groupCandidateRole: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    textTransform: "capitalize",
  },
  groupModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  groupCancelButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  groupCancelText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  groupCreateButton: {
    minWidth: 120,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  groupCreateButtonDisabled: { opacity: 0.5 },
  groupCreateText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  searchBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, marginLeft: 9 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  conversationCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 16 },
  avatarText: { fontSize: 15, fontWeight: "800" },
  conversationCopy: { flex: 1, marginLeft: 12 },
  conversationTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  role: { color: colors.blue, fontSize: 11, fontWeight: "700", marginTop: 3 },
  preview: { color: colors.muted, fontSize: 12, marginTop: 5 },
  time: { color: "#9AA7B8", fontSize: 10 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.blue,
    marginLeft: 8,
  },
  empty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 70 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  chatHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  chatIdentity: { flex: 1, flexDirection: "row", alignItems: "center" },
  chatName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 10,
  },
  chatRole: { color: colors.muted, fontSize: 11, marginLeft: 10, marginTop: 2 },
  headerIcon: { padding: 8 },
  messageList: {
    padding: 16,
    paddingBottom: 22,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  messageRowOwn: { justifyContent: "flex-end" },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 7 },
  senderAvatarContainer: { position: "relative", marginRight: 7 },
  messageGroup: { maxWidth: "84%", alignItems: "flex-start" },
  messageGroupOwn: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 17,
  },
  bubbleOwn: { backgroundColor: colors.blue, borderBottomRightRadius: 5 },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },
  messageText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  messageTextOwn: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  timeOwn: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    textAlign: "right",
  },
  messageFooter: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    maxWidth: "100%",
  },
  messageFooterOwn: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  messageDeliveryError: {
    marginTop: 5,
    color: "#B42318",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  composer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    color: colors.ink,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: "#B8C5D6" },
});
