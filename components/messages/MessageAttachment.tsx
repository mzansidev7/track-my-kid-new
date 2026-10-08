import { MaterialIcons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { File as ExpoFile, Paths } from "expo-file-system";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  View,
} from "react-native";

export interface MessageAttachmentData {
  type: "attachment";
  mediaType: "image" | "audio" | "pdf";
  url: string;
  name: string;
  mimeType: string;
  caption?: string;
}

export const parseMessageAttachment = (
  content: string,
): MessageAttachmentData | null => {
  try {
    const value = JSON.parse(content);
    if (
      value?.type === "attachment" &&
      (value.mediaType === "image" ||
        value.mediaType === "audio" ||
        value.mediaType === "pdf") &&
      typeof value.url === "string" &&
      /^https:\/\//i.test(value.url) &&
      typeof value.name === "string" &&
      typeof value.mimeType === "string"
    ) {
      return {
        type: "attachment",
        mediaType: value.mediaType,
        url: value.url,
        name: value.name,
        mimeType: value.mimeType,
        caption:
          typeof value.caption === "string" ? value.caption : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const getMessagePreview = (content?: string | null) => {
  if (!content) return "";
  const attachment = parseMessageAttachment(content);
  if (!attachment) return content;
  const label =
    attachment.mediaType === "image"
      ? "Photo"
      : attachment.mediaType === "pdf"
        ? "PDF attachment"
        : "Voice message";
  return attachment.caption ? `${label}: ${attachment.caption}` : label;
};

const AudioMessage = ({
  attachment,
  isOwn,
}: {
  attachment: MessageAttachmentData;
  isOwn: boolean;
}) => {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let objectUrl: string | undefined;

    const loadAudio = async () => {
      setLoading(true);
      setLoadError("");
      const extension =
        attachment.mimeType === "audio/webm" ? "webm" : "m4a";
      const destination = new ExpoFile(
        Paths.cache,
        `message-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
      );

      try {
        let sourceUri: string;
        if (Platform.OS === "web") {
          const response = await fetch(attachment.url, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Audio download failed (${response.status}).`);
          }
          const audioBlob = await response.blob();
          if (!audioBlob.size) throw new Error("The audio file is empty.");
          objectUrl = URL.createObjectURL(audioBlob);
          sourceUri = objectUrl;
        } else {
          const localFile = await ExpoFile.downloadFileAsync(
            attachment.url,
            destination,
            { idempotent: true, signal: controller.signal },
          );
          sourceUri = localFile.uri;
        }
        if (cancelled) return;
        player.replace({ uri: sourceUri });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load this audio.";
        console.error("Unable to load voice message:", error);
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAudio();
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url, attachment.mimeType, player]);

  const togglePlayback = async () => {
    if (loading || loadError || status.error) return;
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish) player.seekTo(0);
        player.play();
      }
    } catch (error) {
      console.error("Unable to play voice message:", error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.audioMessage, isOwn && styles.audioMessageOwn]}
      onPress={togglePlayback}
      disabled={loading || Boolean(loadError) || Boolean(status.error)}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? "Pause voice message" : "Play voice message"}
    >
      <View style={[styles.audioPlay, isOwn && styles.audioPlayOwn]}>
        {loading ? (
          <ActivityIndicator size="small" color={isOwn ? "#1769D2" : "#FFFFFF"} />
        ) : (
          <MaterialIcons
            name={status.playing ? "pause" : "play-arrow"}
            size={22}
            color={isOwn ? "#1769D2" : "#FFFFFF"}
          />
        )}
      </View>
      <View style={styles.audioCopy}>
        <Text style={[styles.audioTitle, isOwn && styles.audioTitleOwn]}>
          {loadError || status.error ? "Audio unavailable" : "Voice message"}
        </Text>
        <Text style={[styles.audioHint, isOwn && styles.audioHintOwn]}>
          {loading
            ? "Loading audio…"
            : loadError || status.error || (status.playing ? "Playing" : "Tap to play")}
        </Text>
      </View>
      <MaterialIcons
        name="graphic-eq"
        size={21}
        color={isOwn ? "rgba(255,255,255,0.82)" : "#1769D2"}
      />
    </TouchableOpacity>
  );
};

export const MessageAttachment = ({
  content,
  isOwn,
}: {
  content: string;
  isOwn: boolean;
}) => {
  const attachment = parseMessageAttachment(content);
  if (!attachment) return null;

  if (attachment.mediaType === "image") {
    return (
      <View style={styles.attachmentContent}>
        <Image
          source={{ uri: attachment.url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel="Image attachment"
        />
        {attachment.caption ? (
          <Text style={[styles.caption, isOwn && styles.captionOwn]}>
            {attachment.caption}
          </Text>
        ) : null}
      </View>
    );
  }

  if (attachment.mediaType === "pdf") {
    return (
      <View style={styles.attachmentContent}>
        <TouchableOpacity
          style={[styles.pdfMessage, isOwn && styles.pdfMessageOwn]}
          onPress={() => Linking.openURL(attachment.url)}
          accessibilityRole="button"
          accessibilityLabel={`Open PDF ${attachment.name}`}
        >
          <MaterialIcons name="picture-as-pdf" size={24} color="#FFFFFF" />
          <Text style={styles.pdfName} numberOfLines={1}>
            {attachment.name}
          </Text>
          <MaterialIcons name="open-in-new" size={19} color="#FFFFFF" />
        </TouchableOpacity>
        {attachment.caption ? (
          <Text style={[styles.caption, isOwn && styles.captionOwn]}>
            {attachment.caption}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.attachmentContent}>
      <AudioMessage attachment={attachment} isOwn={isOwn} />
      {attachment.caption ? (
        <Text style={[styles.caption, isOwn && styles.captionOwn]}>
          {attachment.caption}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  attachmentContent: {
    gap: 7,
  },
  caption: {
    color: "#17385F",
    fontSize: 14,
    lineHeight: 19,
  },
  captionOwn: {
    color: "#FFFFFF",
  },
  image: {
    width: 228,
    height: 190,
    borderRadius: 15,
    backgroundColor: "#E6EDF5",
  },
  pdfMessage: {
    minWidth: 205,
    maxWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#1769D2",
    gap: 9,
  },
  pdfMessageOwn: {
    backgroundColor: "#1259B5",
  },
  pdfName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  audioMessage: {
    minWidth: 205,
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    borderRadius: 13,
    backgroundColor: "#1769D2",
    gap: 10,
  },
  audioMessageOwn: {
    backgroundColor: "transparent",
  },
  audioPlay: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  audioPlayOwn: {
    backgroundColor: "#FFFFFF",
  },
  audioCopy: {
    flex: 1,
  },
  audioTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  audioTitleOwn: {
    color: "#FFFFFF",
  },
  audioHint: {
    color: "#E1ECF8",
    fontSize: 11,
    marginTop: 2,
  },
  audioHintOwn: {
    color: "#DCEAFF",
  },
});
