import React, { useContext } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useSchoolDashboard } from "../schoolHelpers/hooks/useSchoolDashboard";
import { useTheme } from "../../../styles/theme";

const managementItems = [
  {
    key: "students",
    label: "Students",
    sub: "Manage enrolled students",
    icon: "people",
    color: "#4285F4",
    target: "students",
  },
  {
    key: "drivers",
    label: "Drivers",
    sub: "Manage school drivers",
    icon: "person-outline",
    color: "#FB8C00",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    sub: "Manage transport vehicles",
    icon: "directions-bus",
    color: "#34A853",
  },
  {
    key: "routes",
    label: "Routes",
    sub: "Review school routes",
    icon: "alt-route",
    color: "#8E44AD",
    target: "routes",
  },
  {
    key: "trips",
    label: "Trips",
    sub: "View scheduled trips",
    icon: "commute",
    color: "#4285F4",
  },
];

const operationsItems = [
  {
    key: "attendance",
    label: "Attendance",
    sub: "View student attendance",
    icon: "check-circle",
    color: "#34A853",
  },
  {
    key: "live-tracking",
    label: "Live Tracking",
    sub: "Monitor active vehicles",
    icon: "location-on",
    color: "#4285F4",
  },
  {
    key: "parents",
    label: "Parents",
    sub: "View connected families",
    icon: "family-restroom",
    color: "#8E44AD",
  },
  {
    key: "staff-members",
    label: "Staff Members",
    sub: "Manage school staff",
    icon: "badge",
    color: "#FB8C00",
  },
];

const communicationItems = [
  {
    key: "announcements",
    label: "Announcements",
    sub: "Share school updates",
    icon: "campaign",
    color: "#FB8C00",
  },
  {
    key: "notifications",
    label: "Notifications",
    sub: "Review school alerts",
    icon: "notifications",
    color: "#EA4335",
  },
];

const administrationItems = [
  {
    key: "reports",
    label: "Reports",
    sub: "Review school reports",
    icon: "bar-chart",
    color: "#4285F4",
  },
  {
    key: "incidents",
    label: "Incidents",
    sub: "Manage reported incidents",
    icon: "report-problem",
    color: "#EA4335",
  },
  {
    key: "settings",
    label: "Settings",
    sub: "Configure school settings",
    icon: "settings",
    color: "#6B7280",
  },
];

const quickActions = [
  {
    key: "students",
    label: "View Students",
    icon: "people",
    color: "#4285F4",
    target: "students",
  },
  {
    key: "routes",
    label: "View Routes",
    icon: "alt-route",
    color: "#8E44AD",
    target: "routes",
  },
  {
    key: "announcements",
    label: "Send Notice",
    icon: "send",
    color: "#34A853",
  },
];

const More = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { logout } = useContext(AuthContext);
  const { user, school, students, routes, drivers } = useSchoolDashboard();
  const displayName =
    user?.first_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "School administrator";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/welcomeScreen" as never);
  };

  const handleItemPress = (item: { label: string; target?: string }) => {
    if (item.target) {
      router.push(`/(school)/(tabs)/${item.target}` as never);
      return;
    }

    Alert.alert(item.label, "This school feature is coming soon.");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>More</Text>
            <Text style={styles.subtitle}>School Panel</Text>
          </View>
          <TouchableOpacity
            style={styles.iconRound}
            onPress={() => router.push("/(school)/(tabs)/messages" as never)}
            accessibilityLabel="Open messages"
          >
            <MaterialIcons
              name="notifications-none"
              size={20}
              color="#0F172A"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.profileIcon}>
              <MaterialIcons name="verified" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName} numberOfLines={1}>
                {school?.name || "Your school"}
              </Text>
              <Text style={styles.profileRole} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: school?.is_active
                        ? "#16A34A"
                        : "#F59E0B",
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {school?.is_active ? "Active account" : "Pending approval"}
                </Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
        </View>

        <View style={styles.statsRow}>
          <Stat value={students.length} label="Students" />
          <Stat value={routes.length} label="Routes" />
          <Stat value={drivers.length} label="Drivers" />
        </View>

        <Text style={styles.sectionHeader}>SCHOOL MANAGEMENT</Text>
        <View style={styles.grid}>
          {managementItems.map((item) => (
            <Tile
              key={item.label}
              item={item}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        <Text style={styles.sectionHeader}>OPERATIONS</Text>
        <View style={styles.grid}>
          {operationsItems.map((item) => (
            <Tile
              key={item.label}
              item={item}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        <Text style={styles.sectionHeader}>COMMUNICATION</Text>
        <View style={styles.grid}>
          {communicationItems.map((item) => (
            <Tile
              key={item.label}
              item={item}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        <Text style={styles.sectionHeader}>REPORTS & SETTINGS</Text>
        <View style={styles.grid}>
          {administrationItems.map((item) => (
            <Tile
              key={item.label}
              item={item}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickBtn}
              onPress={() => handleItemPress(action)}
            >
              <MaterialIcons
                name={action.icon as any}
                size={18}
                color={action.color}
              />
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => router.push("/(school)/(tabs)/messages" as never)}
        >
          <Text style={styles.helpText}>Help & Support</Text>
          <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Tile = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.82}>
    <View style={[styles.tileIcon, { backgroundColor: `${item.color}15` }]}>
      <MaterialIcons name={item.icon} size={22} color={item.color} />
    </View>
    <Text style={styles.tileLabel}>{item.label}</Text>
    <Text style={styles.tileSub}>{item.sub}</Text>
  </TouchableOpacity>
);

export default More;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, paddingBottom: 140 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitleWrap: { flex: 1, alignItems: "flex-start" },
  title: { color: "#202124", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  iconRound: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    backgroundColor: "#4285F4",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  profileLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileDetails: { flex: 1 },
  profileName: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  profileRole: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
  statsRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  stat: { alignItems: "center", minWidth: 80 },
  statValue: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  sectionHeader: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tile: {
    width: "48.5%",
    minHeight: 118,
    padding: 15,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileLabel: { color: "#222222", fontSize: 14, fontWeight: "800" },
  tileSub: { color: "#6B7280", fontSize: 12, marginTop: 6 },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  quickBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  quickLabel: { color: "#333333", marginLeft: 8, fontWeight: "700" },
  helpRow: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  helpText: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#FCD5D0",
  },
  logoutText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
});
