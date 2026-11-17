import React from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import DriverMainHeader from "../components/DriverMainHeader";
import DriverStatusCard from "../components/DriverStatusCard";
import DriverQuickActions from "../components/DriverQuickActions";
import DriverRouteCard from "../components/DriverRouteCard";
import DriverStudentsCard from "../components/DriverStudentsCard";
import { SafeAreaView } from "react-native-safe-area-context";
import AppNotification from "@/components/Notification";
import { useDriverNotifications } from "@/app-support/driver/driverHelpers/hooks/useDriverNotifications";
import { useDriverProfile } from "@/app-support/driver/driverHelpers/hooks/useDriverProfile";
import useDriverRoutesQuery, {
  deriveDriverStudentStatus,
  timeToMinutes,
} from "@/app-support/driver/driverHelpers/hooks/useDriverRoutes";
import { useDriverTracking } from "@/app-support/driver/driverHelpers/hooks/useDriverTracking";
import { DRIVER_COLORS, useDriverTheme } from "@/styles/theme";

type DashboardStudentStatus =
  | "picked_up"
  | "waiting"
  | "dropped_off"
  | "scheduled"
  | "not_picked_up"
  | "trip_incomplete"
  | "at_stop"
  | "schedule_unavailable"
  | "not_included";

type DashboardStudent = {
  id: string;
  name: string;
  school: string;
  routeName: string;
  status: DashboardStudentStatus;
};

const DriverHome = () => {
  const { colors } = useDriverTheme();

  const { driver, loading, error, refreshDriver } = useDriverProfile();
  const { routes, routesLoading, routesError, refreshRoutes } =
    useDriverRoutesQuery();
  const router = useRouter();
  const { notifications, unreadCount } = useDriverNotifications();
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const [sosSending, setSosSending] = React.useState(false);
  const sosSendingRef = React.useRef(false);
  const [sosNotification, setSosNotification] = React.useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "warning",
  });
  const [sosReplyToast, setSosReplyToast] = React.useState("");
  const handledSosNotification = React.useRef<string | null>(null);
  const blinkAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const latestSosNotification = notifications.find((notification) =>
      /sos/i.test(notification.title || ""),
    );
    if (
      !latestSosNotification?.id ||
      handledSosNotification.current === latestSosNotification.id
    ) {
      return;
    }
    handledSosNotification.current = latestSosNotification.id;
    const createdAt = latestSosNotification.created_at
      ? new Date(latestSosNotification.created_at).getTime()
      : 0;
    if (createdAt && Date.now() - createdAt < 5 * 60 * 1000) {
      setTimeout(() => setSosReplyToast(latestSosNotification.title), 0);
    }
  }, [notifications]);

  const currentDate = new Date(currentTime);
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
  const pickupStart = timeToMinutes(route?.pickup_start_time);
  const pickupEnd = timeToMinutes(route?.pickup_end_time);
  const dropoffStart = timeToMinutes(route?.dropoff_start_time);
  const dropoffEnd = timeToMinutes(route?.dropoff_end_time);
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
  const routeType = inDropoffWindow ? "dropoff" : "pickup";
  const routeWindowActive = inPickupWindow || inDropoffWindow;
  const activeWindowStops = (route?.route_stops || []).filter(
    (stop) => stop.stop_type === routeType,
  );
  const activeWindowCompleted =
    routeWindowActive &&
    activeWindowStops.length > 0 &&
    activeWindowStops.every((stop) =>
      ["completed", "skipped"].includes(stop.status || ""),
    );
  const canStartTrip = routeWindowActive && !activeWindowCompleted;
  const {
    online,
    busy: trackingBusy,
    error: trackingError,
    sendEmergencyAlert,
  } = useDriverTracking(route?.id, routeType);

  const shouldBlink = canStartTrip && !online;

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (shouldBlink) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      blinkAnim.setValue(0);
    }
  }, [shouldBlink, blinkAnim]);
  const studentRoutes = route
    ? [
        route,
        ...routes.filter((assignedRoute) => assignedRoute.id !== route.id),
      ]
    : routes;
  const studentsById = new Map<string, DashboardStudent>();
  for (const assignedRoute of studentRoutes) {
    for (const routeChild of assignedRoute.route_children || []) {
      const child = routeChild.children || {};
      const childId = routeChild.child_id || child.id;
      if (!childId) continue;
      const childStops = (assignedRoute.route_stops || []).filter(
        (routeStop: any) => routeStop.child_id === childId,
      );
      const childStatus = deriveDriverStudentStatus(
        childStops,
        assignedRoute,
        currentMinutes,
      );
      const school = Array.isArray(child.schools)
        ? child.schools[0]
        : child.schools;

      const existingStudent = studentsById.get(String(childId));
      if (existingStudent) {
        const routeNames = new Set([
          ...existingStudent.routeName.split(", "),
          assignedRoute.route_name || "Assigned route",
        ]);
        studentsById.set(String(childId), {
          ...existingStudent,
          routeName: [...routeNames].join(", "),
        });
        continue;
      }

      studentsById.set(String(childId), {
        id: String(childId),
        name: [child.name, child.lastname].filter(Boolean).join(" ") || "Child",
        school: child.school_name || school?.name || "School not specified",
        routeName: assignedRoute.route_name || "Assigned route",
        status:
          routeChild.transport_restricted
            ? "not_included"
            : childStatus.status === "DROPPED OFF"
            ? "dropped_off"
            : childStatus.status === "ONBOARD"
              ? "picked_up"
              : childStatus.status === "CURRENT STOP"
                ? "at_stop"
                : childStatus.status === "SCHEDULED"
                  ? "scheduled"
                  : childStatus.status === "NOT PICKED UP"
                    ? "not_picked_up"
                    : childStatus.status === "TRIP INCOMPLETE"
                      ? "trip_incomplete"
                      : childStatus.status === "SCHEDULE UNAVAILABLE"
                        ? "schedule_unavailable"
                        : "waiting",
      });
    }
  }
  const students = [...studentsById.values()];

  const handleSubtitle = () => {
    if (students.some((student) => student.status === "trip_incomplete")) {
      return "A trip is incomplete. Review the route in Trips.";
    }

    if (
      students.some(
        (student) =>
          student.status === "waiting" || student.status === "not_picked_up",
      )
    ) {
      if (
        students.some((student) => student.status === "waiting" && canStartTrip)
      ) {
        return "You have students waiting for pickup.";
      }
      return "Some students were not picked up during the scheduled window.";
    }

    if (students.some((student) => student.status === "scheduled")) {
      return "Your students are scheduled for a later trip.";
    }

    if (
      students.length > 0 &&
      students.every((student) => student.status === "schedule_unavailable")
    ) {
      return "Trip schedule unavailable. Check Trips for route details.";
    }

    if (students.some((student) => student.status === "at_stop")) {
      return "You are currently at a route stop.";
    }

    if (
      students.length > 0 &&
      students.every((student) => student.status === "dropped_off")
    ) {
      return "All students have been dropped off.";
    }

    if (students.some((student) => student.status === "picked_up")) {
      return "You are currently on a trip.";
    }

    return "Ready for today's trips?";
  };

  const handleStartTrip = () => {
    if (activeWindowCompleted) return;

    if (online) {
      router.push("/(driver)/(tabs)/trips");
      return;
    }

    if (!route) {
      router.push("/(driver)/(tabs)/trips");
      return;
    }

    if (!canStartTrip) {
      router.push("/(driver)/(tabs)/trips");
      return;
    }

    router.push({
      pathname: "/(driver)/pre-trip",
      params: { routeId: route.id, routeType },
    } as never);
  };

  const tripActionLabel = activeWindowCompleted
    ? "Completed"
    : online
      ? "Trip Active"
      : canStartTrip
        ? routeType === "pickup"
          ? "Start Pickup"
          : "Start Drop-off"
        : "Trips";
  const tripActionIcon = activeWindowCompleted
    ? "task-alt"
    : online
      ? "navigation"
      : canStartTrip
        ? routeType === "pickup"
          ? "directions-car"
          : "near-me"
        : "route";

  const handleEmergencyPress = async () => {
    if (sosSendingRef.current) return;
    sosSendingRef.current = true;
    setSosSending(true);
    try {
      const result = await sendEmergencyAlert(
        "Driver activated emergency assistance from the mobile app.",
      );
      const warnings = Array.isArray(result.delivery_warnings)
        ? result.delivery_warnings
        : [];
      const supportNotified = result.support_notification_sent === true;
      setSosNotification({
        visible: true,
        type: supportNotified ? "success" : "warning",
        message: supportNotified
          ? "SOS sent to support."
          : `SOS recorded, but support was not notified${warnings.length ? `: ${warnings.join(", ")}` : "."}`,
      });
    } catch (alertError) {
      console.error("Unable to send emergency alert", alertError);
      setSosNotification({
        visible: true,
        type: "error",
        message:
          "SOS could not be sent. Please call your emergency contact or local emergency services.",
      });
    } finally {
      sosSendingRef.current = false;
      setSosSending(false);
    }
  };

  if (error || routesError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
      >
        <View style={styles.loadingContent}>
          <Text style={{ color: colors.error, textAlign: "center" }}>
            {error || routesError}
          </Text>
          <TouchableOpacity
            onPress={() => {
              void refreshDriver();
              void refreshRoutes(true);
            }}
            style={{ padding: 14 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (loading || routesLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
      >
        <AppNotification
          visible={sosNotification.visible}
          message={sosNotification.message}
          type={sosNotification.type}
          onHide={() =>
            setSosNotification((current) => ({ ...current, visible: false }))
          }
        />
        <AppNotification
          visible={Boolean(sosReplyToast)}
          message={sosReplyToast}
          type="warning"
          onHide={() => setSosReplyToast("")}
        />
        <ScrollView
          contentContainerStyle={styles.loadingContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.loadingEyebrow, { color: colors.primary }]}>
            Preparing route
          </Text>
          <Text style={[styles.loadingTitle, { color: colors.primary }]}>
            Loading driver dashboard
          </Text>
          <Text style={[styles.loadingSubtitle, { color: colors.primary }]}>
            Syncing your route, students, and live trip status.
          </Text>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loadingSpinner}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: DRIVER_COLORS.background }]}
    >
      <AppNotification
        visible={sosNotification.visible}
        message={sosNotification.message}
        type={sosNotification.type}
        onHide={() =>
          setSosNotification((current) => ({ ...current, visible: false }))
        }
      />
      <AppNotification
        visible={Boolean(sosReplyToast)}
        message={sosReplyToast}
        type="warning"
        onHide={() => setSosReplyToast("")}
      />
      <DriverMainHeader
        driverName={driver?.user?.name || "Driver"}
        onNotificationPress={() => router.push("/(driver)/pages/notifications")}
        notificationCount={unreadCount}
        onProfilePress={() => router.push("/(driver)/(tabs)/profile")}
        subtitle={handleSubtitle()}
        avatarUrl={driver?.user?.avatar_url || undefined}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <DriverStatusCard
          isOnline={online}
          vehicleName={route?.vehicle?.name || driver?.vehicle?.name}
          licensePlate={
            route?.vehicle?.license_plate || driver?.vehicle?.license_plate
          }
        />

        <DriverQuickActions
          actions={[
            {
              label: tripActionLabel,
              icon: tripActionIcon,
              onPress: handleStartTrip,
              blinking: shouldBlink,
              blinkAnim: shouldBlink ? blinkAnim : null,
              disabled: activeWindowCompleted || trackingBusy,
            },
            {
              label: "Students",
              icon: "groups",
              onPress: () => router.push("/(driver)/(tabs)/students"),
            },
            {
              label: "Messages",
              icon: "chat-bubble-outline",
              onPress: () => router.push("/(driver)/(tabs)/messages"),
            },
            {
              label: "SOS",
              icon: "sos",
              onPress: handleEmergencyPress,
              disabled: sosSending,
              loading: sosSending,
            },
            // {
            //   label: "Map",
            //   icon: "map",
            //   onPress: () => router.push("/(driver)/(tabs)/trips"),
            // },
          ]}
        />

        <View style={styles.routesHeading}>
          <View>
            <Text style={styles.routesTitle}>Your routes</Text>
            <Text style={styles.routesSubtitle}>
              {routes.length} assigned route{routes.length === 1 ? "" : "s"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(driver)/(tabs)/trips")}
          >
            <Text style={styles.routesAction}>View all</Text>
          </TouchableOpacity>
        </View>
        {routes.length ? (
          routes.map((assignedRoute) => (
            <DriverRouteCard
              key={assignedRoute.id}
              routeName={assignedRoute.route_name || "Assigned route"}
              startLocation={
                assignedRoute.start_location || "Route start not set"
              }
              endLocation={assignedRoute.end_location || "Route end not set"}
              students={assignedRoute.route_children?.length || 0}
              time={`${assignedRoute.pickup_start_time || "--:--"} - ${assignedRoute.pickup_end_time || "--:--"} | ${assignedRoute.dropoff_start_time || "--:--"} - ${assignedRoute.dropoff_end_time || "--:--"}`}
              onPress={() =>
                router.push({
                  pathname: "/(driver)/(tabs)/trips",
                  params: { routeId: assignedRoute.id },
                })
              }
            />
          ))
        ) : (
          <DriverRouteCard
            routeName="No route assigned"
            startLocation="Route start not set"
            endLocation="Route end not set"
            students={0}
            onPress={() => router.push("/(driver)/(tabs)/trips")}
          />
        )}

        <DriverStudentsCard
          students={students}
          totalStudents={students.length}
          onViewAll={() => router.push("/(driver)/(tabs)/students")}
        />
        {trackingError ? (
          <Text style={styles.trackingError}>{trackingError}</Text>
        ) : !canStartTrip && !online ? (
          <View
            style={[
              styles.tripWindowNotice,
              {
                backgroundColor: `${colors.error}0D`,
                borderColor: `${colors.error}33`,
              },
            ]}
          >
            <View
              style={[
                styles.tripWindowNoticeIcon,
                { backgroundColor: `${colors.error}1A` },
              ]}
            >
              <MaterialIcons name="schedule" size={21} color={colors.error} />
            </View>
            <View style={styles.tripWindowNoticeContent}>
              <Text
                style={[styles.tripWindowNoticeTitle, { color: colors.error }]}
              >
                No active trip window
              </Text>
              <Text style={styles.tripWindowNoticeMessage}>
                Your next route may be scheduled for later. Check your assigned
                routes and trip times.
              </Text>
              <TouchableOpacity
                style={styles.tripWindowNoticeAction}
                onPress={() => router.push("/(driver)/(tabs)/trips")}
                accessibilityRole="button"
                accessibilityLabel="Open assigned trips"
              >
                <Text
                  style={[
                    styles.tripWindowNoticeActionText,
                    { color: colors.error },
                  ]}
                >
                  View assigned trips
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={17}
                  color={colors.error}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : trackingBusy ? (
          <Text style={[styles.trackingHint, { color: colors.primary }]}>
            Starting route...
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DRIVER_COLORS.background,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112,
  },

  trackingError: {
    color: "#DC2626",
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  trackingHint: {
    color: "#065F46",
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  tripWindowNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 16,
  },

  tripWindowNoticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  tripWindowNoticeContent: {
    flex: 1,
    minWidth: 0,
  },

  tripWindowNoticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  tripWindowNoticeMessage: {
    color: DRIVER_COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  tripWindowNoticeAction: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 9,
    paddingVertical: 2,
  },

  tripWindowNoticeActionText: {
    fontSize: 12,
    fontWeight: "800",
  },

  routesHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  routesTitle: {
    color: DRIVER_COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  routesSubtitle: {
    color: DRIVER_COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },

  routesAction: {
    color: DRIVER_COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  loadingContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 80,
  },

  loadingEyebrow: {
    color: DRIVER_COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  loadingTitle: {
    color: DRIVER_COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  loadingSubtitle: {
    color: DRIVER_COLORS.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },

  loadingSpinner: {
    marginTop: 8,
  },
});

export default DriverHome;
