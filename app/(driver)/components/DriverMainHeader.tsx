import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DRIVER_COLORS } from "@/styles/theme";

type Props = {
  driverName: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  notificationCount?: number;
  subtitle?: string;
  avatarUrl?: string;
};

const DriverHeader = ({
  driverName,
  onNotificationPress,
  onProfilePress,
  notificationCount = 0,
  subtitle,
  avatarUrl,
}: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <Text style={styles.eyebrow}>DRIVER DASHBOARD</Text>
        <Text style={styles.greeting} numberOfLines={2} ellipsizeMode="tail">
          Good day, {driverName}
        </Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleAccent} />
            <Text
              style={styles.subtitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
        >
          <MaterialIcons
            name="notifications-none"
            size={25}
            color={DRIVER_COLORS.primary}
          />

          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {avatarUrl ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
          >
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 42, height: 42, borderRadius: 14 }}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
          >
            <MaterialIcons
              name="person"
              size={23}
              color={DRIVER_COLORS.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 15,
  },

  identity: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },

  eyebrow: {
    color: DRIVER_COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  greeting: {
    color: DRIVER_COLORS.text,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
    flexShrink: 1,
  },

  subtitle: {
    color: DRIVER_COLORS.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.15,
    flexShrink: 1,
  },

  subtitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 7,
    minWidth: 0,
  },

  subtitleAccent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DRIVER_COLORS.cyan,
    marginTop: 5,
    marginRight: 8,
    flexShrink: 0,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: DRIVER_COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },

  notificationBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DRIVER_COLORS.danger,
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
    backgroundColor: DRIVER_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DRIVER_COLORS.primary,
  },
});

export default DriverHeader;
