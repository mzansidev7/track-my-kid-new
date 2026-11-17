import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

type SupportChat = {
  id: string;
  user_id: string;
  status: string;
  last_message_at: string | null;
  users?: { name?: string; email?: string } | null;
};
type SupportMessage = {
  id: string;
  sender_id: string | null;
  sender_role: string;
  message: string;
  created_at: string;
};

export default function SupportLiveChat() {
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    if (!token) {
      setError("Your session has expired. Sign in again.");
      setLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/support/live-chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load chats.");
      const nextChats = Array.isArray(data) ? data : [];
      setChats(nextChats);
      setSelectedChat((current) =>
        current ? nextChats.find((chat: SupportChat) => chat.id === current.id) || null : current,
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chats.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadChats();
      const timer = setInterval(() => void loadChats(), 10000);
      return () => clearInterval(timer);
    }, [loadChats]),
  );

  const loadMessages = useCallback(async (sessionId: string) => {
    if (!token) return;
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/support/live-chats/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load messages.");
      setMessages(Array.isArray(data) ? data : []);
    } catch (loadError) {
      Alert.alert("Chat unavailable", loadError instanceof Error ? loadError.message : "Please try again.");
    }
  }, [token]);

  useEffect(() => {
    if (!selectedChat) return;
    const initialLoad = setTimeout(() => void loadMessages(selectedChat.id), 0);
    const refreshTimer = setInterval(() => void loadMessages(selectedChat.id), 5000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(refreshTimer);
    };
  }, [loadMessages, selectedChat]);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!selectedChat || !token || !message || sending) return;
    setSending(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/support/live-chats/${selectedChat.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to send message.");
      setMessages((current) => [...current, data]);
      setDraft("");
    } catch (sendError) {
      Alert.alert("Message not sent", sendError instanceof Error ? sendError.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => void loadChats()} style={styles.iconButton} accessibilityLabel="Refresh support chats">
          <MaterialIcons name="refresh" size={21} color="#16853B" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>One-to-one chats</Text>
          <Text style={styles.subtitle}>Requests assigned to your support account</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#16853B" style={styles.loader} />
      ) : (
        <View style={styles.body}>
          <FlatList
            style={styles.chatList}
            data={chats}
            keyExtractor={(chat) => chat.id}
            ListEmptyComponent={
              <Text style={styles.emptyList}>No one-to-one chat requests yet.</Text>
            }
            renderItem={({ item }) => {
              const name = item.users?.name || item.users?.email || "Client";
              return (
                <TouchableOpacity
                  onPress={() => {
                    setMessages([]);
                    setSelectedChat(item);
                  }}
                  style={[styles.chatRow, selectedChat?.id === item.id && styles.selectedChatRow]}
                >
                  <View style={styles.chatAvatar}><MaterialIcons name="person" size={21} color="#16853B" /></View>
                  <View style={styles.chatCopy}>
                    <Text numberOfLines={1} style={styles.clientName}>{name}</Text>
                    <Text style={styles.chatStatus}>{item.status.replaceAll("_", " ")}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          {selectedChat ? (
            <KeyboardAvoidingView
              style={styles.conversation}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationTitle}>
                  {selectedChat.users?.name || selectedChat.users?.email || "Client"}
                </Text>
                <Text style={styles.chatStatus}>{selectedChat.status.replaceAll("_", " ")}</Text>
              </View>
              <FlatList
                style={styles.messageList}
                data={messages}
                keyExtractor={(message) => message.id}
                ListEmptyComponent={<Text style={styles.emptyList}>No messages yet. Say hello to start the chat.</Text>}
                renderItem={({ item }) => {
                  const isMine = item.sender_role === "support";
                  return (
                    <View style={[styles.bubble, isMine ? styles.agentBubble : styles.clientBubble]}>
                      <Text style={[styles.messageText, isMine && styles.agentMessageText]}>{item.message}</Text>
                    </View>
                  );
                }}
              />
              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Reply to the client..."
                  multiline
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => void sendMessage()}
                  disabled={sending || !draft.trim()}
                  style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}
                  accessibilityLabel="Send reply"
                >
                  <MaterialIcons name="send" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.noChat}>
              <MaterialIcons name="chat" size={36} color="#9AA79E" />
              <Text style={styles.emptyList}>Select a chat request to view the conversation.</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F7FAF8", flex: 1 },
  header: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#E3ECE5", borderBottomWidth: 1, flexDirection: "row", gap: 12, padding: 15 },
  headerCopy: { flex: 1 },
  title: { color: "#173322", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#718078", fontSize: 12, marginTop: 3 },
  iconButton: { alignItems: "center", backgroundColor: "#EAF6ED", borderRadius: 11, height: 40, justifyContent: "center", width: 40 },
  body: { flex: 1 },
  chatList: { flexGrow: 0, maxHeight: 220 },
  chatRow: { alignItems: "center", borderBottomColor: "#E6EDE8", borderBottomWidth: 1, flexDirection: "row", padding: 12 },
  selectedChatRow: { backgroundColor: "#EAF6ED" },
  chatAvatar: { alignItems: "center", backgroundColor: "#EAF6ED", borderRadius: 19, height: 38, justifyContent: "center", marginRight: 10, width: 38 },
  chatCopy: { flex: 1 },
  clientName: { color: "#173322", fontSize: 13, fontWeight: "700" },
  chatStatus: { color: "#6C7B72", fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  emptyList: { color: "#718078", fontSize: 13, lineHeight: 19, padding: 18, textAlign: "center" },
  conversation: { flex: 1 },
  conversationHeader: { backgroundColor: "#FFFFFF", borderBottomColor: "#E3ECE5", borderBottomWidth: 1, paddingHorizontal: 15, paddingVertical: 10 },
  conversationTitle: { color: "#173322", fontSize: 14, fontWeight: "700" },
  messageList: { flex: 1, paddingHorizontal: 14 },
  bubble: { borderRadius: 14, marginVertical: 5, maxWidth: "82%", paddingHorizontal: 12, paddingVertical: 9 },
  agentBubble: { alignSelf: "flex-end", backgroundColor: "#16853B", borderBottomRightRadius: 4 },
  clientBubble: { alignSelf: "flex-start", backgroundColor: "#E8EEE9", borderBottomLeftRadius: 4 },
  messageText: { color: "#203128", fontSize: 13, lineHeight: 18 },
  agentMessageText: { color: "#FFFFFF" },
  composer: { alignItems: "flex-end", backgroundColor: "#FFFFFF", borderTopColor: "#E3ECE5", borderTopWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  input: { backgroundColor: "#F6FAF7", borderColor: "#DDE8E0", borderRadius: 12, borderWidth: 1, color: "#173322", flex: 1, maxHeight: 100, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 },
  sendButton: { alignItems: "center", backgroundColor: "#16853B", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  disabled: { opacity: 0.55 },
  noChat: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  loader: { marginTop: 45 },
  error: { color: "#B42318", paddingHorizontal: 15, paddingTop: 10 },
});
