import React, { useContext } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../styles/theme";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useClientProfile } from "../../../clientHelpers/hooks/useClientProfile";
import { ClientHeader } from "../../../components/ClientHeader";

const ClientHomeScreen = () => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const { client, loading } = useClientProfile();
  const clientName = client?.name || user?.userData?.name || "Nomsa";

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ClientHeader
          name={clientName}
          greeting={getGreeting()}
          subtitle="Here’s what’s happening with your child today."
          // avatarSource={require("@/assets/images/client.png")}
          avatarStatusColor="#22C55E"
        />

        <View style={[styles.childCard, { backgroundColor: colors.surface }]}>
          <View style={styles.childCardRow}>
            <View style={styles.childAvatarWrap}>
              <Image
                source={require("@/assets/images/client.png")}
                style={styles.childAvatar}
              />
            </View>
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.text.primary }]}>
                Lukhanyo Dlamini
              </Text>
              <Text
                style={[styles.childDetails, { color: colors.text.secondary }]}
              >
                Grade 4 • Sunshine Primary School
              </Text>
              <View style={styles.childStatusRow}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    On the way to school
                  </Text>
                </View>
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={colors.text.secondary}
            />
          </View>
        </View>

        <View
          style={[styles.liveTripCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.liveTripHeader}>
            <View>
              <Text
                style={[styles.liveTripTitle, { color: colors.text.primary }]}
              >
                Live Trip
              </Text>
              <View style={styles.liveTripStatusRow}>
                <View style={styles.liveTripDot} />
                <Text style={[styles.liveTripStatus, { color: "#10B981" }]}>
                  In Progress
                </Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapPreview}>
            <View style={styles.mapGraphic}>
              <View style={[styles.routeLine, { left: 24, top: 26 }]} />
              <View
                style={[styles.routeLine, { left: 40, top: 52, width: 160 }]}
              />
              <View style={[styles.routeDot, { left: 60, top: 48 }]} />
              <View style={[styles.routeDot, { left: 96, top: 68 }]} />
              <View style={[styles.routeDot, { left: 140, top: 54 }]} />
              <View
                style={[
                  styles.tripPin,
                  styles.pickupPin,
                  { left: 18, top: 18 },
                ]}
              >
                <MaterialIcons name="home" size={16} color="#fff" />
              </View>
              <View
                style={[
                  styles.tripPin,
                  styles.dropoffPin,
                  { right: 18, top: 24 },
                ]}
              >
                <MaterialIcons name="school" size={16} color="#fff" />
              </View>
            </View>
          </View>

          <View
            style={[styles.driverCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.driverAvatarWrap}>
              <Image
                source={require("@/assets/images/driver.jpeg")}
                style={styles.driverAvatar}
              />
            </View>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.text.primary }]}>
                John Mokoena
              </Text>
              <View style={styles.driverMetaRow}>
                <MaterialIcons name="star" size={14} color="#FBBF24" />
                <Text style={styles.driverMetaText}>4.9</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <MaterialIcons name="call" size={18} color="#2563EB" />
              <Text style={styles.callButtonText}>Call Driver</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickCardsRow}>
          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardIcon, { backgroundColor: "#EEF2FF" }]}>
              <MaterialIcons name="today" size={20} color="#4338CA" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Today’s Schedule
            </Text>
            <View style={styles.scheduleRow}>
              <Text
                style={[styles.scheduleTime, { color: colors.text.primary }]}
              >
                Pickup
              </Text>
              <Text
                style={[styles.scheduleValue, { color: colors.text.secondary }]}
              >
                07:15 AM
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text
                style={[styles.scheduleTime, { color: colors.text.primary }]}
              >
                Drop-off
              </Text>
              <Text
                style={[styles.scheduleValue, { color: colors.text.secondary }]}
              >
                02:30 PM
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.cardLink}>View Schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardIcon, { backgroundColor: "#DCFCE7" }]}>
              <MaterialIcons name="shield" size={20} color="#047857" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Safety First
            </Text>
            <Text style={[styles.cardText, { color: colors.text.secondary }]}>
              We prioritize your child’s safety always.
            </Text>
            <TouchableOpacity>
              <Text style={styles.cardLink}>Learn More</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardIcon, { backgroundColor: "#FEF3C7" }]}>
              <MaterialIcons name="message" size={20} color="#B45309" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Messages
            </Text>
            <Text style={[styles.cardText, { color: colors.text.secondary }]}>
              You have 2 new messages from driver
            </Text>
            <TouchableOpacity>
              <Text style={styles.cardLink}>View Inbox</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View
            style={[styles.activityCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.activityHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Recent Activity
              </Text>
              <TouchableOpacity>
                <Text style={styles.activityLink}>View Full Activity</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityDotActive} />
              <View style={styles.activityTextGroup}>
                <Text
                  style={[styles.activityTime, { color: colors.text.primary }]}
                >
                  07:15 AM
                </Text>
                <Text
                  style={[
                    styles.activityText,
                    { color: colors.text.secondary },
                  ]}
                >
                  Picked up from Home
                </Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityDotActive} />
              <View style={styles.activityTextGroup}>
                <Text
                  style={[styles.activityTime, { color: colors.text.primary }]}
                >
                  07:22 AM
                </Text>
                <Text
                  style={[
                    styles.activityText,
                    { color: colors.text.secondary },
                  ]}
                >
                  On the way to School
                </Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityTextGroup}>
                <Text
                  style={[styles.activityTime, { color: colors.text.primary }]}
                >
                  07:45 AM
                </Text>
                <Text
                  style={[
                    styles.activityText,
                    { color: colors.text.secondary },
                  ]}
                >
                  Expected at School
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.announcementCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.activityHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Announcements
              </Text>
              <TouchableOpacity>
                <Text style={styles.activityLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.announcementItem}>
              <Text
                style={[
                  styles.announcementTitle,
                  { color: colors.text.primary },
                ]}
              >
                School will close early on Friday, 23 May at 12:00 PM.
              </Text>
              <Text
                style={[
                  styles.announcementSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                2 days ago
              </Text>
            </View>
            <View style={styles.announcementItem}>
              <Text
                style={[
                  styles.announcementTitle,
                  { color: colors.text.primary },
                ]}
              >
                Sports day on 30 May. More details to follow.
              </Text>
              <Text
                style={[
                  styles.announcementSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                5 days ago
              </Text>
            </View>
          </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  profileAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  avatarStatus: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 32,
    fontWeight: "800",
  },
  wave: {
    fontSize: 32,
    marginLeft: 8,
  },
  subtext: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  childCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  childCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  childAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 16,
  },
  childAvatar: {
    width: "100%",
    height: "100%",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 13,
    marginBottom: 10,
  },
  childStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: "#DEF7EC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
  },
  liveTripCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  liveTripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  liveTripTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  liveTripStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveTripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  liveTripStatus: {
    fontSize: 13,
    fontWeight: "700",
  },
  viewDetailsText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
  mapPreview: {
    width: "100%",
    aspectRatio: 2,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  mapGraphic: {
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
  },
  routeLine: {
    position: "absolute",
    width: 120,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.22)",
  },
  routeDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  tripPin: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  pickupPin: {
    backgroundColor: "#2563EB",
  },
  dropoffPin: {
    backgroundColor: "#10B981",
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  driverAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
  },
  driverAvatar: {
    width: "100%",
    height: "100%",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "800",
  },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  driverMetaText: {
    color: "#6B7280",
    marginLeft: 6,
    fontSize: 13,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  callButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  quickCardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  quickCard: {
    width: "100%",
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    minHeight: 160,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardLink: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "700",
  },
  scheduleValue: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: "column",
    gap: 12,
  },
  activityCard: {
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  activityLink: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  activityDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    marginTop: 6,
    marginRight: 12,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#CBD5E1",
    marginTop: 6,
    marginRight: 12,
  },
  activityTextGroup: {
    flex: 1,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  activityText: {
    fontSize: 13,
    lineHeight: 20,
  },
  announcementCard: {
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  announcementItem: {
    marginBottom: 14,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  announcementSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
});
