import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export type MessageReaction = {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe?: boolean;
};

type MessageReactionsProps = {
  apiBaseUrl: string;
  role: "owner" | "driver" | "client" | "school";
  conversationId: string;
  messageId: string;
  token: string;
  currentUserId: string;
  accentColor: string;
  reactions?: MessageReaction[];
  isOwn?: boolean;
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
  reactions: initialReactions = EMPTY_REACTIONS,
  isOwn = false,
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyEmoji, setBusyEmoji] = useState("");

  const toggleReaction = async (emoji: string) => {
    if (busyEmoji) return;
    const previous = reactions;
    setBusyEmoji(emoji);
    setPickerOpen(false);
    const updatedReactions = (() => {
      const selected = reactions.find((item) => item.emoji === emoji);
      const userAlreadyReacted =
        selected?.userIds?.includes(currentUserId) ||
        selected?.reactedByMe;
      if (userAlreadyReacted) {
        return reactions
          .map((item) =>
            item.emoji === emoji
              ? {
                  ...item,
                  count: item.count - 1,
                  userIds: item.userIds?.filter((id) => id !== currentUserId),
                  reactedByMe: false,
                }
              : item,
          )
          .filter((item) => item.count > 0);
      }
      if (selected) {
        return reactions.map((item) =>
          item.emoji === emoji
            ? {
                ...item,
                count: item.count + 1,
                userIds: [...(item.userIds || []), currentUserId],
                reactedByMe: true,
              }
            : item,
        );
      }
      return [
        ...reactions,
        {
          emoji,
          count: 1,
          userIds: [currentUserId],
          reactedByMe: true,
        },
      ];
    })();
    updateReactions(updatedReactions);

    try {
      const response = await fetch(
        `${apiBaseUrl}/${role}/conversations/${conversationId}/messages/${messageId}/reactions`,
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
    <View
      style={styles.container}
    >
      {reactions.length > 0 ? (
        <View style={styles.reactionList}>
          {reactions.map((reaction) => {
            const selected =
              reaction.userIds?.includes(currentUserId) ||
              reaction.reactedByMe;
            return (
              <TouchableOpacity
                key={reaction.emoji}
                style={[
                  styles.reactionChip,
                ]}
                onPress={isOwn ? undefined : () => void toggleReaction(reaction.emoji)}
                disabled={isOwn || Boolean(busyEmoji)}
                accessibilityLabel={`${reaction.emoji} reaction`}
                accessibilityState={{ selected: Boolean(selected) }}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {!isOwn && pickerOpen ? (
        <View
          style={[
            styles.picker,
            {
              width: Math.max(0, Math.min(224, windowWidth - (isOwn ? 32 : 80))),
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
        </View>
      ) : null}
      {!isOwn && (
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
            onPress={() => setPickerOpen((open) => !open)}
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
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    flexShrink: 1,
  },
  reactionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
  reactionChip: {
    minWidth: 16,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
    backgroundColor: "transparent",
  },
  reactionEmoji: {
    fontSize: 10,
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
  pickerEmoji: {
    fontSize: 20,
  },
});

export default MessageReactions;
