import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { useTheme } from "../../../styles/theme";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { Child, useChildren } from "../clientHelpers/hooks/useChildren";
import { useClientNotifications } from "../clientHelpers/hooks/useClientNotifications";
import { useClientProfile } from "../clientHelpers/hooks/useClientProfile";
import {
  getClientDate,
  useClientAttendance,
} from "../clientHelpers/hooks/useClientAttendance";
import {
  subscribeToPaymentUpdates,
  unsubscribeFromRealtime,
} from "../../../store/subscriptions/clientRealtime";

type RouteStop = {
  id: string;
  route_id?: string;
  child_id?: string;
  stop_type?: "pickup" | "dropoff";
  status?: "pending" | "in_progress" | "completed" | "skipped";
};

const formatTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatScheduleTime = (value?: string | null) => {
  if (!value) return "Not set";
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "Not set";
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const hasAssignedVehicle = (child: Child) =>
  Boolean(child.vehicle_id || child.vehicle?.id);

const toMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const isWithinWindow = (
  currentMinutes: number,
  start?: string,
  end?: string,
) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || currentMinutes < startMinutes) return false;
  return endMinutes === null || currentMinutes <= endMinutes;
};

const getChildStatus = (
  child: Child,
  stops: RouteStop[] = [],
  timestamp = Date.now(),
) => {
  if (!hasAssignedVehicle(child) || !child.route) {
    return "upcoming";
  }

  const currentDate = new Date(timestamp);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const pickupStop = stops.find((stop) => stop.stop_type === "pickup");
  const dropoffStop = stops.find((stop) => stop.stop_type === "dropoff");

  if (stops.some((stop) => stop.status === "in_progress")) return "on a trip";

  if (
    pickupStop &&
    pickupStop.status !== "completed" &&
    pickupStop.status !== "skipped" &&
    isWithinWindow(
      currentMinutes,
      child.route.pickup_start_time || child.route.departure_time,
      child.route.pickup_end_time,
    )
  ) {
    return "on a trip";
  }

  if (
    dropoffStop &&
    dropoffStop.status !== "completed" &&
    dropoffStop.status !== "skipped" &&
    isWithinWindow(
      currentMinutes,
      child.route.dropoff_start_time,
      child.route.dropoff_end_time,
    )
  ) {
    return "on a trip";
  }

  const pickupStart = toMinutes(
    child.route.pickup_start_time || child.route.departure_time,
  );
  const pickupEnd = toMinutes(child.route.pickup_end_time);
  const dropoffStart = toMinutes(child.route.dropoff_start_time);
  const dropoffEnd = toMinutes(child.route.dropoff_end_time);

  if (pickupStart !== null && currentMinutes < pickupStart) return "upcoming";
  if (
    pickupStart !== null &&
    pickupEnd !== null &&
    currentMinutes >= pickupStart &&
    currentMinutes <= pickupEnd
  ) {
    return "on a trip";
  }
  if (
    pickupEnd !== null &&
    (dropoffStart === null || currentMinutes < dropoffStart) &&
    currentMinutes > pickupEnd
  ) {
    return "at school";
  }
  if (
    dropoffStart !== null &&
    dropoffEnd !== null &&
    currentMinutes >= dropoffStart &&
    currentMinutes <= dropoffEnd
  ) {
    return "on a trip";
  }
  if (dropoffEnd !== null && currentMinutes > dropoffEnd) return "completed";

  if (
    pickupStart !== null &&
    pickupEnd === null &&
    currentMinutes >= pickupStart
  ) {
    return "on a trip";
  }

  return "upcoming";
};

const getTripDirection = (child: Child) => {
  const route = child.route;
  if (!route) return "On the way to school";

  const toMinutes = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dropoffStart = toMinutes(route.dropoff_start_time);
  const dropoffEnd = toMinutes(route.dropoff_end_time);

  if (
    dropoffStart !== null &&
    dropoffEnd !== null &&
    currentMinutes >= dropoffStart &&
    currentMinutes <= dropoffEnd
  ) {
    return "On the way home";
  }

  return "On the way to school";
};

const getDriverName = (child: Child) => {
  const driver = child.vehicle?.driver;
  if (!driver) return "Driver not assigned";
  if (driver.name) return `Driver ${driver.name}`;
  return (
    [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
    "Driver assigned"
  );
};

const DASHBOARD_COLORS = {
  background: "#F4F9FF",
  surface: "#FFFFFF",
  border: "#DCEAF8",
  text: "#17365E",
  muted: "#607A98",
  green: "#159B3A",
  greenDark: "#087C2B",
  greenLight: "#E9F8EE",
  paleBlue: "#EDF7FF",
};

const CHILD_PAYMENT_PRESENTATION: Record<
  string,
  {
    label: string;
    color: string;
    background: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }
> = {
  unpaid: {
    label: "Payment owing",
    color: "#B91C1C",
    background: "#FEF2F2",
    icon: "error-outline",
  },
  waiting_for_approval: {
    label: "Cash waiting for approval",
    color: "#B45309",
    background: "#FFFBEB",
    icon: "hourglass-top",
  },
  payment_pending: {
    label: "Payment processing",
    color: "#1D4ED8",
    background: "#EFF6FF",
    icon: "schedule",
  },
  paid: {
    label: "Paid this month",
    color: "#087C2B",
    background: "#E9F8EE",
    icon: "check-circle",
  },
};

const ClientHomeScreen = () => {
  const router = useRouter();
  const { colors: themeColors, getBrandColors } = useTheme();
  const colors = {
    ...themeColors,
    background: DASHBOARD_COLORS.background,
    surface: DASHBOARD_COLORS.surface,
    border: DASHBOARD_COLORS.border,
    text: {
      ...themeColors.text,
      primary: DASHBOARD_COLORS.text,
      secondary: DASHBOARD_COLORS.muted,
    },
  };
  const clientBrand = {
    ...getBrandColors("client"),
    primary: DASHBOARD_COLORS.green,
    primaryDark: DASHBOARD_COLORS.greenDark,
  };

  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const { client, refreshClient } = useClientProfile();
  const { children, isWeekend } = useChildren();
  const [attendanceDate, setAttendanceDate] = useState(() => getClientDate());
  const { attendance: attendanceItems } = useClientAttendance(attendanceDate);
  const { notifications, unreadCount: unreadNotifications } =
    useClientNotifications();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [stopsByChild, setStopsByChild] = useState<Record<string, RouteStop[]>>(
    {},
  );
  const [paymentStatusByChild, setPaymentStatusByChild] = useState<
    Record<string, { status: string; payment_method: string }>
  >({});
  const [schoolTrips, setSchoolTrips] = useState<any[]>([]);
  const [schoolTripsLoading, setSchoolTripsLoading] = useState(true);
  const [notificationTicker] = useState(() => new Animated.Value(0));
  const latestUnreadNotification = notifications.find(
    (notification) => notification.is_read !== true,
  );

  const refreshPaymentStatuses = React.useCallback(async () => {
    if (!userToken) {
      setPaymentStatusByChild({});
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/payments/summary`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load child payment status.");
      }
      const statuses = Array.isArray(data.child_payment_statuses)
        ? data.child_payment_statuses
        : [];
      setPaymentStatusByChild(
        Object.fromEntries(
          statuses.map((item: any) => [
            item.child_id,
            {
              status: item.status,
              payment_method: item.payment_method || "card",
            },
          ]),
        ),
      );
    } catch (error) {
      console.error("Failed to load payment statuses on client dashboard", error);
    }
  }, [userToken]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshPaymentStatuses();
      const paymentChannel = client?.id
        ? subscribeToPaymentUpdates("client_id", client.id, () => {
            void refreshPaymentStatuses();
          })
        : null;
      const timer = setInterval(() => void refreshPaymentStatuses(), 30_000);
      return () => {
        clearInterval(timer);
        void unsubscribeFromRealtime(paymentChannel);
      };
    }, [client, refreshPaymentStatuses]),
  );

  useEffect(() => {
    notificationTicker.stopAnimation();
    notificationTicker.setValue(0);
    if (!latestUnreadNotification) return undefined;

    const ticker = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(notificationTicker, {
          toValue: -180,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(notificationTicker, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    ticker.start();

    return () => ticker.stop();
  }, [latestUnreadNotification, notificationTicker]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSchoolTrips = async () => {
      if (!user?.token) {
        setSchoolTripsLoading(false);
        return;
      }
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/client/school-trips`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (active && response.ok)
          setSchoolTrips(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load school trips on parent dashboard", error);
      } finally {
        if (active) setSchoolTripsLoading(false);
      }
    };
    void loadSchoolTrips();
    const timer = setInterval(loadSchoolTrips, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.token]);

  useEffect(() => {
    let cancelled = false;

    const loadRouteStops = async () => {
      if (!user?.token) return;

      const assignedChildren = children.filter(
        (child) => child.route?.id && hasAssignedVehicle(child),
      );
      if (assignedChildren.length === 0) {
        setStopsByChild({});
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const stopEntries = await Promise.all(
          assignedChildren.map(async (child) => {
            const response = await fetch(
              `${baseUrl}/client/children/${child.id}/route-stops`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            if (!response.ok) return [child.id, []] as const;
            const data = await response.json();
            const stops = (Array.isArray(data) ? data : []).filter(
              (stop: RouteStop) =>
                !child.route?.id || stop.route_id === child.route.id,
            );
            return [child.id, stops] as const;
          }),
        );

        if (!cancelled) setStopsByChild(Object.fromEntries(stopEntries));
      } catch (error) {
        if (!cancelled) setStopsByChild({});
        console.error("Failed to load client route stops", error);
      }
    };

    loadRouteStops();
    return () => {
      cancelled = true;
    };
  }, [children, user?.token]);

  useFocusEffect(
    React.useCallback(() => {
      refreshClient();
    }, [refreshClient]),
  );

  const clientName =
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.name ||
    user?.userData?.name ||
    "Logged in user";
  const onTripChildren = useMemo(
    () =>
      children.filter(
        (child) =>
          getChildStatus(child, stopsByChild[child.id], currentTime) ===
          "on a trip",
      ),
    [children, currentTime, stopsByChild],
  );
  const atSchoolChildren = useMemo(
    () =>
      children.filter(
        (child) =>
          getChildStatus(child, stopsByChild[child.id], currentTime) ===
          "at school",
      ),
    [children, currentTime, stopsByChild],
  );
  const activeChild = onTripChildren[0];
  const activeTripDriver = activeChild?.vehicle?.driver;
  const scheduledChildren = children.filter(hasAssignedVehicle);
  const todayDate = getClientDate();

  const getAttendanceDisplay = (item: (typeof attendanceItems)[number]) => {
    const child = children.find((candidate) => candidate.id === item.childId);
    const isToday = attendanceDate === todayDate;
    const childTripStatus = child
      ? getChildStatus(child, stopsByChild[child.id], currentTime)
      : "upcoming";

    if (isToday && child && childTripStatus === "on a trip") {
      if (getTripDirection(child) === "On the way to school") {
        return { label: "On route", color: "#2563EB" };
      }
      if (item.status === "present" || item.status === "late") {
        return { label: "Present", color: "#16A34A" };
      }
    }

    if (item.status === "not_recorded") {
      return { label: "Not recorded", color: colors.text.secondary };
    }
    return {
      label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      color:
        item.status === "present"
          ? "#16A34A"
          : item.status === "late"
            ? "#D97706"
            : "#DC2626",
    };
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";

    return "Good night";
  };

  const profileAvatar = client?.avatar || user?.userData?.avatar;
  const getPaymentStatus = (child: Child) =>
    paymentStatusByChild[child.id]?.status ||
    (hasAssignedVehicle(child) && child.route ? "unpaid" : "not_due");
  const childrenOwing = children.filter(
    (child) => getPaymentStatus(child) === "unpaid",
  );
  const childrenAwaitingCashApproval = children.filter(
    (child) => getPaymentStatus(child) === "waiting_for_approval",
  );
  const showPaymentNotice =
    childrenOwing.length > 0 || childrenAwaitingCashApproval.length > 0;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom", "top"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashboardContent}
      >
        <LinearGradient
          colors={["#BDE6FF", "#D8F4E5", "#86D99B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandHeader}
        >
          <View style={styles.brandHeaderTop}>
            <View style={styles.brandIdentity}>
              <View style={styles.brandLogo}>
                <MaterialIcons
                  name="location-on"
                  size={23}
                  color={DASHBOARD_COLORS.green}
                />
              </View>
              <View>
                <Text style={styles.brandName}>Track My Kid</Text>
                <Text style={styles.brandTagline}>
                  Safe Journeys. Brighter Futures.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.headerNotificationButton}
              activeOpacity={0.8}
              onPress={() =>
                router.push("/(client)/pages/notifications" as never)
              }
            >
              <MaterialIcons
                name="notifications-none"
                size={25}
                color={colors.text.primary}
              />
              {unreadNotifications > 0 && (
                <View style={styles.headerNotificationBadge}>
                  <Text style={styles.headerNotificationCount}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.greetingCard}>
            <View style={styles.greetingCopy}>
              <Text style={styles.dashboardGreeting}>{getGreeting()},</Text>
              <Text numberOfLines={1} style={styles.dashboardParentName}>
                {clientName}
              </Text>
              <Text style={styles.dashboardRole}>Parent</Text>
            </View>
            <View style={styles.parentAvatarWrap}>
              <Image
                source={
                  profileAvatar
                    ? { uri: profileAvatar }
                    : require("@/assets/images/client.png")
                }
                style={styles.parentAvatar}
              />
            </View>
          </View>
        </LinearGradient>

        {/* SAFETY STATUS */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(client)/(tabs)/children" as never)}
          style={[
            styles.safetyCard,
            {
              backgroundColor: DASHBOARD_COLORS.greenLight,
              borderColor: "#C8EFD3",
            },
          ]}
        >
          <View
            style={[
              styles.safetyIcon,
              { backgroundColor: clientBrand.primary },
            ]}
          >
            <MaterialIcons name="verified-user" size={18} color="#FFFFFF" />
          </View>

          <View style={styles.safetyContent}>
            <View style={styles.safetyTitleRow}>
              <Text
                style={[styles.safetyTitle, { color: colors.text.primary }]}
              >
                {children.length === 0
                  ? "Set up your child's safety"
                  : children.length > 1
                    ? "Your children are safe"
                    : "Your child is safe"}
              </Text>

              <View style={styles.safeDot} />
            </View>

            <Text
              style={[styles.safetySubtitle, { color: colors.text.secondary }]}
            >
              {children.length === 0
                ? "Add a child to enable live journey tracking."
                : "We're tracking the journey in real-time."}
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {showPaymentNotice && (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push("/(client)/pages/payments" as never)}
            style={styles.paymentDashboardCard}
          >
            <View style={styles.paymentDashboardIcon}>
              <MaterialIcons
                name={
                  childrenAwaitingCashApproval.length > 0
                    ? "hourglass-top"
                    : "payments"
                }
                size={18}
                color={
                  childrenAwaitingCashApproval.length > 0
                    ? "#B45309"
                    : "#B91C1C"
                }
              />
            </View>
            <View style={styles.paymentDashboardCopy}>
              <Text style={styles.paymentDashboardTitle}>
                {childrenAwaitingCashApproval.length > 0
                  ? "Payment awaiting owner approval"
                  : "Payment owing"}
              </Text>
              <Text style={styles.paymentDashboardSubtitle}>
                {[
                  childrenOwing.length > 0
                    ? `${childrenOwing.length} child(ren) still owe payment`
                    : null,
                  childrenAwaitingCashApproval.length > 0
                    ? `Cash reported for ${childrenAwaitingCashApproval.map((child) => child.name).join(", ")} is awaiting approval`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={21} color="#607A98" />
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            My Children
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(client)/(tabs)/children" as never)}
          >
            <Text style={[styles.sectionLink, { color: clientBrand.primary }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {children.slice(0, 2).map((child) => {
          const status = getChildStatus(
            child,
            stopsByChild[child.id],
            currentTime,
          );
          const paymentStatus = getPaymentStatus(child);
          const paymentPresentation = CHILD_PAYMENT_PRESENTATION[paymentStatus] || {
            label: "Payment not due",
            color: "#607A98",
            background: "#EDF7FF",
            icon: "info-outline",
          };
          return (
            <TouchableOpacity
              key={child.id}
              activeOpacity={0.82}
              onPress={() =>
                router.push(`/(client)/(tabs)/children/${child.id}` as never)
              }
              style={[
                styles.dashboardChildCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Image
                source={
                  child.avatar
                    ? { uri: child.avatar }
                    : require("@/assets/images/client.png")
                }
                style={styles.dashboardChildAvatar}
              />
              <View style={styles.dashboardChildInfo}>
                <Text style={styles.dashboardChildName}>
                  {`${child.name} ${child.lastname || ""}`.trim()}
                </Text>
                <Text numberOfLines={1} style={styles.dashboardChildSchool}>
                  {[
                    child.grade ? `Grade ${child.grade}` : null,
                    child.school_name,
                  ]
                    .filter(Boolean)
                    .join("  •  ") || "School not set"}
                </Text>
                <View style={styles.childStatusPill}>
                  <MaterialIcons
                    name={
                      status === "on a trip" ? "directions-bus" : "check-circle"
                    }
                    size={12}
                    color={clientBrand.primary}
                  />
                  <Text style={styles.childStatusText}>
                    {status === "on a trip"
                      ? "On board"
                      : status === "at school"
                        ? "At school"
                        : "Upcoming"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.childPaymentStatusPill,
                    { backgroundColor: paymentPresentation.background },
                  ]}
                >
                  <MaterialIcons
                    name={paymentPresentation.icon as keyof typeof MaterialIcons.glyphMap}
                    size={11}
                    color={paymentPresentation.color}
                  />
                  <Text
                    style={[
                      styles.childPaymentStatusText,
                      { color: paymentPresentation.color },
                    ]}
                  >
                    {paymentPresentation.label}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={clientBrand.primaryDark}
              />
            </TouchableOpacity>
          );
        })}

        {children.length === 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(client)/(tabs)/children" as never)}
            style={[
              styles.dashboardChildCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.emptyChildAvatar}>
              <MaterialIcons
                name="person-add"
                size={22}
                color={clientBrand.primary}
              />
            </View>
            <View style={styles.dashboardChildInfo}>
              <Text style={styles.dashboardChildName}>Add your child</Text>
              <Text style={styles.dashboardChildSchool}>
                Set up school transport and live updates
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={clientBrand.primaryDark}
            />
          </TouchableOpacity>
        )}

        <View style={styles.dashboardStats}>
          <View style={styles.dashboardStatItem}>
            <MaterialIcons
              name="people"
              size={21}
              color={clientBrand.primaryDark}
            />
            <Text style={styles.dashboardStatValue}>{children.length}</Text>
            <Text style={styles.dashboardStatLabel}>
              {children.length === 1 ? "Child" : "Children"}
            </Text>
          </View>
          <View style={styles.dashboardStatDivider} />
          <View style={styles.dashboardStatItem}>
            <MaterialIcons
              name="directions-bus"
              size={21}
              color={clientBrand.primaryDark}
            />
            <Text style={styles.dashboardStatValue}>
              {onTripChildren.length}
            </Text>
            <Text style={styles.dashboardStatLabel}>Active Trip</Text>
          </View>
          <View style={styles.dashboardStatDivider} />
          <View style={styles.dashboardStatItem}>
            <MaterialIcons
              name="location-on"
              size={21}
              color={clientBrand.primaryDark}
            />
            <Text style={styles.dashboardStatValue}>
              {scheduledChildren.length}
            </Text>
            <Text style={styles.dashboardStatLabel}>Upcoming Trips</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              School Attendance
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.text.secondary },
              ]}
            >
              Attendance updates for your children
            </Text>
          </View>
          <View style={styles.attendanceDateButton}>
            <TouchableOpacity
              accessibilityLabel="Previous attendance date"
              onPress={() => {
                const next = new Date(`${attendanceDate}T12:00:00`);
                next.setDate(next.getDate() - 1);
                setAttendanceDate(getClientDate(next));
              }}
            >
              <MaterialIcons
                name="chevron-left"
                size={19}
                color={clientBrand.primary}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.attendanceDateText,
                { color: clientBrand.primaryDark },
              ]}
            >
              {new Date(`${attendanceDate}T12:00:00`).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Next attendance date"
              onPress={() => {
                const next = new Date(`${attendanceDate}T12:00:00`);
                next.setDate(next.getDate() + 1);
                setAttendanceDate(getClientDate(next));
              }}
            >
              <MaterialIcons
                name="chevron-right"
                size={19}
                color={clientBrand.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={[
            styles.attendanceCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {attendanceItems.length === 0 ? (
            <Text
              style={[styles.attendanceEmpty, { color: colors.text.secondary }]}
            >
              No attendance records yet.
            </Text>
          ) : (
            attendanceItems.map((item) => {
              const { label, color } = getAttendanceDisplay(item);
              return (
                <View
                  key={item.childId}
                  style={[
                    styles.attendanceRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.attendanceChildIcon}>
                    <MaterialIcons name="person" size={18} color={color} />
                  </View>
                  <View style={styles.attendanceChildInfo}>
                    <Text
                      style={[
                        styles.attendanceChildName,
                        { color: colors.text.primary },
                      ]}
                    >
                      {item.childName}
                    </Text>
                    <Text
                      style={[
                        styles.attendanceChildTime,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {item.arrivalTime
                        ? `Arrival ${formatTime(item.arrivalTime)}`
                        : "No arrival time"}
                    </Text>
                    <Text
                      style={[
                        styles.attendanceChildTime,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {item.schoolName}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.attendanceStatusBadge,
                      { backgroundColor: `${color}18` },
                    ]}
                  >
                    <Text style={[styles.attendanceStatusText, { color }]}>
                      {label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {false && (
          <>
            {/* TODAY */}
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Today
              </Text>

              <TouchableOpacity
                onPress={() => router.replace("/(client)/(tabs)/trips")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MaterialIcons
                  name="view-list"
                  size={18}
                  color={clientBrand.primary}
                />
                <Text
                  style={[styles.sectionLink, { color: clientBrand.primary }]}
                >
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            {/* STATS */}
            <View style={styles.statsGrid}>
              {/* ON TRIP */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: `${clientBrand.primary}10`,
                    borderColor: `${clientBrand.primary}20`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${clientBrand.primary}18` },
                  ]}
                >
                  <MaterialIcons
                    name="directions-bus"
                    size={20}
                    color={clientBrand.primary}
                  />
                </View>

                <Text
                  style={[styles.statNumber, { color: colors.text.primary }]}
                >
                  {onTripChildren.length}
                </Text>

                <Text
                  style={[styles.statLabel, { color: colors.text.secondary }]}
                >
                  On a trip
                </Text>

                <Text style={[styles.statLink, { color: clientBrand.primary }]}>
                  Live
                </Text>
              </TouchableOpacity>

              {/* SCHOOL */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(client)/pages/school" as never)}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: "#FFF8E7",
                    borderColor: "#FDE68A",
                  },
                ]}
              >
                <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                  <MaterialIcons name="school" size={20} color="#D97706" />
                </View>

                <Text
                  style={[styles.statNumber, { color: colors.text.primary }]}
                >
                  {atSchoolChildren.length}
                </Text>

                <Text
                  style={[styles.statLabel, { color: colors.text.secondary }]}
                >
                  At school
                </Text>

                <Text style={[styles.statLink, { color: "#D97706" }]}>
                  Checked in
                </Text>
              </TouchableOpacity>

              {/* UPCOMING */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: "#F5F0FF",
                    borderColor: "#E9D5FF",
                  },
                ]}
              >
                <View style={[styles.statIcon, { backgroundColor: "#EDE9FE" }]}>
                  <MaterialIcons name="schedule" size={20} color="#7C3AED" />
                </View>

                <Text
                  style={[styles.statNumber, { color: colors.text.primary }]}
                >
                  {scheduledChildren?.length}
                </Text>

                <Text
                  style={[styles.statLabel, { color: colors.text.secondary }]}
                >
                  Upcoming
                </Text>

                <Text style={[styles.statLink, { color: "#7C3AED" }]}>
                  Later today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: "#EFF6FF",
                    borderColor: "#DBEAFE",
                  },
                ]}
                onPress={() =>
                  router.push("/(client)/pages/notifications" as never)
                }
              >
                <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
                  <MaterialIcons
                    name="notifications"
                    size={20}
                    color="#2563EB"
                  />
                  {unreadNotifications > 0 && (
                    <View style={styles.notificationStatBadge}>
                      <Text style={styles.notificationStatBadgeText}>
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.statNumber, { color: colors.text.primary }]}
                >
                  {unreadNotifications}
                </Text>

                <Text
                  style={[styles.statLabel, { color: colors.text.secondary }]}
                >
                  Notifications
                </Text>

                <View style={styles.notificationTicker}>
                  <Animated.Text
                    numberOfLines={1}
                    style={[
                      styles.notificationTickerText,
                      { color: colors.text.secondary },
                      { transform: [{ translateX: notificationTicker }] },
                    ]}
                  >
                    {latestUnreadNotification
                      ? `${latestUnreadNotification?.title}: ${latestUnreadNotification?.message}`
                      : "No unread notifications"}
                  </Animated.Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ATTENDANCE */}
            <View style={styles.sectionHeader}>
              <View>
                <Text
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  School attendance
                </Text>
                <Text
                  style={[
                    styles.sectionDescription,
                    { color: colors.text.secondary },
                  ]}
                >
                  Today&apos;s attendance updates
                </Text>
              </View>
              <TouchableOpacity
                style={styles.attendanceDateButton}
                onPress={() => {
                  const next = new Date(`${attendanceDate}T12:00:00`);
                  next.setDate(next.getDate() - 1);
                  setAttendanceDate(getClientDate(next));
                }}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={18}
                  color={clientBrand.primary}
                />
                <Text
                  style={[
                    styles.attendanceDateText,
                    { color: clientBrand.primary },
                  ]}
                >
                  {new Date(`${attendanceDate}T12:00:00`).toLocaleDateString(
                    [],
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = new Date(`${attendanceDate}T12:00:00`);
                    next.setDate(next.getDate() + 1);
                    setAttendanceDate(getClientDate(next));
                  }}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={clientBrand.primary}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.attendanceCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {attendanceItems.length === 0 ? (
                <Text
                  style={[
                    styles.attendanceEmpty,
                    { color: colors.text.secondary },
                  ]}
                >
                  No attendance records yet.
                </Text>
              ) : (
                attendanceItems.map((item) => {
                  const { label: statusLabel, color: statusColor } =
                    getAttendanceDisplay(item);
                  return (
                    <View
                      key={item.childId}
                      style={[
                        styles.attendanceRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.attendanceChildIcon}>
                        <MaterialIcons
                          name="person"
                          size={18}
                          color={statusColor}
                        />
                      </View>
                      <View style={styles.attendanceChildInfo}>
                        <Text
                          style={[
                            styles.attendanceChildName,
                            { color: colors.text.primary },
                          ]}
                        >
                          {item.childName}
                        </Text>
                        <Text
                          style={[
                            styles.attendanceChildTime,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {item.arrivalTime
                            ? `Arrival ${formatTime(item.arrivalTime)}`
                            : "No arrival time"}
                        </Text>
                        <Text
                          style={[
                            styles.attendanceChildTime,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {item.schoolName} ·{" "}
                          {formatScheduleTime(item.schoolStartTime)} -{" "}
                          {formatScheduleTime(item.schoolEndTime)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.attendanceStatusBadge,
                          { backgroundColor: `${statusColor}18` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.attendanceStatusText,
                            { color: statusColor },
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* ACTIVE TRIPS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Active Trip
            </Text>

            <Text
              style={[
                styles.sectionDescription,
                { color: colors.text.secondary },
              ]}
            >
              Your child&apos;s current journey
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/(client)/(tabs)/trips")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <MaterialIcons
              name="chevron-right"
              size={18}
              color={clientBrand.primary}
            />
            <Text style={[styles.sectionLink, { color: clientBrand.primary }]}>
              See all
            </Text>
          </TouchableOpacity>
        </View>

        {/* ACTIVE TRIP CARD */}
        {activeChild ? (
          <View
            style={[
              styles.tripCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* CHILD HEADER */}
            <View style={styles.tripHeader}>
              <View style={styles.childAvatar}>
                <Image
                  source={
                    activeChild.avatar
                      ? { uri: activeChild.avatar }
                      : require("@/assets/images/client.png")
                  }
                  style={styles.childAvatarImage}
                />

                <View style={styles.onlineIndicator} />
              </View>

              <View style={styles.childInfo}>
                <Text
                  style={[styles.childName, { color: colors.text.primary }]}
                >
                  {`${activeChild.name} ${activeChild.lastname || ""}`.trim()}
                </Text>

                <View style={styles.tripStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: clientBrand.primary },
                    ]}
                  />

                  <Text
                    style={[
                      styles.tripStatus,
                      { color: clientBrand.primaryDark },
                    ]}
                  >
                    {activeChild.eta && activeChild.eta !== "None"
                      ? `${getTripDirection(activeChild)} · ETA ${activeChild.eta}`
                      : getTripDirection(activeChild)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.trackButton,
                  {
                    backgroundColor: `${clientBrand.primary}12`,
                  },
                ]}
              >
                <MaterialIcons
                  name="location-on"
                  size={17}
                  color={clientBrand.primary}
                />

                <Text
                  style={[styles.trackText, { color: clientBrand.primary }]}
                >
                  Track
                </Text>
              </TouchableOpacity>
            </View>

            {/* DRIVER */}
            <View style={styles.activeDriverCard}>
              <View style={styles.activeDriverIdentity}>
                <Image
                  source={
                    activeTripDriver?.avatar
                      ? { uri: activeTripDriver.avatar }
                      : require("@/assets/images/client.png")
                  }
                  style={styles.activeDriverAvatar}
                />
                <View style={styles.activeDriverInfo}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.activeDriverName,
                      { color: colors.text.primary },
                    ]}
                  >
                    Driver:{" "}
                    {activeTripDriver?.name ||
                      [
                        activeTripDriver?.first_name,
                        activeTripDriver?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "Not assigned"}
                  </Text>
                  <View style={styles.activeDriverPhoneRow}>
                    <MaterialIcons
                      name="call"
                      size={12}
                      color={clientBrand.primaryDark}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.activeDriverPhone,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {activeTripDriver?.phone || "Contact not available"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.activeVehicle}>
                <View style={styles.activeVehicleIcon}>
                  <MaterialIcons
                    name="directions-bus"
                    size={19}
                    color={clientBrand.primaryDark}
                  />
                </View>
                <View style={styles.activeDriverInfo}>
                  <Text style={styles.activeVehicleLabel}>Vehicle</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.activeVehicleValue,
                      { color: colors.text.primary },
                    ]}
                  >
                    {activeChild.vehicle?.license_plate ||
                      activeChild.vehicle?.name ||
                      "Not assigned"}
                  </Text>
                </View>
              </View>
            </View>

            {/* ROUTE */}
            <View style={styles.routeContainer}>
              {/* HOME */}
              <View style={styles.routePoint}>
                <View
                  style={[
                    styles.routeIcon,
                    { backgroundColor: `${clientBrand.primary}15` },
                  ]}
                >
                  <MaterialIcons
                    name="home"
                    size={17}
                    color={clientBrand.primary}
                  />
                </View>

                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>Pickup</Text>

                  <Text
                    style={[styles.routeName, { color: colors.text.primary }]}
                  >
                    {activeChild.route?.start_location ||
                      activeChild.pickup_address ||
                      "Home"}
                  </Text>
                </View>

                <Text
                  style={[styles.routeTime, { color: colors.text.secondary }]}
                >
                  {formatTime(
                    activeChild.route?.pickup_start_time ||
                      activeChild.route?.departure_time,
                  )}
                </Text>
              </View>

              {/* ROUTE LINE */}
              <View style={styles.routeLineContainer}>
                <View
                  style={[
                    styles.routeLine,
                    { backgroundColor: `${clientBrand.primary}35` },
                  ]}
                />

                <View
                  style={[
                    styles.vehicleBubble,
                    {
                      backgroundColor: clientBrand.primary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="directions-bus"
                    size={15}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              {/* SCHOOL */}
              <View style={styles.routePoint}>
                <View
                  style={[styles.routeIcon, { backgroundColor: "#FEF3C7" }]}
                >
                  <MaterialIcons name="school" size={17} color="#D97706" />
                </View>

                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>Drop-off</Text>

                  <Text
                    numberOfLines={1}
                    style={[styles.routeName, { color: colors.text.primary }]}
                  >
                    {activeChild.route?.end_location ||
                      activeChild.school_name ||
                      "School"}
                  </Text>
                </View>

                <Text
                  style={[styles.routeTime, { color: colors.text.secondary }]}
                >
                  {formatTime(activeChild.route?.dropoff_start_time)}
                </Text>
              </View>
            </View>

            {/* LIVE LOCATION */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.liveTracking,
                { backgroundColor: `${clientBrand.primary}10` },
              ]}
            >
              <View
                style={[
                  styles.liveIcon,
                  { backgroundColor: clientBrand.primary },
                ]}
              >
                <MaterialIcons name="my-location" size={16} color="#FFFFFF" />
              </View>

              <View style={styles.liveContent}>
                <Text
                  style={[styles.liveTitle, { color: colors.text.primary }]}
                >
                  Live tracking available
                </Text>

                <Text
                  style={[
                    styles.liveSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  View current vehicle location
                </Text>
              </View>

              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="directions-bus"
              size={22}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              No active trips right now.
            </Text>
          </View>
        )}

        {/* UPCOMING */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Upcoming Trips
            </Text>

            <Text
              style={[
                styles.sectionDescription,
                { color: colors.text.secondary },
              ]}
            >
              Scheduled transportation
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/(client)/(tabs)/trips")}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MaterialIcons
              name="schedule"
              size={18}
              color={clientBrand.primary}
            />
            <Text style={[styles.sectionLink, { color: clientBrand.primary }]}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {scheduledChildren.slice(0, 2).map((child) => (
          <TouchableOpacity
            key={child.id}
            activeOpacity={0.8}
            style={[
              styles.upcomingCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dateBox,
                { backgroundColor: `${clientBrand.primary}10` },
              ]}
            >
              <Text style={[styles.dateMonth, { color: clientBrand.primary }]}>
                {child.route?.departure_time
                  ? new Date(child.route.departure_time)
                      .toLocaleString([], { month: "short" })
                      .toUpperCase()
                  : "—"}
              </Text>

              <Text style={[styles.dateNumber, { color: colors.text.primary }]}>
                {child.route?.departure_time
                  ? new Date(child.route.departure_time).getDate()
                  : "—"}
              </Text>

              <Text style={[styles.dateDay, { color: colors.text.secondary }]}>
                {child.route?.departure_time
                  ? new Date(child.route.departure_time)
                      .toLocaleString([], { weekday: "short" })
                      .toUpperCase()
                  : "—"}
              </Text>
            </View>

            <View style={styles.upcomingContent}>
              <View style={styles.upcomingTopRow}>
                <Text
                  style={[styles.upcomingTime, { color: colors.text.primary }]}
                >
                  {formatTime(
                    child.route?.dropoff_start_time ||
                      child.route?.departure_time,
                  )}
                </Text>

                <View style={styles.scheduledPill}>
                  <Text style={styles.scheduledText}>Scheduled</Text>
                </View>
              </View>

              <Text
                numberOfLines={1}
                style={[styles.upcomingRoute, { color: colors.text.secondary }]}
              >
                {`${child.route?.end_location || child.school_name || "School"} → ${child.route?.start_location || child.pickup_address || "Home"}`}
              </Text>

              <Text
                style={[
                  styles.upcomingDriver,
                  { color: colors.text.secondary },
                ]}
              >
                {getDriverName(child)}
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        ))}
        {scheduledChildren.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="event-busy"
              size={22}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {isWeekend
                ? "It’s the weekend. No transport scheduled."
                : "No upcoming trips scheduled."}
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              School Trips
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.text.secondary },
              ]}
            >
              Activities involving your children
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(client)/(tabs)/trips" as never)}
          >
            <Text style={[styles.sectionLink, { color: clientBrand.primary }]}>
              View all
            </Text>
          </TouchableOpacity>
        </View>
        {schoolTripsLoading ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Loading school trips…
            </Text>
          </View>
        ) : schoolTrips.length ? (
          schoolTrips.slice(0, 2).map((trip) => (
            <TouchableOpacity
              key={trip.id}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/(client)/(tabs)/school-trip/[tripId]",
                  params: { tripId: trip.id },
                } as never)
              }
              style={[
                styles.upcomingCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.dateBox,
                  { backgroundColor: `${clientBrand.primary}10` },
                ]}
              >
                <Text
                  style={[styles.dateMonth, { color: clientBrand.primary }]}
                >
                  {new Date(trip.departure_at)
                    .toLocaleString([], { month: "short" })
                    .toUpperCase()}
                </Text>
                <Text
                  style={[styles.dateNumber, { color: colors.text.primary }]}
                >
                  {new Date(trip.departure_at).getDate()}
                </Text>
                <Text
                  style={[styles.dateDay, { color: colors.text.secondary }]}
                >
                  {new Date(trip.departure_at)
                    .toLocaleString([], { weekday: "short" })
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.upcomingContent}>
                <View style={styles.upcomingTopRow}>
                  <Text
                    style={[
                      styles.upcomingTime,
                      { color: colors.text.primary },
                    ]}
                  >
                    {trip.name}
                  </Text>
                  <View style={styles.scheduledPill}>
                    <Text style={styles.scheduledText}>
                      {trip.status.replaceAll("_", " ")}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.upcomingRoute,
                    { color: colors.text.secondary },
                  ]}
                >
                  {trip.destination}
                </Text>
                <Text
                  style={[
                    styles.upcomingDriver,
                    { color: colors.text.secondary },
                  ]}
                >
                  {trip.vehicles?.[0]?.vehicle?.name || "Vehicle pending"}
                  {trip.vehicles?.[0]?.coordinator
                    ? ` · Coordinator ${trip.vehicles[0].coordinator.first_name || ""} ${trip.vehicles[0].coordinator.last_name || ""}`.trim()
                    : ""}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          ))
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="event-busy"
              size={22}
              color={colors.text.secondary}
            />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              No school trips announced for your children.
            </Text>
          </View>
        )}

        {/* QUICK ACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Quick actions
          </Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push("/(client)/(tabs)/messages" as never)}
            style={[
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: `${clientBrand.primary}12` },
              ]}
            >
              <MaterialIcons
                name="message"
                size={19}
                color={clientBrand.primary}
              />
            </View>

            <Text style={[styles.quickLabel, { color: colors.text.primary }]}>
              Message
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(client)/(tabs)/children" as never)}
            style={[
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: DASHBOARD_COLORS.greenLight },
              ]}
            >
              <MaterialIcons
                name="people"
                size={19}
                color={DASHBOARD_COLORS.green}
              />
            </View>

            <Text style={[styles.quickLabel, { color: colors.text.primary }]}>
              Children
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push(
                (activeChild
                  ? `/(client)/(tabs)/children/${activeChild.id}`
                  : "/(client)/(tabs)/trips") as never,
              )
            }
            style={[
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: DASHBOARD_COLORS.paleBlue },
              ]}
            >
              <MaterialIcons
                name="map"
                size={19}
                color={DASHBOARD_COLORS.greenDark}
              />
            </View>

            <Text style={[styles.quickLabel, { color: colors.text.primary }]}>
              Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(client)/(tabs)/profile" as never)}
            style={[
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: DASHBOARD_COLORS.paleBlue },
              ]}
            >
              <MaterialIcons
                name="headset-mic"
                size={19}
                color={DASHBOARD_COLORS.greenDark}
              />
            </View>

            <Text style={[styles.quickLabel, { color: colors.text.primary }]}>
              Support
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  dashboardContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },

  brandHeader: {
    minHeight: 160,
    marginHorizontal: -14,
    paddingTop: 8,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  brandHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brandIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  brandName: {
    color: DASHBOARD_COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  brandTagline: {
    color: "#355B75",
    fontSize: 9,
    marginTop: 1,
  },

  greetingCard: {
    minHeight: 92,
    marginTop: 14,
    marginHorizontal: -18,
    paddingHorizontal: 22,
    paddingTop: 11,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  greetingCopy: {
    flex: 1,
    paddingRight: 8,
  },

  dashboardGreeting: {
    color: DASHBOARD_COLORS.text,
    fontSize: 13,
    fontWeight: "500",
  },

  dashboardParentName: {
    color: DASHBOARD_COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 1,
  },

  dashboardRole: {
    color: DASHBOARD_COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },

  parentAvatarWrap: {
    width: 76,
    height: 76,
    marginTop: -24,
    padding: 3,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: DASHBOARD_COLORS.border,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },

  parentAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
  },

  headerNotificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },

  headerNotificationBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  headerNotificationCount: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  paymentDashboardCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
  },

  paymentDashboardIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
  },

  paymentDashboardCopy: {
    flex: 1,
    minWidth: 0,
  },

  paymentDashboardTitle: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "800",
  },

  paymentDashboardSubtitle: {
    marginTop: 3,
    color: "#78350F",
    fontSize: 10,
    lineHeight: 14,
  },

  dashboardChildCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  dashboardChildAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 10,
  },

  emptyChildAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: DASHBOARD_COLORS.greenLight,
  },

  dashboardChildInfo: {
    flex: 1,
    minWidth: 0,
  },

  dashboardChildName: {
    color: DASHBOARD_COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  dashboardChildSchool: {
    color: DASHBOARD_COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },

  childStatusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: DASHBOARD_COLORS.greenLight,
  },

  childStatusText: {
    color: DASHBOARD_COLORS.greenDark,
    fontSize: 9,
    fontWeight: "700",
  },

  childPaymentStatusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
  },

  childPaymentStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  dashboardStats: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: DASHBOARD_COLORS.paleBlue,
    marginTop: 1,
    marginBottom: 17,
    paddingVertical: 7,
  },

  dashboardStatItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  dashboardStatValue: {
    color: DASHBOARD_COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  dashboardStatLabel: {
    color: DASHBOARD_COLORS.muted,
    fontSize: 9,
  },

  dashboardStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: DASHBOARD_COLORS.border,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: "500",
  },

  /* SAFETY */

  safetyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 16,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  safetyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  safetyContent: {
    flex: 1,
  },

  safetyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  safetyTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  safetySubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  safeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },

  /* SECTIONS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 5,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.15,
  },

  sectionDescription: {
    fontSize: 10,
    marginTop: 2,
  },

  sectionLink: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* STATS */

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 22,
  },

  statCard: {
    width: "48%",
    minHeight: 118,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  notificationStatBadge: {
    position: "absolute",
    top: -7,
    right: -9,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  notificationStatBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  statNumber: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 0,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },

  statLink: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  notificationTicker: {
    width: "100%",
    overflow: "hidden",
    marginTop: 4,
  },

  notificationTickerText: {
    fontSize: 9,
    lineHeight: 13,
    minWidth: 260,
  },

  /* ACTIVE TRIP */

  tripCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 16,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 1,
  },

  emptyCard: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 11,
    fontWeight: "600",
  },

  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    overflow: "hidden",
    marginRight: 9,
    position: "relative",
  },

  childAvatarImage: {
    width: "100%",
    height: "100%",
  },

  onlineIndicator: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  childInfo: {
    flex: 1,
  },

  childName: {
    fontSize: 14,
    fontWeight: "800",
  },

  tripStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  tripStatus: {
    fontSize: 10,
    fontWeight: "600",
  },

  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  trackText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 3,
  },

  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
  },

  activeDriverCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 11,
    padding: 8,
    borderRadius: 11,
    backgroundColor: DASHBOARD_COLORS.paleBlue,
  },

  activeDriverIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  activeDriverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 7,
    backgroundColor: "#FFFFFF",
  },

  activeDriverInfo: {
    flex: 1,
    minWidth: 0,
  },

  activeDriverName: {
    fontSize: 10,
    fontWeight: "800",
  },

  activeDriverPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },

  activeDriverPhone: {
    flexShrink: 1,
    fontSize: 9,
  },

  activeVehicle: {
    flex: 0.85,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingLeft: 7,
    borderLeftWidth: 1,
    borderLeftColor: DASHBOARD_COLORS.border,
  },

  activeVehicleIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },

  activeVehicleLabel: {
    color: DASHBOARD_COLORS.muted,
    fontSize: 8,
  },

  activeVehicleValue: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },

  driverText: {
    fontSize: 10,
    marginLeft: 5,
  },

  driverDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },

  etaText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* ROUTE */

  routeContainer: {
    marginTop: 11,
    paddingVertical: 5,
  },

  routePoint: {
    flexDirection: "row",
    alignItems: "center",
  },

  routeIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  routeTextContainer: {
    flex: 1,
    marginLeft: 9,
  },

  routeLabel: {
    fontSize: 8,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  routeName: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },

  routeTime: {
    fontSize: 10,
    fontWeight: "600",
  },

  routeLineContainer: {
    height: 27,
    marginLeft: 15,
    position: "relative",
    justifyContent: "center",
  },

  routeLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },

  vehicleBubble: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -11,
  },

  /* LIVE TRACKING */

  liveTracking: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    padding: 8,
    marginTop: 10,
  },

  liveIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  liveContent: {
    flex: 1,
    marginLeft: 8,
  },

  liveTitle: {
    fontSize: 10,
    fontWeight: "800",
  },

  liveSubtitle: {
    fontSize: 9,
    marginTop: 1,
  },

  /* UPCOMING */

  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 9,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  dateBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  dateMonth: {
    fontSize: 8,
    fontWeight: "800",
  },

  dateNumber: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },

  dateDay: {
    fontSize: 8,
    fontWeight: "700",
  },

  upcomingContent: {
    flex: 1,
  },

  upcomingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  upcomingTime: {
    fontSize: 12,
    fontWeight: "800",
  },

  scheduledPill: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  scheduledText: {
    fontSize: 8,
    color: "#059669",
    fontWeight: "700",
  },

  upcomingRoute: {
    fontSize: 10,
    marginTop: 3,
  },

  upcomingDriver: {
    fontSize: 9,
    marginTop: 3,
  },

  /* QUICK ACTIONS */

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  quickAction: {
    width: "23.5%",
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 10,
  },

  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  quickLabel: {
    fontSize: 9,
    fontWeight: "700",
  },

  attendanceCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 22,
  },

  attendanceDateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
  },

  attendanceDateText: {
    fontSize: 11,
    fontWeight: "800",
  },

  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  attendanceChildIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginRight: 10,
  },

  attendanceChildInfo: {
    flex: 1,
  },

  attendanceChildName: {
    fontSize: 14,
    fontWeight: "800",
  },

  attendanceChildTime: {
    fontSize: 11,
    marginTop: 3,
  },

  attendanceStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  attendanceStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  attendanceEmpty: {
    paddingVertical: 18,
    fontSize: 13,
    textAlign: "center",
  },

  /* BOTTOM NAV */

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingBottom: 4,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },
});
