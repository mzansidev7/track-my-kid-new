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
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  MessageAttachment,
  getMessagePreview,
  parseMessageAttachment,
} from "../../../components/messages/MessageAttachment";
import MessageComposer from "../../../components/messages/MessageComposer";
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
} from "../schoolHelpers/actionHelpers/actions";

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

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fresh = await fetchConversationsWithCache(userId, (cached) => {
        setConversations(cached);
        setLoading(false);
      });
      setConversations(fresh);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
    const channel = userId
      ? subscribeToConversations(userId, setConversations)
      : null;
    return () => {
      if (channel) unsubscribeFromRealtime(channel);
    };
  }, [loadConversations, userId]);

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
        setDraft("");
        setMessages(await fetchMessagesWithCache(selectedConversation.id));
        return true;
      }
      return false;
    } catch (err) {
      setSending(false);
      console.warn(err);
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
            <Avatar
              name={selectedConversation.other_participant?.name}
              color={colors.purple}
            />
            <View>
              <Text style={styles.chatName}>
                {selectedConversation.other_participant?.name || "Contact"}
              </Text>
              <Text style={styles.chatRole}>
                {getRoleLabel(selectedConversation.other_participant?.role)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <MaterialIcons name="more-vert" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>
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
            ListEmptyComponent={
              <EmptyState
                title="No messages yet"
                subtitle="Send the first message to start this conversation."
                icon="chat-bubble-outline"
              />
            }
            renderItem={({ item }) => {
              const own = item.sender_id === userId;
              const attachment = parseMessageAttachment(item.content);
              return (
                <View style={[styles.messageRow, own && styles.messageRowOwn]}>
                  <View
                    style={[
                      styles.bubble,
                      own ? styles.bubbleOwn : styles.bubbleOther,
                    ]}
                  >
                    {attachment ? (
                      <MessageAttachment content={item.content} isOwn={own} />
                    ) : (
                      <Text
                        style={
                          own ? styles.messageTextOwn : styles.messageText
                        }
                      >
                        {item.content}
                      </Text>
                    )}
                    <Text style={own ? styles.timeOwn : styles.time}>
                      {formatTime(item.sent_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
              <View style={styles.headerBadge}>
                <MaterialIcons name="chat" size={22} color={colors.blue} />
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
    </SafeAreaView>
  );
}

function Avatar({ name, color }: { name?: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.avatarText, { color }]}>{getInitials(name)}</Text>
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
      <Avatar name={item.other_participant?.name} color={colors.blue} />
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
  bubble: {
    maxWidth: "78%",
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
    marginTop: 4,
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
