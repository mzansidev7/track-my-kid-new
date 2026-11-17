import React, { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useAuth } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import {
  useRecentTrips,
  useSchoolDashboard,
} from "@/app-support/school/schoolHelpers/hooks/useSchoolDashboard";
import { useSchoolNotifications } from "@/app-support/school/schoolHelpers/hooks/useSchoolNotifications";
import { RecentTrip } from "@/types/school/client.interfaces";
import {
  getUserName,
  schoolQuickActions,
  schoolStats,
} from "@/app-support/school/schoolHelpers/actionHelpers/actions";

const SchoolDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { school, students, routes, drivers, loading, assignedTrips } =
    useSchoolDashboard();
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<{
    present: number;
    absent: number;
    total: number;
    pending: number;
  } | null>(null);
  const [attendanceError, setAttendanceError] = useState("");
  const { unreadCount: unreadNotificationCount } = useSchoolNotifications();
  const quickActions = schoolQuickActions();
  const stats = schoolStats(students, routes, drivers);
  const userName = getUserName(user);
  const avatar = user?.userData?.avatar;
  const userAvatar =
    (typeof avatar === "string" ? avatar : avatar?.avatar_url || avatar?.url) ||
    adminAvatar ||
    (typeof user?.userData?.admin_profile?.avatar === "string"
      ? user.userData.admin_profile.avatar
      : user?.userData?.admin_profile?.avatar?.avatar_url ||
        user?.userData?.admin_profile?.avatar?.url) ||
    user?.userData?.avatar_url ||
    user?.userData?.profile_photo_url;

  const recentTrips = useRecentTrips(routes);

  useEffect(() => {
    if (!user?.token) return undefined;

    let active = true;
    const loadAdminAvatar = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/school/admin/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const profile = await response.json();
        if (!response.ok) {
          throw new Error(profile.error || "Unable to load admin profile.");
        }
        if (!active) return;

        const profileAvatar = profile.avatar;
        setAdminAvatar(
          typeof profileAvatar === "string"
            ? profileAvatar
            : profileAvatar?.avatar_url || profileAvatar?.url || null,
        );
      } catch (error) {
        console.error("Could not load school admin avatar:", error);
      }
    };

    void loadAdminAvatar();
    return () => {
      active = false;
    };
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return undefined;

    let active = true;
    const loadAttendance = async () => {
      const today = new Date();
      const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/school/attendance?date=${date}`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load today's attendance.");
        }
        if (!active) return;

        const records = Array.isArray(data.records) ? data.records : [];
        const absenceReports = Array.isArray(data.absenceReports)
          ? data.absenceReports
          : [];
        const students = Array.isArray(data.students) ? data.students : [];
        const handledStudentIds = new Set([
          ...records.map((record: { child_id: string | number }) =>
            String(record.child_id),
          ),
          ...absenceReports.map((report: { child_id: string | number }) =>
            String(report.child_id),
          ),
        ]);
        const absentStudentIds = new Set([
          ...records
            .filter((record: { status: string }) => record.status === "absent")
            .map((record: { child_id: string | number }) =>
              String(record.child_id),
            ),
          ...absenceReports.map((report: { child_id: string | number }) =>
            String(report.child_id),
          ),
        ]);
        setAttendance({
          present: records.filter(
            (record: { status: string }) =>
              record.status === "present" || record.status === "late",
          ).length,
          absent: absentStudentIds.size,
          total: students.length,
          pending: students.filter(
            (student: { id: string | number }) =>
              !handledStudentIds.has(String(student.id)),
          ).length,
        });
        setAttendanceError("");
      } catch (requestError: any) {
        console.error("Could not load mobile school attendance:", requestError);
        if (active) {
          setAttendanceError("Today's attendance reminder is unavailable.");
        }
      }
    };

    void loadAttendance();
    const interval = setInterval(() => void loadAttendance(), 300000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={school?.logo ? { uri: school.logo } : undefined}
        resizeMode="cover"
        imageStyle={styles.headerBackgroundImage}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {new Date().getHours() < 12
              ? "Good morning"
              : new Date().getHours() < 17
                ? "Good afternoon"
                : "Good evening"}
          </Text>
          <Text style={styles.welcomeName}>{userName}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            unreadNotificationCount > 0
              ? `Notifications, ${unreadNotificationCount} unread`
              : "Notifications"
          }
          activeOpacity={0.75}
          onPress={() => router.push("/(school)/pages/notifications" as never)}
          style={styles.headerNotification}
        >
          <Ionicons name="notifications-outline" size={23} color="#FFFFFF" />
          {unreadNotificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          {userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={styles.headerAvatarImage}
            />
          ) : (
            <Ionicons name="school-outline" size={23} color="#FFFFFF" />
          )}
        </View>
      </ImageBackground>
      {/* Devider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#E2E8F0",
          marginVertical: 10,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.schoolCard}>
          <View style={styles.schoolIcon}>
            {school?.logo ? (
              <Image source={{ uri: school.logo }} style={styles.schoolLogo} />
            ) : (
              <Ionicons name="school-outline" size={24} color="#FFFFFF" />
            )}
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
                  : "School profile"}
            </Text>
          </View>
          <MaterialIcons
            name="verified"
            size={22}
            color={school?.is_active ? "#86EFAC" : "#CBD5E1"}
          />
        </View>

        {assignedTrips.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(school)/(tabs)/trips" as never)}
            style={styles.tripStartAlert}
          >
            <View style={styles.tripStartIcon}>
              <MaterialIcons name="my-location" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.tripStartCopy}>
              <Text style={styles.tripStartTitle}>Trip starting now</Text>
              <Text style={styles.tripStartText} numberOfLines={2}>
                {assignedTrips[0].trip?.name || "An assigned school trip"} is in
                progress. You are the{" "}
                {assignedTrips[0].assigned_role?.replaceAll("_", " ") ||
                  "assigned staff member"}
                . Tap to go online and share your location.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#166534" />
          </TouchableOpacity>
        )}

        {school &&
          (["pending", "needs_info", "rejected"].includes(school.status) ||
            school.is_active === false) && (
            <View style={styles.schoolStatusNotice}>
              <MaterialIcons
                name={school.status === "pending" ? "schedule" : "info-outline"}
                size={19}
                color="#B45309"
              />
              <Text style={styles.schoolStatusText}>
                {school.status === "pending"
                  ? "Your school registration is awaiting approval."
                  : school.status === "needs_info"
                    ? "More information is needed to complete your school registration."
                    : school.status === "rejected"
                      ? "Your school registration was not approved. Please contact support."
                      : "Some school features may be limited while your account is inactive."}
              </Text>
            </View>
          )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>School overview</Text>
            <Text style={styles.sectionSubtitle}>Your school at a glance</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <View key={item.title} style={styles.statCard}>
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
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <Text style={styles.sectionSubtitle}>Common school tasks</Text>
          </View>
        </View>

        <View style={styles.actionsCard}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.actionItem}
              activeOpacity={0.82}
              onPress={() => {
                if (item.screen === "Students") {
                  router.push("/(school)/(tabs)/students" as never);
                } else if (item.screen === "Routes") {
                  router.push("/(school)/(tabs)/routes" as never);
                } else {
                  router.push("/(school)/(tabs)/more" as never);
                }
              }}
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
              <MaterialIcons name="arrow-outward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Transport overview</Text>
            <Text style={styles.sectionSubtitle}>
              Current school operations
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push("/(school)/(tabs)/trips" as never)}
          >
            <Text style={styles.viewAll}>Trips</Text>
            <MaterialIcons name="chevron-right" size={17} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.transportCard}>
          <View style={styles.transportRow}>
            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>{assignedTrips.length}</Text>
              <Text style={styles.transportLabel}>Assigned trips</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>{students.length}</Text>
              <Text style={styles.transportLabel}>Students</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.transportItem}>
              <Text style={styles.transportNumber}>{routes.length}</Text>
              <Text style={styles.transportLabel}>Routes</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent routes</Text>
            <Text style={styles.sectionSubtitle}>
              Latest routes configured for your school
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push("/(school)/(tabs)/routes" as never)}
          >
            <Text style={styles.viewAll}>See all</Text>
            <MaterialIcons name="chevron-right" size={17} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.tripsCard}>
          {recentTrips.length === 0 ? (
            <View style={styles.emptyRoutes}>
              <View style={styles.tripIcon}>
                <MaterialCommunityIcons name="bus" size={19} color="#2563EB" />
              </View>
              <View style={styles.tripInfo}>
                <Text style={styles.tripRoute}>No routes yet</Text>
                <Text style={styles.tripDetails}>
                  School routes will appear here when added.
                </Text>
              </View>
            </View>
          ) : (
            recentTrips.map((trip: RecentTrip, index: number) => (
              <View
                key={trip.id}
                style={[
                  styles.tripItem,
                  index !== recentTrips.length - 1 && styles.tripBorder,
                ]}
              >
                <View style={styles.tripIcon}>
                  <MaterialCommunityIcons
                    name="bus"
                    size={18}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>{trip.route}</Text>
                  <Text style={styles.tripDetails}>
                    {trip.vehicle} · {trip.driver}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tripStatus,
                    { backgroundColor: `${trip.statusColor}15` },
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
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <Text style={styles.sectionSubtitle}>
              Today&apos;s student register
            </Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>
              {new Date().toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.attendanceCard}>
          <View style={styles.attendanceTop}>
            <View>
              <Text style={styles.attendanceTitle}>{`Today's attendance`}</Text>

              <Text style={styles.attendanceSubtitle}>
                {attendance
                  ? `${attendance.present} present or late out of ${attendance.total} students`
                  : "Attendance summary"}
              </Text>
            </View>

            <Text style={styles.attendancePercentage}>
              {attendance
                ? `${Math.round(
                    attendance.total
                      ? (attendance.present / attendance.total) * 100
                      : 0,
                  )}%`
                : "--"}
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(
                    attendance?.total
                      ? (attendance.present / attendance.total) * 100
                      : 0,
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.attendanceStats}>
            <View>
              <Text style={styles.attendanceNumber}>
                {attendance?.present ?? "--"}
              </Text>
              <Text style={styles.attendanceLabel}>Present / late</Text>
            </View>

            <View>
              <Text style={styles.attendanceNumber}>
                {attendance?.absent ?? "--"}
              </Text>
              <Text style={styles.attendanceLabel}>Absent</Text>
            </View>

            <View>
              <Text style={styles.attendanceNumber}>
                {attendance?.pending ?? "--"}
              </Text>
              <Text style={styles.attendanceLabel}>Still to mark</Text>
            </View>
          </View>
          {attendanceError ? (
            <Text style={styles.attendanceError}>{attendanceError}</Text>
          ) : attendance && attendance.pending > 0 ? (
            <View style={styles.attendanceReminder}>
              <Ionicons name="alert-circle" size={18} color="#B45309" />
              <Text style={styles.attendanceReminderText}>
                {attendance.pending} student
                {attendance.pending === 1 ? " still needs" : "s still need"} an
                attendance status today.
              </Text>
            </View>
          ) : null}
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
    backgroundColor: "#F4F7FB",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 132,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: 15,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  headerBackgroundImage: {
    opacity: 0.4,
    borderRadius: 16,
  },

  headerLeft: {
    flex: 1,
  },

  greeting: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 3,
  },

  welcomeName: {
    color: "#14213D",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  schoolName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 4,
  },

  headerNotification: {
    width: 46,
    height: 46,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    marginRight: 10,
    backgroundColor: "#2c3444",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    backgroundColor: "#DC2626",
    zIndex: 1,
    elevation: 2,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  headerAvatar: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#2c3444",
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },

  schoolCard: {
    backgroundColor: "#122957",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#122957",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },

  tripStartAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginBottom: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  tripStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
  },
  tripStartCopy: { flex: 1, gap: 3 },
  tripStartTitle: { color: "#166534", fontSize: 13, fontWeight: "800" },
  tripStartText: { color: "#3F644C", fontSize: 11, lineHeight: 16 },

  schoolStatusNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
  },
  schoolStatusText: {
    flex: 1,
    color: "#92400E",
    fontSize: 11,
    lineHeight: 16,
  },

  schoolIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  schoolLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  schoolInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  schoolTitle: {
    fontSize: 14,
    fontWeight: "800",
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

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: "#718096",
    fontSize: 11,
  },

  viewAll: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statCard: {
    width: "48.2%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    minHeight: 112,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#172033",
  },

  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  actionsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 12,
  },

  actionItem: {
    width: "48.2%",
    minHeight: 82,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 0,
  },

  actionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#27364B",
    flex: 1,
  },

  transportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    paddingVertical: 17,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
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
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
  },

  transportLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  verticalLine: {
    width: 1,
    height: 32,
    backgroundColor: "#E8EDF4",
  },

  tripsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },

  tripItem: {
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  tripBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  emptyRoutes: {
    minHeight: 76,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  tripIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  tripInfo: {
    flex: 1,
  },

  tripRoute: {
    fontSize: 12,
    fontWeight: "700",
    color: "#172033",
  },

  tripDetails: {
    fontSize: 10,
    color: "#718096",
    marginTop: 3,
  },

  tripRight: {
    alignItems: "flex-end",
  },

  tripStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  attendanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    padding: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  attendanceReminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
  },
  attendanceError: {
    marginTop: 12,
    color: "#B91C1C",
    fontSize: 11,
  },
  attendanceReminderText: {
    flex: 1,
    color: "#9A3412",
    fontSize: 10,
    lineHeight: 15,
  },

  attendanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  attendanceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#172033",
  },

  attendanceSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  attendancePercentage: {
    fontSize: 22,
    fontWeight: "800",
    color: "#16834A",
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  datePillText: { color: "#2563EB", fontSize: 10, fontWeight: "700" },

  progressBackground: {
    height: 8,
    backgroundColor: "#E8EDF4",
    borderRadius: 5,
    marginTop: 14,
    overflow: "hidden",
  },

  progressFill: {
    width: "0%",
    height: "100%",
    backgroundColor: "#22A064",
    borderRadius: 5,
  },

  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },

  attendanceNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
  },

  attendanceLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 3,
  },
});
