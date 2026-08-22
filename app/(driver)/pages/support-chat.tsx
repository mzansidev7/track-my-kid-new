import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import { AuthContext } from "@/context/authContext/auth-context";
import { client } from "@/supabaseConfig/supabaseConfig";
import {
  ensureUserLiveChatSession,
  fetchLiveChatMessages,
  sendLiveChatMessage,
  subscribeToLiveChatMessages,
} from "@/store/subscriptions/liveChatRealtime";

const SupportChatPage = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const currentUserId = user?.userData?.id || user?.id;
  const currentUserRole = (
    user?.userData?.role ||
    user?.role ||
    "driver"
  ).toLowerCase();

  useEffect(() => {
    const initializeChat = async () => {
      if (!currentUserId) {
        return;
      }

      const activeSession = await ensureUserLiveChatSession(
        currentUserId,
        currentUserRole,
      );
      if (!activeSession?.id) {
        return;
      }

      setSessionId(activeSession.id);
      const sessionMessages = await fetchLiveChatMessages(activeSession.id);
      setMessages(sessionMessages);

      const channel = subscribeToLiveChatMessages(
        activeSession.id,
        (nextMessages) => {
          setMessages(nextMessages);
        },
      );

      return () => {
        if (channel) {
          client.removeChannel(channel);
        }
      };
    };

    let cleanup: (() => void) | undefined;

    initializeChat().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentUserId]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!currentUserId || !sessionId) {
      Alert.alert("Not ready", "Your chat session is not ready yet.");
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    setIsSending(true);

    try {
      const sentMessage = await sendLiveChatMessage({
        sessionId,
        userId: currentUserId,
        userRole: currentUserRole,
        message: trimmedMessage,
      });

      if (!sentMessage) {
        Alert.alert(
          "Unable to send",
          "Your message could not be sent right now.",
        );
        return;
      }

      setMessage("");
      setMessages((currentMessages) => [...currentMessages, sentMessage]);
    } catch (error: any) {
      console.error("Send live chat message error:", error);
      Alert.alert("Unable to send", error?.message || "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DriverHeader
        title="Support Chat"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
      >
        {messages.length === 0 ? (
          <Text style={styles.emptyState}>
            Start the conversation with support.
          </Text>
        ) : (
          messages.map((item) => {
            const isUser =
              item.sender_role === currentUserRole ||
              item.sender_id === currentUserId;

            return (
              <View
                key={item.id}
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.supportBubble,
                ]}
              >
                <Text style={[styles.messageText, isUser && styles.userText]}>
                  {item.message}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#061A3A",
  },
  supportBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 14,
    color: "#111827",
  },
  userText: {
    color: "#fff",
  },
  emptyState: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#061A3A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default SupportChatPage;
