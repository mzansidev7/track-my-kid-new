import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
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
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { CLIENT_COLORS } from "../../../styles/theme";
import { BASE_URL } from "../../../url";
import {
  fetchConversationsWithCache,
  fetchMessagesWithCache,
  subscribeToConversations,
  subscribeToMessages,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/messagesRealtime";

const tabs = ["All", "Groups", "Drivers", "Schools", "Owners"];

const getRoleColor = (role) => {
  void role;
  return CLIENT_COLORS.surfaceElevated;
};

const getInitials = (name = "") => {
  const clean = name.trim();
  if (!clean) return "?";

  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const formatConversationTime = (value) => {
  if (!value) return "Now";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Now";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Now";
  }
};

const ClientMessages = () => {
  const { user } = useContext(AuthContext);
  const userId = user?.userData?.id || user?.userData?.user_id || "";
  const [selectedTab, setSelectedTab] = useState("All");
  const [conversations, setConversations] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");

  const fetchConversations = useCallback(async () => {
    if (!user?.token || !userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchConversationsWithCache(
        userId,
        (cached) => {
          setConversations(cached);
          setLoading(false);
        },
        user.token,
      );
      setConversations(data);
    } catch (error) {
      console.error("Error loading client conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.token, userId]);

  const fetchLinkedContacts = useCallback(async () => {
    if (!user?.token) {
      setContactOptions([]);
      return;
    }

    try {
      const [driversRes, ownersRes, schoolsRes] = await Promise.all([
        fetch(`${BASE_URL}/client/linked-drivers`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BASE_URL}/client/linked-owners`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BASE_URL}/client/linked-schools`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      const [driversData, ownersData, schoolsData] = await Promise.all([
        driversRes.ok ? driversRes.json() : [],
        ownersRes.ok ? ownersRes.json() : [],
        schoolsRes.ok ? schoolsRes.json() : [],
      ]);

      const mappedDrivers = (Array.isArray(driversData) ? driversData : []).map(
        (driver) => ({
          id: driver?.users?.id || driver?.id,
          userId: driver?.users?.id || driver?.user_id,
          name: driver?.users?.name || "Driver",
          role: "driver",
          type: "client_driver",
          subtitle: driver?.vehicle_plate_number || "Driver",
        }),
      );

      const mappedOwners = (Array.isArray(ownersData) ? ownersData : []).map(
        (owner) => ({
          id: owner?.users?.id || owner?.id,
          userId: owner?.users?.id || owner?.user_id,
          name: owner?.company_name || owner?.users?.name || "Fleet owner",
          role: "owner",
          type: "client_owner",
          subtitle: owner?.company_name ? "Fleet owner" : owner?.users?.name,
        }),
      );

      const mappedSchools = (Array.isArray(schoolsData) ? schoolsData : []).map(
        (school) => ({
          id: school?.id,
          userId: school?.userId,
          name: school?.name || "School",
          role: "school",
          type: "client_school",
          subtitle: school?.address || school?.userName || "School contact",
        }),
      );

      setContactOptions([...mappedDrivers, ...mappedOwners, ...mappedSchools]);
    } catch (error) {
      console.error("Error loading linked contacts:", error);
      setContactOptions([]);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchConversations();
    fetchLinkedContacts();

    const conversationsChannel = userId
      ? subscribeToConversations(userId, setConversations, user?.token)
      : null;
    const refreshInterval = userId
      ? setInterval(() => void fetchConversations(), 20_000)
      : null;
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void fetchConversations();
      },
    );

    return () => {
      if (conversationsChannel) unsubscribeFromRealtime(conversationsChannel);
      if (refreshInterval) clearInterval(refreshInterval);
      appStateSubscription.remove();
    };
  }, [fetchConversations, fetchLinkedContacts, user?.token, userId]);

  const startConversation = async (contact) => {
    if (!contact?.userId || !contact?.type || !user?.token) {
      Alert.alert("Missing contact", "This contact cannot be messaged yet.");
      return;
    }

    try {
      setStartingConversation(true);
      const response = await fetch(`${BASE_URL}/client/conversations`, {
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

      setContactSheetVisible(false);
      await fetchConversations();
      Alert.alert(
        "Conversation started",
        `You can now message ${contact.name}.`,
      );
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert(
        "Message failed",
        error.message || "Unable to start conversation.",
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    try {
      const data = await fetchMessagesWithCache(conversation.id, (cached) => {
        setConversationMessages(cached);
        setLoadingMessages(false);
      });
      setConversationMessages(data);

      await fetch(`${BASE_URL}/client/conversations/${conversation.id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user?.token || ""}` },
      });
      await fetchConversations();
    } catch (error) {
      console.error("Error opening client conversation:", error);
      Alert.alert("Messages unavailable", "Unable to load this conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation) return undefined;

    const messagesChannel = subscribeToMessages(
      selectedConversation.id,
      setConversationMessages,
    );
    return () => {
      if (messagesChannel) unsubscribeFromRealtime(messagesChannel);
    };
  }, [selectedConversation]);

  const sendMessage = async (content = draft.trim()) => {
    if (!content || !selectedConversation || sending || !user?.token) {
      return false;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      sender_id: user?.userData?.id || user?.userData?.user_id || "",
      users: user?.userData,
    };
    setConversationMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSending(true);
    try {
      const response = await fetch(`${BASE_URL}/client/messages`, {
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
      if (!response.ok) throw new Error("Unable to send message");
      const freshMessages = await fetchMessagesWithCache(
        selectedConversation.id,
      );
      setConversationMessages(freshMessages);
      return true;
    } catch (error) {
      console.error("Error sending client message:", error);
      setConversationMessages((current) =>
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

  const visibleConversations = useMemo(() => {
    if (selectedTab === "All") return conversations;

    const roleMap = {
      Groups: "group",
      Drivers: "driver",
      Schools: "school",
      Owners: "owner",
    };

    return conversations.filter(
      (item) =>
        (item.other_participant?.role || "").toLowerCase() ===
        roleMap[selectedTab],
    );
  }, [conversations, selectedTab]);

  if (selectedConversation) {
    const participant = selectedConversation.other_participant || {};
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.chatBackButton}
            onPress={() => setSelectedConversation(null)}
            accessibilityLabel="Back to conversations"
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={CLIENT_COLORS.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.chatHeaderIdentity}>
            <View style={styles.chatAvatar}>
              {participant.role?.toLowerCase() === "admin" ? (
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={styles.chatAvatarImage}
                  resizeMode="contain"
                />
              ) : selectedConversation.conversation_type === "school_group" &&
                participant.avatar ? (
                <Image
                  source={{ uri: participant.avatar }}
                  style={styles.chatAvatarImage}
                  resizeMode="cover"
                />
              ) : participant.avatar || participant.profile?.avatar ? (
                <Image
                  source={{
                    uri: participant.avatar || participant.profile.avatar,
                  }}
                  style={styles.chatAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(participant.name)}
                </Text>
              )}
              {participant.role !== "group" ? (
                <PresenceDot userId={participant.id} />
              ) : null}
            </View>
            <View style={styles.chatHeaderText}>
              <Text style={styles.chatName} numberOfLines={1}>
                {participant.name || "Contact"}
              </Text>
              <View style={styles.chatHeaderMeta}>
                <Text style={styles.chatRole} numberOfLines={1}>
                  {participant.role === "school"
                    ? participant.school_name || "School"
                    : participant.role === "group"
                      ? "Group chat"
                      : participant.role || "Contact"}
                </Text>
                {participant.role !== "group" ? (
                  <PresenceStatus
                    userId={participant.id}
                    style={styles.chatPresenceStatus}
                  />
                ) : null}
              </View>
            </View>
          </View>
          {["admin_group", "school_group"].includes(
            selectedConversation.conversation_type,
          ) ? (
            <GroupChatMenu
              key={selectedConversation.id}
              conversation={selectedConversation}
              role="client"
              token={user?.token || ""}
              currentUserId={userId}
              onRemoved={() => {
                setSelectedConversation(null);
                setConversationMessages([]);
                void fetchConversations();
              }}
              onUpdated={() => void fetchConversations()}
              iconColor={CLIENT_COLORS.textPrimary}
            />
          ) : null}
        </View>

        <KeyboardAvoidingView
          style={styles.chatKeyboardArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {loadingMessages ? (
            <View style={styles.chatLoading}>
              <ActivityIndicator
                size="large"
                color={CLIENT_COLORS.primary}
              />
            </View>
          ) : (
            <ScrollView
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {conversationMessages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Text style={styles.emptyText}>No messages yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Send the first message to start this conversation.
                  </Text>
                </View>
              ) : (
                conversationMessages.map((message) => {
                  const own =
                    message.sender_id ===
                    (user?.userData?.id || user?.userData?.user_id);
                  const isGroupChat = ["admin_group", "school_group"].includes(
                    selectedConversation.conversation_type,
                  );
                  const attachment = parseMessageAttachment(message.content);
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.chatMessageRow,
                        own && styles.chatMessageRowOwn,
                      ]}
                    >
                      {!own &&
                      (isGroupChat ||
                        (selectedConversation.other_participant.role ===
                          "school" &&
                          message.sender_id ===
                            selectedConversation.other_participant.id)) ? (
                        <GroupSenderAvatar
                          name={message.users?.name}
                          avatar={message.users?.avatar}
                          userId={message.sender_id}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.chatMessageGroup,
                          own && styles.chatMessageGroupOwn,
                        ]}
                      >
                        {!own &&
                        !isGroupChat &&
                        selectedConversation.other_participant.role ===
                          "school" &&
                        message.sender_id ===
                          selectedConversation.other_participant.id ? (
                          <View style={styles.schoolSenderLabel}>
                            <Text style={styles.schoolSenderName}>
                              {message.users?.name ||
                                selectedConversation.other_participant.name}
                            </Text>
                            {selectedConversation.other_participant
                              .school_name ? (
                              <Text style={styles.schoolSenderSchool}>
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
                            styles.chatBubble,
                            own && styles.chatBubbleOwn,
                          ]}
                        >
                          <Pressable
                            onLongPress={() => {
                              if (!own) setReactionPickerMessageId(message.id);
                            }}
                            delayLongPress={250}
                          >
                            {attachment ? (
                              <MessageAttachment
                                content={message.content}
                                isOwn={own}
                              />
                            ) : (
                              <Text
                                style={
                                  own
                                    ? styles.chatMessageOwn
                                    : styles.chatMessage
                                }
                              >
                                {message.content}
                              </Text>
                            )}
                            <View
                              style={[
                                styles.chatFooter,
                                own && styles.chatFooterOwn,
                              ]}
                            >
                              <Text
                                style={
                                  own ? styles.chatTimeOwn : styles.chatTime
                                }
                              >
                                {formatConversationTime(message.sent_at)}
                                {own ? (message.is_read ? "  ✓✓" : "  ✓") : ""}
                              </Text>
                            </View>
                          </Pressable>
                          {message.deliveryError ? (
                            <Text style={styles.messageDeliveryError}>
                              Message not sent
                            </Text>
                          ) : null}
                        </View>
                        {!message.deliveryError &&
                        (!own || message.reactions?.length) ? (
                          <MessageReactions
                            apiBaseUrl={BASE_URL}
                            role="client"
                            conversationId={selectedConversation.id}
                            messageId={message.id}
                            token={user?.token || ""}
                            currentUserId={userId}
                            accentColor={CLIENT_COLORS.primary}
                            reactions={message.reactions}
                            isOwn={own}
                            longPressToReact
                            pickerOpen={reactionPickerMessageId === message.id}
                            onPickerOpenChange={(open) =>
                              setReactionPickerMessageId(open ? message.id : "")
                            }
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          <MessageComposer
            apiBaseUrl={BASE_URL}
            role="client"
            conversationId={selectedConversation.id}
            token={user?.token || ""}
            accentColor={CLIENT_COLORS.primary}
            onSendText={sendMessage}
            onSent={async () =>
              setConversationMessages(
                await fetchMessagesWithCache(selectedConversation.id),
              )
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader
        title="My Messages"
        subtitle="Schools, drivers and fleet owners"
      />
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={24}
            color={CLIENT_COLORS.textMuted}
          />
          <Text style={styles.searchText}>Search messages or contacts</Text>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons
              name="tune"
              size={22}
              color={CLIENT_COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {contactSheetVisible && (
          <View style={styles.contactSheet}>
            <View style={styles.contactHeaderRow}>
              <Text style={styles.contactTitle}>Start a conversation</Text>
              <TouchableOpacity onPress={() => setContactSheetVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={CLIENT_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {contactOptions.length === 0 ? (
              <Text style={styles.emptySubtext}>
                Link a driver, owner or school to start messaging.
              </Text>
            ) : (
              contactOptions.map((contact) => (
                <TouchableOpacity
                  key={`${contact.type}-${contact.userId || contact.id}`}
                  style={styles.contactItem}
                  onPress={() => startConversation(contact)}
                  disabled={startingConversation}
                >
                  <View
                    style={[
                      styles.contactAvatar,
                      { backgroundColor: getRoleColor(contact.role) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(contact.name)}
                    </Text>
                  </View>

                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactSubtitle}>
                      {contact.subtitle}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={CLIENT_COLORS.textMuted}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading conversations...</Text>
            </View>
          ) : visibleConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet.</Text>
              <Text style={styles.emptySubtext}>
                Conversations with support groups, schools, drivers, and fleet
                owners will appear here.
              </Text>
            </View>
          ) : (
            visibleConversations.map((item) => {
              const participant = item.other_participant || {};
              const role = (participant.role || "").toLowerCase();
              const lastMessage = item.last_message || {};
              const preview =
                getMessagePreview(lastMessage.content) ||
                "Start a conversation";
              const time = formatConversationTime(
                item.last_message_at || lastMessage.sent_at,
              );
              const unread =
                item.unread_count || (lastMessage.is_read === false ? 1 : 0);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.messageRow}
                  activeOpacity={0.8}
                  onPress={() => openConversation(item)}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getRoleColor(role) },
                    ]}
                  >
                    {role === "admin" ? (
                      <Image
                        source={require("@/assets/images/logo.png")}
                        style={styles.conversationAvatarImage}
                        resizeMode="contain"
                      />
                    ) : participant.avatar || participant.profile?.avatar ? (
                      <Image
                        source={{
                          uri: participant.avatar || participant.profile.avatar,
                        }}
                        style={styles.conversationAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getInitials(participant.name)}
                      </Text>
                    )}
                    {role !== "group" ? (
                      <PresenceDot userId={participant.id} showOffline />
                    ) : null}
                  </View>

                  <View style={styles.messageBody}>
                    <View style={styles.messageTopRow}>
                      <Text style={styles.senderName}>
                        {participant.name || "Unknown contact"}
                      </Text>
                      <Text style={styles.time}>{time}</Text>
                    </View>

                    <Text style={styles.messageTitle}>
                      {role === "group"
                        ? "Group chat"
                        : role === "driver"
                          ? "Driver update"
                          : role === "school"
                            ? item.other_participant?.school_name || "School"
                            : role === "owner"
                              ? "Fleet owner update"
                              : "Conversation"}
                    </Text>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewText} numberOfLines={1}>
                        {preview}
                      </Text>
                      {unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.ctaCard}>
            <View style={styles.ctaIconWrap}>
              <MaterialIcons name="chat" size={36} color="#fff" />
            </View>
            <Text style={styles.ctaTitle}>Need to start a conversation?</Text>
            <Text style={styles.ctaSub}>
              Message your driver, school or fleet owner anytime.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setContactSheetVisible((prev) => !prev)}
              disabled={startingConversation}
            >
              <MaterialIcons name="edit-square" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>New Message</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ClientMessages;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CLIENT_COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: CLIENT_COLORS.background,
    paddingHorizontal: 14,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CLIENT_COLORS.border,
    backgroundColor: CLIENT_COLORS.background,
  },
  chatKeyboardArea: {
    flex: 1,
  },
  chatBackButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
  },
  chatHeaderIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chatAvatar: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: CLIENT_COLORS.border,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    shadowColor: CLIENT_COLORS.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  chatAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  chatHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  chatName: {
    color: CLIENT_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  chatHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  chatRole: {
    color: CLIENT_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  chatPresenceStatus: {
    color: CLIENT_COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  chatSenderAvatarContainer: {
    position: "relative",
    alignSelf: "flex-start",
  },
  chatLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chatList: {
    flex: 1,
    backgroundColor: CLIENT_COLORS.background,
  },
  chatListContent: {
    padding: 14,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  chatEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  chatMessageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  chatMessageRowOwn: {
    justifyContent: "flex-end",
  },
  chatSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 7,
    marginTop: 2,
  },
  chatBubble: {
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: CLIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },
  chatBubbleOwn: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: CLIENT_COLORS.primary,
  },
  chatMessageGroup: {
    maxWidth: "82%",
    alignItems: "flex-start",
  },
  chatMessageGroupOwn: {
    alignItems: "flex-end",
  },
  schoolSenderLabel: {
    marginBottom: 4,
    paddingHorizontal: 3,
  },
  schoolSenderName: {
    color: CLIENT_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  schoolSenderSchool: {
    color: CLIENT_COLORS.textSecondary,
    fontSize: 10,
  },
  chatMessage: {
    color: CLIENT_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  chatMessageOwn: {
    color: CLIENT_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  chatTime: {
    color: CLIENT_COLORS.textSecondary,
    fontSize: 10,
  },
  chatTimeOwn: {
    color: CLIENT_COLORS.textPrimary,
    fontSize: 10,
    textAlign: "right",
  },
  chatFooter: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    maxWidth: "100%",
  },
  chatFooterOwn: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  messageDeliveryError: {
    marginTop: 5,
    color: CLIENT_COLORS.error,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: CLIENT_COLORS.border,
    backgroundColor: CLIENT_COLORS.background,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    borderRadius: 14,
    color: CLIENT_COLORS.textPrimary,
    fontSize: 13,
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: CLIENT_COLORS.primary,
  },
  sendButtonDisabled: {
    backgroundColor: CLIENT_COLORS.surfaceElevated,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 10,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: CLIENT_COLORS.textPrimary,
  },
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 25,
    lineHeight: 36,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    color: CLIENT_COLORS.textSecondary,
    fontWeight: "500",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    backgroundColor: CLIENT_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },
  searchText: {
    flex: 1,
    marginLeft: 10,
    color: CLIENT_COLORS.textSecondary,
    fontSize: 12,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: CLIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: CLIENT_COLORS.primaryBright,
    backgroundColor: CLIENT_COLORS.surfaceElevated,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: CLIENT_COLORS.textSecondary,
  },
  tabTextActive: {
    color: CLIENT_COLORS.textPrimary,
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  contactSheet: {
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
  },
  contactHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: CLIENT_COLORS.border,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: "700",
    color: CLIENT_COLORS.textPrimary,
  },
  contactSubtitle: {
    fontSize: 10,
    color: CLIENT_COLORS.textSecondary,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: CLIENT_COLORS.surface,
    borderWidth: 1,
    borderColor: CLIENT_COLORS.border,
    borderRadius: 16,
  },
  avatar: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  conversationAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
  },
  avatarText: {
    color: CLIENT_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  messageBody: {
    flex: 1,
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
  },
  time: {
    fontSize: 11,
    color: CLIENT_COLORS.textSecondary,
    fontWeight: "600",
  },
  messageTitle: {
    fontSize: 11,
    color: CLIENT_COLORS.primaryBright,
    fontWeight: "700",
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewText: {
    flex: 1,
    color: CLIENT_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: CLIENT_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  ctaCard: {
    backgroundColor: CLIENT_COLORS.surface,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 18,
  },
  ctaIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: CLIENT_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: "800",
    color: CLIENT_COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: 12,
    color: CLIENT_COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 14,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLIENT_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    width: "100%",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CLIENT_COLORS.background,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: CLIENT_COLORS.border,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    marginTop: 6,
    fontSize: 11,
    color: CLIENT_COLORS.textMuted,
    fontWeight: "600",
  },
  navTextActive: {
    color: CLIENT_COLORS.primaryBright,
    fontWeight: "800",
  },
});
