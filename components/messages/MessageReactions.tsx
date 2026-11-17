import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { resolveWorkingBaseUrl } from "../../url";
import EmojiPicker from "./EmojiPicker";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export type MessageReaction = {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe?: boolean;
};

type MessageReactionsProps = {
  apiBaseUrl: string;
  role: "owner" | "driver" | "client" | "school" | "admin";
  conversationId: string;
  messageId: string;
  token: string;
  currentUserId: string;
  accentColor: string;
  reactionEndpoint?: string;
  reactions?: MessageReaction[];
  isOwn?: boolean;
  longPressToReact?: boolean;
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
};

const EMPTY_REACTIONS: MessageReaction[] = [];

const MessageReactions = ({
  apiBaseUrl,
  role,
  conversationId,
  messageId,
  token,
  currentUserId,
  accentColor,
  reactionEndpoint,
  reactions: initialReactions = EMPTY_REACTIONS,
  isOwn = false,
  longPressToReact = false,
  pickerOpen: controlledPickerOpen,
  onPickerOpenChange,
}: MessageReactionsProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const [reactionOverride, setReactionOverride] = useState<{
    source: MessageReaction[];
    value: MessageReaction[];
  } | null>(null);
  const reactions =
    reactionOverride?.source === initialReactions
      ? reactionOverride.value
      : initialReactions;
  const updateReactions = (value: MessageReaction[]) =>
    setReactionOverride({ source: initialReactions, value });
  const [localPickerOpen, setLocalPickerOpen] = useState(false);
  const pickerOpen = controlledPickerOpen ?? localPickerOpen;
  const [busyEmoji, setBusyEmoji] = useState("");
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const setPickerOpen = (open: boolean) => {
    setLocalPickerOpen(open);
    onPickerOpenChange?.(open);
  };

  const toggleReaction = async (emoji: string) => {
    if (busyEmoji) return;
    const previous = reactions;
    setBusyEmoji(emoji);
    setPickerOpen(false);
    setFullPickerOpen(false);
    const updatedReactions = (() => {
      const previousUserReaction = reactions.find(
        (item) =>
          item.userIds?.includes(currentUserId) || item.reactedByMe,
      );
      const removingReaction = previousUserReaction?.emoji === emoji;
      let targetFound = false;
      const updated = reactions
        .map((item) => {
          const userReacted =
            item.userIds?.includes(currentUserId) || item.reactedByMe;
          const isTarget = item.emoji === emoji;
          if (isTarget) targetFound = true;
          const userIds = userReacted
            ? (item.userIds || []).filter((id) => id !== currentUserId)
            : [...(item.userIds || [])];
          const addingReaction = isTarget && !removingReaction && !userReacted;
          if (addingReaction && !userIds.includes(currentUserId)) {
            userIds.push(currentUserId);
          }
          return {
            ...item,
            count: item.count - (userReacted ? 1 : 0) + (addingReaction ? 1 : 0),
            userIds,
            reactedByMe:
              (isTarget && !removingReaction) ||
              (item.reactedByMe && !userReacted),
          };
        })
        .filter((item) => item.count > 0);
      if (!targetFound && !removingReaction) {
        updated.push({
          emoji,
          count: 1,
          userIds: [currentUserId],
          reactedByMe: true,
        });
      }
      return updated;
    })();
    updateReactions(updatedReactions);

    try {
      const baseUrl = reactionEndpoint
        ? await resolveWorkingBaseUrl()
        : apiBaseUrl;
      const endpoint =
        reactionEndpoint && !/^https?:\/\//i.test(reactionEndpoint)
          ? `${baseUrl}${reactionEndpoint}`
          : reactionEndpoint ||
            (role === "admin"
              ? ""
              : `${baseUrl}/${role}/conversations/${conversationId}/messages/${messageId}/reactions`);
      if (!endpoint) {
        throw new Error("The Admin reaction endpoint is not configured.");
      }
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emoji }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Reaction could not be saved.",
        );
      }
      updateReactions(result.reactions || []);
    } catch (error) {
      updateReactions(previous);
      console.error("Could not update message reaction:", error);
      Alert.alert(
        "Reaction not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyEmoji("");
    }
  };

  return (
    <View style={styles.container}>
      <EmojiPicker
        visible={!isOwn && fullPickerOpen}
        accentColor={accentColor}
        onSelect={(emoji) => void toggleReaction(emoji)}
        onClose={() => setFullPickerOpen(false)}
      />
      {reactions.length > 0 ? (
        <ScrollView
          horizontal
          style={styles.reactionScroller}
          contentContainerStyle={styles.reactionList}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {reactions.map((reaction) => {
            const selected =
              reaction.userIds?.includes(currentUserId) ||
              reaction.reactedByMe;
            return (
              <TouchableOpacity
                key={reaction.emoji}
                style={[
                  styles.reactionChip,
                  selected && styles.reactionChipSelected,
                ]}
                onPress={
                  isOwn ? undefined : () => void toggleReaction(reaction.emoji)
                }
                disabled={isOwn || Boolean(busyEmoji)}
                accessibilityLabel={`${reaction.count} ${reaction.emoji} reaction${reaction.count === 1 ? "" : "s"}`}
                accessibilityState={{ selected: Boolean(selected) }}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionCount}>{reaction.count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
      {!isOwn && pickerOpen ? (
        <View
          style={[
            styles.picker,
            {
              width: Math.max(0, Math.min(260, windowWidth - 80)),
            },
            isOwn ? styles.pickerOwn : styles.pickerOther,
          ]}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.pickerButton}
              onPress={() => void toggleReaction(emoji)}
              accessibilityLabel={`React with ${emoji}`}
            >
              <Text style={styles.pickerEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              setPickerOpen(false);
              setFullPickerOpen(true);
            }}
            accessibilityLabel="More reactions"
          >
            <MaterialIcons name="add" size={22} color="#52657C" />
          </TouchableOpacity>
        </View>
      ) : null}
      {!isOwn && !longPressToReact && (
        <>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => void toggleReaction("❤️")}
            disabled={Boolean(busyEmoji)}
            accessibilityLabel="Like message"
          >
            <MaterialIcons name="favorite" size={16} color="#E45672" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setPickerOpen(!pickerOpen)}
            disabled={Boolean(busyEmoji)}
            accessibilityLabel={pickerOpen ? "Close reactions" : "Add reaction"}
            accessibilityState={{ expanded: pickerOpen }}
          >
            <MaterialIcons
              name={pickerOpen ? "close" : "add-reaction"}
              size={17}
              color={accentColor}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
    maxWidth: "100%",
    alignSelf: "stretch",
    flexShrink: 1,
  },
  reactionScroller: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "100%",
  },
  reactionList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingBottom: 1,
  },
  reactionChip: {
    flexShrink: 0,
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
  },
  reactionChipSelected: {
    backgroundColor: "#E8F2FF",
    borderWidth: 1,
    borderColor: "#B8D4F5",
  },
  reactionCount: {
    color: "#52657C",
    fontSize: 9,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  reactionEmoji: {
    fontSize: 9,
  },
  addButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  picker: {
    position: "absolute",
    zIndex: 20,
    bottom: 29,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    borderWidth: 1,
    borderColor: "#E1E7EF",
    borderRadius: 18,
    padding: 5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pickerOwn: {
    right: 0,
  },
  pickerOther: {
    left: 0,
  },
  pickerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  pickerEmoji: {
    fontSize: 20,
  },
});

export default MessageReactions;
