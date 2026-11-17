import { MaterialIcons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

export interface MessageAttachmentData {
  type: "attachment";
  mediaType: "image" | "audio" | "video" | "pdf";
  url: string;
  name: string;
  mimeType?: string;
  caption?: string;
}

export interface MessageAttachmentGroupData {
  type: "attachment_group";
  attachments: MessageAttachmentData[];
  caption?: string;
}

export type ParsedMessageAttachment =
  | MessageAttachmentData
  | MessageAttachmentGroupData;

export const parseMessageAttachment = (
  content: string,
): ParsedMessageAttachment | null => {
  try {
    const value = JSON.parse(content);
    const normalizeAttachment = (
      item: Record<string, unknown>,
    ): MessageAttachmentData | null => {
      if (!item || typeof item !== "object") return null;
      const url =
        typeof item.url === "string"
          ? item.url
          : typeof item.fileUrl === "string"
            ? item.fileUrl
            : typeof item.file_url === "string"
              ? item.file_url
              : "";
      if (!/^https?:\/\//i.test(url)) return null;

      const mimeTypeValue = item.mimeType || item.mime_type;
      const mimeType =
        typeof mimeTypeValue === "string" ? mimeTypeValue.toLowerCase() : "";
      const declaredType = item.mediaType || item.media_type;
      const declaredMediaType =
        typeof declaredType === "string" ? declaredType.toLowerCase() : "";
      const fileExtension = url
        .split("?")[0]
        .split(".")
        .pop()
        ?.toLowerCase();
      const inferredMediaType =
        ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "")
          ? "image"
          : ["mp3", "m4a", "aac", "wav", "webm", "ogg", "3gp"].includes(
                fileExtension || "",
              )
            ? "audio"
            : ["mp4", "mov", "m4v", "webm", "3gp"].includes(
                  fileExtension || "",
                )
              ? "video"
            : fileExtension === "pdf"
              ? "pdf"
              : null;
      const mediaType =
        declaredMediaType === "image" ||
        (typeof declaredMediaType === "string" &&
          declaredMediaType.startsWith("image/")) ||
        mimeType.startsWith("image/")
          ? "image"
          : declaredMediaType === "audio" ||
              (typeof declaredMediaType === "string" &&
                declaredMediaType.startsWith("audio/")) ||
              mimeType.startsWith("audio/")
            ? "audio"
            : declaredMediaType === "pdf" || mimeType === "application/pdf"
              ? "pdf"
              : declaredMediaType === "video" ||
                  (typeof declaredMediaType === "string" &&
                    declaredMediaType.startsWith("video/")) ||
                  mimeType.startsWith("video/")
                ? "video"
                : inferredMediaType;
      if (!mediaType) return null;

      const urlName = url.split("?")[0]?.split("/").pop();
      const nameValue = item.name || item.fileName || item.filename;
      return {
        type: "attachment",
        mediaType,
        url,
        name:
          typeof nameValue === "string" && nameValue
            ? nameValue
            : urlName || "Attachment",
        mimeType: mimeType || undefined,
        caption:
          typeof item.caption === "string" ? item.caption : undefined,
      };
    };
    if (value?.type === "attachment" || value?.url || value?.fileUrl) {
      return normalizeAttachment(value);
    }
    if (
      value?.type === "attachment_group" &&
      Array.isArray(value.attachments)
    ) {
      const attachments = value.attachments
        .map((item: Record<string, unknown>) => normalizeAttachment(item))
        .filter(
          (item: MessageAttachmentData | null): item is MessageAttachmentData =>
            item !== null,
        );
      if (attachments.length) {
        return {
          type: "attachment_group",
          attachments,
          caption:
            typeof value.caption === "string" ? value.caption : undefined,
        };
      }
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
  if (attachment.type === "attachment_group") {
    const imageCount = attachment.attachments.filter(
      (item) => item.mediaType === "image",
    ).length;
    const otherCount = attachment.attachments.length - imageCount;
    const labels = [
      imageCount
        ? `${imageCount} ${imageCount === 1 ? "photo" : "photos"}`
        : "",
      otherCount
        ? `${otherCount} ${otherCount === 1 ? "attachment" : "attachments"}`
        : "",
    ].filter(Boolean);
    return `${labels.join(" · ")}${
      attachment.caption ? `: ${attachment.caption}` : ""
    }`;
  }
  const label =
    attachment.mediaType === "image"
      ? "Photo"
      : attachment.mediaType === "video"
        ? "Video"
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
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = async () => {
    if (status.error) return;
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (status.playing) {
        player.pause();
      } else {
        if (status.isLoaded && status.didJustFinish) player.seekTo(0);
        player.play();
      }
    } catch (error) {
      console.error("Unable to play voice message:", error);
    }
  };
  const durationSeconds = Number.isFinite(status.duration)
    ? Math.max(0, status.duration)
    : 0;
  const currentSeconds = Number.isFinite(status.currentTime)
    ? Math.max(0, status.currentTime)
    : 0;
  const formatDuration = (seconds: number) => {
    const wholeSeconds = Math.floor(seconds);
    return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  };
  const progress =
    durationSeconds > 0
      ? Math.min(1, currentSeconds / durationSeconds)
      : 0;

  return (
    <View style={[styles.audioMessage, isOwn && styles.audioMessageOwn]}>
      <TouchableOpacity
        style={[styles.audioPlay, isOwn && styles.audioPlayOwn]}
        onPress={togglePlayback}
        disabled={!status.isLoaded || Boolean(status.error)}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pause voice message" : "Play voice message"}
      >
        <MaterialIcons
          name={status.playing ? "pause" : "play-arrow"}
          size={23}
          color={isOwn ? "#1769D2" : "#FFFFFF"}
        />
      </TouchableOpacity>
      <View style={styles.audioContent}>
        <View style={styles.audioWave}>
          {Array.from({ length: 24 }, (_, index) => {
            const height = 7 + ((index * 17 + 11) % 17);
            return (
              <View
                key={index}
                style={[
                  styles.audioWaveBar,
                  { height },
                  index / 24 < progress && styles.audioWaveBarPlayed,
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.audioDuration, isOwn && styles.audioHintOwn]}>
          {status.error
            ? "Audio unavailable"
            : status.isLoaded
              ? `${formatDuration(currentSeconds)} / ${formatDuration(durationSeconds)}`
              : status.isBuffering
                ? "Buffering audio…"
                : "Tap play to load audio"}
        </Text>
      </View>
    </View>
  );
};

const VideoMessage = ({ attachment }: { attachment: MessageAttachmentData }) => {
  const player = useVideoPlayer(attachment.url, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls
      contentFit="contain"
      accessibilityLabel={attachment.name || "Video attachment"}
    />
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

  if (attachment.type === "attachment_group") {
    return (
      <View style={styles.attachmentContent}>
        <View style={styles.attachmentGroup}>
          {attachment.attachments.map((item, index) => (
            <SingleMessageAttachment
              key={`${item.url}-${index}`}
              attachment={item}
              isOwn={isOwn}
            />
          ))}
        </View>
        {attachment.caption ? (
          <Text style={[styles.caption, isOwn && styles.captionOwn]}>
            {attachment.caption}
          </Text>
        ) : null}
      </View>
    );
  }

  return <SingleMessageAttachment attachment={attachment} isOwn={isOwn} />;
};

const SingleMessageAttachment = ({
  attachment,
  isOwn,
}: {
  attachment: MessageAttachmentData;
  isOwn: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  if (attachment.mediaType === "image") {
    return (
      <View style={styles.singleAttachment}>
        {imageError ? (
          <View style={styles.imageUnavailable}>
            <MaterialIcons name="broken-image" size={26} color="#9AA8AA" />
            <Text style={styles.audioHint}>Image unavailable</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setImagePreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="View image attachment"
          >
            <ExpoImage
              source={{ uri: attachment.url }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="none"
              accessibilityLabel="Image attachment"
              onError={(event) => {
                console.error(
                  "Could not load message image:",
                  event.error,
                );
                setImageError(true);
              }}
            />
          </TouchableOpacity>
        )}
        <Modal
          visible={imagePreviewOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setImagePreviewOpen(false)}
        >
          <View style={styles.imagePreviewBackdrop}>
            <Pressable
              style={styles.imagePreviewClose}
              onPress={() => setImagePreviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <ExpoImage
              source={{ uri: attachment.url }}
              style={{ width, height: height * 0.86 }}
              contentFit="contain"
              cachePolicy="none"
            />
          </View>
        </Modal>
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
      <View style={styles.singleAttachment}>
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

  if (attachment.mediaType === "video") {
    return (
      <View style={styles.singleAttachment}>
        <VideoMessage attachment={attachment} />
        {attachment.caption ? (
          <Text style={[styles.caption, isOwn && styles.captionOwn]}>
            {attachment.caption}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.singleAttachment}>
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
  attachmentGroup: {
    flexDirection: "column",
    gap: 6,
  },
  singleAttachment: {
    gap: 7,
    maxWidth: 228,
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
  imagePreviewBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 44,
    right: 18,
    zIndex: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: 260,
    height: 190,
    borderRadius: 15,
    backgroundColor: "#0B1113",
    overflow: "hidden",
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
  audioContent: {
    flex: 1,
    gap: 5,
  },
  audioWave: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
  audioWaveBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  audioWaveBarPlayed: {
    backgroundColor: "#4DD0E1",
  },
  audioDuration: {
    color: "#E1ECF8",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  audioHint: {
    color: "#E1ECF8",
    fontSize: 11,
  },
  audioHintOwn: {
    color: "#E1ECF8",
  },
  imageUnavailable: {
    width: 228,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 15,
    backgroundColor: "#152124",
  },
});
