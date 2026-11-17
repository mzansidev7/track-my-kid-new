import React, { useEffect, useRef } from "react";
import { Text, TextStyle } from "react-native";
import { usePresence } from "./PresenceProvider";

const formatLastSeen = (timestamp?: string) => {
  if (!timestamp) return "Last seen unavailable";
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
};

const PresenceStatus = ({
  userId,
  style,
}: {
  userId?: string | null;
  style?: TextStyle;
}) => {
  const { ready, onlineUserIds, lastSeenByUserId, refreshLastSeen } =
    usePresence();
  const isOnline = Boolean(userId && onlineUserIds.has(String(userId)));
  const wasOnline = useRef(false);
  const wasReady = useRef(false);
  useEffect(() => {
    if (ready && userId && !isOnline) {
      void refreshLastSeen(
        [String(userId)],
        wasOnline.current || !wasReady.current,
      );
    }
    wasOnline.current = isOnline;
    wasReady.current = ready;
  }, [isOnline, ready, refreshLastSeen, userId]);
  if (!userId) return null;
  if (!ready) {
    return (
      <Text style={[{ color: "#8795A6", fontSize: 10 }, style]}>
        Connecting...
      </Text>
    );
  }
  return (
    <Text style={[{ color: isOnline ? "#16A34A" : "#8795A6", fontSize: 10 }, style]}>
      {isOnline ? "Online" : formatLastSeen(lastSeenByUserId[String(userId)])}
    </Text>
  );
};

export default PresenceStatus;
