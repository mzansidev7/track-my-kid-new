import React from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DRIVER_COLORS, useTheme } from "@/styles/theme";
import useDriverRoutes, {
  deriveDriverStudentStatus,
} from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import DriverHeader from "../components/DriverHeader";

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const Students = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutes();
  const [selectedRouteId, setSelectedRouteId] = React.useState("all");
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "dropped_off" | "waiting" | "current" | "onboard"
  >("all");
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const currentDate = new Date(currentTime);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const activeRoute = React.useMemo(() => {
    return routes.find((candidate) => {
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
  }, [currentMinutes, routes]);
  const displayRoutes =
    selectedRouteId === "all"
      ? routes
      : routes.filter((candidate) => candidate.id === selectedRouteId);
  const route =
    displayRoutes.find((candidate) => candidate.id === activeRoute?.id) ||
    displayRoutes[0] ||
    null;
  const routeStops = displayRoutes.flatMap(
    (displayRoute) => displayRoute.route_stops || [],
  );
  const currentRouteStops = route?.route_stops || [];
  const dropoffStart = timeToMinutes(route?.dropoff_start_time);
  const routeStopType =
    dropoffStart !== null && currentMinutes >= dropoffStart
      ? "dropoff"
      : "pickup";
  const studentRoutes = route
    ? [route, ...displayRoutes.filter((candidate) => candidate.id !== route.id)]
    : displayRoutes;
  const studentsById = new Map<
    string,
    {
      id: string;
      name: string;
      school: string;
      grade: string;
      status: ReturnType<typeof deriveDriverStudentStatus>["status"];
      onboard: boolean;
      pickedUp: string;
      avatar: string | null;
      highlight: boolean;
      routeNames: Set<string>;
    }
  >();
  for (const assignedRoute of studentRoutes) {
    for (const routeChild of assignedRoute.route_children || []) {
      const child = routeChild.children || {};
      const childId = routeChild.child_id || child.id;
      if (!childId) continue;
      const childStops = (assignedRoute.route_stops || []).filter(
        (routeStop) => routeStop.child_id === childId,
      );
      const childStatus = deriveDriverStudentStatus(childStops);
      const student = studentsById.get(String(childId));
      if (student) {
        student.routeNames.add(assignedRoute.route_name || "Assigned route");
        continue;
      }
      studentsById.set(String(childId), {
        id: String(childId),
        name: [child.name, child.lastname].filter(Boolean).join(" ") || "Child",
        school:
          child.school_name || child.schools?.name || "School not specified",
        grade: child.grade || "Grade not specified",
        status: childStatus.status,
        onboard: childStatus.onboard,
        pickedUp: childStatus.pickedUp ? "Picked up" : "Not picked up",
        avatar: child.avatar || null,
        highlight: Boolean(childStatus.currentStop),
        routeNames: new Set([assignedRoute.route_name || "Assigned route"]),
      });
    }
  }
  const students = [...studentsById.values()].map((student) => ({
    ...student,
    routeName: [...student.routeNames].join(", "),
  }));
  const onboardCount = students.filter((student) => student.onboard).length;
  const droppedOffCount = students.filter(
    (student) => student.status === "DROPPED OFF",
  ).length;
  const waitingCount = students.filter(
    (student) => student.status === "WAITING",
  ).length;
  const currentCount = students.filter(
    (student) => student.status === "CURRENT STOP",
  ).length;
  const completedStopCount = routeStops.filter((stop) =>
    ["completed", "skipped"].includes(stop.status || ""),
  ).length;
  const remainingStopCount = Math.max(
    0,
    routeStops.length - completedStopCount,
  );
  const routeProgress = students.length
    ? Math.round((completedStopCount / Math.max(1, routeStops.length)) * 100)
    : 0;
  const visibleStudents = students.filter((student) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "dropped_off")
      return student.status === "DROPPED OFF";
    if (selectedFilter === "waiting") return student.status === "WAITING";
    if (selectedFilter === "current") return student.status === "CURRENT STOP";
    return student.onboard;
  });
  const nextRouteStop =
    currentRouteStops.find(
      (stop) =>
        stop.stop_type === routeStopType && stop.status === "in_progress",
    ) ||
    currentRouteStops.find(
      (stop) =>
        stop.stop_type === routeStopType &&
        !["completed", "skipped"].includes(stop.status || ""),
    );
  const nextStopStudent = students.find(
    (student) => student.id === nextRouteStop?.child_id,
  );
  const nextStopChild = route?.route_children?.find(
    (routeChild) => routeChild.child_id === nextRouteStop?.child_id,
  )?.children;
  const nextStopName =
    [nextStopChild?.name, nextStopChild?.lastname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    nextStopStudent?.name ||
    (nextRouteStop?.address &&
    !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(nextRouteStop.address.trim())
      ? nextRouteStop.address
      : "Unnamed stop");

  if (routesLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: DRIVER_COLORS.background }]}
      >
        <DriverHeader
          title="Students"
          subtitle="Manage your assigned students and their routes"
          showBackButton
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.text.secondary, margin: 20 }}>
            Loading students...
          </Text>
          <ActivityIndicator size="large" color={DRIVER_COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (routesError) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: DRIVER_COLORS.background }]}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <DriverHeader
            title="Students"
            subtitle="Manage your assigned students and their routes"
            showBackButton
          />
          <Text style={{ color: colors.text.secondary, margin: 20 }}>
            {routesError}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void refreshRoutes(true)}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: DRIVER_COLORS.background }]}
    >
      <DriverHeader
        title="Students"
        subtitle="Manage your assigned students and their routes"
        showBackButton
        showNotifications
        onRightPress={() => router.push("/(driver)/pages/notifications")}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { marginTop: 8 }]}>
          <View style={styles.heroIconCircle}>
            <MaterialIcons
              name="directions-bus"
              size={26}
              color={DRIVER_COLORS.cyan}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroLabel}>
              {selectedRouteId === "all" ? "Assigned routes" : "Selected route"}
            </Text>
            <Text style={styles.heroTitle}>
              {selectedRouteId === "all"
                ? `${routes.length} route${routes.length === 1 ? "" : "s"}`
                : route?.route_name || "No route assigned"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {selectedRouteId === "all"
                ? `${students.length} unique students across your routes`
                : `${route?.start_location || "Route start"} → ${route?.end_location || "Route end"}`}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {displayRoutes.length ? "ASSIGNED" : "NO ROUTE"}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.routeSelector}
        >
          <TouchableOpacity
            style={[
              styles.tabItem,
              selectedFilter === "all" && styles.tabActive,
            ]}
            onPress={() => setSelectedFilter("all")}
          >
            <Text
              style={[
                styles.tabText,
                selectedFilter === "all" && styles.tabTextActive,
              ]}
            >
              All ({students.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedRouteId("all")}
            style={[
              styles.routeChip,
              selectedRouteId === "all" && styles.routeChipActive,
            ]}
          >
            <Text
              style={[
                styles.routeChipText,
                selectedRouteId === "all" && styles.routeChipTextActive,
              ]}
            >
              All routes ({routes.length})
            </Text>
          </TouchableOpacity>
          {routes.map((assignedRoute) => (
            <TouchableOpacity
              key={assignedRoute.id}
              onPress={() => setSelectedRouteId(assignedRoute.id)}
              style={[
                styles.routeChip,
                selectedRouteId === assignedRoute.id && styles.routeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.routeChipText,
                  selectedRouteId === assignedRoute.id &&
                    styles.routeChipTextActive,
                ]}
                numberOfLines={1}
              >
                {assignedRoute.route_name || "Route"}
              </Text>
              <Text
                style={[
                  styles.routeChipMeta,
                  selectedRouteId === assignedRoute.id &&
                    styles.routeChipTextActive,
                ]}
              >
                {assignedRoute.route_children?.length || 0} students
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <View style={styles.heroStatHeading}>
              <View style={[styles.heroStatIcon, styles.heroStatIconGreen]}>
                <MaterialIcons
                  name="groups"
                  size={18}
                  color={DRIVER_COLORS.primary}
                />
              </View>
              <Text style={styles.heroStatLabel}>Students onboard</Text>
            </View>
            <Text style={styles.heroStatValue}>{onboardCount}</Text>
            <Text style={styles.heroStatMeta}>Currently with you</Text>
          </View>

          <View style={styles.heroStatItem}>
            <View style={styles.heroStatHeading}>
              <View style={[styles.heroStatIcon, styles.heroStatIconBlue]}>
                <MaterialIcons
                  name="near-me"
                  size={18}
                  color="#2563EB"
                />
              </View>
              <Text style={styles.heroStatLabel}>Next stop</Text>
            </View>
            <Text style={styles.heroStatValue} numberOfLines={2}>
              {nextRouteStop ? nextStopName : "No upcoming stop"}
            </Text>
            <Text style={styles.heroStatMeta}>
              {nextRouteStop?.status === "in_progress"
                ? "Current stop"
                : nextRouteStop
                  ? "Up next"
                  : "Route complete"}
            </Text>
          </View>

          <View style={styles.heroStatItem}>
            <View style={styles.heroStatHeading}>
              <View style={[styles.heroStatIcon, styles.heroStatIconPurple]}>
                <MaterialIcons
                  name="trending-up"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <Text style={styles.heroStatLabel}>Route progress</Text>
            </View>
            <Text style={styles.heroStatValue}>{routeProgress}%</Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${routeProgress}%` }]}
              />
            </View>
          </View>

          <View style={styles.heroStatItem}>
            <View style={styles.heroStatHeading}>
              <View style={[styles.heroStatIcon, styles.heroStatIconOrange]}>
                <MaterialIcons
                  name="pin-drop"
                  size={18}
                  color="#EA580C"
                />
              </View>
              <Text style={styles.heroStatLabel}>Stops left</Text>
            </View>
            <Text style={styles.heroStatValue}>{remainingStopCount}</Text>
            <Text style={styles.heroStatMeta}>of {routeStops.length} stops</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          <TouchableOpacity
            style={[
              styles.tabItem,
              selectedFilter === "dropped_off" && styles.tabActive,
            ]}
            onPress={() => setSelectedFilter("dropped_off")}
          >
            <Text
              style={[
                styles.tabText,
                selectedFilter === "dropped_off" && styles.tabTextActive,
              ]}
            >
              Dropped off ({droppedOffCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabItem,
              selectedFilter === "waiting" && styles.tabActive,
            ]}
            onPress={() => setSelectedFilter("waiting")}
          >
            <Text
              style={[
                styles.tabText,
                selectedFilter === "waiting" && styles.tabTextActive,
              ]}
            >
              Waiting ({waitingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabItem,
              selectedFilter === "current" && styles.tabActive,
            ]}
            onPress={() => setSelectedFilter("current")}
          >
            <Text
              style={[
                styles.tabText,
                selectedFilter === "current" && styles.tabTextActive,
              ]}
            >
              Current ({currentCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabItem,
              selectedFilter === "onboard" && styles.tabActive,
            ]}
            onPress={() => setSelectedFilter("onboard")}
          >
            <Text
              style={[
                styles.tabText,
                selectedFilter === "onboard" && styles.tabTextActive,
              ]}
            >
              Onboard ({onboardCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.infoBanner}>
          <View style={styles.infoBadge}>
            <MaterialIcons
              name="shield"
              size={20}
              color={DRIVER_COLORS.primary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>
              {completedStopCount} of {routeStops.length} stops completed
            </Text>
            <Text style={styles.infoSubtitle}>
              {selectedRouteId === "all"
                ? `${displayRoutes.length} assigned route${displayRoutes.length === 1 ? "" : "s"}`
                : `Route: ${route?.route_name || "not assigned"}`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => void refreshRoutes()}>
            <Text style={styles.infoAction}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {visibleStudents.length === 0 ? (
            <Text style={styles.emptyState}>
              No children in this category right now.
            </Text>
          ) : (
            visibleStudents.map((student) => (
              <View
                key={student.id}
                style={[
                  styles.studentRow,
                  student.highlight && {
                    backgroundColor: "#EAF2ED",
                    borderColor: DRIVER_COLORS.cardBorder,
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
                  <Text style={styles.studentRoute} numberOfLines={1}>
                    {student.routeName}
                  </Text>
                  <Text style={styles.studentGrade}>{student.grade}</Text>
                </View>
                <View style={styles.studentMeta}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{student.status}</Text>
                  </View>
                  <Text style={styles.studentPickedUp}>{student.pickedUp}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => void refreshRoutes(true)}
        >
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
  retryButton: {
    alignSelf: "flex-start",
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: DRIVER_COLORS.primary,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
    paddingBottom: 116,
  },
  emptyState: {
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    backgroundColor: DRIVER_COLORS.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeSelector: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  routeChip: {
    minWidth: 112,
    maxWidth: 190,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    backgroundColor: DRIVER_COLORS.card,
  },
  routeChipActive: {
    backgroundColor: DRIVER_COLORS.primary,
    borderColor: DRIVER_COLORS.primary,
  },
  routeChipText: {
    color: DRIVER_COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  routeChipTextActive: {
    color: DRIVER_COLORS.white,
  },
  routeChipMeta: {
    color: DRIVER_COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: DRIVER_COLORS.card,
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
    backgroundColor: DRIVER_COLORS.card,
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
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },
  heroStatItem: {
    flexBasis: "45%",
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 116,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: "#E7EFEA",
  },
  heroStatHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  heroStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatIconGreen: {
    backgroundColor: "#E4F5EC",
  },
  heroStatIconBlue: {
    backgroundColor: "#EAF1FF",
  },
  heroStatIconPurple: {
    backgroundColor: "#F1EAFE",
  },
  heroStatIconOrange: {
    backgroundColor: "#FFF0E5",
  },
  heroStatLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  heroStatValue: {
    color: "#17385F",
    fontWeight: "800",
    marginTop: 1,
    fontSize: 18,
    lineHeight: 23,
    width: "100%",
  },
  heroStatMeta: {
    color: "#8492A6",
    fontSize: 11,
    marginTop: 3,
  },
  progressTrack: {
    height: 5,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#E3EAE6",
    overflow: "hidden",
    marginTop: 7,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: DRIVER_COLORS.primary,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DRIVER_COLORS.card,
    borderColor: DRIVER_COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 13,
  },
  tabActive: {
    backgroundColor: DRIVER_COLORS.primary,
    borderColor: DRIVER_COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: DRIVER_COLORS.muted,
    fontWeight: "600",
  },
  tabTextActive: {
    color: DRIVER_COLORS.white,
  },
  infoBanner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#EAF2ED",
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  infoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E2F2E9",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: DRIVER_COLORS.primary,
  },
  infoSubtitle: {
    fontSize: 12,
    color: DRIVER_COLORS.muted,
    marginTop: 4,
  },
  infoAction: {
    color: DRIVER_COLORS.primary,
    fontWeight: "700",
  },
  listCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    overflow: "hidden",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DRIVER_COLORS.cardBorder,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EAF2ED",
    justifyContent: "center",
    alignItems: "center",
  },
  studentInfo: {
    flex: 1,
    paddingLeft: 14,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: DRIVER_COLORS.text,
  },
  studentSchool: {
    color: DRIVER_COLORS.muted,
    marginTop: 4,
    fontSize: 13,
  },
  studentGrade: {
    color: DRIVER_COLORS.muted,
    marginTop: 2,
    fontSize: 12,
  },
  studentRoute: {
    color: DRIVER_COLORS.primary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  studentMeta: {
    alignItems: "flex-end",
  },
  statusPill: {
    backgroundColor: "#E2F2E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    color: DRIVER_COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  studentPickedUp: {
    color: DRIVER_COLORS.primary,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },
  viewAllButton: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: DRIVER_COLORS.card,
  },
  viewAllText: {
    color: DRIVER_COLORS.primary,
    fontWeight: "700",
    marginLeft: 8,
  },
  reminderCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFF4E1",
    flexDirection: "row",
    alignItems: "center",
  },
  reminderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(213, 138, 22, 0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#80510E",
  },
  reminderText: {
    color: "#80510E",
    marginTop: 4,
    fontSize: 13,
  },
});
