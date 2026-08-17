import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext/auth-context";
import { useAdminProfile } from "@/adminHelpers/hooks/useAdminProfile";

const topStats = [
  {
    label: "PARENTS",
    value: "1,284",
    change: "+8.4%",
    changeLabel: "vs last month",
    icon: "people",
    accent: "#1BB474",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "CHILDREN",
    value: "2,936",
    change: "+12.2%",
    changeLabel: "vs last month",
    icon: "child-care",
    accent: "#F59E0B",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "VEHICLES",
    value: "184",
    change: "6 Offline",
    changeLabel: "vs today",
    icon: "directions-bus",
    accent: "#3B82F6",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "DRIVERS",
    value: "221",
    change: "14 Pending",
    changeLabel: "verification",
    icon: "person",
    accent: "#8B5CF6",
    bg: "rgba(255,255,255,0.72)",
  },
];

const quickStats = [
  { label: "SCHOOLS", value: "48", icon: "school", accent: "#3B82F6" },
  { label: "ACTIVE ROUTES", value: "73", icon: "map", accent: "#10B981" },
  { label: "LIVE TRIPS", value: "24", icon: "local-taxi", accent: "#F59E0B" },
  {
    label: "OPEN TICKETS",
    value: "18",
    icon: "confirmation-number",
    accent: "#22C55E",
  },
];

const attentionCards = [
  {
    title: "6 Vehicles Offline",
    subtitle: "Check vehicle connections",
    tone: "danger",
    icon: "directions-bus",
  },
  {
    title: "14 Drivers Pending",
    subtitle: "Verification required",
    tone: "warning",
    icon: "person",
  },
  {
    title: "2 Active Incidents",
    subtitle: "Requires immediate attention",
    tone: "danger",
    icon: "warning",
  },
];

const routeCards = [
  {
    route: "ABC Primary",
    driver: "Kabelo M.",
    children: "Children: 14",
    status: "ON ROUTE",
  },
  {
    route: "Bloemfontein North",
    driver: "Thabo K.",
    children: "Children: 11",
    status: "ON ROUTE",
  },
];

const supportOverview = [
  { label: "Open", value: 18, tone: "soft-red" },
  { label: "In Progress", value: 7, tone: "soft-blue" },
  { label: "Urgent", value: 3, tone: "soft-orange" },
  { label: "Resolved", value: 126, tone: "soft-green" },
];

const recentActivity = [
  {
    title: "New school registered",
    subtitle: "ABC Primary School",
    time: "5 min ago",
    color: "#10B981",
  },
  {
    title: "Driver approved",
    subtitle: "Kabelo Mokoena",
    time: "18 min ago",
    color: "#3B82F6",
  },
  {
    title: "Vehicle added",
    subtitle: "Toyota Quantum (CA 123-456)",
    time: "32 min ago",
    color: "#F59E0B",
  },
  {
    title: "Support ticket created",
    subtitle: "Unable to track my child",
    time: "45 min ago",
    color: "#8B5CF6",
  },
];

const chartValues = [1.2, 2.2, 2.8, 3.4, 4.1, 4.8, 5.6];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { admin, loading, error, refreshAdmin } = useAdminProfile();

  const greetingName = user?.name?.split(" ")?.[0] || "Admin";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#BCE8B0", "#B7E1B4"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingTitle}>Loading dashboard</Text>
              <Text style={styles.loadingSubtitle}>
                Fetching admin information...
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#BCE8B0", "#B7E1B4"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingTitle}>Error loading dashboard</Text>
              <Text style={styles.loadingSubtitle}>{error}</Text>
              <View style={{ marginTop: 12 }}>
                {/* Add refresh button */}
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    backgroundColor: "#10B981",
                    borderRadius: 8,
                  }}
                  onPress={refreshAdmin}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#BCE8B0", "#B7E1B4"]} style={styles.gradient}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logo}
              />{" "}
            </View>
            <Text style={styles.brandText}>TRACK</Text>
            <Text style={styles.brandTextSecondary}>MY KID</Text>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.notificationWrap}>
              <MaterialIcons
                name="notifications-none"
                size={24}
                color="#0F172A"
              />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={async () => {
                await logout();
                router.replace("/");
              }}
            >
              <MaterialIcons name="account-circle" size={38} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Good morning, {greetingName}</Text>
            <Text style={styles.wave}>☀️</Text>
          </View>
          <Text style={styles.subtitle}>
            Here&apos;s what&apos;s happening today
          </Text>

          <View style={styles.metricsGrid}>
            {topStats.map((item) => (
              <View
                key={item.label}
                style={[styles.metricBox, { backgroundColor: item.bg }]}
              >
                <View
                  style={[styles.metricIcon, { backgroundColor: item.accent }]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={22}
                    color="#fff"
                  />
                </View>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={styles.metricValue}>{item.value}</Text>
                <Text style={styles.metricChange}>
                  <Text style={{ color: item.accent }}>{item.change}</Text>
                  <Text style={{ color: "#64748B" }}> {item.changeLabel}</Text>
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.quickGrid}>
            {quickStats.map((stat) => (
              <View key={stat.label} style={styles.quickBox}>
                <View
                  style={[styles.quickIcon, { backgroundColor: stat.accent }]}
                >
                  <MaterialIcons
                    name={stat.icon as any}
                    size={17}
                    color="#fff"
                  />
                </View>
                <View style={styles.quickTextWrap}>
                  <Text style={styles.quickLabel}>{stat.label}</Text>
                  <Text style={styles.quickValue}>{stat.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.leftPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ATTENTION REQUIRED</Text>
              <Text style={styles.seeAll}>See all</Text>
            </View>

            <View style={styles.alertList}>
              {attentionCards.map((item) => (
                <View key={item.title} style={styles.alertItem}>
                  <View
                    style={[
                      styles.alertIcon,
                      {
                        backgroundColor:
                          item.tone === "warning" ? "#FDF2D7" : "#FEE2E2",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={18}
                      color={item.tone === "warning" ? "#F59E0B" : "#EF4444"}
                    />
                  </View>

                  <View style={styles.alertContent}>
                    <View style={styles.alertTextWrap}>
                      <Text style={styles.alertText}>{item.title}</Text>
                      <Text style={styles.alertSubText}>{item.subtitle}</Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#64748B"
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.supportBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>SUPPORT OVERVIEW</Text>
                <Text style={styles.seeAll}>See all</Text>
              </View>

              <View style={styles.supportGrid}>
                {supportOverview.map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.supportCard,
                      item.tone === "soft-red"
                        ? styles.softRed
                        : item.tone === "soft-blue"
                          ? styles.softBlue
                          : item.tone === "soft-orange"
                            ? styles.softOrange
                            : styles.softGreen,
                    ]}
                  >
                    <Text style={styles.supportValue}>{item.value}</Text>
                    <Text style={styles.supportLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.supportList}>
                {[
                  { text: "Unable to track my child", status: "High" },
                  { text: "Driver verification issue", status: "Medium" },
                  { text: "App not sending notifications", status: "Low" },
                ].map((item) => (
                  <View key={item.text} style={styles.supportRow}>
                    <View style={styles.supportDot} />
                    <Text style={styles.supportRowText}>{item.text}</Text>
                    <Text
                      style={[
                        styles.statusPill,
                        item.status === "High"
                          ? styles.statusHigh
                          : item.status === "Medium"
                            ? styles.statusMedium
                            : styles.statusLow,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>View All Tickets</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.rightPanel, { marginTop: 16 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LIVE TRIPS</Text>
              <Text style={styles.seeAll}>See all</Text>
            </View>

            <View style={styles.routeList}>
              {routeCards.map((route) => (
                <View key={route.route} style={styles.tripCard}>
                  <View style={styles.tripMeta}>
                    <View style={styles.statusDot} />
                    <Text style={styles.tripStatus}>{route.status}</Text>
                  </View>
                  <View style={styles.tripRow}>
                    <View style={styles.tripTextWrap}>
                      <Text style={styles.tripRoute}>Route: {route.route}</Text>
                      <Text style={styles.tripDriver}>
                        Driver: {route.driver}
                      </Text>
                      <Text style={styles.tripChildren}>{route.children}</Text>
                    </View>
                    <View style={styles.mapMini}>
                      <MaterialIcons name="map" size={42} color="#8BE2AD" />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.mapButton}>
              <MaterialIcons name="map" size={18} color="#fff" />
              <Text style={styles.mapButtonText}>View Live Map</Text>
            </TouchableOpacity>

            <View style={styles.chartCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PLATFORM ACTIVITY</Text>
                <Text style={styles.range}>30 Days</Text>
              </View>

              <View style={styles.chartLegend}>
                {["Users", "Children", "Trips"].map((item, index) => (
                  <View key={item} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendBullet,
                        {
                          backgroundColor: ["#10B981", "#3B82F6", "#F59E0B"][
                            index
                          ],
                        },
                      ]}
                    />
                    <Text style={styles.legendText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartArea}>
                {chartValues.map((value, index) => (
                  <View
                    key={`${value}-${index}`}
                    style={[
                      styles.chartBar,
                      {
                        height: 18 + value * 18,
                        backgroundColor:
                          index % 3 === 0
                            ? "#10B981"
                            : index % 3 === 1
                              ? "#3B82F6"
                              : "#F59E0B",
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.activityCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                <Text style={styles.seeAll}>See all</Text>
              </View>

              {recentActivity.map((item) => (
                <View key={item.title} style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItemActive}>
              <MaterialIcons name="home" size={24} color="#0F172A" />
              <Text style={styles.navTextActive}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <MaterialIcons name="location-on" size={24} color="#6B7280" />
              <Text style={styles.navText}>Live</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navCenterButton}>
              <MaterialIcons name="add" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <MaterialIcons name="support-agent" size={24} color="#6B7280" />
              <Text style={styles.navText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <MaterialIcons name="more-horiz" size={24} color="#6B7280" />
              <Text style={styles.navText}>More</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#BCE8B0",
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  scrollContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.4,
  },
  brandTextSecondary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationWrap: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 1,
    backgroundColor: "#F97316",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f3f6f7",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  wave: {
    fontSize: 24,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  metricBox: {
    width: "48%",
    borderRadius: 18,
    padding: 12,
    minHeight: 118,
    marginBottom: 8,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metricValue: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 10,
  },
  metricChange: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.38)",
    borderRadius: 18,
    padding: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  quickBox: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  quickTextWrap: {
    flex: 1,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  quickValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  contentGrid: {
    flexDirection: "row",
  },
  leftPanel: {
    flex: 1,
  },
  rightPanel: {
    flex: 1.08,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  seeAll: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "700",
  },
  alertList: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },
  alertIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  alertContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  alertText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  alertSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  supportBox: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 18,
    padding: 12,
  },
  supportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  supportCard: {
    width: "48%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  softRed: { backgroundColor: "#FEE2E2" },
  softBlue: { backgroundColor: "#DBEAFE" },
  softOrange: { backgroundColor: "#FDE68A" },
  softGreen: { backgroundColor: "#DCFCE7" },
  supportValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  supportLabel: {
    fontSize: 11,
    color: "#475569",
    marginTop: 3,
  },
  supportList: {
    marginTop: 6,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  supportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0EA5E9",
    marginRight: 8,
  },
  supportRowText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  statusPill: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusHigh: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  statusMedium: { backgroundColor: "#FEF3C7", color: "#B45309" },
  statusLow: { backgroundColor: "#DCFCE7", color: "#166534" },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: "#10B981",
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  routeList: {
    marginTop: 4,
  },
  tripCard: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  tripMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  tripStatus: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
  },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  tripTextWrap: {
    flex: 1,
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  tripDriver: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
  },
  tripChildren: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  mapMini: {
    width: 84,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#E8F8EF",
    alignItems: "center",
    justifyContent: "center",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#10B981",
    paddingVertical: 13,
    marginTop: 8,
    marginBottom: 18,
  },
  mapButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  range: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
  },
  chartLegend: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: "#475569",
    fontSize: 11,
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 8,
    paddingTop: 10,
  },
  chartBar: {
    flex: 1,
    borderRadius: 8,
    minHeight: 16,
  },
  activityCard: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 18,
    padding: 14,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  activitySubtitle: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: "#64748B",
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 18,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navItemActive: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navCenterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  navTextActive: {
    fontSize: 11,
    color: "#0F172A",
    marginTop: 2,
    fontWeight: "700",
  },
});
