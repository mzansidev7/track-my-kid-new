import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../authContext/auth-context";
import { BASE_URL } from "../../../../url";
import {
  subscribeToClientChildrenUpdates,
  unsubscribeFromRealtime,
} from "../../../../store/subscriptions/clientRealtime";
import {
  saveChildren,
  loadChildren,
} from "../../../../asyncStorage/clientCache";

const ChildrenScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const cachedChildren = await loadChildren();
      if (!forceRefresh && cachedChildren && cachedChildren.length >= 0) {
        setChildren(cachedChildren);
      }

      const response = await fetch(`${BASE_URL}/client/children`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to load children.",
        );
      }

      const nextChildren = Array.isArray(data) ? data : [];
      await saveChildren(nextChildren);
      setChildren(nextChildren);
    } catch (err: any) {
      console.error("Fetch children error:", err);
      setError(err?.message || "Unable to load children.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.token) return;

    fetchChildren();

    const channel = subscribeToClientChildrenUpdates(
      user.userData?.id || user?.id,
      () => {
        fetchChildren(true);
      },
    );

    return () => {
      unsubscribeFromRealtime(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, user?.userData?.id, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChildren(true);
    setRefreshing(false);
  };

  const renderChild = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.childCard, { backgroundColor: colors.surface }]}
        // onPress={() =>
        //   router.push(`/(client)/(tabs)/children/${item.id.toString()}`)
        // }
        activeOpacity={0.7}
      >
        <Text style={[styles.childCardHeader, { color: colors.text.primary }]}>
          {JSON.stringify(item)}
        </Text>
        <View style={styles.childCardHeader}>
          <View style={styles.childCardLeft}>
            <Image
              source={
                item?.avatar
                  ? { uri: item.avatar }
                  : require("@/assets/images/client.png")
              }
              style={styles.childAvatar}
            />
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.text.primary }]}>
                {item.name} {item.lastname || ""}
              </Text>
              <View style={styles.childMetaRow}>
                <Ionicons name="school" size={14} color="#8B5CF6" />
                <Text
                  style={[styles.childMeta, { color: colors.text.secondary }]}
                >
                  {item.grade || "Grade not set"} •{" "}
                  {item.school_name || "School"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.vehicle ? "#DCFCE7" : "#DBEAFE",
                  },
                ]}
              >
                <Ionicons
                  name={item.vehicle ? "car" : "information-circle"}
                  size={14}
                  color={item.vehicle ? "#16A34A" : "#1D4ED8"}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: item.vehicle ? "#16A34A" : "#1D4ED8",
                    },
                  ]}
                >
                  {item.vehicle
                    ? "On the way to school"
                    : "Not linked to a vehicle"}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialIcons
              name="more-vert"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.childCardStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="radio-button-off" size={18} color="#2563EB" />
            </View>
            <View>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                Today&apos;s Pickup
              </Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>
                07:15 AM
              </Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="home" size={18} color="#10B981" />
            </View>
            <View>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                Today&apos;s Drop-off
              </Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>
                02:30 PM
              </Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="navigate-circle" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                Route
              </Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>
                Route 5
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.text.secondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              My Children
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text.secondary }]}
            >
              Manage and monitor your children
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons
                name="notifications"
                size={24}
                color={colors.text.primary}
              />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>2</Text>
              </View>
            </TouchableOpacity>
            <Image
              source={require("@/assets/images/client.png")}
              style={styles.headerAvatar}
            />
          </View>
        </View>

        {/* Banner */}
        <View style={[styles.bannerCard, { backgroundColor: colors.surface }]}>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconContainer}>
              <MaterialIcons name="shield" size={28} color="#2563EB" />
            </View>
            <View style={styles.bannerText}>
              <Text
                style={[styles.bannerTitle, { color: colors.text.primary }]}
              >
                Your children are our priority
              </Text>
              <Text
                style={[
                  styles.bannerDescription,
                  { color: colors.text.secondary },
                ]}
              >
                We ensure their safety with real-time tracking, verified drivers
                and secure trips.
              </Text>
            </View>
          </View>
          <View style={styles.bannerIllustration}>
            <Ionicons name="shield-checkmark" size={60} color="#2563EB" />
          </View>
        </View>

        {/* Your Children Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Your Children ({children.length})
          </Text>
          <TouchableOpacity
            style={styles.addChildButton}
            // onPress={() => router.push("/(client)/(tabs)/children/add-child")}
          >
            <MaterialIcons name="add-circle" size={20} color="#2563EB" />
            <Text style={[styles.addChildText, { color: "#2563EB" }]}>
              Add Child
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={[styles.messageTitle, { color: colors.text.primary }]}>
              Unable to load children
            </Text>
            <Text
              style={[styles.messageText, { color: colors.text.secondary }]}
            >
              {error}
            </Text>
            <TouchableOpacity onPress={() => fetchChildren()}>
              <Text style={[styles.retryText, { color: colors.primary }]}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : children.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No children yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.text.secondary }]}
            >
              Add your first child profile to link them to a vehicle and begin
              tracking.
            </Text>
          </View>
        ) : (
          <View>
            {children.map((child, idx) => (
              <View key={child.id.toString()}>
                {renderChild({ item: child, index: idx } as any)}
              </View>
            ))}
          </View>
        )}

        {/* Need to update something? */}
        {children.length > 0 && (
          <>
            <View
              style={[styles.updateCard, { backgroundColor: colors.surface }]}
            >
              <View>
                <Text
                  style={[styles.updateTitle, { color: colors.text.primary }]}
                >
                  Need to update something?
                </Text>
                <Text
                  style={[
                    styles.updateSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  Edit your child&apos;s details, school, or trip information.
                </Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.updateLink, { color: "#2563EB" }]}>
                  Manage Children
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsHeader}>
              <Text
                style={[
                  styles.quickActionsTitle,
                  { color: colors.text.primary },
                ]}
              >
                Quick Actions
              </Text>
            </View>
            <View style={styles.quickActions}>
              {[
                {
                  label: "Add Child",
                  desc: "Register a new child",
                  icon: "person-add",
                  color: "#10B981",
                  // onPress: () =>
                  //   router.push("/(client)/(tabs)/children/add-child"),
                },
                {
                  label: "Update School",
                  desc: "Change school information",
                  icon: "school",
                  color: "#F59E0B",
                },
                {
                  label: "Manage Trips",
                  desc: "View and edit child trips",
                  icon: "calendar-today",
                  color: "#2563EB",
                },
                {
                  label: "Share QR Code",
                  desc: "Share child's QR with driver",
                  icon: "qr-code",
                  color: "#8B5CF6",
                },
              ].map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.actionTile}
                  onPress={(action as any).onPress}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${action.color}22` },
                    ]}
                  >
                    <MaterialIcons
                      name={action.icon as any}
                      size={24}
                      color={action.color}
                    />
                  </View>
                  <Text
                    style={[styles.actionLabel, { color: colors.text.primary }]}
                  >
                    {action.label}
                  </Text>
                  <Text
                    style={[
                      styles.actionDesc,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {action.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Safety Banner */}
            <View style={styles.safetyBanner}>
              <View style={styles.safetyLeft}>
                <View style={styles.safetyIcon}>
                  <MaterialIcons name="shield" size={28} color="#fff" />
                </View>
                <View>
                  <Text
                    style={[styles.safetyTitle, { color: colors.text.primary }]}
                  >
                    Safety at Every Step
                  </Text>
                  <Text
                    style={[
                      styles.safetyDescription,
                      { color: colors.text.secondary },
                    ]}
                  >
                    You will be notified when your child is picked up and
                    dropped off.
                  </Text>
                </View>
              </View>
              <View style={styles.safetyIllustration}>
                <Ionicons name="bus" size={40} color="#10B981" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChildrenScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 120 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    position: "relative",
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },

  // Banner
  bannerCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  bannerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  bannerDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  bannerIllustration: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  addChildButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addChildText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Child Card
  childCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  childCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  childCardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  childAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  childMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  childMeta: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  // Child Card Stats
  childCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  // Update Card
  updateCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  updateSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  updateLink: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Quick Actions
  quickActionsHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionTile: {
    width: "48%",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },

  // Safety Banner
  safetyBanner: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
  },
  safetyLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  safetyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  safetyDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  safetyIllustration: {
    justifyContent: "center",
    alignItems: "center",
  },

  // States
  loadingContainer: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  messageCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyStateCard: {
    marginHorizontal: 20,
    marginTop: 40,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
