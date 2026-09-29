import React from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useRouter } from "expo-router";

import DriverMainHeader from "../components/DriverMainHeader";
import DriverStatusCard from "../components/DriverStatusCard";
import DriverQuickActions from "../components/DriverQuickActions";
import DriverRouteCard from "../components/DriverRouteCard";
import DriverStudentsCard from "../components/DriverStudentsCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverNotifications } from "@/app/(driver)/driverHelpers/hooks/useDriverNotifications";
import { useDriverProfile } from "@/app/(driver)/driverHelpers/hooks/useDriverProfile";
import useDriverRoutes from "@/app/(driver)/driverHelpers/hooks/useDriverRoutes";
import { useDriverTracking } from "../driverHelpers/hooks/useDriverTracking";
import { useTheme } from "@/styles/theme";

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

type DashboardStudent = {
  id: string;
  name: string;
  school: string;
  status: "picked_up" | "waiting" | "dropped_off";
};

const DriverHome = () => {
  const { colors } = useTheme();

  const { driver, loading, error } = useDriverProfile();
  const { routes, routesLoading, routesError } = useDriverRoutes();
  const router = useRouter();
  const { notifications } = useDriverNotifications();
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const blinkAnim = React.useRef(new Animated.Value(0)).current;

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
  const canStartTrip = inPickupWindow || inDropoffWindow;
  const {
    online,
    busy: trackingBusy,
    error: trackingError,
    goOnline,
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
  const students: DashboardStudent[] = (route?.route_children || []).map(
    (routeChild: any) => {
      const child = routeChild.children || routeChild.child || {};
      const stop = (route?.route_stops || []).find(
        (routeStop: any) => routeStop.child_id === routeChild.child_id,
      );
      const isDropoff = stop?.stop_type === "dropoff";

      return {
        id: String(routeChild.child_id || child.id),
        name: [child.name, child.lastname].filter(Boolean).join(" ") || "Child",
        school:
          child.school_name || child.schools?.name || "School not specified",
        status:
          stop?.status === "completed"
            ? isDropoff
              ? "dropped_off"
              : "picked_up"
            : "waiting",
      };
    },
  );

  const handleSubtitle = () => {
    // Check if there are students waiting for pickup
    if (students.some((student) => student.status === "waiting")) {
      return "You have students waiting for pickup.";
    }

    // Check if all students have been dropped off
    if (
      students.length > 0 &&
      students.every((student) => student.status === "dropped_off")
    ) {
      return "All students have been dropped off.";
    }

    // Check if currently on a trip
    if (students.some((student) => student.status === "picked_up")) {
      return "You are currently on a trip.";
    }

    // Default message
    return "Ready for today's trips?";
  };

  const handleStartTrip = () => {
    if (online) {
      router.push("/(driver)/(tabs)/trips");
      return;
    }

    if (!canStartTrip) {
      router.push("/(driver)/(tabs)/trips");
      return;
    }

    goOnline();
  };

  const handleEmergencyPress = async () => {
    try {
      await sendEmergencyAlert(
        "Driver activated emergency assistance from the mobile app.",
      );
      router.push("/(driver)/(tabs)/messages");
    } catch (alertError) {
      console.error("Unable to send emergency alert", alertError);
    }
  };

  if (error || routesError) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.primary }}>
          Error loading driver data. Please try again later.
        </Text>
      </SafeAreaView>
    );
  }
  if (loading || routesLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <DriverMainHeader
          driverName={driver?.user?.name || "Driver"}
          onNotificationPress={() =>
            router.push("/(driver)/pages/notifications")
          }
          notificationCount={
            (notifications &&
              notifications.filter((n: any) => !n.is_read).length) ||
            0
          }
          onProfilePress={() => router.push("/(driver)/(tabs)/profile")}
          subtitle={handleSubtitle()}
        />

        <DriverStatusCard
          isOnline={online}
          vehicleName={driver?.vehicle?.name}
          licensePlate={driver?.vehicle?.license_plate}
        />

        <DriverQuickActions
          actions={[
            {
              label: "Start Trip",
              icon: "play-arrow",
              onPress: handleStartTrip,
              blinking: shouldBlink,
              blinkAnim: shouldBlink ? blinkAnim : null,
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
            },
            // {
            //   label: "Map",
            //   icon: "map",
            //   onPress: () => router.push("/(driver)/(tabs)/trips"),
            // },
          ]}
        />

        <DriverRouteCard
          routeName={route?.route_name || "No route assigned"}
          startLocation={route?.start_location || "Route start not set"}
          endLocation={route?.end_location || "Route end not set"}
          students={students.length}
          time={
            route
              ? `${route.pickup_start_time || "--:--"} - ${route.pickup_end_time || "--:--"} | ${route.dropoff_start_time || "--:--"} - ${route.dropoff_end_time || "--:--"}`
              : undefined
          }
          onPress={() => router.push("/(driver)/(tabs)/trips")}
        />

        <DriverStudentsCard
          students={students.slice(0, 3)}
          onViewAll={() => router.push("/(driver)/(tabs)/students")}
        />
        {trackingError ? (
          <Text style={styles.trackingError}>{trackingError}</Text>
        ) : !canStartTrip && !online ? (
          <Text style={[styles.trackingHint, { color: colors.error }]}>
            Start Trip is available during the pickup or drop-off time window.
          </Text>
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
    backgroundColor: "#F5FBF7",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
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

  loadingContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 80,
  },

  loadingEyebrow: {
    color: "#0F9D58",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  loadingTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  loadingSubtitle: {
    color: "#4B5563",
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
