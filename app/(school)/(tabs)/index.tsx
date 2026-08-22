import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../../context/authContext/auth-context";
import { useSchoolDashboard } from "../schoolHelpers/hooks/useSchoolDashboard";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type DashboardAction = {
  title: string;
  icon: IoniconName;
  color: string;
  screen: string;
};

type RecentTrip = {
  id: string;
  route: string;
  vehicle: string;
  driver: string;
  status: string;
  statusColor: string;
  time: string;
};

const SchoolDashboard = () => {
  const { user } = useAuth();
  const { school, students, routes, drivers, loading } = useSchoolDashboard();
  const userName =
    user?.userData?.first_name || user?.userData?.name || "there";

  console.log({ user: user?.userData, school, students, routes, drivers });
  const stats: (DashboardAction & { value: string })[] = [
    {
      title: "Students",
      value: String(students.length),
      icon: "people-outline",
      color: "#4285F4",
      screen: "Students",
    },
    {
      title: "Vehicles",
      value: String(
        routes.reduce(
          (count: number, route: any) =>
            count +
            (Array.isArray(route.assignments) ? route.assignments.length : 0),
          0,
        ),
      ),
      icon: "bus-outline",
      color: "#34A853",
      screen: "Vehicles",
    },
    {
      title: "Drivers",
      value: String(drivers.length),
      icon: "person-outline",
      color: "#FB8C00",
      screen: "Drivers",
    },
    {
      title: "Routes",
      value: String(routes.length),
      icon: "map-outline",
      color: "#8E44AD",
      screen: "Routes",
    },
  ];

  const quickActions: DashboardAction[] = [
    {
      title: "Students",
      icon: "people-outline",
      color: "#4285F4",
      screen: "Students",
    },
    {
      title: "Routes",
      icon: "map-outline",
      color: "#8E44AD",
      screen: "Routes",
    },
    {
      title: "Attendance",
      icon: "checkmark-circle-outline",
      color: "#34A853",
      screen: "Attendance",
    },
    {
      title: "Drivers",
      icon: "person-outline",
      color: "#FB8C00",
      screen: "Drivers",
    },
  ];

  const recentTrips: RecentTrip[] = routes.slice(0, 3).map((route: any) => {
    const assignment = route.assignments?.[0];
    const driver = assignment?.drivers?.users;
    return {
      id: route.id,
      route: route.route_name || "School route",
      vehicle: assignment?.vehicle_id ? "Assigned vehicle" : "No vehicle",
      driver: driver?.name || "No driver",
      status: assignment?.is_active === false ? "Inactive" : "Scheduled",
      statusColor: assignment?.is_active === false ? "#F39C12" : "#34A853",
      time: route.pickup_start_time || "--:--",
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.greeting}>{userName}</Text>

            <Text style={styles.schoolName}>
              {school?.name || "School Dashboard"}
            </Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={21} color="#222" />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* School Card */}
        <View style={styles.schoolCard}>
          <View style={styles.schoolIcon}>
            <Ionicons name="school-outline" size={24} color="#fff" />
          </View>

          <View style={styles.schoolInfo}>
            <Text style={styles.schoolTitle}>
              {school?.name || "School information"}
            </Text>
            <Text style={styles.schoolSubtitle}>
              {school?.emis_number
                ? `EMIS: ${school.emis_number}`
                : loading
                  ? "Loading school information..."
                  : "EMIS not set"}
            </Text>
          </View>
          <View style={styles.activeBadge}>
            {school?.is_active ? (
              <View style={styles.activeDot} />
            ) : (
              <View style={styles.notActiveDot} />
            )}

            {school?.is_active ? (
              <Text style={styles.activeText}>Active</Text>
            ) : (
              <Text style={styles.inActiveText}>Inactive</Text>
            )}
          </View>
        </View>
        <Text>{JSON.stringify(school)}</Text>

        {school?.is_active && school?.status === "pending" ? (
          <View
            style={{
              backgroundColor: "#FFF3CD",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#856404", fontSize: 12 }}>
              Your school is currently pending approval. Some features may be
              limited until approval is granted.
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#D4EDDA",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#155724", fontSize: 12 }}>
              Your school is approved and active. You have full access to all
              features.
            </Text>
            <Text style={{ color: "#155724", fontSize: 12 }}>
              Approved by: {school?.approved_by}
            </Text>
          </View>
        )}

        {/* Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>

          <TouchableOpacity>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.statCard}
              activeOpacity={0.8}
              // onPress={() => handleNavigate(item.screen)}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${item.color}15` },
                ]}
              >
                <Ionicons name={item.icon} size={19} color={item.color} />
              </View>

              <Text style={styles.statValue}>{item.value}</Text>

              <Text style={styles.statLabel}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>

        <View style={styles.actionsCard}>
          {quickActions.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.actionItem,
                index !== quickActions.length - 1 && styles.actionBorder,
              ]}
              // onPress={() => handleNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${item.color}15` },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>

              <Text style={styles.actionText}>{item.title}</Text>

              <Ionicons name="chevron-forward" size={16} color="#A0A0A0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Transport Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transport today</Text>

          <TouchableOpacity
          // onPress={() => handleNavigate("Trips")}
          >
            <Text style={styles.viewAll}>View trips</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transportCard}>
          <View style={styles.transportRow}>
            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>12</Text>
              <Text style={styles.transportLabel}>Trips</Text>
            </View>

            <View style={styles.verticalLine} />

            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>218</Text>
              <Text style={styles.transportLabel}>Students</Text>
            </View>

            <View style={styles.verticalLine} />

            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>9</Text>
              <Text style={styles.transportLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Recent Trips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent trips</Text>

          <TouchableOpacity
          // onPress={() => handleNavigate("Trips")}
          >
            <Text style={styles.viewAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripsCard}>
          {recentTrips.map((trip: RecentTrip, index: number) => (
            <TouchableOpacity
              key={trip.id}
              style={[
                styles.tripItem,
                index !== recentTrips.length - 1 && styles.tripBorder,
              ]}
              activeOpacity={0.7}
              // onPress={() => handleNavigate("Trips")}
            >
              <View style={styles.tripIcon}>
                <MaterialCommunityIcons name="bus" size={18} color="#4285F4" />
              </View>

              <View style={styles.tripInfo}>
                <Text style={styles.tripRoute}>{trip.route}</Text>

                <Text style={styles.tripDetails}>
                  {trip.vehicle} • {trip.driver}
                </Text>
              </View>

              <View style={styles.tripRight}>
                <Text style={styles.tripTime}>{trip.time}</Text>

                <View
                  style={[
                    styles.tripStatus,
                    {
                      backgroundColor: `${trip.statusColor}15`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: trip.statusColor },
                    ]}
                  />

                  <Text
                    style={[styles.statusText, { color: trip.statusColor }]}
                  >
                    {trip.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Attendance */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Attendance</Text>

          <TouchableOpacity
          // onPress={() => handleNavigate("Attendance")}
          >
            <Text style={styles.viewAll}>Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceCard}>
          <View style={styles.attendanceTop}>
            <View>
              <Text style={styles.attendanceTitle}>{`Today's attendance`}</Text>

              <Text style={styles.attendanceSubtitle}>21 August 2026</Text>
            </View>

            <Text style={styles.attendancePercentage}>94%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.attendanceStats}>
            <View>
              <Text style={styles.attendanceNumber}>230</Text>
              <Text style={styles.attendanceLabel}>Present</Text>
            </View>

            <View>
              <Text style={styles.attendanceNumber}>15</Text>
              <Text style={styles.attendanceLabel}>Absent</Text>
            </View>

            <View>
              <Text style={styles.attendanceNumber}>245</Text>
              <Text style={styles.attendanceLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SchoolDashboard;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerLeft: {
    flex: 1,
  },

  greeting: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },

  schoolName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#202124",
  },

  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EA4335",
  },

  /* School card */
  schoolCard: {
    backgroundColor: "#4285F4",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  schoolIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  schoolInfo: {
    flex: 1,
    marginLeft: 10,
  },

  schoolTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  schoolSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginTop: 3,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7CFF9B",
    marginRight: 5,
  },
  notActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF7C7C",
    marginRight: 5,
  },

  inActiveText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  activeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  viewAll: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4285F4",
  },

  /* Stats */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  statCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 11,
    minHeight: 100,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  statLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 1,
  },

  /* Quick actions */
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    marginBottom: 4,
    overflow: "hidden",
  },

  actionItem: {
    minHeight: 50,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  actionIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  actionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  /* Transport */
  transportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 14,
    marginBottom: 4,
  },

  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  transportItem: {
    flex: 1,
    alignItems: "center",
  },

  transportNumber: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },

  transportLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },

  verticalLine: {
    width: 1,
    height: 32,
    backgroundColor: "#EEEEEE",
  },

  /* Trips */
  tripsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    marginBottom: 4,
  },

  tripItem: {
    minHeight: 68,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  tripBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  tripIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  tripInfo: {
    flex: 1,
  },

  tripRoute: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
  },

  tripDetails: {
    fontSize: 9,
    color: "#888",
    marginTop: 3,
  },

  tripRight: {
    alignItems: "flex-end",
  },

  tripTime: {
    fontSize: 9,
    color: "#777",
    marginBottom: 4,
  },

  tripStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "600",
  },

  /* Attendance */
  attendanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 13,
  },

  attendanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  attendanceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
  },

  attendanceSubtitle: {
    fontSize: 9,
    color: "#888",
    marginTop: 3,
  },

  attendancePercentage: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34A853",
  },

  progressBackground: {
    height: 6,
    backgroundColor: "#EAEAEA",
    borderRadius: 5,
    marginTop: 12,
    overflow: "hidden",
  },

  progressFill: {
    width: "94%",
    height: "100%",
    backgroundColor: "#34A853",
    borderRadius: 5,
  },

  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  attendanceNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  attendanceLabel: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
});
