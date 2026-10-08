import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  adminName?: string;
  adminRole?: string;
  action?: ReactNode;
};

export default function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  adminName,
  adminRole,
  action,
}: AdminPageHeaderProps) {
  const initials = (adminName || "Admin")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <LinearGradient
      colors={["#101B34", "#17356D", "#1E40AF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <MaterialIcons
              name="admin-panel-settings"
              size={19}
              color="#BFDBFE"
            />
          </View>
          <View>
            <Text style={styles.brandName}>TRACK MY KID</Text>
            <Text style={styles.brandSection}>ADMIN CONSOLE</Text>
          </View>
        </View>
        {action || (
          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={13} color="#86EFAC" />
            <Text style={styles.secureText}>SECURE</Text>
          </View>
        )}
      </View>

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {adminName ? (
        <View style={styles.adminRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "A"}</Text>
          </View>
          <View style={styles.adminCopy}>
            <Text style={styles.adminName} numberOfLines={1}>
              {adminName}
            </Text>
            <Text style={styles.adminRole}>
              {(adminRole || "Platform administrator").replaceAll("_", " ")}
            </Text>
          </View>
          <View style={styles.activeStatus}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.decorativeCircle} />
    </LinearGradient>
  );
}

export function AdminHeaderAction({
  onPress,
  loading = false,
  accessibilityLabel,
}: {
  onPress: () => void;
  loading?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={styles.actionButton}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialIcons
        name={loading ? "hourglass-top" : "refresh"}
        size={20}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    minHeight: 220,
    justifyContent: "flex-start",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandSection: {
    color: "#BFDBFE",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginTop: 2,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(134,239,172,0.12)",
    borderColor: "rgba(134,239,172,0.22)",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  secureText: {
    color: "#BBF7D0",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: "#93C5FD",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#DCE8FF",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    maxWidth: "92%",
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#1E3A8A", fontSize: 10, fontWeight: "900" },
  adminCopy: { flex: 1, minWidth: 0 },
  adminName: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  adminRole: {
    color: "#BFDBFE",
    fontSize: 9,
    marginTop: 2,
    textTransform: "capitalize",
  },
  activeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  activeText: {
    color: "#DCFCE7",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  decorativeCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -70,
    top: 62,
    backgroundColor: "rgba(147,197,253,0.07)",
  },
});
