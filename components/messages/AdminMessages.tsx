import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../styles/theme";
import { resolveWorkingBaseUrl } from "../../url";
import { client as supabase } from "../../supabaseConfig/supabaseConfig";
import {
  cacheConversations,
  cacheMessages,
  getCachedConversations,
  getCachedMessages,
} from "../../store/asyncStorage/messages.asyncStore";
import {
  getMessagePreview,
  MessageAttachment,
  parseMessageAttachment,
} from "./MessageAttachment";
import MessageComposer from "./MessageComposer";
import MessageReactions from "./MessageReactions";
import GroupChatMenu from "./GroupChatMenu";
import GroupSenderAvatar from "./GroupSenderAvatar";
import PresenceDot from "../presence/PresenceDot";
import PresenceStatus from "../presence/PresenceStatus";

type Participant = {
  id?: string;
  name?: string;
  role?: string;
  avatar?: string | null;
};

type Conversation = {
  id: string;
  conversation_type?: string;
  group_name?: string | null;
  anchor_user_id?: string | null;
  can_manage_group?: boolean;
  is_group_conversation?: boolean;
  is_linked_conversation?: boolean;
  participant?: Participant;
  participants?: Participant[];
  last_message?: Message | null;
  last_message_at?: string;
  unread_count?: number;
};

type Message = {
  id: string;
  content?: string;
  sender_id?: string;
  sent_at?: string;
  is_read?: boolean;
  deliveryError?: boolean;
  users?: Participant;
  reactions?: {
    emoji: string;
    count: number;
    userIds: string[];
    reactedByMe?: boolean;
  }[];
};

type AdminMessagesProps = {
  token: string;
  adminUserId: string;
  initialChatId?: string;
  initialConversationType?: string;
  initialConversationLabel?: string;
  initialConversationAvatar?: string;
};

const ACCENT = "#2563EB";
const LINKED_TYPES = new Set([
  "client_driver",
  "client_owner",
  "driver_owner",
  "client_school",
  "owner_school",
  "driver_school",
  "school_staff",
]);

const FILTERS = [
  { key: "all", label: "All" },
  { key: "support", label: "Support" },
  { key: "groups", label: "Groups" },
  { key: "linked", label: "Linked" },
] as const;

type ConversationFilter = (typeof FILTERS)[number]["key"];

const requestAdmin = async <T,>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> => {
  const baseUrl = await resolveWorkingBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result?.message || result?.error || "The request could not be completed.",
    );
  }
  return result as T;
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const conversationType = (conversation: Conversation) =>
  conversation.conversation_type || "";

const isLinkedConversation = (conversation: Conversation) =>
  conversation.is_linked_conversation === true ||
  LINKED_TYPES.has(conversationType(conversation));

const conversationParticipant = (conversation: Conversation): Participant =>
  conversation.participant || {
    name: conversation.group_name || "Group chat",
    role: conversation.is_group_conversation ? "group" : "contact",
  };

const AdminMessages = ({
  token,
  adminUserId,
  initialChatId,
  initialConversationType,
  initialConversationLabel,
  initialConversationAvatar,
}: AdminMessagesProps) => {
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = ACCENT;
  const background = isDark ? "#101827" : "#F4F7FB";
  const surface = isDark ? "#1F2937" : "#FFFFFF";
  const surfaceAlt = isDark ? "#263449" : "#EFF6FF";
  const border = isDark ? "#374151" : "#DCE5F0";
  const text = isDark ? "#F3F4F6" : "#172B4D";
  const muted = isDark ? "#A7B4C7" : "#64748B";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialChatId || "",
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [sending, setSending] = useState(false);
  const messageScrollRef = useRef<ScrollView>(null);
  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (
      conversations.find((item) => item.id === selectedConversationId) || {
        id: selectedConversationId,
        conversation_type: initialConversationType,
        is_linked_conversation: LINKED_TYPES.has(
          initialConversationType || "",
        ),
        participant: {
          name: initialConversationLabel || "Conversation",
          role: initialConversationType,
          avatar: initialConversationAvatar || null,
        },
      }
    );
  }, [
    conversations,
    initialConversationAvatar,
    initialConversationLabel,
    initialConversationType,
    selectedConversationId,
  ]);

  const loadConversations = useCallback(
    async (refresh = false) => {
      if (!token) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        return;
      }
      if (refresh) setRefreshing(true);
      setError("");
      try {
        const rows = await requestAdmin<Conversation[]>(
          "/admin/conversations",
          token,
        );
        if (!Array.isArray(rows)) {
          throw new Error("The conversations response was invalid.");
        }
        const sorted = [...rows].sort(
          (first, second) =>
            new Date(second.last_message_at || "").getTime() -
            new Date(first.last_message_at || "").getTime(),
        );
        setConversations(sorted);
        if (adminUserId) await cacheConversations(sorted, adminUserId);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load conversations.";
        setError(message);
        console.error("Could not load Admin conversations:", loadError);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminUserId, token],
  );

  useEffect(() => {
    let active = true;
    const loadCachedFirst = async () => {
      if (adminUserId) {
        const cached = await getCachedConversations(adminUserId);
        if (active && cached.length) {
          setConversations(cached as Conversation[]);
          setLoading(false);
        }
      }
      if (active) void loadConversations();
    };
    void loadCachedFirst();

    const channel = supabase
      .channel(`admin-messages-inbox-${adminUserId || "session"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void loadConversations(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void loadConversations(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "Admin messaging realtime is unavailable; periodic refresh remains active.",
            status,
          );
        }
      });
    const interval = setInterval(() => void loadConversations(), 25_000);

    return () => {
      active = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [adminUserId, loadConversations]);

  const getMessagesEndpoint = useCallback((conversation: Conversation) => {
    const id = encodeURIComponent(conversation.id);
    if (LINKED_TYPES.has(conversationType(conversation))) {
      return `/admin/linked-conversations/${id}/messages`;
    }
    if (conversationType(conversation) === "admin_driver") {
      return `/admin/driver-conversations/${id}/messages`;
    }
    return `/admin/user-conversations/${id}/messages`;
  }, []);

  const refreshMessages = useCallback(
    async (conversation: Conversation) => {
      const result = await requestAdmin<Message[]>(
        getMessagesEndpoint(conversation),
        token,
      );
      if (!Array.isArray(result)) {
        throw new Error("The conversation messages response was invalid.");
      }
      setMessages(result);
      setMessageError("");
      await cacheMessages(conversation.id, result);
    },
    [getMessagesEndpoint, token],
  );

  useEffect(() => {
    if (!selectedConversation) return undefined;
    let active = true;
    const conversation = selectedConversation;
    const refresh = () =>
      refreshMessages(conversation).catch((refreshError) => {
        if (!active) return;
        setMessageError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh messages.",
        );
        console.error("Could not refresh Admin conversation:", refreshError);
      });

    const loadThread = async () => {
      setLoadingMessages(true);
      setMessageError("");
      const cached = await getCachedMessages(conversation.id);
      if (active && cached.length) {
        setMessages(cached as Message[]);
        setLoadingMessages(false);
      }
      try {
        await refreshMessages(conversation);
      } catch (loadError) {
        if (active) {
          setMessageError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this conversation.",
          );
        }
        console.error("Could not load Admin conversation:", loadError);
      } finally {
        if (active) setLoadingMessages(false);
      }
    };
    void loadThread();

    const channel = supabase
      .channel(`admin-messages-thread-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        refresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "Admin message updates are unavailable in realtime; periodic refresh remains active.",
            status,
          );
        }
      });
    const interval = setInterval(refresh, 20_000);

    return () => {
      active = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [refreshMessages, selectedConversation, token]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const linked = isLinkedConversation(conversation);
      const type = conversationType(conversation);
      const group =
        conversation.is_group_conversation === true ||
        type === "admin_group" ||
        type === "school_group";
      if (
        filter === "support" &&
        !["admin_user", "admin_driver"].includes(type)
      ) {
        return false;
      }
      if (filter === "groups" && !group) return false;
      if (filter === "linked" && !linked) return false;
      if (unreadOnly && Number(conversation.unread_count || 0) < 1) {
        return false;
      }
      if (!normalized) return true;
      const participant = conversationParticipant(conversation);
      return [
        participant.name,
        participant.role,
        conversation.group_name,
        getMessagePreview(conversation.last_message?.content),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [conversations, filter, query, unreadOnly]);

  const openConversation = (conversation: Conversation) => {
    setMessages([]);
    setSelectedConversationId(conversation.id);
  };

  const closeConversation = () => {
    setSelectedConversationId("");
    setMessages([]);
    setMessageError("");
    if (initialChatId) {
      router.setParams({
        chatId: undefined,
        conversationType: undefined,
        conversationLabel: undefined,
        conversationAvatar: undefined,
      } as never);
    }
  };

  const sendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim() || sending) return false;
    const currentId = selectedConversation.id;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content,
      sender_id: adminUserId,
      sent_at: new Date().toISOString(),
      is_read: false,
      users: { name: "You", role: "admin" },
    };
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);
    try {
      const type = conversationType(selectedConversation);
      const path =
        type === "admin_driver"
          ? `/admin/driver-conversations/${encodeURIComponent(currentId)}/messages`
          : `/admin/user-conversations/${encodeURIComponent(currentId)}/messages`;
      await requestAdmin(path, token, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      await refreshMessages(selectedConversation);
      return true;
    } catch (sendError) {
      console.error("Could not send Admin message:", sendError);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
      Alert.alert(
        "Message not sent",
        sendError instanceof Error
          ? sendError.message
          : "Please try sending your message again.",
      );
      return false;
    } finally {
      setSending(false);
    }
  };

  const activeConversation = selectedConversation;
  const activeParticipant = activeConversation
    ? conversationParticipant(activeConversation)
    : null;
  const readOnly = activeConversation
    ? isLinkedConversation(activeConversation)
    : false;
  const useDriverEndpoint =
    activeConversation?.conversation_type === "admin_driver";
  const conversationId = activeConversation?.id || "";

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safe,
        {
          backgroundColor: background,
          paddingBottom: 58 + Math.max(insets.bottom, 12),
        },
      ]}
    >
      {activeConversation && activeParticipant ? (
        <>
          <View
            style={[
              styles.threadHeader,
              { backgroundColor: surface, borderBottomColor: border },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to conversations"
              onPress={closeConversation}
              style={[styles.backButton, { backgroundColor: surfaceAlt }]}
            >
              <MaterialIcons name="arrow-back" size={21} color={accent} />
            </TouchableOpacity>
            <View style={[styles.avatar, { backgroundColor: surfaceAlt }]}>
              {activeParticipant.avatar ? (
                <Image
                  source={{ uri: activeParticipant.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: accent }]}>
                  {initials(activeParticipant.name)}
                </Text>
              )}
              {activeParticipant.role !== "group" ? (
                <PresenceDot userId={activeParticipant.id} />
              ) : null}
            </View>
            <View style={styles.headerIdentity}>
              <Text style={[styles.threadName, { color: text }]} numberOfLines={1}>
                {activeParticipant.name || "Conversation"}
              </Text>
              <Text style={[styles.threadRole, { color: muted }]} numberOfLines={1}>
                {activeParticipant.role === "group"
                  ? `${activeConversation.participants?.length || 0} members · Group chat`
                  : activeParticipant.role || "Contact"}
              </Text>
              {activeParticipant.role !== "group" ? (
                <PresenceStatus userId={activeParticipant.id} />
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refresh messages"
              onPress={() => void refreshMessages(activeConversation)}
              style={[styles.iconButton, { backgroundColor: surfaceAlt }]}
            >
              <MaterialIcons name="refresh" size={20} color={accent} />
            </TouchableOpacity>
            {["admin_group", "school_group"].includes(
              activeConversation.conversation_type || "",
            ) ? (
              <GroupChatMenu
                key={activeConversation.id}
                conversation={activeConversation}
                role="admin"
                token={token}
                currentUserId={adminUserId}
                onRemoved={() => {
                  closeConversation();
                  void loadConversations(true);
                }}
                onUpdated={() => void loadConversations(true)}
                iconColor={accent}
              />
            ) : null}
          </View>

          {readOnly ? (
            <View style={[styles.readOnlyNotice, { backgroundColor: surfaceAlt }]}>
              <MaterialIcons name="visibility" size={16} color={accent} />
              <Text style={[styles.readOnlyText, { color: muted }]}>
                Read-only review · messages are not marked as read
              </Text>
            </View>
          ) : null}
          {messageError ? (
            <TouchableOpacity
              style={styles.errorNotice}
              onPress={() => void refreshMessages(activeConversation)}
            >
              <MaterialIcons name="error-outline" size={17} color="#B91C1C" />
              <Text style={styles.errorText} numberOfLines={2}>
                {messageError}
              </Text>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
          {loadingMessages && messages.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.mutedText, { color: muted }]}>
                Loading messages…
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={messageScrollRef}
              style={{ flex: 1, backgroundColor: background }}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                messageScrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.length === 0 ? (
                <View style={styles.emptyThread}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: surfaceAlt },
                    ]}
                  >
                    <MaterialIcons
                      name="forum"
                      size={27}
                      color={accent}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: text }]}>
                    No messages yet
                  </Text>
                  <Text style={[styles.mutedText, { color: muted }]}>
                    Send a message to start the conversation.
                  </Text>
                </View>
              ) : (
                messages.map((message) => {
                  const own = String(message.sender_id) === adminUserId;
                  const canReact = ["admin_user", "admin_group"].includes(
                    conversationType(activeConversation),
                  );
                  const attachment = parseMessageAttachment(
                    message.content || "",
                  );
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        own && styles.messageRowOwn,
                      ]}
                    >
                      {!own &&
                      ["admin_group", "school_group"].includes(
                        conversationType(activeConversation),
                      ) ? (
                        <GroupSenderAvatar
                          name={message.users?.name}
                          avatar={message.users?.avatar}
                          userId={message.sender_id}
                        />
                      ) : !own && message.users?.avatar ? (
                        <View style={styles.senderAvatarContainer}>
                          <Image
                            source={{ uri: message.users.avatar }}
                            style={styles.senderAvatar}
                          />
                          <PresenceDot userId={message.sender_id} />
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.messageGroup,
                          own && styles.messageGroupOwn,
                        ]}
                      >
                      <View
                        style={[
                          styles.messageBubble,
                          {
                            backgroundColor: own ? accent : surface,
                            borderColor: own ? accent : border,
                          },
                          own && styles.messageBubbleOwn,
                        ]}
                      >
                        {!own ? (
                          <Text style={[styles.messageSender, { color: accent }]}>
                            {message.users?.name || "Participant"}
                          </Text>
                        ) : null}
                        {attachment ? (
                          <MessageAttachment
                            content={message.content || ""}
                            isOwn={own}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.messageText,
                              { color: own ? "#FFFFFF" : text },
                            ]}
                          >
                            {message.content}
                          </Text>
                        )}
                        {message.deliveryError ? (
                          <Text style={styles.deliveryError}>
                            Message not sent
                          </Text>
                        ) : null}
                        <View style={styles.messageFooter}>
                          <Text
                            style={[
                              styles.messageTime,
                              { color: own ? "#DBEAFE" : muted },
                            ]}
                          >
                            {formatTime(message.sent_at)}
                            {own
                              ? message.deliveryError
                                ? " · Not sent"
                                : message.is_read
                                  ? " · ✓✓"
                                  : " · ✓"
                              : ""}
                          </Text>
                        </View>
                      {!message.deliveryError &&
                      (own || (canReact && !readOnly)) ? (
                        <MessageReactions
                          apiBaseUrl=""
                          role="admin"
                          reactionEndpoint={
                            !own && canReact
                              ? `/admin/user-conversations/${encodeURIComponent(
                                  conversationId,
                                )}/messages/${encodeURIComponent(
                                  message.id,
                                )}/reactions`
                              : undefined
                          }
                          conversationId={conversationId}
                          messageId={message.id}
                          token={token}
                          currentUserId={adminUserId}
                          accentColor={accent}
                          reactions={message.reactions}
                          isOwn={own || readOnly || !canReact}
                        />
                      ) : null}
                      </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {!readOnly ? (
              <MessageComposer
                apiBaseUrl=""
                role="admin"
                conversationId={conversationId}
                token={token}
                accentColor={accent}
                messageEndpoint={
                  useDriverEndpoint
                    ? `/admin/driver-conversations/${encodeURIComponent(
                        conversationId,
                      )}/messages`
                    : `/admin/user-conversations/${encodeURIComponent(
                        conversationId,
                      )}/messages`
                }
                attachmentEndpoint={
                  useDriverEndpoint
                    ? `/admin/driver-conversations/${encodeURIComponent(
                        conversationId,
                      )}/attachments`
                    : `/admin/user-conversations/${encodeURIComponent(
                        conversationId,
                      )}/attachments`
                }
                onSendText={sendMessage}
                onSent={() => refreshMessages(activeConversation)}
                disabled={sending}
              />
          ) : null}
          </KeyboardAvoidingView>
        </>
      ) : (
        <>
          <View
            style={[
              styles.inboxHeader,
              { backgroundColor: surface, borderBottomColor: border },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: surfaceAlt }]}
            >
              <MaterialIcons name="arrow-back" size={21} color={accent} />
            </TouchableOpacity>
            <View style={styles.inboxTitleWrap}>
              <Text style={[styles.inboxTitle, { color: text }]}>Messages</Text>
              <Text style={[styles.inboxSubtitle, { color: muted }]}>
                Support conversations and participant messages
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refresh conversations"
              onPress={() => void loadConversations(true)}
              style={[styles.iconButton, { backgroundColor: surfaceAlt }]}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={accent} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inboxBody}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: surface, borderColor: border },
              ]}
            >
              <MaterialIcons name="search" size={21} color={muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search messages or people"
                placeholderTextColor={muted}
                style={[styles.searchInput, { color: text }]}
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                >
                  <MaterialIcons name="close" size={19} color={muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView
              horizontal
              style={styles.filterScroller}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? accent : surface,
                        borderColor: active ? accent : border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        { color: active ? "#FFFFFF" : muted },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setUnreadOnly((current) => !current)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: unreadOnly ? surfaceAlt : surface,
                    borderColor: unreadOnly ? accent : border,
                  },
                ]}
              >
                <MaterialIcons
                  name="mark-chat-unread"
                  size={14}
                  color={unreadOnly ? accent : muted}
                />
                <Text
                  style={[
                    styles.filterLabel,
                    { color: unreadOnly ? accent : muted },
                  ]}
                >
                  Unread
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {error ? (
              <TouchableOpacity
                style={styles.errorNotice}
                onPress={() => void loadConversations(true)}
              >
                <MaterialIcons name="error-outline" size={17} color="#B91C1C" />
                <Text style={styles.errorText} numberOfLines={2}>
                  {error}
                </Text>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.conversationCount, { color: muted }]}>
              {filteredConversations.length} conversations
            </Text>

            {loading && conversations.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={[styles.mutedText, { color: muted }]}>
                  Loading conversations…
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.conversationList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void loadConversations(true)}
                    tintColor={accent}
                  />
                }
              >
                {filteredConversations.length === 0 ? (
                  <View style={styles.emptyInbox}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: surfaceAlt },
                      ]}
                    >
                      <MaterialIcons
                        name="forum"
                        size={27}
                        color={accent}
                      />
                    </View>
                    <Text style={[styles.emptyTitle, { color: text }]}>
                      {conversations.length
                        ? "No matching conversations"
                        : "No conversations yet"}
                    </Text>
                    <Text style={[styles.mutedText, { color: muted }]}>
                      {conversations.length
                        ? "Try changing your search or filters."
                        : "Messages with users and linked participants will appear here."}
                    </Text>
                  </View>
                ) : (
                  filteredConversations.map((conversation) => {
                    const participant = conversationParticipant(conversation);
                    const unread = Number(conversation.unread_count || 0);
                    const type = conversationType(conversation);
                    const group =
                      conversation.is_group_conversation === true ||
                      type === "admin_group" ||
                      type === "school_group";
                    const lastMessage = conversation.last_message;
                    return (
                      <TouchableOpacity
                        key={conversation.id}
                        activeOpacity={0.78}
                        onPress={() => openConversation(conversation)}
                        style={[
                          styles.conversationCard,
                          { backgroundColor: surface, borderColor: border },
                        ]}
                      >
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: surfaceAlt },
                          ]}
                        >
                          {participant.avatar ? (
                            <Image
                              source={{ uri: participant.avatar }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.avatarInitials,
                                { color: accent },
                              ]}
                            >
                              {initials(participant.name)}
                            </Text>
                          )}
                          {participant.role !== "group" ? (
                            <PresenceDot
                              userId={participant.id}
                              showOffline
                            />
                          ) : null}
                        </View>
                        <View style={styles.conversationInfo}>
                          <View style={styles.conversationTopRow}>
                            <Text
                              style={[
                                styles.conversationName,
                                { color: text },
                              ]}
                              numberOfLines={1}
                            >
                              {participant.name || "Contact"}
                            </Text>
                            <Text style={[styles.conversationTime, { color: muted }]}>
                              {formatTime(
                                lastMessage?.sent_at ||
                                  conversation.last_message_at,
                              )}
                            </Text>
                          </View>
                          <View style={styles.conversationTypeRow}>
                            <Text
                              style={[
                                styles.conversationType,
                                { color: accent },
                              ]}
                              numberOfLines={1}
                            >
                              {group
                                ? "Group chat"
                                : isLinkedConversation(conversation)
                                  ? "Linked conversation"
                                  : type === "admin_driver"
                                    ? "Support · Driver"
                                    : "Support conversation"}
                            </Text>
                            {isLinkedConversation(conversation) ? (
                              <MaterialIcons
                                name="visibility"
                                size={13}
                                color={muted}
                              />
                            ) : null}
                          </View>
                          <View style={styles.previewRow}>
                            <Text
                              style={[styles.previewText, { color: muted }]}
                              numberOfLines={1}
                            >
                              {lastMessage
                                ? `${lastMessage.sender_id === adminUserId ? "You: " : ""}${getMessagePreview(lastMessage.content)}`
                                : "Start a conversation"}
                            </Text>
                            {unread > 0 ? (
                              <View
                                style={[
                                  styles.unreadBadge,
                                  { backgroundColor: accent },
                                ]}
                              >
                                <Text style={styles.unreadCount}>
                                  {unread > 99 ? "99+" : unread}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inboxTitleWrap: { flex: 1 },
  inboxTitle: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
  inboxSubtitle: { marginTop: 2, fontSize: 11 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxBody: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  searchBar: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 13 },
  filterScroller: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 4,
    marginBottom: 2,
  },
  filterRow: { alignItems: "center", gap: 7, paddingVertical: 7 },
  filterChip: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  filterLabel: { fontSize: 11, fontWeight: "800" },
  conversationCount: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  conversationList: { flex: 1 },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    marginBottom: 9,
  },
  avatar: {
    position: "relative",
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  avatarInitials: { fontSize: 14, fontWeight: "900" },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conversationName: { flex: 1, fontSize: 14, fontWeight: "800" },
  conversationTime: { fontSize: 10, fontWeight: "600" },
  conversationTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  conversationType: { fontSize: 10, fontWeight: "800" },
  previewRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  previewText: { flex: 1, fontSize: 11, lineHeight: 16 },
  unreadBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadCount: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  emptyInbox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 46,
  },
  emptyThread: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 5 },
  mutedText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIdentity: { flex: 1, minWidth: 0 },
  threadName: { fontSize: 15, fontWeight: "900" },
  threadRole: { marginTop: 2, fontSize: 10, textTransform: "capitalize" },
  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  readOnlyText: { fontSize: 10, fontWeight: "600" },
  errorNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: { flex: 1, color: "#991B1B", fontSize: 11 },
  retryText: { color: "#1D4ED8", fontSize: 10, fontWeight: "900" },
  threadContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 10,
  },
  messageRowOwn: { justifyContent: "flex-end" },
  messageGroup: { maxWidth: "84%", alignItems: "flex-start" },
  messageGroupOwn: { alignItems: "flex-end" },
  senderAvatar: { width: 27, height: 27, borderRadius: 14 },
  senderAvatarContainer: { position: "relative", marginRight: 7 },
  messageBubble: {
    maxWidth: "100%",
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 17,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 5,
  },
  messageSender: { fontSize: 10, fontWeight: "900", marginBottom: 4 },
  messageText: { fontSize: 13, lineHeight: 19 },
  messageFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 5,
  },
  messageTime: { fontSize: 9, fontWeight: "600" },
  deliveryError: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
});

export default AdminMessages;
