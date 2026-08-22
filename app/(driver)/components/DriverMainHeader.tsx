import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  driverName: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  notificationCount?: number;
  subtitle?: string;
};

const DriverHeader = ({
  driverName,
  onNotificationPress,
  onProfilePress,
  notificationCount = 0,
  subtitle,
}: Props) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Hello, {driverName} 👋</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
        >
          <MaterialIcons name="notifications-none" size={25} color="#FFFFFF" />

          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <MaterialIcons name="person" size={23} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  greeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    color: "#AAB8CC",
    fontSize: 13,
    marginTop: 5,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#102B50",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0057FF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DriverHeader;
