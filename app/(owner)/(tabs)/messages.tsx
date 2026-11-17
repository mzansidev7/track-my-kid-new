import { MaterialIcons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDrivers } from "@/app-support/owner/ownerHelpers/hooks/useDrivers";
import { AuthContext } from "../../../context/authContext/auth-context";
import AppNotification from "../../../components/Notification";
import {
  cacheConversations,
  clearConversationsCache,
  getCachedConversations,
  getCachedMessages,
} from "../../../store/asyncStorage/messages.asyncStore";
import {
  ConversationData,
  fetchMessagesWithCache,
  sortConversationsByLastMessage,
  subscribeToConversations,
  subscribeToMessages,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/messagesRealtime";
import { clearAuthToken } from "../../../supabaseConfig/supabaseConfig";
import { BASE_URL } from "../../../url";
import {
  getMessagePreview,
  MessageAttachment,
  parseMessageAttachment,
} from "../../../components/messages/MessageAttachment";
import EmojiPicker from "../../../components/messages/EmojiPicker";
import MessageReactions from "../../../components/messages/MessageReactions";
import GroupChatMenu from "../../../components/messages/GroupChatMenu";
import GroupSenderAvatar from "../../../components/messages/GroupSenderAvatar";
import PresenceDot from "../../../components/presence/PresenceDot";
import PresenceStatus from "../../../components/presence/PresenceStatus";

interface Message {
  id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
  sender_id: string;
  deliveryError?: boolean;
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
    reactedByMe?: boolean;
  }>;
  users: {
    name: string;
    role: string;
    avatar?: string | null;
  };
}

export default function Messages({ setActiveButton }: any) {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const userRole = user?.role || "client";
  const insets = useSafeAreaInsets();

  // Color scheme based on user role
  const bubbleColors =
    userRole === "driver"
      ? { primary: "#0A84FF", secondary: "#0066FF" }
      : userRole === "owner"
        ? { primary: "#00B894", secondary: "#087A62" }
        : { primary: "#FF9F0A", secondary: "#FF7A00" };

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<
    "all" | "unread" | "drivers" | "groups"
  >("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAttachmentActions, setShowAttachmentActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showDriversList, setShowDriversList] = useState(false);
  const [showSchoolsList, setShowSchoolsList] = useState(false);
  const [showParentsList, setShowParentsList] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
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
  useEffect(
    () => () => {
      setAudioModeAsync({ allowsRecording: false }).catch((error) => {
        console.error("Unable to reset audio mode on chat close:", error);
      });
    },
    [],
  );
  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.safeAreaHeader}>
      <View style={styles.mainHeader}>
        <View style={styles.brandIcon}>
          <MaterialIcons name="directions-car" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>FleetManager</Text>
          <Text style={styles.brandSubtitle}>Messages</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() =>
            Alert.alert("New conversation", "Choose who you want to message.", [
              {
                text: "Driver",
                onPress: () => {
                  setShowDriversList(true);
                  setShowSchoolsList(false);
                  setShowParentsList(false);
                },
              },
              {
                text: "School",
                onPress: () => {
                  setShowSchoolsList(true);
                  setShowDriversList(false);
                  setShowParentsList(false);
                },
              },
              {
                text: "Parent",
                onPress: () => {
                  setShowParentsList(true);
                  setShowDriversList(false);
                  setShowSchoolsList(false);
                },
              },
              { text: "Cancel", style: "cancel" },
            ])
          }
          accessibilityLabel="Start a new conversation"
        >
          <MaterialIcons name="person-add-alt-1" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => router.push("/(owner)/notifications")}
          accessibilityLabel="Open notifications"
        >
          <MaterialIcons name="notifications-none" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const loadSchools = useCallback(async () => {
    if (!user?.token) return;
    setLoadingSchools(true);
    try {
      const response = await fetch(`${BASE_URL}/owner/linked-schools`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      setSchools(response.ok && Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading linked schools:", error);
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  }, [user?.token]);

  const loadParents = useCallback(async () => {
    if (!user?.token) return;
    setLoadingParents(true);
    try {
      const response = await fetch(`${BASE_URL}/owner/linked-clients`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      const normalizedParents =
        response.ok && Array.isArray(data)
          ? data.map((item) => ({
              id: item?.clients?.user_id || item?.clients?.id || item?.id,
              userId: item?.clients?.user_id || item?.clients?.id || item?.id,
              name: item?.clients?.users?.name || "Parent",
              email: item?.clients?.users?.email || null,
              phone: item?.clients?.users?.phone || null,
              vehicleName: item?.vehicles?.name || "Vehicle",
              vehiclePlate: item?.vehicles?.license_plate || "",
              homeAddress: item?.clients?.home_address || "",
            }))
          : [];
      setParents(normalizedParents);
    } catch (error) {
      console.error("Error loading linked parents:", error);
      setParents([]);
    } finally {
      setLoadingParents(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadSchools();
    loadParents();
  }, [loadSchools, loadParents]);
  const flatListRef = useRef<FlatList>(null);
  const conversationsChannelRef = useRef<any>(null);
  const messagesChannelRef = useRef<any>(null);

  const scrollMessagesToBottom = useCallback((animated = true) => {
    if (!flatListRef.current) return;

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 50);
  }, []);

  const fetchOwnerConversations = useCallback(
    async (onCached?: (cached: ConversationData[]) => void) => {
      const userId = user?.userData?.id;
      if (!userId || !user?.token) {
        throw new Error("Your owner session has expired. Please sign in again.");
      }

      const cachedConversations = await getCachedConversations(userId);
      if (cachedConversations.length) {
        const sortedCachedConversations: ConversationData[] =
          sortConversationsByLastMessage(cachedConversations);
        onCached?.(sortedCachedConversations);
      }

      const response = await fetch(`${BASE_URL}/owner/conversations`, {
        headers: { Authorization: "Bearer " + user.token },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(
          result?.error || "Unable to load your conversations.",
        );
      }

      const sortedConversations: ConversationData[] =
        sortConversationsByLastMessage(result);
      await cacheConversations(sortedConversations, userId);
      return sortedConversations;
    },
    [user?.token, user?.userData?.id],
  );

  const initializeConversations = useCallback(async () => {
    setLoading(true);
    try {
      const loadedConversations = await fetchOwnerConversations(
        (cached) => {
          setConversations(cached);
          setLoading(false);
        },
      );
      setConversations(loadedConversations);

      // Subscribe to real-time updates
      conversationsChannelRef.current = subscribeToConversations(
        user?.userData?.id,
        () => {
          void fetchOwnerConversations()
            .then(setConversations)
            .catch((error) => {
              console.error("Error refreshing owner conversations:", error);
              setNotification({
                visible: true,
                message: "Unable to refresh conversations.",
                type: "error",
              });
            });
        },
      );
    } catch (error) {
      console.error("Error initializing conversations:", error);
      setNotification({
        visible: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load conversations",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchOwnerConversations, user?.userData?.id]);

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

        const cachedMessages = await getCachedMessages(conversationId);

        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
        }

        const freshMessages = await fetchMessagesWithCache(conversationId);
        setMessages(freshMessages);
        scrollMessagesToBottom(true);

        // Mark messages as read
        await markAsRead(conversationId);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unread_count: 0 }
              : conversation,
          ),
        );
        setSelectedConversation((current) =>
          current?.id === conversationId
            ? { ...current, unread_count: 0 }
            : current,
        );

        // Subscribe to real-time updates
        messagesChannelRef.current = subscribeToMessages(
          conversationId,
          (updated) => {
            setMessages(updated);
            // Scroll to bottom when new messages arrive.
            if (updated.length > 0) {
              scrollMessagesToBottom(true);
            }
          },
        );

        // Scroll to bottom
        if (cachedMessages.length > 0) {
          scrollMessagesToBottom(true);
        }
      } catch (error) {
        console.error("Error initializing messages:", error);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    if (selectedConversation) {
      // Initialize the selected conversation from the server/realtime cache.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initializeMessages(selectedConversation.id);
    }

    return () => {
      if (messagesChannelRef.current) {
        unsubscribeFromRealtime(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [selectedConversation, initializeMessages]);

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
        const updatedConversations = await fetchOwnerConversations();

        // Update the conversations list
        setConversations(updatedConversations);

        // Find and select the new conversation
        const newConversation = updatedConversations.find(
          (conv: any) => conv.id === data.conversation_id,
        );

        if (newConversation) {
          setSelectedConversation(newConversation);
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

  const startConversationWithSchool = async (school: any) => {
    if (!school?.userId || !user?.token) return;
    try {
      const response = await fetch(`${BASE_URL}/owner/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          otherUserId: school.userId,
          conversationType: "owner_school",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.conversation_id) {
        throw new Error(data.error || "Could not start conversation");
      }
      await clearConversationsCache(user?.userData?.id);
      const updatedConversations = await fetchOwnerConversations();
      setConversations(updatedConversations);
      const newConversation = updatedConversations.find(
        (conversation) => conversation.id === data.conversation_id,
      );
      if (newConversation) {
        setSelectedConversation(newConversation);
        setViewMode("chat");
      }
      setShowSchoolsList(false);
    } catch (error) {
      console.error("Error starting school conversation:", error);
      setNotification({
        visible: true,
        message: "Could not start school conversation",
        type: "error",
      });
    }
  };

  const startConversationWithParent = async (parent: any) => {
    const parentUserId = parent?.userId || parent?.id;
    if (!parentUserId || !user?.token) return;

    try {
      const response = await fetch(`${BASE_URL}/owner/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          otherUserId: parentUserId,
          conversationType: "client_owner",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.conversation_id) {
        throw new Error(data.error || "Could not start conversation");
      }

      await clearConversationsCache(user?.userData?.id);
      const updatedConversations = await fetchOwnerConversations();
      setConversations(updatedConversations);

      const newConversation = updatedConversations.find(
        (conversation) => conversation.id === data.conversation_id,
      );

      if (newConversation) {
        setSelectedConversation(newConversation);
        setViewMode("chat");
      }

      setShowParentsList(false);
      setNotification({
        visible: true,
        message: `Started conversation with ${parent.name || "parent"}`,
        type: "success",
      });
    } catch (error) {
      console.error("Error starting parent conversation:", error);
      setNotification({
        visible: true,
        message: "Could not start parent conversation",
        type: "error",
      });
    }
  };

  const sendMessage = async (content = newMessage.trim()) => {
    if (!content || !selectedConversation || sending) return false;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      sender_id: user?.userData?.id || user?.userData?.user_id || "",
      users: user?.userData || { name: "You", role: "owner" },
    };
    setMessages((current) => [...current, optimisticMessage]);
    setNewMessage("");
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
          content,
        }),
      });

      const data = await response.json();

      if (response.ok) {
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
              scrollMessagesToBottom(true);
            }
          } catch (err) {
            console.error("⚠️ Fallback refresh failed:", err);
          }
        }, 2000);
        return true;
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticId
              ? { ...message, deliveryError: true }
              : message,
          ),
        );
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
        return false;
      }
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
      console.error("❌ Error sending message:", error);
      setNotification({
        visible: true,
        message: "Network error: Failed to send message",
        type: "error",
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  const uploadAndSendAttachments = async (
    attachments: {
      uri: string;
      name: string;
      mimeType: string;
      mediaType: "image" | "audio" | "video" | "pdf";
    }[],
  ) => {
    if (attachments.length > 20) {
      setNotification({
        visible: true,
        message: "You can send up to 20 attachments in one message.",
        type: "warning",
      });
      return false;
    }
    if (
      !selectedConversation ||
      !user?.token ||
      uploadingAttachment ||
      sending
    ) {
      return false;
    }

    setUploadingAttachment(true);
    try {
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        const fileResponse = await fetch(attachment.uri);
        const fileBlob = await fileResponse.blob();
        if (!fileBlob.size) {
          throw new Error(`${attachment.name} is empty or unavailable.`);
        }
        if (fileBlob.size > 20 * 1024 * 1024) {
          throw new Error(`${attachment.name} exceeds the 20 MB limit.`);
        }
        const formData = new FormData();
        formData.append(
          "file",
          fileBlob.slice(0, fileBlob.size, attachment.mimeType),
          attachment.name,
        );
        const uploadResponse = await fetch(
          `${BASE_URL}/owner/conversations/${selectedConversation.id}/attachments`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${user.token}` },
            body: formData,
          },
        );
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok || !uploaded.url) {
          throw new Error(uploaded.error || "Attachment upload failed");
        }
        uploadedAttachments.push({
          type: "attachment",
          mediaType: attachment.mediaType,
          url: uploaded.url,
          name: uploaded.name || attachment.name,
          mimeType: uploaded.mimeType || attachment.mimeType,
        });
      }

      const caption = newMessage.trim();
      const content = JSON.stringify(
        uploadedAttachments.length === 1
          ? { ...uploadedAttachments[0], caption }
          : {
              type: "attachment_group",
              attachments: uploadedAttachments,
              caption,
            },
      );
      const sent = await sendMessage(content);
      if (sent) {
        setShowAttachmentActions(false);
        setShowEmojiPicker(false);
      }
      return sent;
    } catch (error) {
      console.error("Unable to upload message attachments:", error);
      setNotification({
        visible: true,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload the attachments.",
        type: "error",
      });
      return false;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const uploadAndSendAttachment = async (
    uri: string,
    name: string,
    mimeType: string,
    mediaType: "image" | "audio" | "video" | "pdf",
  ) => {
    if (
      !selectedConversation ||
      !user?.token ||
      uploadingAttachment ||
      sending
    ) {
      return false;
    }

    setUploadingAttachment(true);
    try {
      const fileResponse = await fetch(uri);
      const fileBlob = await fileResponse.blob();
      if (!fileBlob.size) {
        throw new Error("The selected attachment is empty or unavailable.");
      }
      const formData = new FormData();
      formData.append("file", fileBlob.slice(0, fileBlob.size, mimeType), name);
      const uploadResponse = await fetch(
        `${BASE_URL}/owner/conversations/${selectedConversation.id}/attachments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
          body: formData,
        },
      );
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || !uploaded.url) {
        throw new Error(uploaded.error || "Attachment upload failed");
      }

      const mediaContent = JSON.stringify({
        type: "attachment",
        mediaType,
        url: uploaded.url,
        name: uploaded.name || name,
        mimeType: uploaded.mimeType || mimeType,
        caption: newMessage.trim(),
      });
      const sent = await sendMessage(mediaContent);
      if (sent) {
        setShowAttachmentActions(false);
        setShowEmojiPicker(false);
      }
      return sent;
    } catch (error) {
      console.error("Unable to upload message attachment:", error);
      setNotification({
        visible: true,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload the attachment.",
        type: "error",
      });
      return false;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const selectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      await uploadAndSendAttachments(
        result.assets.map((document) => ({
          uri: document.uri,
          name: document.name,
          mimeType: document.mimeType || "application/pdf",
          mediaType: "pdf",
        })),
      );
    } catch (error) {
      console.error("Unable to select PDF attachment:", error);
      setNotification({
        visible: true,
        message:
          error instanceof Error ? error.message : "Unable to select the PDF.",
        type: "error",
      });
    }
  };

  const selectImage = async (source: "camera" | "library") => {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message:
            source === "camera"
              ? "Camera permission is required to take a photo."
              : "Photo library permission is required to choose an image.",
          type: "warning",
        });
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.82,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsMultipleSelection: true,
              selectionLimit: 20,
              quality: 0.82,
            });
      const assets = result.canceled ? [] : result.assets || [];
      if (!assets.length) return;
      await uploadAndSendAttachments(
        assets.map((asset) => ({
          uri: asset.uri,
          name:
            asset.fileName ||
            asset.uri.split("/").pop() ||
            `image-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
          mediaType: "image",
        })),
      );
    } catch (error) {
      console.error("Unable to select image:", error);
      setNotification({
        visible: true,
        message: "Unable to open the camera or photo library.",
        type: "error",
      });
    }
  };

  const selectVideo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message: "Photo library permission is required to choose a video.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.82,
        videoMaxDuration: 120,
      });
      const assets = result.canceled ? [] : result.assets || [];
      if (!assets.length) return;
      await uploadAndSendAttachments(
        assets.map((asset) => {
          const isVideo = asset.type === "video";
          return {
            uri: asset.uri,
            name:
              asset.fileName ||
              asset.uri.split("/").pop() ||
              (isVideo ? "video.mp4" : "image.jpg"),
            mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
            mediaType: isVideo ? "video" : "image",
          };
        }),
      );
    } catch (error) {
      console.error("Unable to select video:", error);
      setNotification({
        visible: true,
        message:
          error instanceof Error ? error.message : "Unable to select video.",
        type: "error",
      });
    }
  };

  const toggleAudioRecording = async () => {
    if (recording) {
      try {
        await recorder.stop();
        const recordingUri = recorder.uri;
        setRecording(false);
        await setAudioModeAsync({ allowsRecording: false });
        if (!recordingUri) {
          throw new Error("The voice recording could not be saved.");
        }
        await uploadAndSendAttachment(
          recordingUri,
          `voice-message-${Date.now()}${Platform.OS === "web" ? ".webm" : ".m4a"}`,
          Platform.OS === "web" ? "audio/webm" : "audio/mp4",
          "audio",
        );
      } catch (error) {
        console.error("Unable to stop or send voice recording:", error);
        setRecording(false);
        setNotification({
          visible: true,
          message:
            error instanceof Error
              ? error.message
              : "Unable to save the voice message.",
          type: "error",
        });
      }
      return;
    }
    if (sending || uploadingAttachment) return;

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message:
            "Microphone permission is required to record a voice message.",
          type: "warning",
        });
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setShowAttachmentActions(false);
    } catch (error) {
      console.error("Unable to start voice recording:", error);
      setNotification({
        visible: true,
        message: "Unable to start recording. Please try again.",
        type: "error",
      });
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
          <MaterialIcons name="add-circle-outline" size={24} color="#35D9B3" />
        )}
      </TouchableOpacity>
    );
  };

  const renderParentItem = ({ item }: { item: any }) => {
    const conversationUserId = item.userId || item.id;
    const alreadyConversing = conversations.some(
      (conv) => conv.other_participant.id === conversationUserId,
    );

    return (
      <TouchableOpacity
        style={styles.driverListItem}
        onPress={() => startConversationWithParent(item)}
        disabled={alreadyConversing}
      >
        <View style={styles.conversationIcon}>
          <MaterialIcons name="person" size={24} color="#35D9B3" />
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationRole}>
            {item.vehicleName}{" "}
            {item.vehiclePlate ? `(${item.vehiclePlate})` : ""}
          </Text>
          {item.homeAddress ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.homeAddress}
            </Text>
          ) : null}
        </View>
        {!alreadyConversing && (
          <MaterialIcons name="add-circle-outline" size={24} color="#35D9B3" />
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
        {item.other_participant.role === "admin" ? (
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.listAvatarImage}
            resizeMode="contain"
          />
        ) : item.other_participant.avatar ||
          item.other_participant.profile?.avatar ? (
          <Image
            source={{
              uri:
                item.other_participant.avatar ||
                item.other_participant.profile?.avatar,
            }}
            style={styles.listAvatarImage}
          />
        ) : (
          <Text style={styles.listAvatarText}>
            {item.other_participant.name.charAt(0).toUpperCase() || "?"}
          </Text>
        )}
        {item.other_participant.role !== "group" ? (
          <PresenceDot userId={item.other_participant.id} showOffline />
        ) : null}
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationTopLine}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.other_participant.name}
          </Text>
          <Text style={styles.conversationTime}>
            {formatConversationTime(
              item.last_message?.sent_at || item.created_at,
            )}
          </Text>
        </View>
        {item.other_participant.role === "school" &&
        item.other_participant.school_name ? (
          <Text
            style={[styles.conversationPreview, { fontWeight: "600" }]}
            numberOfLines={1}
          >
            {item.other_participant.school_name}
          </Text>
        ) : null}
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {item.last_message
            ? `${item.last_message.sender_id === user?.userData?.id ? "You: " : ""}${getMessagePreview(item.last_message.content)}`
            : item.other_participant.role === "client"
              ? "Parent"
              : item.other_participant.role === "driver"
                ? "Driver"
                : item.other_participant.role === "school"
                ? "No messages yet"
                  : item.other_participant.role}
        </Text>
      </View>
      <View style={styles.conversationCountColumn}>
        {(item.unread_count ?? 0) > 0 && (
          <View style={styles.unreadIndicator}>
            <Text style={styles.unreadIndicatorText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const formatConversationTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return date.toDateString() === yesterday.toDateString()
      ? "Yesterday"
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isOwnMessage = item.sender_id === user?.userData?.id;
    const attachment = parseMessageAttachment(item.content);
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
    const isSupportSender =
      !isOwnMessage &&
      selectedConversation?.other_participant.role === "admin" &&
      item.sender_id === selectedConversation.other_participant.id;
    const senderAvatar =
      !isOwnMessage &&
      item.users?.avatar
        ? item.users.avatar
        : !isOwnMessage &&
          item.sender_id === selectedConversation?.other_participant.id
        ? selectedConversation.other_participant.avatar ||
          selectedConversation.other_participant.profile?.avatar
        : drivers.find((driver: any) => driver.id === item.sender_id)?.avatar;
    const currentDate = new Date(item.sent_at).toDateString();
    const previousDate =
      index > 0 ? new Date(messages[index - 1].sent_at).toDateString() : null;
    const showDateSeparator = currentDate !== previousDate;

    return (
      <React.Fragment key={item.id}>
        {showDateSeparator ? (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {new Date(item.sent_at).toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        ) : null}
        <View
          style={[
            styles.messageContainer,
            isOwnMessage
              ? styles.ownMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          {!isOwnMessage &&
          ["admin_group", "school_group"].includes(
            selectedConversation?.conversation_type || "",
          ) ? (
            <GroupSenderAvatar
              name={item.users?.name}
              avatar={senderAvatar}
              userId={item.sender_id}
            />
          ) : !isOwnMessage ? (
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {isSupportSender ? (
                  <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                ) : senderAvatar ? (
                  <Image
                    source={{ uri: senderAvatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{senderInitial}</Text>
                )}
                <PresenceDot userId={item.sender_id} />
              </View>
            </View>
          ) : null}

          <View
            style={
              isOwnMessage ? styles.ownMessageGroup : styles.otherMessageGroup
            }
          >
            {!isOwnMessage &&
            !["admin_group", "school_group"].includes(
              selectedConversation?.conversation_type || "",
            ) &&
            selectedConversation?.other_participant.role === "school" &&
            item.sender_id === selectedConversation.other_participant.id ? (
              <View style={{ marginBottom: 4, paddingHorizontal: 3 }}>
                <Text style={{ color: "#B1C4BC", fontSize: 11, fontWeight: "700" }}>
                  {item.users?.name ||
                    selectedConversation.other_participant.name}
                </Text>
                {selectedConversation.other_participant.school_name ? (
                  <Text style={{ color: "#B1C4BC", fontSize: 10 }}>
                    {selectedConversation.other_participant.school_name}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View
              style={[
                styles.messageBubble,
                attachment?.type === "attachment" &&
                  attachment.mediaType === "image" &&
                  styles.imageBubble,
                isOwnMessage ? styles.ownBubble : styles.otherBubble,
                isOwnMessage && { backgroundColor: bubbleColors.primary },
              ]}
            >
            <Pressable
              onLongPress={() => {
                if (!isOwnMessage) setReactionPickerMessageId(item.id);
              }}
              delayLongPress={250}
            >
              {attachment ? (
                <MessageAttachment
                  content={item.content}
                  isOwn={isOwnMessage}
                />
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownText : styles.otherText,
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </Pressable>
            {item.deliveryError ? (
              <Text style={styles.messageDeliveryError}>Message not sent</Text>
            ) : null}
            <View
              style={[
                styles.messageMetadata,
                isOwnMessage ? styles.ownMetadata : styles.otherMetadata,
              ]}
            >
              <View style={styles.messageMetaRight}>
                <Text style={styles.messageTime}>{displayTime}</Text>
                {isOwnMessage && (
                  <MaterialIcons
                    name={item.is_read ? "done-all" : "done"}
                    size={14}
                    color={item.is_read ? "#1683F8" : "#91A3B5"}
                    style={styles.messageReadIcon}
                  />
                )}
              </View>
            </View>
            {!item.deliveryError &&
            (!isOwnMessage || item.reactions?.length) ? (
              <MessageReactions
                apiBaseUrl={BASE_URL}
                role="owner"
                conversationId={selectedConversation?.id || ""}
                messageId={item.id}
                token={user?.token || ""}
                currentUserId={user?.userData?.id || ""}
                accentColor={bubbleColors.primary}
                reactions={item.reactions}
                isOwn={isOwnMessage}
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
      </React.Fragment>
    );
  };

  const isDriverConversation = (conversation: ConversationData) =>
    conversation.other_participant.role === "driver" ||
    conversation.conversation_type === "admin_driver";

  const getConversationParticipantLabel = (conversation: ConversationData) => {
    if (
      conversation.conversation_type === "admin_driver" ||
      conversation.conversation_type === "admin_user"
    ) {
      return "Support team";
    }
    if (conversation.conversation_type === "admin_group") {
      return "Group chat";
    }

    switch (conversation.other_participant.role) {
      case "client":
        return "Parent";
      case "driver":
        return "Driver";
      case "school":
        return conversation.other_participant.school_name || "School";
      case "admin":
        return "Admin";
      default:
        return "Owner";
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    const query = searchQuery.trim().toLowerCase();
    const name = conversation.other_participant.name?.toLowerCase() || "";
    const message = conversation.last_message?.content?.toLowerCase() || "";
    const isGroup = conversation.conversation_type
      ?.toLowerCase()
      .includes("group");
    const matchesFilter =
      conversationFilter === "all" ||
      (conversationFilter === "unread" &&
        (conversation.unread_count ?? 0) > 0) ||
      (conversationFilter === "drivers" &&
        isDriverConversation(conversation)) ||
      (conversationFilter === "groups" && isGroup);
    return (
      matchesFilter &&
      (!query || name.includes(query) || message.includes(query))
    );
  });
  const filterOptions = [
    { key: "all", label: `All (${conversations.length})` },
    {
      key: "unread",
      label: `Unread (${conversations.filter((item) => (item.unread_count ?? 0) > 0).length})`,
    },
    {
      key: "drivers",
      label: `Drivers (${conversations.filter(isDriverConversation).length})`,
    },
    {
      key: "groups",
      label: `Groups (${conversations.filter((item) => item.conversation_type?.toLowerCase().includes("group")).length})`,
    },
  ] as const;

  if (loading) {
    return (
      <View style={styles.container}>
        {viewMode === "list" ? renderHeader() : null}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#35D9B3" />
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

      {viewMode === "list" ? (
        // Conversations List View
        <View style={styles.content}>
          {renderHeader()}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#6F89A2" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search drivers, vehicles or messages..."
              placeholderTextColor="#8BA0B4"
              returnKeyType="search"
              accessibilityLabel="Search conversations"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityLabel="Clear search"
              >
                <MaterialIcons name="close" size={19} color="#6F89A2" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filterDropdownContainer}>
            <TouchableOpacity
              style={[
                styles.filterDropdownTrigger,
                conversationFilter !== "all" &&
                  styles.filterDropdownTriggerActive,
              ]}
              onPress={() => setShowFilterDropdown((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Filter conversations"
              accessibilityState={{ expanded: showFilterDropdown }}
            >
              <MaterialIcons
                name="filter-list"
                size={20}
                color={conversationFilter === "all" ? "#B1C4BC" : "#00B894"}
              />
              <Text
                style={[
                  styles.filterDropdownLabel,
                  conversationFilter !== "all" &&
                    styles.filterDropdownLabelActive,
                ]}
              >
                {
                  filterOptions.find(
                    (option) => option.key === conversationFilter,
                  )?.label
                }
              </Text>
              <MaterialIcons
                name={
                  showFilterDropdown
                    ? "keyboard-arrow-up"
                    : "keyboard-arrow-down"
                }
                size={20}
                color="#B1C4BC"
              />
            </TouchableOpacity>
            {showFilterDropdown ? (
              <View style={styles.filterDropdownMenu}>
                {filterOptions.map((option) => {
                  const selected = conversationFilter === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={styles.filterDropdownOption}
                      onPress={() => {
                        setConversationFilter(option.key);
                        setShowFilterDropdown(false);
                        setShowDriversList(false);
                        setShowSchoolsList(false);
                        setShowParentsList(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterDropdownOptionText,
                          selected && styles.filterDropdownOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={18} color="#35D9B3" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
          {showDriversList || showSchoolsList || showParentsList ? (
            <View style={styles.directoryBar}>
              <Text style={styles.directoryTitle}>
                {showDriversList
                  ? "Start with a driver"
                  : showSchoolsList
                    ? "Start with a school"
                    : "Start with a parent"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDriversList(false);
                  setShowSchoolsList(false);
                  setShowParentsList(false);
                }}
                accessibilityLabel="Return to conversations"
              >
                <Text style={styles.directoryClose}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showSchoolsList ? (
            loadingSchools ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#35D9B3" />
              </View>
            ) : (
              <FlatList
                data={schools}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.conversationsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.driverListItem}
                    onPress={() => startConversationWithSchool(item)}
                  >
                    <View style={styles.conversationIcon}>
                      <MaterialIcons name="school" size={24} color="#35D9B3" />
                    </View>
                    <View style={styles.conversationInfo}>
                      <Text style={styles.conversationName}>{item.name}</Text>
                      <Text style={styles.conversationRole}>
                        {item.userName || "Primary school admin"}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="add-circle-outline"
                      size={24}
                      color="#35D9B3"
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="school" size={48} color="#A7B7C7" />
                    <Text style={styles.emptyText}>No linked schools</Text>
                  </View>
                }
              />
            )
          ) : showDriversList ? (
            loadingDrivers ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#35D9B3" />
              </View>
            ) : (
              <FlatList
                data={drivers}
                renderItem={renderDriverItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.conversationsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="drive-eta" size={48} color="#A7B7C7" />
                    <Text style={styles.emptyText}>No drivers assigned</Text>
                  </View>
                }
              />
            )
          ) : showParentsList ? (
            loadingParents ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#35D9B3" />
              </View>
            ) : (
              <FlatList
                data={parents}
                renderItem={renderParentItem}
                keyExtractor={(item) => item.userId || item.id}
                contentContainerStyle={styles.conversationsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="people" size={48} color="#A7B7C7" />
                    <Text style={styles.emptyText}>No linked parents</Text>
                  </View>
                }
              />
            )
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.conversationsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="chat" size={48} color="#A7B7C7" />
                  <Text style={styles.emptyText}>
                    {conversationFilter === "unread"
                      ? "No unread conversations"
                      : conversationFilter === "drivers"
                        ? "No driver conversations"
                        : conversationFilter === "groups"
                          ? "No group conversations"
                          : searchQuery
                            ? "No matching conversations"
                            : "No conversations yet"}
                  </Text>
                  <Text style={styles.emptySubText}>
                    {searchQuery
                      ? "Try another name or message."
                      : "Start a conversation using the new message button."}
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
              <SafeAreaView edges={["top"]} style={styles.chatSafeAreaHeader}>
                <View style={styles.chatHeaderWithBack}>
                  <TouchableOpacity
                    style={styles.chatBackButton}
                    onPress={() => setViewMode("list")}
                    accessibilityLabel="Back to conversations"
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={23}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <View style={styles.chatHeaderAvatar}>
                    {selectedConversation.other_participant.role ===
                    "admin" ? (
                      <Image
                        source={require("@/assets/images/logo.png")}
                        style={styles.chatHeaderAvatarImage}
                        resizeMode="contain"
                      />
                    ) : selectedConversation.other_participant.avatar ||
                      selectedConversation.other_participant.profile?.avatar ? (
                      <Image
                        source={{
                          uri:
                            selectedConversation.other_participant.avatar ||
                            selectedConversation.other_participant.profile?.avatar,
                        }}
                        style={styles.chatHeaderAvatarImage}
                      />
                    ) : (
                      <Text style={styles.chatHeaderAvatarText}>
                        {selectedConversation.other_participant.name
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    )}
                    {selectedConversation.other_participant.role !== "group" ? (
                      <PresenceDot
                        userId={selectedConversation.other_participant.id}
                      />
                    ) : null}
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {selectedConversation.other_participant.name}
                    </Text>
                    <Text style={styles.chatSubtitle}>
                      {getConversationParticipantLabel(selectedConversation)}
                    </Text>
                    {selectedConversation.other_participant.role !== "group" ? (
                      <PresenceStatus
                        userId={selectedConversation.other_participant.id}
                      />
                    ) : null}
                  </View>
                  {selectedConversation.other_participant.phone ? (
                    <TouchableOpacity
                      style={styles.chatHeaderAction}
                      onPress={() =>
                        Linking.openURL(
                          `tel:${selectedConversation.other_participant.phone}`,
                        ).catch((error) => {
                          console.warn("Unable to start phone call:", error);
                          setNotification({
                            visible: true,
                            message: "Unable to open the phone app.",
                            type: "error",
                          });
                        })
                      }
                      accessibilityLabel="Call contact"
                    >
                      <MaterialIcons name="call" size={21} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}
                  {["admin_group", "school_group"].includes(
                    selectedConversation.conversation_type,
                  ) ? (
                    <GroupChatMenu
                      key={selectedConversation.id}
                      conversation={selectedConversation}
                      role="owner"
                      token={user?.token || ""}
                      currentUserId={user?.userData?.id || ""}
                      onRemoved={() => {
                        setSelectedConversation(null);
                        setMessages([]);
                        void initializeConversations();
                      }}
                      onUpdated={() => void initializeConversations()}
                      iconColor="#FFFFFF"
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.chatHeaderAction}
                      onPress={() =>
                        Alert.alert(
                          selectedConversation.other_participant.name,
                          [
                            selectedConversation.other_participant.role,
                            selectedConversation.other_participant.email,
                            selectedConversation.other_participant.phone,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        )
                      }
                      accessibilityLabel="Contact details"
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={22}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </SafeAreaView>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
              >
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                scrollsToTop={false}
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              />

              <View
                style={[
                  styles.inputContainer,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
              >
                {showAttachmentActions ? (
                  <View style={styles.attachmentActions}>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={() => selectImage("camera")}
                      disabled={uploadingAttachment || sending}
                      accessibilityLabel="Take a photo"
                    >
                      <MaterialIcons
                        name="photo-camera"
                        size={20}
                        color="#82968D"
                      />
                      <Text style={styles.attachmentActionLabel}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={() => selectImage("library")}
                      disabled={uploadingAttachment || sending}
                      accessibilityLabel="Choose a photo"
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={20}
                        color="#82968D"
                      />
                      <Text style={styles.attachmentActionLabel}>Images</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={selectVideo}
                      disabled={uploadingAttachment || sending}
                      accessibilityLabel="Choose a video"
                    >
                      <MaterialIcons
                        name="videocam"
                        size={20}
                        color="#82968D"
                      />
                      <Text style={styles.attachmentActionLabel}>
                        Images & videos
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={selectDocument}
                      disabled={uploadingAttachment || sending}
                      accessibilityLabel="Attach a PDF"
                    >
                      <MaterialIcons
                        name="picture-as-pdf"
                        size={20}
                        color="#82968D"
                      />
                      <Text style={styles.attachmentActionLabel}>Files</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={toggleAudioRecording}
                      disabled={uploadingAttachment || sending}
                      accessibilityLabel="Record a voice message"
                    >
                      <MaterialIcons name="mic" size={20} color="#82968D" />
                      <Text style={styles.attachmentActionLabel}>Voice</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <EmojiPicker
                  visible={showEmojiPicker}
                  accentColor={bubbleColors.primary}
                  onSelect={(emoji) =>
                    setNewMessage((value) => `${value}${emoji}`)
                  }
                  onClose={() => setShowEmojiPicker(false)}
                />
                <View style={styles.composerRow}>
                  <View style={styles.ownerInputBar}>
                    <TouchableOpacity
                      style={styles.attachToggle}
                      onPress={() => setShowEmojiPicker((visible) => !visible)}
                      disabled={recording || uploadingAttachment || sending}
                      accessibilityLabel={
                        showEmojiPicker ? "Hide emoji picker" : "Choose emoji"
                      }
                    >
                      <MaterialIcons
                        name="sentiment-satisfied-alt"
                        size={22}
                        color="#82968D"
                      />
                    </TouchableOpacity>
                    {recording ? (
                      <View style={styles.recordingStatus}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>
                          Recording voice message
                        </Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.messageInput}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={500}
                        editable={!uploadingAttachment && !sending}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.attachToggle}
                      onPress={() =>
                        setShowAttachmentActions((visible) => !visible)
                      }
                      disabled={recording || uploadingAttachment || sending}
                      accessibilityLabel={
                        showAttachmentActions
                          ? "Hide attachments"
                          : "Show attachments"
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={24}
                        color="#82968D"
                        style={
                          showAttachmentActions
                            ? styles.attachIconOpen
                            : undefined
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  {uploadingAttachment ? (
                    <View style={styles.sendButton}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : newMessage.trim() && !recording ? (
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        sending && styles.sendButtonDisabled,
                      ]}
                      onPress={() => sendMessage()}
                      disabled={sending}
                      accessibilityLabel="Send message"
                    >
                      {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="send" size={19} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.recordButton,
                        recording && styles.recordButtonActive,
                        sending && styles.sendButtonDisabled,
                      ]}
                      onPress={toggleAudioRecording}
                      disabled={sending}
                      accessibilityLabel={
                        recording
                          ? "Stop and send voice message"
                          : "Record a voice message"
                      }
                    >
                      <MaterialIcons
                        name={recording ? "stop" : "mic"}
                        size={21}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.noChatContainer}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={64}
                color="#A7B7C7"
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
    backgroundColor: "#13231D",
  },
  safeAreaHeader: {
    backgroundColor: "#050907",
  },
  mainHeader: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#050907",
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 11,
  },
  brandCopy: {
    flex: 1,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    color: "#C7D8EA",
    fontSize: 12,
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#82968D",
  },
  content: {
    flex: 1,
    flexDirection: "column",
  },
  conversationsContainer: {
    flex: 1,
    backgroundColor: "#13231D",
  },
  searchBar: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 15,
    marginBottom: 12,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 9,
    color: "#F4FBF8",
    fontSize: 14,
  },
  filterDropdownContainer: {
    zIndex: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterDropdownTrigger: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#294238",
    borderRadius: 11,
    backgroundColor: "#0D1713",
  },
  filterDropdownTriggerActive: {
    borderColor: "#00B894",
    backgroundColor: "#13231D",
  },
  filterDropdownLabel: {
    color: "#B1C4BC",
    fontSize: 12,
    fontWeight: "700",
  },
  filterDropdownLabelActive: {
    color: "#35D9B3",
  },
  filterDropdownMenu: {
    position: "absolute",
    top: 48,
    left: 16,
    minWidth: 190,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  filterDropdownOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
  },
  filterDropdownOptionText: {
    color: "#B1C4BC",
    fontSize: 13,
    fontWeight: "600",
  },
  filterDropdownOptionTextSelected: {
    color: "#35D9B3",
    fontWeight: "700",
  },
  directoryBar: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
  },
  directoryTitle: {
    color: "#F4FBF8",
    fontSize: 13,
    fontWeight: "700",
  },
  directoryClose: {
    color: "#35D9B3",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F4FBF8",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
  },
  conversationsList: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
    backgroundColor: "#0D1713",
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
    color: "#B1C4BC",
  },
  tabTextActive: {
    color: "#35D9B3",
  },
  tabActive: {
    borderBottomColor: "#00B894",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
    paddingHorizontal: 5,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
    backgroundColor: "#0D1713",
  },
  driverListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#294238",
    backgroundColor: "#0D1713",
  },
  selectedConversation: {
    backgroundColor: "#13231D",
  },
  conversationIcon: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#13231D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  listAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F4FBF8",
    flexShrink: 1,
  },
  conversationRole: {
    fontSize: 12,
    color: "#82968D",
    marginBottom: 4,
  },
  conversationTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  conversationTime: {
    flexShrink: 0,
    color: "#B1C4BC",
    fontSize: 11,
  },
  conversationPreview: {
    color: "#82968D",
    fontSize: 12,
    lineHeight: 17,
  },
  conversationCountColumn: {
    minWidth: 34,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginLeft: 8,
  },
  messageCount: {
    color: "#B1C4BC",
    fontSize: 11,
    fontWeight: "600",
  },
  listAvatarText: {
    color: "#F4FBF8",
    fontSize: 17,
    fontWeight: "700",
  },
  lastMessage: {
    fontSize: 12,
    color: "#B1C4BC",
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 12,
    lineHeight: 16,
    color: "#B1C4BC",
  },
  messageMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginLeft: 4,
  },
  messageReadIcon: {
    marginLeft: 2,
    marginRight: 2,
  },
  unreadIndicator: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00B894",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadIndicatorText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  chatViewContainer: {
    flex: 1,
    backgroundColor: "#13231D",
    flexDirection: "column",
    paddingBottom: 0,
  },
  chatSafeAreaHeader: {
    backgroundColor: "#050907",
  },
  chatHeaderWithBack: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#050907",
  },
  chatBackButton: {
    width: 38,
    height: 42,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 3,
    marginRight: 5,
  },
  chatHeaderAvatar: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#13231D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 10,
  },
  chatHeaderAvatarImage: {
    width: "100%",
    height: "100%",
  },
  chatHeaderAvatarText: {
    color: "#F4FBF8",
    fontSize: 16,
    fontWeight: "800",
  },
  chatHeaderAction: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#13231D",
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#294238",
    backgroundColor: "#0D1713",
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatSubtitle: {
    fontSize: 12,
    color: "#C7D8EA",
    marginTop: 2,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingTop: 18,
    paddingBottom: 24,
  },
  dateSeparator: {
    alignSelf: "center",
    marginTop: 5,
    marginBottom: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#13231D",
  },
  dateSeparatorText: {
    color: "#B1C4BC",
    fontSize: 11,
    fontWeight: "600",
  },
  messageContainer: {
    marginBottom: 12,
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
    backgroundColor: "#13231D",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  ownMessageGroup: {
    flex: 1,
    alignItems: "flex-end",
    maxWidth: "84%",
  },
  otherMessageGroup: {
    flex: 1,
    alignItems: "flex-start",
    maxWidth: "84%",
  },
  messageBubble: {
    maxWidth: "100%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 3,
    overflow: "hidden",
  },
  imageBubble: {
    padding: 4,
  },
  otherBubble: {
    backgroundColor: "#0D1713",
    borderWidth: 1,
    borderColor: "#294238",
    borderBottomLeftRadius: 5,
  },
  ownBubble: {
    backgroundColor: "#00B894",
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  ownText: {
    color: "#FFF",
  },
  otherText: {
    color: "#F4FBF8",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B1C4BC",
    marginBottom: 4,
    opacity: 0.7,
  },
  messageMetadata: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  messageDeliveryError: {
    marginTop: 5,
    color: "#B42318",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  ownMetadata: {
    justifyContent: "flex-end",
  },
  otherMetadata: {
    justifyContent: "flex-start",
  },
  //   messageTime: {
  //     fontSize: 11,
  //     color: "#B1C4BC",
  //     fontWeight: "500",
  //   },
  readReceipt: {
    fontSize: 11,
    color: "#35D9B3",
    fontWeight: "700",
    marginLeft: 4,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#294238",
    backgroundColor: "#0D1713",
  },
  attachmentActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingLeft: 43,
    paddingBottom: 10,
    gap: 20,
  },
  attachmentAction: {
    width: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#13231D",
  },
  attachmentActionLabel: {
    color: "#82968D",
    fontSize: 10,
    fontWeight: "600",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
  },
  ownerInputBar: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: "#13231D",
    borderWidth: 1,
    borderColor: "#294238",
  },
  attachToggle: {
    width: 36,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  attachIconOpen: {
    transform: [{ rotate: "45deg" }],
  },
  messageInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 110,
    paddingHorizontal: 6,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "400",
    color: "#F4FBF8",
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B894",
  },
  recordButtonActive: {
    backgroundColor: "#13231D",
  },
  recordingStatus: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginRight: 9,
    borderRadius: 22,
    backgroundColor: "#35151D",
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
    backgroundColor: "#13231D",
  },
  recordingText: {
    color: "#9B3131",
    fontSize: 13,
    fontWeight: "600",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00B894",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#AAB8C6",
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
    color: "#82968D",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#B1C4BC",
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
    color: "#82968D",
    marginTop: 16,
    textAlign: "center",
  },
});
