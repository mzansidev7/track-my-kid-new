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
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMessagePreview,
  MessageAttachment,
  parseMessageAttachment,
} from "../../../components/messages/MessageAttachment";
import MessageComposer from "../../../components/messages/MessageComposer";
import MessageReactions from "../../../components/messages/MessageReactions";
import GroupChatMenu from "../../../components/messages/GroupChatMenu";
import GroupSenderAvatar from "../../../components/messages/GroupSenderAvatar";
import PresenceDot from "../../../components/presence/PresenceDot";
import PresenceStatus from "../../../components/presence/PresenceStatus";
import { DRIVER_COLORS, useDriverTheme } from "@/styles/theme";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import {
  ConversationData,
  MessageData,
  fetchConversationsWithCache,
  fetchMessagesWithCache,
  subscribeToConversations,
  subscribeToMessages,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/messagesRealtime";
import { BASE_URL, resolveWorkingBaseUrl } from "../../../url";
import { useDriverNotifications } from "@/app-support/driver/driverHelpers/hooks/useDriverNotifications";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const formatMessageTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getConversationRoleLabel = (role?: string) => {
  switch (role) {
    case "group":
      return "Group chat";
    case "client":
      return "Parent";
    case "school":
      return "School";
    case "owner":
      return "Fleet owner";
    default:
      return "Contact";
  }
};

const getConversationCategory = (
  role?: string,
): "parents" | "school" | "owner" | "all" => {
  if (role === "client") return "parents";
  if (role === "school") return "school";
  if (role === "owner") return "owner";
  return "all";
};

const Messages = () => {
  const { colors } = useDriverTheme();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const userId =
    user?.userData?.id || user?.userData?.user_id || user?.id || "";
  const [activeTab, setActiveTab] = useState<
    "all" | "parents" | "school" | "owner"
  >("all");
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingLinkedContacts, setLoadingLinkedContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkedContactsError, setLinkedContactsError] = useState<string | null>(
    null,
  );
  const { unreadCount } = useDriverNotifications();

  const tabs: Array<{
    id: "all" | "parents" | "school" | "owner";
    label: string;
  }> = [
    { id: "all", label: "All" },
    { id: "parents", label: "Parents" },
    { id: "school", label: "School" },
    { id: "owner", label: "Fleet Owner" },
  ];

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchConversationsWithCache(userId, (cached) => {
        setConversations(cached);
        setLoading(false);
      });
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadLinkedContacts = useCallback(async () => {
    if (!user?.token) {
      setLinkedContacts([]);
      return;
    }

    setLoadingLinkedContacts(true);
    try {
      setLinkedContactsError(null);
      const baseUrl = await resolveWorkingBaseUrl();
      const [clientsRes, ownersRes, schoolsRes] = await Promise.all([
        fetch(`${baseUrl}/driver/linked-clients`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${baseUrl}/driver/linked-owners`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${baseUrl}/driver/linked-schools`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      const endpoints = [
        ["clients", clientsRes],
        ["owners", ownersRes],
        ["schools", schoolsRes],
      ] as const;
      const results = await Promise.allSettled(
        endpoints.map(async ([category, response]) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              data.error ||
                data.message ||
                `Unable to load linked ${category} (HTTP ${response.status}).`,
            );
          }
          return Array.isArray(data) ? data : [];
        }),
      );
      const [clientsResult, ownersResult, schoolsResult] = results;
      const clientsData =
        clientsResult.status === "fulfilled" ? clientsResult.value : [];
      const ownersData =
        ownersResult.status === "fulfilled" ? ownersResult.value : [];
      const schoolsData =
        schoolsResult.status === "fulfilled" ? schoolsResult.value : [];
      const resultEntries = [
        ["clients", "client", clientsResult],
        ["owners", "owner", ownersResult],
        ["schools", "school", schoolsResult],
      ] as const;
      const failedEndpoints = resultEntries.filter(
        ([, , result]) => result.status === "rejected",
      );
      const merged = [
        ...(Array.isArray(clientsData) ? clientsData : [])
          .filter(
            (contact) =>
              contact?.clients?.user_id || contact?.clients?.users?.id,
          )
          .map((contact) => ({
            id: contact?.clients?.user_id || contact?.clients?.users?.id,
            userId: contact?.clients?.user_id || contact?.clients?.users?.id,
            name: contact?.clients?.users?.name || "Parent",
            role: "client",
            type: "client_driver",
            subtitle: "Parent",
            avatar:
              contact?.clients?.users?.name ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent("Parent")}&background=0A84FF&color=fff`,
          })),
        ...(Array.isArray(ownersData) ? ownersData : [])
          .filter((contact) => contact?.users?.id)
          .map((contact) => ({
            id: contact.users.id,
            userId: contact.users.id,
            name:
              contact?.company_name || contact?.users?.name || "Fleet owner",
            role: "owner",
            type: "driver_owner",
            subtitle: "Fleet owner",
            avatar:
              contact?.users?.name ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent("Fleet owner")}&background=0A84FF&color=fff`,
          })),
        ...(Array.isArray(schoolsData) ? schoolsData : [])
          .filter((contact) => contact?.userId)
          .map((contact) => ({
            id: contact?.userId || contact?.id,
            userId: contact?.userId || contact?.id,
            name: contact?.name || "School",
            role: "school",
            type: "driver_school",
            subtitle: contact?.primary_admin_name
              ? `Primary admin: ${contact.primary_admin_name}`
              : contact?.address || "School contact",
            avatar:
              contact?.name ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent("School")}&background=0A84FF&color=fff`,
          })),
      ];

      const deduped = merged.filter(
        (contact, index, array) =>
          index ===
          array.findIndex(
            (item) =>
              item.userId === contact.userId && item.type === contact.type,
          ),
      );

      const updatedRoles = new Set(
        resultEntries
          .filter(([, , result]) => result.status === "fulfilled")
          .map(([, role]) => role),
      );
      setLinkedContacts((current) => {
        const retainedContacts = current.filter(
          (contact) => !updatedRoles.has(contact.role),
        );
        const combinedContacts = [...retainedContacts, ...deduped];
        return combinedContacts.filter(
          (contact, index, array) =>
            index ===
            array.findIndex(
              (item) =>
                item.userId === contact.userId && item.type === contact.type,
            ),
        );
      });
      setLinkedContactsError(
        failedEndpoints.length
          ? `Couldn't load some contacts (${failedEndpoints
              .map(([category]) => category)
              .map((category) => {
                if (category === "clients") return "parents";
                if (category === "owners") return "fleet owners";
                return "schools";
              })
              .join(", ")}). Existing conversations are still available.`
          : null,
      );
    } catch {
      setLinkedContactsError(
        "Linked contacts couldn't load. Check your connection and try again.",
      );
    } finally {
      setLoadingLinkedContacts(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadConversations();
    loadLinkedContacts();

    const channel = userId
      ? subscribeToConversations(userId, setConversations)
      : null;

    return () => {
      if (channel) unsubscribeFromRealtime(channel);
    };
  }, [loadConversations, loadLinkedContacts, userId]);

  const startConversation = useCallback(
    async (contact: any) => {
      if (!contact?.userId || !contact?.type || !user?.token) {
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/driver/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            otherUserId: contact.userId,
            conversationType: contact.type,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to start conversation");
        }

        await loadConversations();
        setSelectedConversation(null);
      } catch (error) {
        console.error("Error starting conversation:", error);
        Alert.alert(
          "Unable to start conversation",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    },
    [loadConversations, user?.token],
  );

  const openConversation = useCallback(
    async (conversation: ConversationData) => {
      setSelectedConversation(conversation);
      setLoadingMessages(true);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const conversationMessages = await fetchMessagesWithCache(
          conversation.id,
          (cached) => setMessages(cached),
        );
        setMessages(conversationMessages);

        await fetch(`${baseUrl}/driver/conversations/${conversation.id}/read`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        const refreshed = await fetchConversationsWithCache(userId);
        setConversations(refreshed);
      } catch (error) {
        console.error("Error opening conversation:", error);
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.token, userId],
  );

  useEffect(() => {
    if (!selectedConversation) return undefined;

    const channel = subscribeToMessages(selectedConversation.id, setMessages);
    return () => {
      if (channel) unsubscribeFromRealtime(channel);
    };
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const category = getConversationCategory(
        conversation.other_participant?.role,
      );
      const matchesTab = activeTab === "all" || category === activeTab;
      const name = conversation.other_participant?.name || "";
      const matchesSearch =
        query.length === 0 || name.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, conversations, searchText]);

  const filteredLinkedContacts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return linkedContacts.filter((contact) => {
      const role = contact.role;
      const category =
        role === "client" ? "parents" : role === "school" ? "school" : "owner";
      const matchesTab = activeTab === "all" || category === activeTab;
      const matchesSearch =
        query.length === 0 ||
        (contact.name || "").toLowerCase().includes(query);

      const hasConversation = conversations.some(
        (conversation) =>
          conversation.other_participant?.id === contact.userId ||
          conversation.other_participant?.name === contact.name,
      );

      return matchesTab && matchesSearch && !hasConversation;
    });
  }, [activeTab, conversations, linkedContacts, searchText]);

  const sendMessage = async (content = draft.trim()) => {
    if (!content || !selectedConversation || sending || !user?.token) {
      return false;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageData = {
      id: optimisticId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      sender_id: user?.userData?.id || user?.userData?.user_id || "",
      users: user?.userData,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSending(true);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/messages`, {
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
        const nextMessages = await fetchMessagesWithCache(
          selectedConversation.id,
        );
        setMessages(nextMessages);
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
    } catch (error) {
      console.error("Error sending message:", error);
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

  const conversationHeaderName =
    selectedConversation?.other_participant?.name || "Contact";
  const conversationHeaderSubtitle =
    selectedConversation?.other_participant?.role === "school"
      ? selectedConversation.other_participant.school_name || "School"
      : getConversationRoleLabel(selectedConversation?.other_participant?.role);

  if (selectedConversation) {
    return (
      <SafeAreaView
        style={[
          localStyles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
      >
        <View
          style={[
            localStyles.chatHeader,
            { backgroundColor: DRIVER_COLORS.background },
          ]}
        >
          <TouchableOpacity
            style={localStyles.backButton}
            onPress={() => setSelectedConversation(null)}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={colors.text.primary}
            />
          </TouchableOpacity>

          <View style={localStyles.chatIdentity}>
            <View
              style={[localStyles.avatarBubble, { backgroundColor: "#E9F2FF" }]}
            >
              {selectedConversation?.other_participant?.role === "admin" ? (
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={localStyles.avatarImage}
                  resizeMode="contain"
                />
              ) : selectedConversation?.conversation_type === "school_group" &&
                selectedConversation.other_participant?.avatar ? (
                <Image
                  source={{
                    uri: selectedConversation.other_participant.avatar,
                  }}
                  style={localStyles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={localStyles.avatarText}>
                  {getInitials(conversationHeaderName)}
                </Text>
              )}
              {selectedConversation.other_participant?.role !== "group" ? (
                <PresenceDot
                  userId={selectedConversation.other_participant?.id}
                />
              ) : null}
            </View>

            <View>
              <Text
                style={[localStyles.chatName, { color: colors.text.primary }]}
              >
                {conversationHeaderName}
              </Text>
              <Text
                style={[localStyles.chatRole, { color: colors.text.secondary }]}
              >
                {conversationHeaderSubtitle}
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
              role="driver"
              token={user?.token || ""}
              currentUserId={userId}
              onRemoved={() => {
                setSelectedConversation(null);
                setMessages([]);
                void loadConversations();
              }}
              onUpdated={() => void loadConversations()}
              iconColor={colors.text.secondary}
            />
          ) : (
            <TouchableOpacity style={localStyles.headerIcon}>
              <MaterialIcons
                name="more-vert"
                size={22}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {loadingMessages ? (
            <View style={localStyles.centeredMessage}>
              <ActivityIndicator size="large" color={DRIVER_COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={localStyles.messageList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={localStyles.emptyState}>
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={42}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[
                      localStyles.emptyText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    No messages yet
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isOwn = item.sender_id === userId;
                const isGroupChat = ["admin_group", "school_group"].includes(
                  selectedConversation?.conversation_type || "",
                );
                const attachment = parseMessageAttachment(item.content);

                return (
                  <View
                    style={[
                      localStyles.messageRow,
                      isOwn && localStyles.messageRowOwn,
                    ]}
                  >
                    {!isOwn &&
                    (isGroupChat ||
                      (selectedConversation?.other_participant.role ===
                        "school" &&
                        item.sender_id ===
                          selectedConversation?.other_participant.id)) ? (
                      <GroupSenderAvatar
                        name={item.users?.name}
                        avatar={item.users?.avatar}
                        userId={item.sender_id}
                      />
                    ) : null}
                    <View
                      style={[
                        localStyles.messageGroup,
                        isOwn && localStyles.messageGroupOwn,
                      ]}
                    >
                      {!isOwn &&
                      !isGroupChat &&
                      selectedConversation?.other_participant.role ===
                        "school" &&
                      item.sender_id ===
                        selectedConversation.other_participant.id ? (
                        <View style={{ marginBottom: 4, paddingHorizontal: 3 }}>
                          <Text
                            style={{
                              color: DRIVER_COLORS.text,
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            {item.users?.name ||
                              selectedConversation.other_participant.name}
                          </Text>
                          {selectedConversation.other_participant
                            .school_name ? (
                            <Text
                              style={{
                                color: DRIVER_COLORS.muted,
                                fontSize: 10,
                              }}
                            >
                              {
                                selectedConversation.other_participant
                                  .school_name
                              }
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      <View
                        style={[
                          localStyles.bubble,
                          isOwn
                            ? localStyles.bubbleOwn
                            : localStyles.bubbleOther,
                        ]}
                      >
                        <Pressable
                          onLongPress={() => {
                            if (!isOwn) setReactionPickerMessageId(item.id);
                          }}
                          delayLongPress={250}
                        >
                          {attachment ? (
                            <MessageAttachment
                              content={item.content}
                              isOwn={isOwn}
                            />
                          ) : (
                            <Text
                              style={
                                isOwn
                                  ? localStyles.messageTextOwn
                                  : localStyles.messageText
                              }
                            >
                              {item.content}
                            </Text>
                          )}
                          <View
                            style={[
                              localStyles.messageFooter,
                              isOwn && localStyles.messageFooterOwn,
                            ]}
                          >
                            <Text
                              style={
                                isOwn ? localStyles.timeOwn : localStyles.time
                              }
                            >
                              {formatMessageTime(item.sent_at)}
                              {isOwn ? (item.is_read ? "  ✓✓" : "  ✓") : ""}
                            </Text>
                          </View>
                          {item.deliveryError ? (
                            <Text style={localStyles.messageDeliveryError}>
                              Message not sent
                            </Text>
                          ) : null}
                        </Pressable>
                        {!item.deliveryError &&
                        (!isOwn || item.reactions?.length) ? (
                          <MessageReactions
                            apiBaseUrl={BASE_URL}
                            role="driver"
                            conversationId={selectedConversation.id}
                            messageId={item.id}
                            token={user?.token || ""}
                            currentUserId={userId}
                            accentColor={DRIVER_COLORS.primary}
                            reactions={item.reactions}
                            isOwn={isOwn}
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

          <View
            style={[
              localStyles.composer,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <MessageComposer
              apiBaseUrl={BASE_URL}
              role="driver"
              conversationId={selectedConversation.id}
              token={user?.token || ""}
              accentColor={DRIVER_COLORS.primary}
              layout="whatsapp"
              onSendText={sendMessage}
              onSent={async () =>
                setMessages(
                  await fetchMessagesWithCache(selectedConversation.id),
                )
              }
              containerStyle={{
                backgroundColor: DRIVER_COLORS.background,
                borderTopColor: DRIVER_COLORS.cardBorder,
              }}
              inputStyle={{
                color: DRIVER_COLORS.text,
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        localStyles.container,
        { backgroundColor: DRIVER_COLORS.background },
      ]}
    >
      <DriverHeader
        title="Messages"
        subtitle="Stay connected with parents, school and fleet owner"
        showNotifications={true}
        notificationCount={unreadCount}
      />

      <ScrollView
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.text.secondary}
            style={localStyles.searchIcon}
          />
          <TextInput
            placeholder="Search messages"
            placeholderTextColor={colors.text.secondary}
            style={[localStyles.searchInput, { color: colors.text.primary }]}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <TouchableOpacity
          style={localStyles.filterDropdown}
          activeOpacity={0.8}
          onPress={() => setFilterMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filter conversations: ${tabs.find((item) => item.id === activeTab)?.label || "All"}`}
        >
          <MaterialIcons
            name="filter-list"
            size={20}
            color={DRIVER_COLORS.primary}
          />
          <Text style={localStyles.filterDropdownLabel}>
            {tabs.find((item) => item.id === activeTab)?.label || "All"}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={22}
            color={DRIVER_COLORS.muted}
          />
        </TouchableOpacity>

        <Modal
          transparent
          visible={filterMenuVisible}
          animationType="fade"
          onRequestClose={() => setFilterMenuVisible(false)}
        >
          <Pressable
            style={localStyles.filterModalOverlay}
            onPress={() => setFilterMenuVisible(false)}
          >
            <View style={localStyles.filterMenu}>
              <Text style={localStyles.filterMenuTitle}>
                Show conversations
              </Text>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    localStyles.filterOption,
                    activeTab === tab.id && localStyles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.id);
                    setFilterMenuVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTab === tab.id }}
                >
                  <Text
                    style={[
                      localStyles.filterOptionText,
                      activeTab === tab.id &&
                        localStyles.filterOptionTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {activeTab === tab.id ? (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={DRIVER_COLORS.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>

        {linkedContactsError ? (
          <View
            accessibilityRole="alert"
            style={localStyles.linkedContactsNotice}
          >
            <Text style={localStyles.linkedContactsNoticeText}>
              {linkedContactsError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadLinkedContacts()}
              accessibilityRole="button"
              accessibilityState={{ disabled: loadingLinkedContacts }}
              disabled={loadingLinkedContacts}
              style={localStyles.linkedContactsRetryButton}
            >
              <Text style={localStyles.linkedContactsRetry}>
                {loadingLinkedContacts ? "Retrying..." : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={localStyles.loadingState}>
            <ActivityIndicator size="large" color={DRIVER_COLORS.primary} />
            <Text
              style={[
                localStyles.loadingText,
                { color: colors.text.secondary },
              ]}
            >
              Loading conversations...
            </Text>
          </View>
        ) : (
          <>
            {filteredLinkedContacts.length > 0 && (
              <View style={localStyles.sectionBlock}>
                <Text
                  style={[
                    localStyles.sectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Linked contacts
                </Text>
                {filteredLinkedContacts.map((contact) => (
                  <TouchableOpacity
                    key={`${contact.type}-${contact.userId}`}
                    style={[
                      localStyles.contactRow,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => startConversation(contact)}
                  >
                    <View style={localStyles.avatarContainer}>
                      <Image
                        source={{
                          uri:
                            contact.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=0A84FF&color=fff`,
                        }}
                        style={localStyles.avatar}
                      />
                    </View>

                    <View style={localStyles.conversationInfo}>
                      <Text
                        style={[
                          localStyles.conversationName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {contact.name}
                      </Text>
                      <Text
                        style={[
                          localStyles.conversationMessage,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {contact.subtitle}
                      </Text>
                    </View>

                    <View style={localStyles.messageAction}>
                      <MaterialIcons
                        name="message"
                        size={18}
                        color={DRIVER_COLORS.primary}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {filteredConversations.length > 0 ? (
              filteredConversations.map((item) => {
                const name = item.other_participant?.name || "Unknown contact";
                const previewMessage =
                  getMessagePreview(item.last_message?.content) ||
                  "No messages yet";
                const unreadCount = item.unread_count || 0;
                const avatarUri =
                  (item.conversation_type === "school_group"
                    ? item.other_participant?.avatar
                    : null) ||
                  item.other_participant?.avatar ||
                  item.other_participant?.profile?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A84FF&color=fff`;
                const isSupport = item.other_participant?.role === "admin";

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      localStyles.conversationRow,
                      { borderBottomColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => openConversation(item)}
                  >
                    <View style={localStyles.avatarContainer}>
                      {isSupport ? (
                        <Image
                          source={require("@/assets/images/logo.png")}
                          style={localStyles.avatar}
                          resizeMode="contain"
                        />
                      ) : (
                        <Image
                          source={{ uri: avatarUri }}
                          style={localStyles.avatar}
                        />
                      )}
                      {item.other_participant?.role !== "group" ? (
                        <PresenceDot
                          userId={item.other_participant?.id}
                          showOffline
                        />
                      ) : null}
                    </View>

                    <View style={localStyles.conversationInfo}>
                      <Text
                        style={[
                          localStyles.conversationName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {name}
                      </Text>
                      {item.other_participant?.role === "school" &&
                      item.other_participant.school_name ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            localStyles.conversationMessage,
                            { color: colors.text.secondary, fontWeight: "600" },
                          ]}
                        >
                          {item.other_participant.school_name}
                        </Text>
                      ) : null}
                      <Text
                        numberOfLines={1}
                        style={[
                          localStyles.conversationMessage,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {previewMessage}
                      </Text>
                    </View>

                    <View style={localStyles.conversationMeta}>
                      <Text
                        style={[
                          localStyles.conversationTimestamp,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {item.last_message_at
                          ? new Date(item.last_message_at).toLocaleDateString(
                              [],
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "New"}
                      </Text>
                      {unreadCount > 0 && (
                        <View style={localStyles.unreadBadge}>
                          <Text style={localStyles.unreadCount}>
                            {unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : filteredLinkedContacts.length === 0 ? (
              <View style={localStyles.emptyState}>
                <MaterialIcons
                  name="mail-outline"
                  size={48}
                  color={colors.text.secondary}
                />
                <Text
                  style={[
                    localStyles.emptyText,
                    { color: colors.text.secondary },
                  ]}
                >
                  No conversations yet
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Messages;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroCard: {
    margin: 16,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DRIVER_COLORS.successSurface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 15,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterDropdown: {
    minHeight: 46,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    backgroundColor: DRIVER_COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterDropdownLabel: {
    flex: 1,
    color: DRIVER_COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  filterMenu: {
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    backgroundColor: DRIVER_COLORS.card,
  },
  filterMenuTitle: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    color: DRIVER_COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  filterOption: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterOptionSelected: {
    backgroundColor: DRIVER_COLORS.surfaceRaised,
  },
  filterOptionText: {
    color: DRIVER_COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  filterOptionTextSelected: {
    color: DRIVER_COLORS.cyan,
    fontWeight: "800",
  },
  linkedContactsNotice: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.warning,
    backgroundColor: DRIVER_COLORS.warningSurface,
    gap: 12,
  },
  linkedContactsNoticeText: {
    color: DRIVER_COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  linkedContactsRetryButton: {
    alignSelf: "flex-end",
    minWidth: 84,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },
  linkedContactsRetry: {
    color: DRIVER_COLORS.cyan,
    fontSize: 13,
    fontWeight: "800",
  },
  conversationsList: {
    marginTop: 8,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: "rgba(0, 185, 167, 0.06)",
  },
  avatarContainer: {
    position: "relative",
    width: 48,
    height: 48,
    marginRight: 12,
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 13,
  },
  conversationMeta: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  conversationTimestamp: {
    fontSize: 12,
    marginBottom: 6,
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DRIVER_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  messageAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerNotification: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DRIVER_COLORS.cardBorder,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  chatIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  avatarBubble: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: DRIVER_COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "700",
  },
  chatRole: {
    fontSize: 12,
    marginTop: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  messageRow: {
    marginBottom: 10,
  },
  messageRowOwn: {
    alignItems: "flex-end",
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 7,
    marginBottom: 2,
  },
  senderAvatarContainer: {
    position: "relative",
    marginRight: 7,
  },
  messageGroup: {
    maxWidth: "84%",
    alignItems: "flex-start",
  },
  messageGroupOwn: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "100%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubbleOwn: {
    backgroundColor: DRIVER_COLORS.primary,
  },
  bubbleOther: {
    backgroundColor: DRIVER_COLORS.card,
  },
  messageText: {
    color: DRIVER_COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    color: DRIVER_COLORS.muted,
  },
  timeOwn: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },
  messageFooter: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
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
    alignSelf: "flex-end",
  },
  composer: {
    width: "100%",
    alignItems: "stretch",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: DRIVER_COLORS.cardBorder,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: DRIVER_COLORS.text,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: DRIVER_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingState: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
