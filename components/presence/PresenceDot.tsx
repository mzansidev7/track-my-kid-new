import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { usePresence } from "./PresenceProvider";

const PresenceDot = ({
  userId,
  style,
  showOffline = false,
}: {
  userId?: string | null;
  style?: StyleProp<ViewStyle>;
  showOffline?: boolean;
}) => {
  const { onlineUserIds, ready } = usePresence();
  if (!ready || !userId) return null;
  const isOnline = onlineUserIds.has(String(userId));
  if (!isOnline && !showOffline) return null;
  return (
    <View
      accessibilityLabel={isOnline ? "Online" : "Offline"}
      accessibilityRole="image"
      style={[
        {
          position: "absolute",
          right: 1,
          bottom: 1,
          width: 11,
          height: 11,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: "#FFFFFF",
          backgroundColor: isOnline ? "#22C55E" : "#94A3B8",
        },
        style,
      ]}
    />
  );
};

export default PresenceDot;
