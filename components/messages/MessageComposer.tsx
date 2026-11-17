import { MaterialIcons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import EmojiPicker from "./EmojiPicker";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { resolveWorkingBaseUrl } from "../../url";

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

type MessageComposerProps = {
  apiBaseUrl: string;
  role: "owner" | "driver" | "client" | "school" | "admin";
  conversationId: string;
  token: string;
  accentColor: string;
  messageEndpoint?: string;
  attachmentEndpoint?: string;
  onSent: () => Promise<void> | void;
  onSendText?: (content: string) => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
  layout?: "default" | "whatsapp";
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

type PickedAttachment = {
  uri: string;
  name: string;
  mimeType: string;
  mediaType: "image" | "audio" | "video" | "pdf";
  size?: number | null;
};

const MessageComposer = ({
  apiBaseUrl,
  role,
  conversationId,
  token,
  accentColor,
  messageEndpoint,
  attachmentEndpoint,
  onSent,
  onSendText,
  disabled = false,
  layout = "whatsapp",
  containerStyle,
  inputStyle,
}: MessageComposerProps) => {
  const [draft, setDraft] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(
    () => () => {
      setAudioModeAsync({ allowsRecording: false }).catch((modeError) => {
        console.error(
          "Unable to reset audio mode after leaving chat:",
          modeError,
        );
      });
    },
    [],
  );

  const request = async (path: string, options: RequestInit) => {
    const baseUrl = apiBaseUrl || (await resolveWorkingBaseUrl());
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        result.error || result.message || "Message could not be sent.",
      );
    }
    return result;
  };

  const sendContent = async (content: string) => {
    const endpoint =
      messageEndpoint || (role === "admin" ? "" : `/${role}/messages`);
    if (!endpoint) {
      throw new Error("The Admin message endpoint is not configured.");
    }
    await request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    setDraft("");
    setEmojiPickerOpen(false);
    await onSent();
  };

  const uploadAttachment = async ({
    uri,
    name,
    mimeType,
    mediaType,
    size,
  }: PickedAttachment) => {
    if (size && size > MAX_ATTACHMENT_SIZE)
      throw new Error(`${name} exceeds the 20 MB attachment limit.`);
    const fileResponse = await fetch(uri);
    const fileBlob = await fileResponse.blob();
    if (!fileBlob.size) {
      throw new Error(`${name} is empty or unavailable.`);
    }
    if (fileBlob.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`${name} exceeds the 20 MB attachment limit.`);
    }
    const formData = new FormData();
    formData.append("file", fileBlob.slice(0, fileBlob.size, mimeType), name);

    const uploadEndpoint =
      attachmentEndpoint ||
      (role === "admin"
        ? ""
        : `/${role}/conversations/${encodeURIComponent(conversationId)}/attachments`);
    if (!uploadEndpoint) {
      throw new Error("The Admin attachment endpoint is not configured.");
    }
    const uploaded = await request(uploadEndpoint, {
      method: "POST",
      body: formData,
    });
    if (!uploaded.url)
      throw new Error("Attachment upload did not return a file URL.");
    return {
      type: "attachment" as const,
      mediaType,
      url: uploaded.url,
      name: uploaded.name || name,
      mimeType: uploaded.mimeType || mimeType,
    };
  };

  const sendAttachments = async (attachments: PickedAttachment[]) => {
    if (attachments.length > 20) {
      throw new Error("You can send up to 20 attachments in one message.");
    }
    const uploaded = [];
    for (const attachment of attachments) {
      uploaded.push(await uploadAttachment(attachment));
    }
    const caption = draft.trim();
    await sendContent(
      JSON.stringify(
        uploaded.length === 1
          ? { ...uploaded[0], caption }
          : { type: "attachment_group", attachments: uploaded, caption },
      ),
    );
  };

  const sendAttachment = async (
    uri: string,
    name: string,
    mimeType: string,
    mediaType: "image" | "audio" | "video" | "pdf",
    size?: number | null,
  ) => {
    await sendAttachments([{ uri, name, mimeType, mediaType, size }]);
  };

  const runBusyAction = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Unable to send attachment.";
      setError(message);
      Alert.alert("Message not sent", message);
    } finally {
      setBusy(false);
    }
  };

  const sendText = () => {
    const text = draft.trim();
    if (!text || disabled || busy) return;
    if (!onSendText) {
      runBusyAction(() => sendContent(text));
      return;
    }
    runBusyAction(async () => {
      const sent = await onSendText(text);
      if (sent === false) throw new Error("Message could not be sent.");
      else {
        setDraft("");
        setEmojiPickerOpen(false);
      }
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      throw new Error("Photo library access is required to choose an image.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.82,
    });
    const images = result.canceled ? [] : result.assets || [];
    if (!images.length) return;
    await sendAttachments(
      images.map((image) => ({
        uri: image.uri,
        name:
          image.fileName ||
          image.uri.split("/").pop() ||
          "image.jpg",
        mimeType: image.mimeType || "image/jpeg",
        mediaType: "image",
        size: image.fileSize,
      })),
    );
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo library access is required to choose media.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.82,
      videoMaxDuration: 120,
    });
    const media = result.canceled ? [] : result.assets || [];
    if (!media.length) return;
    await sendAttachments(
      media.map((asset) => {
        const isVideo = asset.type === "video";
        return {
          uri: asset.uri,
          name:
            asset.fileName ||
            asset.uri.split("/").pop() ||
            (isVideo ? "video.mp4" : "image.jpg"),
          mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          mediaType: isVideo ? "video" : "image",
          size: asset.fileSize,
        };
      }),
    );
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    await sendAttachments(
      result.assets.map((document) => ({
        uri: document.uri,
        name: document.name,
        mimeType: document.mimeType || "application/pdf",
        mediaType: "pdf",
        size: document.size,
      })),
    );
  };

  const toggleRecording = async () => {
    if (recording) {
      await runBusyAction(async () => {
        await recorder.stop();
        setRecording(false);
        await setAudioModeAsync({ allowsRecording: false });
        if (!recorder.uri)
          throw new Error("The voice recording could not be saved.");
        await sendAttachment(
          recorder.uri,
          `voice-message-${Date.now()}${Platform.OS === "web" ? ".webm" : ".m4a"}`,
          Platform.OS === "web" ? "audio/webm" : "audio/mp4",
          "audio",
        );
      });
      return;
    }
    if (disabled || busy) return;
    setError("");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          "Microphone permission is required to record a voice message.",
        );
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (recordError) {
      const message =
        recordError instanceof Error
          ? recordError.message
          : "Unable to start voice recording.";
      setError(message);
      Alert.alert("Recording unavailable", message);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Modal
        visible={attachmentPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentPickerOpen(false)}
      >
        <Pressable
          style={styles.attachmentPickerBackdrop}
          onPress={() => setAttachmentPickerOpen(false)}
        >
          <Pressable
            style={styles.attachmentPicker}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.attachmentPickerHeading}>
              <Text style={styles.attachmentPickerTitle}>Attach media</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close attachment menu"
                onPress={() => setAttachmentPickerOpen(false)}
              >
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.attachmentPickerOptions}>
              {[
                {
                  label: "Images",
                  icon: "image" as const,
                  action: pickImage,
                  color: "#0D9488",
                },
                {
                  label: "Images & videos",
                  icon: "perm-media" as const,
                  action: pickMedia,
                  color: "#7C3AED",
                },
                {
                  label: "Files",
                  icon: "insert-drive-file" as const,
                  action: pickDocument,
                  color: "#2563EB",
                },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.attachmentPickerOption}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${option.label.toLowerCase()}`}
                  disabled={disabled || busy}
                  onPress={() => {
                    setAttachmentPickerOpen(false);
                    void runBusyAction(option.action);
                  }}
                >
                  <View
                    style={[
                      styles.attachmentPickerIcon,
                      { backgroundColor: `${option.color}18` },
                    ]}
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={24}
                      color={option.color}
                    />
                  </View>
                  <Text style={styles.attachmentPickerOptionText}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.attachmentPickerNote}>
              Files supports PDF documents.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
      <EmojiPicker
        visible={emojiPickerOpen}
        accentColor={accentColor}
        onSelect={(emoji) => setDraft((current) => `${current}${emoji}`)}
        onClose={() => setEmojiPickerOpen(false)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {recording ? (
        <Text style={styles.recordingLabel}>
          Recording voice message… Tap stop to send.
        </Text>
      ) : null}
      <View
        style={[
          styles.composerRow,
          layout === "whatsapp" && styles.whatsappComposerRow,
        ]}
      >
        {layout === "whatsapp" ? (
          <View
            style={[
              styles.whatsappInputBar,
              {
                backgroundColor: role === "driver" ? "#172326" : "#F1F5F9",
              },
            ]}
          >
            <TouchableOpacity
              style={styles.whatsappActionButton}
              onPress={() => setEmojiPickerOpen((open) => !open)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Choose emoji"
            >
              <MaterialIcons
                name="sentiment-satisfied-alt"
                size={23}
                color={accentColor}
              />
            </TouchableOpacity>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              editable={!disabled && !busy && !recording}
              style={[
                styles.whatsappInput,
                {
                  color: role === "driver" ? "#FFFFFF" : "#17385F",
                },
                inputStyle,
              ]}
            />
            <TouchableOpacity
              style={styles.whatsappActionButton}
              onPress={() => setAttachmentPickerOpen(true)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Choose an attachment"
            >
              <MaterialIcons name="attach-file" size={24} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.whatsappActionButton}
              onPress={() => runBusyAction(pickImage)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Send image"
            >
              <MaterialIcons
                name="photo-camera"
                size={23}
                color={accentColor}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setEmojiPickerOpen((open) => !open)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Choose emoji"
            >
              <MaterialIcons
                name="sentiment-satisfied-alt"
                size={22}
                color={accentColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => runBusyAction(pickImage)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Send image"
            >
              <MaterialIcons name="image" size={22} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => runBusyAction(pickDocument)}
              disabled={disabled || busy || recording}
              accessibilityLabel="Attach PDF"
            >
              <MaterialIcons name="attach-file" size={22} color={accentColor} />
            </TouchableOpacity>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              editable={!disabled && !busy && !recording}
              style={[styles.input, inputStyle]}
            />
          </>
        )}
        {busy ? (
          <View
            style={[
              styles.sendButton,
              layout === "whatsapp" && styles.whatsappSendButton,
              { backgroundColor: accentColor },
            ]}
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : draft.trim() && !recording ? (
          <TouchableOpacity
            style={[
              styles.sendButton,
              layout === "whatsapp" && styles.whatsappSendButton,
              { backgroundColor: accentColor },
            ]}
            onPress={sendText}
            disabled={disabled}
            accessibilityLabel="Send message"
          >
            <MaterialIcons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              layout === "whatsapp" && styles.whatsappSendButton,
              { backgroundColor: recording ? "#C0392B" : accentColor },
            ]}
            onPress={toggleRecording}
            disabled={disabled || busy}
            accessibilityLabel={
              recording ? "Stop and send voice message" : "Record voice message"
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
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
  error: {
    color: "#B42318",
    fontSize: 12,
    marginBottom: 6,
  },
  recordingLabel: {
    color: "#B42318",
    fontSize: 12,
    marginBottom: 6,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  whatsappComposerRow: {
    gap: 8,
  },
  whatsappInputBar: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: "#172326",
  },
  whatsappActionButton: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappInput: {
    flex: 1,
    minWidth: 0,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 6,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 15,
  },
  actionButton: {
    width: 34,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    flexBasis: 0,
    width: 0,
    flexShrink: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    color: "#17385F",
    fontSize: 14,
  },
  attachmentPickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  attachmentPicker: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  attachmentPickerHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  attachmentPickerTitle: {
    color: "#132A3A",
    fontSize: 17,
    fontWeight: "800",
  },
  attachmentPickerOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  attachmentPickerOption: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  attachmentPickerIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  attachmentPickerOptionText: {
    color: "#263746",
    fontSize: 13,
    fontWeight: "700",
  },
  attachmentPickerNote: {
    color: "#73808D",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default MessageComposer;
