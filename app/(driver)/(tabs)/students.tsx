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
import { DRIVER_COLORS, useDriverTheme } from "@/styles/theme";
import useDriverRoutes, {
  deriveDriverStudentStatus,
  timeToMinutes,
} from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import DriverHeader from "../components/DriverHeader";

const Students = () => {
  const router = useRouter();
  const { colors } = useDriverTheme();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutes();
  const [selectedRouteId, setSelectedRouteId] = React.useState("all");
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "dropped_off" | "waiting" | "current" | "onboard" | "restricted"
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
  const routeSelectorItems = routes.map((assignedRoute) => {
    const routeChildren = assignedRoute.route_children || [];
    const activeCount = routeChildren.filter(
      (routeChild) => !routeChild.transport_restricted,
    ).length;
    return {
      route: assignedRoute,
      activeCount,
      pausedCount: routeChildren.length - activeCount,
    };
  });
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
      status:
        | ReturnType<typeof deriveDriverStudentStatus>["status"]
        | "NOT INCLUDED";
      onboard: boolean;
      transportRestricted: boolean;
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
      const childStatus = deriveDriverStudentStatus(
        childStops,
        assignedRoute,
        currentMinutes,
      );
      const student = studentsById.get(String(childId));
      if (student) {
        if (routeChild.transport_restricted) {
          student.transportRestricted = true;
          student.status = "NOT INCLUDED";
          student.onboard = false;
          student.pickedUp = "Payment outstanding";
          student.highlight = false;
          student.routeNames = new Set(["Not included in route"]);
        } else if (!student.transportRestricted) {
          student.routeNames.add(assignedRoute.route_name || "Assigned route");
        }
        continue;
      }
      studentsById.set(String(childId), {
        id: String(childId),
        name: [child.name, child.lastname].filter(Boolean).join(" ") || "Child",
        school:
          child.school_name || child.schools?.name || "School not specified",
        grade: child.grade || "Grade not specified",
        status: routeChild.transport_restricted
          ? "NOT INCLUDED"
          : childStatus.status,
        onboard: !routeChild.transport_restricted && childStatus.onboard,
        transportRestricted: Boolean(routeChild.transport_restricted),
        pickedUp: routeChild.transport_restricted
          ? "Payment outstanding"
          : childStatus.pickedUp
            ? "Picked up"
            : "Not picked up",
        avatar: child.avatar || null,
        highlight:
          !routeChild.transport_restricted &&
          childStatus.status === "CURRENT STOP",
        routeNames: new Set(
          routeChild.transport_restricted
            ? ["Not included in route"]
            : [assignedRoute.route_name || "Assigned route"],
        ),
      });
    }
  }
  const students = [...studentsById.values()].map((student) => ({
    ...student,
    routeName: [...student.routeNames].join(", "),
  }));
  const activeStudents = students.filter(
    (student) => !student.transportRestricted,
  );
  const restrictedCount = students.length - activeStudents.length;
  const onboardCount = activeStudents.filter((student) => student.onboard).length;
  const droppedOffCount = activeStudents.filter(
    (student) => student.status === "DROPPED OFF",
  ).length;
  const waitingCount = activeStudents.filter(
    (student) => student.status === "WAITING",
  ).length;
  const currentCount = activeStudents.filter(
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
    if (selectedFilter === "restricted") return student.transportRestricted;
    if (student.transportRestricted) return false;
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
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconCircle}>
              <MaterialIcons
                name={selectedRouteId === "all" ? "directions-bus" : "route"}
                size={24}
                color={DRIVER_COLORS.cyan}
              />
            </View>
            <View style={styles.heroHeading}>
              <Text style={styles.heroLabel}>
                {selectedRouteId === "all" ? "DRIVER OVERVIEW" : "SELECTED ROUTE"}
              </Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {selectedRouteId === "all"
                  ? `${routes.length} assigned route${routes.length === 1 ? "" : "s"}`
                  : route?.route_name || "No route assigned"}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={2}>
                {selectedRouteId === "all"
                  ? "Your students across all assigned routes"
                  : `${route?.start_location || "Route start"} → ${route?.end_location || "Route end"}`}
              </Text>
            </View>
            <View
              style={[
                styles.heroBadge,
                !displayRoutes.length && styles.heroBadgeInactive,
              ]}
            >
              <View
                style={[
                  styles.heroBadgeDot,
                  !displayRoutes.length && styles.heroBadgeDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.heroBadgeText,
                  !displayRoutes.length && styles.heroBadgeTextInactive,
                ]}
              >
                {displayRoutes.length ? "ASSIGNED" : "NO ROUTE"}
              </Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroSummary}>
            <View style={styles.heroSummaryItem}>
              <MaterialIcons name="groups" size={18} color={DRIVER_COLORS.cyan} />
              <Text style={styles.heroSummaryValue}>{activeStudents.length}</Text>
              <Text style={styles.heroSummaryLabel}>active students</Text>
            </View>
            {restrictedCount > 0 ? (
              <View style={styles.heroSummaryItem}>
                <MaterialIcons
                  name="payments"
                  size={17}
                  color={DRIVER_COLORS.warning}
                />
                <Text style={[styles.heroSummaryValue, styles.restrictedText]}>
                  {restrictedCount}
                </Text>
                <Text style={styles.heroSummaryLabel}>transport paused</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.selectorHeading}>
          <Text style={styles.selectorTitle}>ROUTES</Text>
          <Text style={styles.selectorCount}>
            {routes.length} assigned
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.routeSelector}
        >
          <TouchableOpacity
            onPress={() => setSelectedRouteId("all")}
            style={[
              styles.routeChip,
              selectedRouteId === "all" && styles.routeChipActive,
            ]}
          >
            <View style={styles.routeChipHeading}>
              <MaterialIcons
                name="apps"
                size={16}
                color={
                  selectedRouteId === "all"
                    ? DRIVER_COLORS.white
                    : DRIVER_COLORS.primary
                }
              />
              <Text
                style={[
                  styles.routeChipText,
                  selectedRouteId === "all" && styles.routeChipTextActive,
                ]}
                numberOfLines={1}
              >
                All routes
              </Text>
              {selectedRouteId === "all" ? (
                <MaterialIcons
                  name="check-circle"
                  size={15}
                  color={DRIVER_COLORS.white}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.routeChipMeta,
                selectedRouteId === "all" && styles.routeChipTextActive,
              ]}
            >
              {activeStudents.length} active
              {restrictedCount > 0 ? ` · ${restrictedCount} paused` : ""}
            </Text>
          </TouchableOpacity>
          {routeSelectorItems.map(
            ({ route: assignedRoute, activeCount, pausedCount }) => {
              const selected = selectedRouteId === assignedRoute.id;
              return (
                <TouchableOpacity
                  key={assignedRoute.id}
                  onPress={() => setSelectedRouteId(assignedRoute.id)}
                  style={[
                    styles.routeChip,
                    selected && styles.routeChipActive,
                  ]}
                >
                  <View style={styles.routeChipHeading}>
                    <MaterialIcons
                      name="alt-route"
                      size={16}
                      color={
                        selected ? DRIVER_COLORS.white : DRIVER_COLORS.primary
                      }
                    />
                    <Text
                      style={[
                        styles.routeChipText,
                        selected && styles.routeChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {assignedRoute.route_name || "Route"}
                    </Text>
                    {selected ? (
                      <MaterialIcons
                        name="check-circle"
                        size={15}
                        color={DRIVER_COLORS.white}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.routeChipMeta,
                      selected && styles.routeChipTextActive,
                    ]}
                  >
                    {activeCount} active
                    {pausedCount > 0 ? ` · ${pausedCount} paused` : ""}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
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

        <View style={[styles.selectorHeading, styles.studentFilterHeading]}>
          <Text style={styles.selectorTitle}>STUDENT STATUS</Text>
          <Text style={styles.selectorCount}>
            {visibleStudents.length} shown
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
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
          {restrictedCount > 0 ? (
            <TouchableOpacity
              style={[
                styles.tabItem,
                styles.restrictedTab,
                selectedFilter === "restricted" && styles.restrictedTabActive,
              ]}
              onPress={() => setSelectedFilter("restricted")}
            >
              <Text
                style={[
                  styles.tabText,
                  styles.restrictedTabText,
                  selectedFilter === "restricted" &&
                    styles.restrictedTabTextActive,
                ]}
              >
                Payment paused ({restrictedCount})
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {restrictedCount > 0 ? (
          <View style={styles.paymentNotice}>
            <MaterialIcons
              name="payments"
              size={19}
              color={DRIVER_COLORS.warning}
            />
            <View style={styles.paymentNoticeContent}>
              <Text style={styles.paymentNoticeTitle}>
                Transport paused for {restrictedCount} student
                {restrictedCount === 1 ? "" : "s"}
              </Text>
              <Text style={styles.paymentNoticeText}>
                Outstanding payments mean these students are not included in
                route stops.
              </Text>
            </View>
          </View>
        ) : null}

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
                    backgroundColor: DRIVER_COLORS.successSurface,
                    borderColor: DRIVER_COLORS.cardBorder,
                  },
                  student.transportRestricted && styles.restrictedStudentRow,
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
                  <View
                    style={[
                      styles.statusPill,
                      student.transportRestricted &&
                        styles.restrictedStatusPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        student.transportRestricted &&
                          styles.restrictedStatusPillText,
                      ]}
                    >
                      {student.status}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.studentPickedUp,
                      student.transportRestricted &&
                        styles.restrictedStudentPickedUp,
                    ]}
                  >
                    {student.pickedUp}
                  </Text>
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
            <MaterialIcons
              name="groups"
              size={20}
              color={DRIVER_COLORS.primary}
            />
            <Text style={styles.viewAllText}>View All Children</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={DRIVER_COLORS.primary}
          />
        </TouchableOpacity>

        <View style={styles.reminderCard}>
          <View style={styles.reminderIconBox}>
            <MaterialIcons
              name="safety-check"
              size={22}
              color={DRIVER_COLORS.warning}
            />
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
    color: DRIVER_COLORS.muted,
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroHeading: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    height: 1,
    backgroundColor: DRIVER_COLORS.cardBorder,
    marginVertical: 16,
  },
  heroSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  heroSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroSummaryValue: {
    color: DRIVER_COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  heroSummaryLabel: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
  },
  restrictedText: {
    color: DRIVER_COLORS.warning,
  },
  selectorHeading: {
    marginTop: 20,
    marginHorizontal: 18,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorTitle: {
    color: DRIVER_COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  selectorCount: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  studentFilterHeading: {
    marginTop: 16,
  },
  routeSelector: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  routeChip: {
    minWidth: 142,
    maxWidth: 220,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
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
    flex: 1,
  },
  routeChipHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: DRIVER_COLORS.primaryDark,
    justifyContent: "center",
    alignItems: "center",
  },
  heroLabel: {
    color: DRIVER_COLORS.cyan,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  heroTitle: {
    color: DRIVER_COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: DRIVER_COLORS.muted,
    marginTop: 4,
    fontSize: 11,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DRIVER_COLORS.successSurface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroBadgeInactive: {
    backgroundColor: DRIVER_COLORS.neutralSurface,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DRIVER_COLORS.success,
  },
  heroBadgeDotInactive: {
    backgroundColor: DRIVER_COLORS.muted,
  },
  heroBadgeText: {
    color: DRIVER_COLORS.success,
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  heroBadgeTextInactive: {
    color: DRIVER_COLORS.muted,
  },
  heroStats: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    gap: 8,
    shadowColor: "#000000",
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
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
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
    backgroundColor: DRIVER_COLORS.successSurface,
  },
  heroStatIconBlue: {
    backgroundColor: DRIVER_COLORS.infoSurface,
  },
  heroStatIconPurple: {
    backgroundColor: DRIVER_COLORS.surfaceRaised,
  },
  heroStatIconOrange: {
    backgroundColor: DRIVER_COLORS.warningSurface,
  },
  heroStatLabel: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  heroStatValue: {
    color: DRIVER_COLORS.text,
    fontWeight: "800",
    marginTop: 1,
    fontSize: 18,
    lineHeight: 23,
    width: "100%",
  },
  heroStatMeta: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  progressTrack: {
    height: 5,
    width: "100%",
    borderRadius: 999,
    backgroundColor: DRIVER_COLORS.cardBorder,
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
  restrictedTab: {
    borderColor: DRIVER_COLORS.warning,
    backgroundColor: DRIVER_COLORS.warningSurface,
  },
  restrictedTabActive: {
    backgroundColor: DRIVER_COLORS.warning,
    borderColor: DRIVER_COLORS.warning,
  },
  restrictedTabText: {
    color: DRIVER_COLORS.warning,
  },
  restrictedTabTextActive: {
    color: DRIVER_COLORS.background,
  },
  paymentNotice: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242, 184, 75, 0.4)",
    backgroundColor: DRIVER_COLORS.warningSurface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  paymentNoticeContent: {
    flex: 1,
  },
  paymentNoticeTitle: {
    color: DRIVER_COLORS.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  paymentNoticeText: {
    color: DRIVER_COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  infoBanner: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  infoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: DRIVER_COLORS.successSurface,
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
  restrictedStudentRow: {
    backgroundColor: DRIVER_COLORS.warningSurface,
    borderBottomColor: DRIVER_COLORS.cardBorder,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: DRIVER_COLORS.successSurface,
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
    backgroundColor: DRIVER_COLORS.successSurface,
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
  restrictedStatusPill: {
    backgroundColor: DRIVER_COLORS.warning,
  },
  restrictedStatusPillText: {
    color: DRIVER_COLORS.background,
  },
  restrictedStudentPickedUp: {
    color: DRIVER_COLORS.warning,
    maxWidth: 110,
    textAlign: "right",
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
    backgroundColor: DRIVER_COLORS.warningSurface,
    flexDirection: "row",
    alignItems: "center",
  },
  reminderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(242, 184, 75, 0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DRIVER_COLORS.warning,
  },
  reminderText: {
    color: DRIVER_COLORS.warning,
    marginTop: 4,
    fontSize: 13,
  },
});
