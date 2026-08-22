import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AppNotification from "../../../../components/Notification";
import ClientHeader from "../../components/ClientHeader";
import { Child, useChildren } from "../../clientHelpers/hooks/useChildren";
import { useClientProfile } from "../../clientHelpers/hooks/useClientProfile";

const formatTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return value;
};

const deriveChildStatus = (child: Child) => {
  const route = child.route;
  const pickupTime = route?.pickup_start_time || route?.departure_time;
  const dropoffTime = route?.dropoff_start_time;

  if (child.status) {
    return {
      label: child.status,
      accent: child.accent || "#2563EB",
      note:
        child.eta && child.eta !== "None"
          ? `ETA to school: ${child.eta}`
          : "Tracking active",
    };
  }

  if (pickupTime || dropoffTime) {
    return {
      label: pickupTime ? "On a Trip" : "At School",
      accent: pickupTime ? "#22C55E" : "#F59E0B",
      note: pickupTime
        ? `ETA to school: ${formatTime(pickupTime)}`
        : "Checked in safely at school",
    };
  }

  return {
    label: "At School",
    accent: "#F59E0B",
    note: "Checked in safely at school",
  };
};

const ChildrenScreen = () => {
  const router = useRouter();
  const { children: existingChildren, childrenLoading } = useChildren();
  const { client } = useClientProfile();
  const [profileNotification, setProfileNotification] = React.useState({
    visible: false,
    message: "",
    type: "warning" as const,
  });

  const openAddChild = () => {
    const phone = (client?.phone || "").replace(/[\s()-]/g, "");
    const profileComplete = Boolean(
      client?.first_name?.trim() &&
      client?.last_name?.trim() &&
      /^\+?[0-9]{7,15}$/.test(phone) &&
      client?.relationship &&
      client?.home_address?.trim() &&
      client?.home_latitude !== null &&
      client?.home_latitude !== undefined &&
      client?.home_longitude !== null &&
      client?.home_longitude !== undefined,
    );

    if (!profileComplete) {
      setProfileNotification({
        visible: true,
        message:
          "Please complete your personal information before adding a child. Routing to the profile page",
        type: "warning",
      });
      setTimeout(() => {
        router.push("/(client)/pages/personal-information");
      }, 4000);
      return;
    }

    router.push("/(client)/(tabs)/children/add-child");
  };

  const overviewCards = [
    {
      count: existingChildren.filter(
        (child) => deriveChildStatus(child).label === "On a Trip",
      ).length,
      label: "On a Trip",
      sub: "View live location",
      icon: "directions-bus" as const,
      color: "#DCFCE7",
      iconColor: "#16A34A",
    },
    {
      count: existingChildren.filter(
        (child) => deriveChildStatus(child).label === "At School",
      ).length,
      label: "At School",
      sub: "Checked in",
      icon: "school" as const,
      color: "#FEF3C7",
      iconColor: "#F59E0B",
    },
    {
      count: existingChildren.filter((child) => !child.route).length,
      label: "Upcoming",
      sub: "Later today",
      icon: "schedule" as const,
      color: "#E9D5FF",
      iconColor: "#8B5CF6",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader
        title="My Children"
        subtitle="Track and manage your children"
        showBackButton={true}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Children</Text>
            <Text style={styles.subtitle}>Manage and track your children</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={23} color="#111827" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="people" size={26} color="#2563EB" />
            </View>
            <View style={styles.summaryMeta}>
              <Text style={styles.summaryCount}>
                {(existingChildren && existingChildren.length) || 0} Children
              </Text>
              <Text style={styles.summaryInfo}>
                {overviewCards[0].count} On a trip · {overviewCards[1].count} At
                school
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddChild}>
            <MaterialIcons name="add" size={22} color="#2563EB" />
            <Text style={styles.addText}>Add Child</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Children Overview</Text>
        <View style={styles.overviewGrid}>
          {/*  */}
          {overviewCards.map((card) => (
            <TouchableOpacity
              key={card.label}
              style={[
                styles.overviewCard,
                {
                  backgroundColor: card.color,
                  borderColor: `${card.iconColor}`,
                  shadowColor: "#000",
                },
              ]}
            >
              <View
                style={[
                  styles.overviewIcon,
                  { backgroundColor: `${card.iconColor}1A` },
                ]}
              >
                <MaterialIcons
                  name={card.icon}
                  size={18}
                  color={card.iconColor}
                />
                <Text style={styles.overviewCount}>{card.count}</Text>
              </View>
              <Text style={styles.overviewLabel}>{card.label}</Text>
              <Text style={styles.overviewSub}>{card.sub}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#4B5563" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitleLarge}>My Children</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {childrenLoading && existingChildren.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading children...</Text>
            </View>
          ) : existingChildren.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialIcons
                  name="people-outline"
                  size={28}
                  color="#2563EB"
                />
              </View>
              <Text style={styles.emptyTitle}>No children yet</Text>
              <Text style={styles.emptyText}>
                Add your first child to start tracking their school trip.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddChild}
              >
                <Text style={styles.emptyButtonText}>Add Child</Text>
              </TouchableOpacity>
            </View>
          ) : (
            existingChildren.map((child: Child) => {
              const status = deriveChildStatus(child);
              const routeName = child.route?.route_name || "Route";
              const pickupTime = formatTime(
                child.route?.pickup_start_time || child.route?.departure_time,
              );
              const dropoffTime = formatTime(
                child.route?.dropoff_start_time ||
                  child.route?.dropoff_end_time,
              );

              return (
                <View key={child.id || child.name} style={styles.childCard}>
                  <View style={styles.childHeader}>
                    <View style={styles.avatarWrap}>
                      {child.avatar ? (
                        <Image
                          source={{ uri: child.avatar }}
                          style={{ width: 50, height: 50, borderRadius: 23 }}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(child.name || "C").charAt(0)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>
                        {child.name} {child.lastname || ""}
                      </Text>
                      <Text style={styles.childMeta}>
                        {child.grade || "Grade not set"} •{" "}
                        {child.school_name || "School not set"}
                      </Text>

                      <View style={styles.statusRow}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#475569",
                            fontWeight: "600",
                          }}
                        >
                          {routeName}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={() =>
                        router.push({
                          pathname: "/(client)/(tabs)/children/[childId]",
                          params: { childId: child.id },
                        })
                      }
                    >
                      <Ionicons
                        name="location-outline"
                        size={22}
                        color="#1D4ED8"
                      />
                      <Text style={styles.trackText}>Track</Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inlineStatusCard}>
                    <Ionicons
                      name={
                        status.label === "At School"
                          ? "checkmark-circle"
                          : "navigate-circle"
                      }
                      size={18}
                      color={status.accent}
                    />
                    <Text style={styles.inlineStatusText}>{status.label}</Text>
                    <Text style={styles.inlineTimeText}>
                      {status.label === "At School"
                        ? status.note
                        : `${pickupTime} • ${dropoffTime}`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {!childrenLoading && existingChildren.length > 0 && (
            <View style={styles.safetyBanner}>
              <View style={styles.safetyIconWrap}>
                <MaterialIcons name="security" size={32} color="#fff" />
              </View>
              <Text style={styles.safetyText}>
                We&apos;ll notify you if your child is picked up, dropped off or
                if there are any changes.
              </Text>
              <MaterialIcons name="chevron-right" size={26} color="#111827" />
            </View>
          )}
        </ScrollView>
        <AppNotification
          message={profileNotification.message}
          type={profileNotification.type}
          visible={profileNotification.visible}
          onHide={() =>
            setProfileNotification((current) => ({
              ...current,
              visible: false,
            }))
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default ChildrenScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },

  container: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    paddingHorizontal: 14,
  },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },

  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: "#64748B",
  },

  bellButton: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#DDE7F1",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    position: "absolute",
    right: 1,
    top: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "700",
  },

  /* SUMMARY */
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#CFE0FF",
    marginBottom: 12,
  },

  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#DDEBFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  summaryMeta: {
    flex: 1,
  },

  summaryCount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  summaryInfo: {
    fontSize: 10,
    color: "#475569",
    marginTop: 1,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1.2,
    borderColor: "#2E5BFF",
    backgroundColor: "#F4F8FF",
  },

  addText: {
    marginLeft: 3,
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },

  /* SECTION TITLES */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 3,
    marginBottom: 7,
  },

  sectionTitleLarge: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
    marginBottom: 7,
  },

  /* OVERVIEW */
  overviewGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 7,
  },

  overviewCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    minHeight: 78,
    alignItems: "flex-start",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  overviewIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 15,
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 5,
  },

  overviewCount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 20,
  },

  overviewLabel: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "700",
    marginTop: 1,
  },

  overviewSub: {
    fontSize: 9,
    color: "#475569",
    marginTop: 0,
    marginBottom: 1,
  },

  /* LIST */
  list: {
    flex: 1,
    marginTop: 3,
  },

  loadingState: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#475569",
    fontWeight: "700",
  },

  emptyState: {
    minHeight: 220,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    maxWidth: 260,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  emptyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  /* CHILD CARD */
  childCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 9,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  childHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrap: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#D9EAFD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  childInfo: {
    flex: 1,
  },

  childName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  childMeta: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  extraMeta: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
  },

  /* TRACK BUTTON */
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#D0DAF3",
  },

  trackText: {
    marginLeft: 3,
    fontSize: 10,
    color: "#1D4ED8",
    fontWeight: "700",
  },

  /* INLINE STATUS */
  inlineStatusCard: {
    marginTop: 8,
    backgroundColor: "#EDF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  inlineStatusText: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "700",
  },

  inlineTimeText: {
    fontSize: 9,
    color: "#475569",
    marginLeft: 1,
  },

  /* SAFETY */
  safetyBanner: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: "#EAF4FF",
    borderRadius: 12,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4E5FF",
  },

  safetyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#0F5BEF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  safetyText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: "#111827",
    fontWeight: "600",
  },

  /* BOTTOM NAV */
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F5F7",
    paddingTop: 7,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    marginTop: 4,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },

  navTextActive: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
});
