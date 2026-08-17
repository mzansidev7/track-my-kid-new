import { MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDrivers } from "../../../ownerHelpers/hooks/useDrivers";
import { useOwnerPageHeader } from "../../../ownerHelpers/hooks/useOwnerPageHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import AppNotification from "../../../components/Notification";
import { clearConversationsCache } from "../../../store/asyncStorage/messages.asyncStore";
import {
  ConversationData,
  fetchConversationsWithCache,
  fetchMessagesWithCache,
  subscribeToConversations,
  subscribeToMessages,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/messagesRealtime";
import { clearAuthToken } from "../../../supabaseConfig/supabaseConfig";
import { BASE_URL } from "../../../url";

interface Message {
  id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
  sender_id: string;
  users: {
    name: string;
    role: string;
  };
}

export default function Messages({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || "client";

  // Color scheme based on user role
  const bubbleColors =
    userRole === "driver"
      ? { primary: "#0A84FF", secondary: "#0066FF" }
      : userRole === "owner"
        ? { primary: "#34C759", secondary: "#20B94D" }
        : { primary: "#FF9F0A", secondary: "#FF7A00" };

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationData | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showDriversList, setShowDriversList] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "chat">("list"); // Mobile view mode
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const { drivers, loadingDrivers } = useDrivers();
  const { renderHeader } = useOwnerPageHeader({
    title: "Messages",
    subtitle: "",
  });
  const flatListRef = useRef<FlatList>(null);
  const conversationsChannelRef = useRef<any>(null);
  const messagesChannelRef = useRef<any>(null);

  const initializeConversations = useCallback(async () => {
    setLoading(true);
    try {
      const cachedConversations = await fetchConversationsWithCache(
        user?.userData?.id,
      );
      setConversations(cachedConversations);

      // Subscribe to real-time updates
      conversationsChannelRef.current = subscribeToConversations(
        user?.userData?.id,
        (updated) => setConversations(updated),
      );
    } catch (error) {
      console.error("Error initializing conversations:", error);
      setNotification({
        visible: true,
        message: "Failed to load conversations",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.userData?.id]);

  useEffect(() => {
    if (user?.userData?.id) {
      initializeConversations();
    }

    return () => {
      // Cleanup subscriptions on unmount
      if (conversationsChannelRef.current) {
        unsubscribeFromRealtime(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
      if (messagesChannelRef.current) {
        unsubscribeFromRealtime(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [user?.userData?.id, initializeConversations]);

  const initializeMessages = useCallback(
    async (conversationId: string) => {
      try {
        // Realtime subscriptions in this app should not receive the backend auth token.
        clearAuthToken();

        const cachedMessages = await fetchMessagesWithCache(conversationId);
        setMessages(cachedMessages);

        // Mark messages as read
        await markAsRead(conversationId);

        // Subscribe to real-time updates
        messagesChannelRef.current = subscribeToMessages(
          conversationId,
          (updated) => {
            setMessages(updated);
            // Scroll to bottom when new messages arrive (scroll to index 0 with inverted list)
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }, 50);
          },
        );

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        }, 50);
      } catch (error) {
        console.error("Error initializing messages:", error);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    if (selectedConversation) {
      initializeMessages(selectedConversation.id);
    }

    return () => {
      if (messagesChannelRef.current) {
        unsubscribeFromRealtime(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [selectedConversation, initializeMessages]);

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`${BASE_URL}/owner/conversations/${conversationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const startConversationWithDriver = async (
    driverUserId: string,
    driverName: string,
  ) => {
    try {
      const response = await fetch(`${BASE_URL}/owner/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          otherUserId: driverUserId,
          conversationType: "driver_owner",
        }),
      });

      const data = await response.json();

      if (response.ok && data.conversation_id) {
        // Clear cache to force fresh fetch
        await clearConversationsCache();

        // Fetch fresh conversations
        const updatedConversations = await fetchConversationsWithCache(
          user?.userData?.id,
        );

        // Update the conversations list
        setConversations(updatedConversations);

        // Find and select the new conversation
        const newConversation = updatedConversations.find(
          (conv: any) => conv.id === data.conversation_id,
        );

        if (newConversation) {
          setSelectedConversation(newConversation);
          setSelectedConversationId(newConversation.id);
          setViewMode("chat");
          const msgs = await fetchMessagesWithCache(newConversation.id);
          setMessages(msgs);

          setNotification({
            visible: true,
            message: `Started conversation with ${driverName}`,
            type: "success",
          });
        } else {
          console.warn(
            "Conversation created but not found in list:",
            data.conversation_id,
          );
          setNotification({
            visible: true,
            message: `Conversation started but unable to open`,
            type: "warning",
          });
        }

        setShowDriversList(false);
      } else {
        console.error("Failed to create conversation:", data);
        setNotification({
          visible: true,
          message: data.error || "Could not start conversation",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      setNotification({
        visible: true,
        message: "Failed to start conversation",
        type: "error",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${BASE_URL}/owner/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewMessage("");

        // Fallback: If realtime subscription doesn't fire within 2 seconds, manually refresh
        setTimeout(async () => {
          console.warn(
            "⚠️ Realtime didn't update - falling back to manual refresh",
          );
          try {
            const updated = await fetchMessagesWithCache(
              selectedConversation.id,
            );

            if (updated.length > messages.length) {
              setMessages(updated);
              // Scroll to latest message
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: 0,
                  animated: true,
                });
              }, 50);
            }
          } catch (err) {
            console.error("⚠️ Fallback refresh failed:", err);
          }
        }, 2000);
      } else {
        console.error(
          "❌ Failed to send message. Status:",
          response.status,
          "Data:",
          data,
        );
        setNotification({
          visible: true,
          message: `Failed to send message (${response.status})`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setNotification({
        visible: true,
        message: "Network error: Failed to send message",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const renderDriverItem = ({ item }: { item: any }) => {
    const conversationUserId = item.userId || item.id;
    const alreadyConversing = conversations.some(
      (conv) => conv.other_participant.id === conversationUserId,
    );

    return (
      <TouchableOpacity
        style={styles.driverListItem}
        onPress={() =>
          startConversationWithDriver(conversationUserId, item.name)
        }
        disabled={alreadyConversing}
      >
        <View style={styles.conversationIcon}>
          <View>
            {item?.avatar ? (
              <Image source={{ uri: item?.avatar }} style={styles.avatar} />
            ) : (
              <Text>{item?.name?.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationRole}>
            {alreadyConversing ? "Conversation exists" : "Start conversation"}
          </Text>
        </View>
        {!alreadyConversing && (
          <MaterialIcons name="add-circle-outline" size={24} color="#7ED321" />
        )}
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }: { item: ConversationData }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.selectedConversation,
      ]}
      onPress={() => {
        setSelectedConversation(item);
        setViewMode("chat"); // Switch to chat view on mobile
      }}
    >
      <View style={styles.conversationIcon}>
        {item.other_participant.profile?.avatar ? (
          <Image
            source={{ uri: item.other_participant.profile.avatar }}
            style={styles.avatar}
          />
        ) : (
          <Text>
            {item.other_participant.name.charAt(0).toUpperCase() || "?"}
          </Text>
        )}
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationName}>
          {item.other_participant.name}
        </Text>
        <Text style={styles.conversationRole}>
          {item.other_participant.role === "client"
            ? "Parent"
            : item.other_participant.role === "driver"
              ? "Driver"
              : "Owner"}
        </Text>
        {item.last_message && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message.sender_id === user?.userData?.id ? "You: " : ""}
            {item.last_message.content}
          </Text>
        )}
        <Text style={styles.messageTime}>
          {item.last_message
            ? new Date(item.last_message.sent_at).toLocaleDateString()
            : new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {item.last_message &&
        !item.last_message.is_read &&
        item.last_message.sender_id !== user?.userData?.id && (
          <View style={styles.unreadIndicator} />
        )}
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.userData?.id;
    const senderInitial = item.users?.name?.charAt(0).toUpperCase() || "?";
    const formattedTime = new Date(item.sent_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const isToday =
      new Date(item.sent_at).toDateString() === new Date().toDateString();
    const displayTime = isToday
      ? formattedTime
      : new Date(item.sent_at).toLocaleDateString();
    const driverAvatar = drivers.filter((d: any) => d.id === item.sender_id)[0]
      ?.avatar;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
        ]}
      >
        {/* Avatar for other messages */}
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {driverAvatar ? (
                <Image
                  source={{ uri: driverAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{senderInitial}</Text>
              )}
            </View>
          </View>
        )}

        {/* Message bubble with metadata */}
        <View
          style={
            isOwnMessage ? styles.ownMessageGroup : styles.otherMessageGroup
          }
        >
          {/* Message bubble */}

          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? {
                    backgroundColor: bubbleColors.primary,
                    shadowColor: bubbleColors.primary,
                  }
                : styles.otherBubble,
            ]}
          >
            {/* Sender name for group context */}
            {/* {!isOwnMessage && (
              <Text style={styles.senderName}>
                {item.users?.name || "Unknown"}
              </Text>
            )} */}

            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownText : styles.otherText,
              ]}
            >
              {item.content}
            </Text>
          </View>
          {/* Time and read status */}
          <View
            style={[
              styles.messageMetadata,
              isOwnMessage ? styles.ownMetadata : styles.otherMetadata,
            ]}
          >
            <Text style={styles.messageTime}>{displayTime}</Text>
            {isOwnMessage && (
              <Text style={styles.readReceipt}>
                {item.is_read ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7ED321" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}

      {viewMode === "list" ? (
        // Conversations List View
        <View style={styles.content}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !showDriversList && styles.tabActive]}
              onPress={() => setShowDriversList(false)}
            >
              <Text
                style={[
                  styles.tabText,
                  !showDriversList && styles.tabTextActive,
                ]}
              >
                Conversations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, showDriversList && styles.tabActive]}
              onPress={() => setShowDriversList(true)}
            >
              <Text
                style={[
                  styles.tabText,
                  showDriversList && styles.tabTextActive,
                ]}
              >
                Drivers
              </Text>
            </TouchableOpacity>
          </View>

          {showDriversList ? (
            loadingDrivers ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7ED321" />
              </View>
            ) : (
              <FlatList
                data={drivers}
                renderItem={renderDriverItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.conversationsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="drive-eta" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No drivers assigned</Text>
                  </View>
                }
              />
            )
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.conversationsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="chat" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No conversations yet</Text>
                  <Text style={styles.emptySubText}>
                    Start a conversation with a driver using the Drivers tab
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // Chat View
        <View style={styles.chatViewContainer}>
          {selectedConversation ? (
            <>
              <View style={styles.chatHeaderWithBack}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setViewMode("list")}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.chatHeaderInfo}>
                  <Text style={styles.chatTitle}>
                    {selectedConversation.other_participant.name}
                  </Text>
                  <Text style={styles.chatSubtitle}>
                    {selectedConversation.other_participant.role === "client"
                      ? "Parent"
                      : selectedConversation.other_participant.role === "driver"
                        ? "Driver"
                        : "Owner"}
                  </Text>
                </View>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                inverted
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                scrollsToTop={false}
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    flatListRef.current?.scrollToIndex({
                      index: 0,
                      animated: false,
                    });
                  }
                }}
              />

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.inputContainer}
              >
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || sending) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.noChatContainer}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={64}
                color="#ccc"
              />
              <Text style={styles.noChatText}>
                Select a conversation to start chatting
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    flexDirection: "column",
  },
  conversationsContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  conversationsList: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#999",
  },
  tabTextActive: {
    color: "#7ED321",
  },
  tabActive: {
    borderBottomColor: "#7ED321",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  driverListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedConversation: {
    backgroundColor: "#f0f8ff",
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  conversationRole: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7ED321",
  },
  chatViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
    flexDirection: "column",
  },
  chatHeaderWithBack: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  messagesList: {
    padding: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  ownMessageContainer: {
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7ED321",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 25,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  ownMessageGroup: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: "85%",
  },
  otherMessageGroup: {
    flex: 1,
    alignItems: "flex-start",
    maxWidth: "85%",
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
    overflow: "hidden",
  },
  otherBubble: {
    backgroundColor: "#f5f5f5",
    borderWidth: 0.5,
    borderColor: "#e8e8e8",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  ownText: {
    color: "#fff",
  },
  otherText: {
    color: "#2c2c2c",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    opacity: 0.7,
  },
  messageMetadata: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  ownMetadata: {
    justifyContent: "flex-end",
  },
  otherMetadata: {
    justifyContent: "flex-start",
  },
  //   messageTime: {
  //     fontSize: 11,
  //     color: "#999",
  //     fontWeight: "500",
  //   },
  readReceipt: {
    fontSize: 11,
    color: "#7ED321",
    fontWeight: "700",
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 0,
    borderTopColor: "transparent",
    backgroundColor: "#fff",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    maxHeight: 120,
    backgroundColor: "#f8f9fa",
    fontSize: 15,
    fontWeight: "500",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7ED321",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7ED321",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  noChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noChatText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
});
