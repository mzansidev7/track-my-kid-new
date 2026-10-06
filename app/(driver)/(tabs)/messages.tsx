import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useTheme } from "@/styles/theme";
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
import { resolveWorkingBaseUrl } from "../../../url";

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
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const userId = user?.userData?.id || user?.userData?.user_id || "";
  const [activeTab, setActiveTab] = useState<
    "all" | "parents" | "school" | "owner"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

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

    try {
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

      const [clientsData, ownersData, schoolsData] = await Promise.all([
        clientsRes.ok ? clientsRes.json() : [],
        ownersRes.ok ? ownersRes.json() : [],
        schoolsRes.ok ? schoolsRes.json() : [],
      ]);

      const merged = [
        ...(Array.isArray(clientsData) ? clientsData : []).map((contact) => ({
          id: contact?.clients?.user_id || contact?.users?.id || contact?.id,
          userId:
            contact?.clients?.user_id || contact?.users?.id || contact?.id,
          name: contact?.clients?.users?.name || "Parent",
          role: "client",
          type: "client_driver",
          subtitle: "Parent",
          avatar:
            contact?.clients?.users?.name ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent("Parent")}&background=0A84FF&color=fff`,
        })),
        ...(Array.isArray(ownersData) ? ownersData : []).map((contact) => ({
          id: contact?.users?.id || contact?.id,
          userId: contact?.users?.id || contact?.id,
          name: contact?.company_name || contact?.users?.name || "Fleet owner",
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

      setLinkedContacts(deduped);
    } catch (error) {
      console.error("Error loading linked contacts:", error);
      setLinkedContacts([]);
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

  const sendMessage = async () => {
    if (!draft.trim() || !selectedConversation || sending || !user?.token) {
      return;
    }

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
          content: draft.trim(),
        }),
      });

      if (response.ok) {
        setDraft("");
        const nextMessages = await fetchMessagesWithCache(
          selectedConversation.id,
        );
        setMessages(nextMessages);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const conversationHeaderName =
    selectedConversation?.other_participant?.name || "Contact";
  const schoolPrimaryAdmin = (
    selectedConversation?.other_participant as {
      primary_admin?: { name?: string };
    } | null
  )?.primary_admin;
  const conversationHeaderSubtitle =
    selectedConversation?.other_participant?.role === "school"
      ? schoolPrimaryAdmin?.name
        ? `Primary admin: ${schoolPrimaryAdmin.name}`
        : "School group"
      : getConversationRoleLabel(selectedConversation?.other_participant?.role);

  if (selectedConversation) {
    return (
      <SafeAreaView
        style={[localStyles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            localStyles.chatHeader,
            { backgroundColor: colors.background },
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
              <Text style={localStyles.avatarText}>
                {getInitials(conversationHeaderName)}
              </Text>
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
            </View>
          </View>

          <TouchableOpacity style={localStyles.headerIcon}>
            <MaterialIcons
              name="more-vert"
              size={22}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {loadingMessages ? (
          <View style={localStyles.centeredMessage}>
            <ActivityIndicator size="large" color="#0F9D58" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={localStyles.messageList}
            showsVerticalScrollIndicator={false}
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
              const attachment = parseMessageAttachment(item.content);

              return (
                <View
                  style={[
                    localStyles.messageRow,
                    isOwn && localStyles.messageRowOwn,
                  ]}
                >
                  <View
                    style={[
                      localStyles.bubble,
                      isOwn ? localStyles.bubbleOwn : localStyles.bubbleOther,
                    ]}
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
                    <Text
                      style={isOwn ? localStyles.timeOwn : localStyles.time}
                    >
                      {formatMessageTime(item.sent_at)}
                      {isOwn ? (item.is_read ? "  ✓✓" : "  ✓") : ""}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View
            style={[
              localStyles.composer,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message..."
              placeholderTextColor="#9AA7B8"
              multiline
              style={localStyles.input}
            />
            <TouchableOpacity
              style={[
                localStyles.sendButton,
                !draft.trim() && localStyles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[localStyles.container, { backgroundColor: colors.background }]}
    >
      <DriverHeader
        title="Messages"
        subtitle="Stay connected with parents, school and fleet owner"
        showBackButton={true}
        showNotifications={true}
        notificationCount={7}
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

        <View style={localStyles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                localStyles.tab,
                activeTab === tab.id && [
                  localStyles.tabActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Text
                style={[
                  localStyles.tabLabel,
                  {
                    color:
                      activeTab === tab.id
                        ? colors.primary
                        : colors.text.secondary,
                    fontWeight: activeTab === tab.id ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={localStyles.loadingState}>
            <ActivityIndicator size="large" color="#0F9D58" />
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
                      <MaterialIcons name="message" size={18} color="#0F9D58" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {filteredConversations.length > 0 ? (
              filteredConversations.map((item) => {
                const name = item.other_participant?.name || "Unknown contact";
                const previewMessage =
                  getMessagePreview(item.last_message?.content) || "No messages yet";
                const unreadCount = item.unread_count || 0;
                const avatarUri =
                  item.other_participant?.profile?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A84FF&color=fff`;

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
                      <Image
                        source={{ uri: avatarUri }}
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
                        {name}
                      </Text>
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
    paddingBottom: 100,
  },
  heroCard: {
    margin: 16,
    borderRadius: 16,
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
    backgroundColor: "rgba(10, 132, 255, 0.1)",
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
    borderRadius: 12,
    backgroundColor: "#F5F5F7",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginRight: 12,
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 14,
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
    backgroundColor: "rgba(10, 132, 255, 0.03)",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
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
    backgroundColor: "#0F9D58",
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
    backgroundColor: "rgba(10, 132, 255, 0.08)",
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
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#0F9D58",
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
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubbleOwn: {
    backgroundColor: "#0F9D58",
  },
  bubbleOther: {
    backgroundColor: "#EAF2FF",
  },
  messageText: {
    color: "#1F2937",
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
    color: "#6B7280",
    marginTop: 6,
    alignSelf: "flex-start",
  },
  timeOwn: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    alignSelf: "flex-end",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0F9D58",
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
