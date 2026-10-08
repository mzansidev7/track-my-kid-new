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
      id: "live-map",
      title: "Live map",
      subtitle: "Open current driver GPS positions on a map",
      icon: "map",
      color: "#0F766E",
    },
    {
      id: "support",
      title: "Support tickets",
      subtitle: "Review and update user requests",
      icon: "support-agent",
      color: "#7C3AED",
    },
    {
      id: "users",
      title: "Users",
      subtitle: "Browse platform accounts and start conversations",
      icon: "people-outline",
      color: "#0284C7",
    },
    {
      id: "drivers",
      title: "Drivers",
      subtitle: "Review driver profiles, vehicles, and routes",
      icon: "badge",
      color: "#EA580C",
    },
    {
      id: "trips",
      title: "Trips",
      subtitle: "Review recent trips and their status",
      icon: "route",
      color: "#DB2777",
    },
    {
      id: "vehicles",
      title: "Vehicles",
      subtitle: "Browse fleet vehicles and assignments",
      icon: "directions-bus",
      color: "#16A34A",
    },
    {
      id: "payments",
      title: "Payments",
      subtitle: "Review commissions, balances, and invoices",
      icon: "payments",
      color: "#B45309",
    },
    {
      id: "school-billing",
      title: "School EFT invoices",
      subtitle: "Review EFT requests and confirm received payments",
      icon: "receipt-long",
      color: "#047857",
    },
    {
      id: "school-subscriptions",
      title: "School subscriptions",
      subtitle: "Search school plans, billing periods, methods, and status",
      icon: "subscriptions",
      color: "#0369A1",
    },
    {
      id: "messages",
      title: "Messages",
      subtitle: "Review conversations and reply to users",
      icon: "chat",
      color: "#4F46E5",
    },
    {
      id: "requests",
      title: "Requests",
      subtitle: "Manage support tickets, incidents, and school reviews",
      icon: "assignment",
      color: "#DC2626",
    },
    {
      id: "support-users",
      title: "Support users",
      subtitle: "Manage platform support accounts",
      icon: "admin-panel-settings",
      color: "#0F766E",
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "Review support controls and platform health",
      icon: "settings",
      color: "#475569",
    },
    {
      id: "profile",
      title: "Profile",
      subtitle: "Update your profile and password",
      icon: "account-circle",
      color: "#9333EA",
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
        <Text style={styles.section}>PLATFORM TOOLS</Text>
        <View style={styles.tiles}>
          {destinations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.tile,
                { backgroundColor: colors.surface, borderColor: "#E2E8F0" },
              ]}
              onPress={() => {
                if (item.id === "dashboard") {
                  router.push("/(admin)/(tabs)" as never);
                } else if (item.id === "live") {
                  router.push("/(admin)/(tabs)/live" as never);
                } else if (item.id === "support") {
                  router.push("/(admin)/(tabs)/support" as never);
                } else if (item.id === "commissions") {
                  router.push("/(admin)/(tabs)/commissions" as never);
                } else if (item.id === "school-billing") {
                  router.push("/(admin)/(tabs)/school-billing" as never);
                } else if (item.id === "school-subscriptions") {
                  router.push("/(admin)/(tabs)/school-subscriptions" as never);
                } else {
                  router.push(`/(admin)/(tabs)/tools/${item.id}` as never);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <View
                style={[
                  styles.tileIcon,
                  { backgroundColor: `${item.color}18` },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={22}
                  color={item.color}
                />
              </View>
              <Text style={styles.tileTitle}>{item.title}</Text>
              <Text style={styles.tileSub}>{item.subtitle}</Text>
              <MaterialIcons
                name="arrow-forward"
                size={18}
                color={item.color}
                style={styles.tileArrow}
              />
            </TouchableOpacity>
          ))}
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
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "47%",
    flexGrow: 1,
    maxWidth: "50%",
    minHeight: 142,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    position: "relative",
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileTitle: { color: "#1E293B", fontSize: 13, fontWeight: "800" },
  tileSub: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    paddingRight: 8,
  },
  tileArrow: { position: "absolute", right: 12, top: 14 },
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
