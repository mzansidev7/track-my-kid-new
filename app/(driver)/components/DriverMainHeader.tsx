import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

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
  const { colors } = useTheme();
  return (
    <View style={[styles.container]}>
      <View>
        <Text style={styles.greeting}>Hello, {driverName} 👋</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={onNotificationPress}
        >
          <MaterialIcons
            name="notifications-none"
            size={25}
            color={colors.primary}
          />

          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={[styles.badgeText, { color: colors.surface }]}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface }]}
          onPress={onProfilePress}
        >
          <MaterialIcons name="person" size={23} color={colors.primary} />
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
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    color: "#4B5563",
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.18)",
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
    backgroundColor: "#0F9D58",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.18)",
  },
});

export default DriverHeader;
