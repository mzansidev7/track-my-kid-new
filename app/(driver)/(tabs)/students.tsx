import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";
import useDriverRoutes from "../driverHelpers/hooks/useDriverRoutes";

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const Students = () => {
  const { colors } = useTheme();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutes();
  const currentDate = new Date();
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const route = React.useMemo(() => {
    if (!routes.length) return null;

    const activeRoute = routes.find((candidate) => {
      const pickupStart = timeToMinutes(candidate.pickup_start_time);
      const pickupEnd = timeToMinutes(candidate.pickup_end_time);
      const dropoffStart = timeToMinutes(candidate.dropoff_start_time);
      const dropoffEnd = timeToMinutes(candidate.dropoff_end_time);

      const inPickupWindow =
        pickupStart !== null &&
        pickupEnd !== null &&
        currentMinutes >= pickupStart &&
        currentMinutes <= pickupEnd;
      const inDropoffWindow =
        dropoffStart !== null &&
        dropoffEnd !== null &&
        currentMinutes >= dropoffStart &&
        currentMinutes <= dropoffEnd;

      return inPickupWindow || inDropoffWindow;
    });

    return activeRoute || routes[0];
  }, [currentMinutes, routes]);
  const routeStops = route?.route_stops || [];
  const students = (route?.route_children || []).map((routeChild: any) => {
    const child = routeChild.children || {};
    const stop = routeStops.find(
      (routeStop) => routeStop.child_id === routeChild.child_id,
    );
    const isDropoff = stop?.stop_type === "dropoff";
    return {
      id: String(routeChild.child_id || child.id),
      name: [child.name, child.lastname].filter(Boolean).join(" ") || "Child",
      school:
        child.school_name || child.schools?.name || "School not specified",
      grade: child.grade || "Grade not specified",
      status:
        stop?.status === "completed"
          ? isDropoff
            ? "DROPPED OFF"
            : "ONBOARD"
          : stop?.status === "in_progress"
            ? "CURRENT STOP"
            : "WAITING",
      pickedUp: stop?.status === "completed" ? "Completed" : "Not completed",
      avatar: child.avatar || null,
      highlight: stop?.status === "in_progress",
    };
  });
  const completedCount = students.filter(
    (student) =>
      student.status === "ONBOARD" || student.status === "DROPPED OFF",
  ).length;
  const currentStop = students.find(
    (student) => student.status === "CURRENT STOP",
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {routesLoading ? (
          <Text style={{ color: colors.text.secondary, margin: 20 }}>
            Loading students...
          </Text>
        ) : routesError ? (
          <Text style={{ color: "#DC2626", margin: 20 }}>{routesError}</Text>
        ) : null}
        <View style={[styles.heroCard, { marginTop: 20 }]}>
          <View style={styles.heroIconCircle}>
            <MaterialIcons name="directions-bus" size={26} color="#0F9D58" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroLabel}>Current Route</Text>
            <Text style={styles.heroTitle}>
              {route?.route_name || "No route assigned"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {route?.start_location || "Route start"} →{" "}
              {route?.end_location || "Route end"}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {route ? "ASSIGNED" : "NO ROUTE"}
            </Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Children Onboard</Text>
            <Text style={styles.heroStatValue}>
              {completedCount} / {students.length}
            </Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Next Stop</Text>
            <Text style={styles.heroStatValue}>
              {currentStop?.school || "No current stop"}
            </Text>
            <Text style={styles.heroStatMeta}>
              {currentStop ? "Current stop" : "Waiting"}
            </Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Route Progress</Text>
            <Text style={styles.heroStatValue}>
              {students.length
                ? Math.round((completedCount / students.length) * 100)
                : 0}
              %
            </Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Distance Left</Text>
            <Text style={styles.heroStatValue}>{routeStops.length}</Text>
            <Text style={styles.heroStatMeta}>Stops</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabItem, styles.tabActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabText}>
              Waiting (
              {
                students.filter((student) => student.status === "WAITING")
                  .length
              }
              )
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Text style={styles.tabText}>
              Current (
              {
                students.filter((student) => student.status === "CURRENT STOP")
                  .length
              }
              )
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBanner}>
          <View style={styles.infoBadge}>
            <MaterialIcons name="shield" size={20} color="#0F9D58" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>
              {completedCount} of {students.length} stops completed
            </Text>
            <Text style={styles.infoSubtitle}>
              Route status: {route ? "assigned" : "not assigned"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => void refreshRoutes()}>
            <Text style={styles.infoAction}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {students.map((student) => (
            <View
              key={student.id}
              style={[
                styles.studentRow,
                student.highlight && {
                  backgroundColor: "rgba(15, 157, 88, 0.08)",
                  borderColor: "rgba(15, 157, 88, 0.18)",
                },
              ]}
            >
              {student.avatar ? (
                <Image
                  source={{ uri: student.avatar }}
                  style={styles.studentAvatar}
                />
              ) : (
                <View style={styles.studentAvatar}>
                  <MaterialIcons name="person" size={22} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentSchool}>{student.school}</Text>
                <Text style={styles.studentGrade}>{student.grade}</Text>
              </View>
              <View style={styles.studentMeta}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{student.status}</Text>
                </View>
                <Text style={styles.studentPickedUp}>{student.pickedUp}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.viewAllButton}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="groups" size={20} color="#0F9D58" />
            <Text style={styles.viewAllText}>View All Children</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#0F9D58" />
        </TouchableOpacity>

        <View style={styles.reminderCard}>
          <View style={styles.reminderIconBox}>
            <MaterialIcons name="safety-check" size={22} color="#F97316" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.reminderTitle}>Safety Reminder</Text>
            <Text style={styles.reminderText}>
              Please ensure all children are seated and wearing seatbelts.
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.text.secondary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Students;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "transparent",
  },
  topIconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  avatarShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#0F9D58",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#0F9D58",
    fontWeight: "700",
    fontSize: 12,
  },
  heroStats: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    textAlign: "center",
  },
  heroStatValue: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    fontSize: 15,
  },
  heroStatMeta: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,157,88,0.16)",
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "rgba(15,157,88,0.08)",
  },
  tabText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0F9D58",
  },
  infoBanner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(15, 157, 88, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
    flexDirection: "row",
    alignItems: "center",
  },
  infoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(15, 157, 88, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F9D58",
  },
  infoSubtitle: {
    fontSize: 12,
    color: "#065F46",
    marginTop: 4,
  },
  infoAction: {
    color: "#0F9D58",
    fontWeight: "700",
  },
  listCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.08)",
    overflow: "hidden",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 157, 88, 0.08)",
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  studentInfo: {
    flex: 1,
    paddingLeft: 14,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentSchool: {
    color: "#4B5563",
    marginTop: 4,
    fontSize: 13,
  },
  studentGrade: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 12,
  },
  studentMeta: {
    alignItems: "flex-end",
  },
  statusPill: {
    backgroundColor: "rgba(15, 157, 88, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    color: "#0F9D58",
    fontSize: 11,
    fontWeight: "700",
  },
  studentPickedUp: {
    color: "#0F9D58",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },
  viewAllButton: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0F9D58",
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 157, 58, 0.04)",
  },
  viewAllText: {
    color: "#0F9D58",
    fontWeight: "700",
    marginLeft: 8,
  },
  reminderCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFEDD5",
    flexDirection: "row",
    alignItems: "center",
  },
  reminderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(249, 115, 22, 0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  reminderText: {
    color: "#92400E",
    marginTop: 4,
    fontSize: 13,
  },
});
