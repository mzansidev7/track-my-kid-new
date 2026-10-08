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
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const EMOJI_OPTIONS = ["😀", "😊", "👍", "❤️", "🙏", "🎉", "👋", "🚗", "✅", "🤝"];
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

type MessageComposerProps = {
  apiBaseUrl: string;
  role: "owner" | "driver" | "client" | "school";
  conversationId: string;
  token: string;
  accentColor: string;
  onSent: () => Promise<void> | void;
  onSendText?: (content: string) => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
};

const MessageComposer = ({
  apiBaseUrl,
  role,
  conversationId,
  token,
  accentColor,
  onSent,
  onSendText,
  disabled = false,
}: MessageComposerProps) => {
  const [draft, setDraft] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(
    () => () => {
      setAudioModeAsync({ allowsRecording: false }).catch((modeError) => {
        console.error("Unable to reset audio mode after leaving chat:", modeError);
      });
    },
    [],
  );

  const request = async (path: string, options: RequestInit) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || result.message || "Message could not be sent.");
    }
    return result;
  };

  const sendContent = async (content: string) => {
    await request(`/${role}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    setDraft("");
    setEmojiPickerOpen(false);
    await onSent();
  };

  const sendAttachment = async (
    uri: string,
    name: string,
    mimeType: string,
    mediaType: "image" | "audio" | "pdf",
    size?: number | null,
  ) => {
    if (size && size > MAX_ATTACHMENT_SIZE) {
      throw new Error("Attachments must be 20 MB or smaller.");
    }

    const fileResponse = await fetch(uri);
    const fileBlob = await fileResponse.blob();
    if (!fileBlob.size) {
      throw new Error("The selected attachment is empty or unavailable.");
    }
    const formData = new FormData();
    formData.append(
      "file",
      fileBlob.slice(0, fileBlob.size, mimeType),
      name,
    );

    const uploaded = await request(
      `/${role}/conversations/${encodeURIComponent(conversationId)}/attachments`,
      { method: "POST", body: formData },
    );
    if (!uploaded.url) throw new Error("Attachment upload did not return a file URL.");

    await sendContent(
      JSON.stringify({
        type: "attachment",
        mediaType,
        url: uploaded.url,
        name: uploaded.name || name,
        mimeType: uploaded.mimeType || mimeType,
        caption: draft.trim(),
      }),
    );
  };

  const runBusyAction = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Unable to send attachment.";
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
    if (!permission.granted) throw new Error("Photo library access is required to choose an image.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
    });
    const image = result.canceled ? null : result.assets?.[0];
    if (!image?.uri) return;
    await sendAttachment(
      image.uri,
      image.fileName || image.uri.split("/").pop() || `image-${Date.now()}.jpg`,
      image.mimeType || "image/jpeg",
      "image",
      image.fileSize,
    );
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const document = result.assets[0];
    await sendAttachment(
      document.uri,
      document.name,
      document.mimeType || "application/pdf",
      "pdf",
      document.size,
    );
  };

  const toggleRecording = async () => {
    if (recording) {
      await runBusyAction(async () => {
        await recorder.stop();
        setRecording(false);
        await setAudioModeAsync({ allowsRecording: false });
        if (!recorder.uri) throw new Error("The voice recording could not be saved.");
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
        throw new Error("Microphone permission is required to record a voice message.");
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
        recordError instanceof Error ? recordError.message : "Unable to start voice recording.";
      setError(message);
      Alert.alert("Recording unavailable", message);
    }
  };

  return (
    <View style={styles.container}>
      {emojiPickerOpen ? (
        <View style={styles.emojiRow}>
          {EMOJI_OPTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButton}
              onPress={() => setDraft((current) => `${current}${emoji}`)}
              accessibilityLabel={`Insert ${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {recording ? (
        <Text style={styles.recordingLabel}>Recording voice message… Tap stop to send.</Text>
      ) : null}
      <View style={styles.composerRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setEmojiPickerOpen((open) => !open)}
          disabled={disabled || busy || recording}
          accessibilityLabel="Choose emoji"
        >
          <MaterialIcons name="sentiment-satisfied-alt" size={22} color={accentColor} />
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
          placeholder={recording ? "Recording voice message…" : "Write a message..."}
          placeholderTextColor="#94A3B8"
          multiline
          editable={!disabled && !busy && !recording}
          style={styles.input}
        />
        {busy ? (
          <View style={[styles.sendButton, { backgroundColor: accentColor }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : draft.trim() && !recording ? (
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: accentColor }]}
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
              { backgroundColor: recording ? "#C0392B" : accentColor },
            ]}
            onPress={toggleRecording}
            disabled={disabled || busy}
            accessibilityLabel={recording ? "Stop and send voice message" : "Record voice message"}
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
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DCE6F0",
    backgroundColor: "#FFFFFF",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  emojiButton: {
    padding: 5,
  },
  emoji: {
    fontSize: 22,
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
    alignItems: "flex-end",
    gap: 5,
  },
  actionButton: {
    width: 34,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    color: "#17385F",
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default MessageComposer;
