import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { client } from "../../../supabaseConfig/supabaseConfig";
import {
  fetchLiveChatMessages,
  sendLiveChatMessage,
  subscribeToLiveChatMessages,
} from "../../../store/subscriptions/liveChatRealtime";

const ClientSupportChatPage = () => {
  const { sessionId: rawSessionId, memberName: rawMemberName } = useLocalSearchParams<{
    sessionId?: string;
    memberName?: string;
  }>();
  const { user } = useContext(AuthContext);
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const memberName = Array.isArray(rawMemberName) ? rawMemberName[0] : rawMemberName;
  const userId = user?.userData?.id || user?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const loadMessages = async () => {
      const initialMessages = await fetchLiveChatMessages(sessionId);
      if (active) setMessages(initialMessages);
    };
    void loadMessages();
    const channel = subscribeToLiveChatMessages(sessionId, (nextMessages) => {
      if (active) setMessages(nextMessages);
    });
    return () => {
      active = false;
      if (channel) void client.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const send = async () => {
    const message = draft.trim();
    if (!sessionId || !userId || !message || sending) return;
    setSending(true);
    try {
      const sent = await sendLiveChatMessage({
        sessionId,
        userId,
        userRole: "client",
        message,
      });
      if (!sent) throw new Error("Unable to send your message. Please try again.");
      setDraft("");
      setMessages((current) => [...current, sent]);
    } catch (error) {
      Alert.alert("Message not sent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader title="Support chat" subtitle={memberName ? `Chatting with ${memberName}` : "One-to-one support"} />
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
          {!messages.length ? (
            <View style={styles.empty}>
              <MaterialIcons name="chat-bubble-outline" size={32} color="#9AA79E" />
              <Text style={styles.emptyTitle}>Your chat request has been sent</Text>
              <Text style={styles.emptyText}>Send a message to start the conversation. The selected support member will be notified.</Text>
            </View>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_id === userId;
              return (
                <View key={message.id} style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMine && styles.myMessageText]}>{message.message}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Write a message..."
            placeholderTextColor="#89968E"
            style={styles.input}
            accessibilityLabel="Write a support message"
          />
          <TouchableOpacity
            onPress={() => void send()}
            disabled={sending || !draft.trim()}
            style={[styles.sendButton, (sending || !draft.trim()) && styles.disabled]}
            accessibilityLabel="Send support message"
          >
            <MaterialIcons name="send" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#07040B", flex: 1 },
  keyboardArea: { flex: 1 },
  messages: { flexGrow: 1, padding: 16 },
  empty: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  emptyTitle: { color: "#FBF8FF", fontSize: 15, fontWeight: "700", marginTop: 12, textAlign: "center" },
  emptyText: { color: "#718078", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  bubble: { borderRadius: 15, marginBottom: 10, maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 10 },
  myBubble: { alignSelf: "flex-end", backgroundColor: "#16853B", borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: "flex-start", backgroundColor: "#1C1026", borderBottomLeftRadius: 4 },
  messageText: { color: "#203128", fontSize: 14, lineHeight: 19 },
  myMessageText: { color: "#FFFFFF" },
  composer: { alignItems: "flex-end", backgroundColor: "#130D1A", borderTopColor: "#E3ECE5", borderTopWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  input: { backgroundColor: "#07040B", borderColor: "#352341", borderRadius: 13, borderWidth: 1, color: "#FBF8FF", flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10 },
  sendButton: { alignItems: "center", backgroundColor: "#16853B", borderRadius: 13, height: 44, justifyContent: "center", width: 46 },
  disabled: { opacity: 0.55 },
});

export default ClientSupportChatPage;
