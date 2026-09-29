import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useAdminProfile } from "../../../adminHelpers/hooks/useAdminProfile";
import { useTheme } from "../../../styles/theme";

export default function AdminMore() {
  const router = useRouter();
  const { colors } = useTheme();
  const { logout } = useContext(AuthContext);
  const { admin } = useAdminProfile();
  const adminName =
    admin?.display_name || admin?.name || "Platform administrator";

  const destinations = [
    {
      title: "Dashboard",
      subtitle: "Platform metrics and activity",
      icon: "dashboard",
      route: "/(admin)/(tabs)",
    },
    {
      title: "Live trips",
      subtitle: "Active tracking sessions and GPS",
      icon: "location-on",
      route: "/(admin)/(tabs)/live",
    },
    {
      title: "Support tickets",
      subtitle: "Review and update user requests",
      icon: "support-agent",
      route: "/(admin)/(tabs)/support",
    },
  ];

  const confirmLogout = () => {
    Alert.alert(
      "Log out of Admin",
      "You will need an authorized Admin account to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/home" as never);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>PLATFORM</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Admin tools
        </Text>
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={styles.avatar}>
            <MaterialIcons
              name="admin-panel-settings"
              size={24}
              color="#2563EB"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{adminName}</Text>
            <Text style={styles.role}>
              {admin?.admin_role
                ? admin.admin_role.replaceAll("_", " ")
                : "Authorized platform administrator"}
            </Text>
          </View>
          <MaterialIcons name="verified-user" size={20} color="#059669" />
        </View>
        <Text style={styles.section}>AVAILABLE AREAS</Text>
        {destinations.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.row, { backgroundColor: colors.surface }]}
            onPress={() => router.push(item.route as never)}
          >
            <View style={styles.rowIcon}>
              <MaterialIcons
                name={item.icon as any}
                size={21}
                color="#2563EB"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        ))}
        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={19} color="#B45309" />
          <Text style={styles.noticeText}>
            Other platform-management modules are not connected to live Admin
            APIs yet, so they are omitted rather than showing fake data or
            broken links.
          </Text>
        </View>
        <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
          <MaterialIcons name="logout" size={19} color="#B91C1C" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 32, gap: 12 },
  kicker: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { fontSize: 25, fontWeight: "900", marginBottom: 4 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 13,
    marginVertical: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  role: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
    textTransform: "capitalize",
  },
  section: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: "#1E293B", fontSize: 12, fontWeight: "800" },
  rowSub: { color: "#64748B", fontSize: 10, marginTop: 3 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    padding: 11,
    borderRadius: 10,
    marginTop: 5,
  },
  noticeText: { color: "#92400E", fontSize: 10, lineHeight: 15, flex: 1 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  logoutText: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
});
