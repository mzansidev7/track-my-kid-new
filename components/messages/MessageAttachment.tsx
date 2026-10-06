import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface MessageAttachmentData {
  type: "attachment";
  mediaType: "image" | "audio";
  url: string;
  name: string;
  mimeType: string;
}

export const parseMessageAttachment = (
  content: string,
): MessageAttachmentData | null => {
  try {
    const value = JSON.parse(content);
    if (
      value?.type === "attachment" &&
      (value.mediaType === "image" || value.mediaType === "audio") &&
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
  return attachment.mediaType === "image" ? "Photo" : "Voice message";
};

const AudioMessage = ({
  attachment,
  isOwn,
}: {
  attachment: MessageAttachmentData;
  isOwn: boolean;
}) => {
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);

  return (
    <TouchableOpacity
      style={[styles.audioMessage, isOwn && styles.audioMessageOwn]}
      onPress={() => (status.playing ? player.pause() : player.play())}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? "Pause voice message" : "Play voice message"}
    >
      <View style={[styles.audioPlay, isOwn && styles.audioPlayOwn]}>
        <MaterialIcons
          name={status.playing ? "pause" : "play-arrow"}
          size={22}
          color={isOwn ? "#1769D2" : "#FFFFFF"}
        />
      </View>
      <View style={styles.audioCopy}>
        <Text style={[styles.audioTitle, isOwn && styles.audioTitleOwn]}>
          Voice message
        </Text>
        <Text style={[styles.audioHint, isOwn && styles.audioHintOwn]}>
          {status.playing ? "Playing" : "Tap to play"}
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
      <Image
        source={{ uri: attachment.url }}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel="Image attachment"
      />
    );
  }

  return (
    <AudioMessage attachment={attachment} isOwn={isOwn} />
  );
};

const styles = StyleSheet.create({
  image: {
    width: 228,
    height: 190,
    borderRadius: 15,
    backgroundColor: "#E6EDF5",
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
