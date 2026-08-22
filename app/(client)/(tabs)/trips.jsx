import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";

const upcomingTrips = [
  {
    day: "May",
    date: "17",
    label: "Today",
    time: "07:30 AM",
    route: "Home → Sunshine Primary School",
    driver: "Driver John",
    status: "On Time",
  },
  {
    day: "May",
    date: "17",
    label: "Today",
    time: "02:30 PM",
    route: "Sunshine Primary School → Home",
    driver: "Driver John",
    status: "On Time",
  },
  {
    day: "May",
    date: "18",
    label: "Tomorrow",
    time: "07:30 AM",
    route: "Home → Sunshine Primary School",
    driver: "Driver John",
    status: "Scheduled",
  },
];

const historyTrips = [
  {
    day: "May",
    date: "16",
    label: "Yesterday",
    time: "02:30 PM",
    route: "Sunshine Primary School → Home",
    driver: "Driver John",
    status: "Completed",
  },
  {
    day: "May",
    date: "16",
    label: "Yesterday",
    time: "07:30 AM",
    route: "Home → Sunshine Primary School",
    driver: "Driver John",
    status: "Completed",
  },
  {
    day: "May",
    date: "15",
    label: "Monday",
    time: "02:30 PM",
    route: "Sunshine Primary School → Home",
    driver: "Driver John",
    status: "Completed",
  },
];

const Trips = () => {
  const [tab, setTab] = useState("upcoming");

  const trips = useMemo(
    () => (tab === "upcoming" ? upcomingTrips : historyTrips),
    [tab],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ClientHeader
          title="My Trips"
          subtitle="Track and manage your trips"
          showBackButton={true}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentView}>
            {/* Upcoming / History */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.segmentButton,
                  tab === "upcoming" && styles.segmentButtonActive,
                ]}
                onPress={() => setTab("upcoming")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={tab === "upcoming" ? "#2563EB" : "#64748B"}
                />

                <Text
                  style={[
                    styles.segmentText,
                    tab === "upcoming" && styles.segmentTextActive,
                  ]}
                >
                  Upcoming
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.segmentButton,
                  tab === "history" && styles.segmentButtonActive,
                ]}
                onPress={() => setTab("history")}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={tab === "history" ? "#2563EB" : "#64748B"}
                />

                <Text
                  style={[
                    styles.segmentText,
                    tab === "history" && styles.segmentTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {/* Next Trip */}
            {tab === "upcoming" && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Next Trip</Text>

                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>

                <View style={styles.nextTripCard}>
                  {/* Time */}
                  <View style={styles.nextTripTop}>
                    <View>
                      <Text style={styles.todayLabel}>Today</Text>
                      <Text style={styles.tripTime}>07:30 AM</Text>
                    </View>

                    <View style={styles.onTimeBadge}>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#16A34A"
                      />
                      <Text style={styles.onTimeText}>On Time</Text>
                    </View>
                  </View>

                  {/* Route */}
                  <View style={styles.routeContainer}>
                    <View style={styles.routeTimeline}>
                      <View style={styles.startPoint}>
                        <View style={styles.startPointInner} />
                      </View>

                      <View style={styles.timelineLine} />

                      <View style={styles.endPoint}>
                        <MaterialIcons
                          name="school"
                          size={15}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>

                    <View style={styles.routeContent}>
                      <View style={styles.locationBlock}>
                        <Text style={styles.locationTitle}>Home</Text>
                        <Text style={styles.locationAddress}>
                          123 Amatole Street, Pretoria
                        </Text>
                      </View>

                      <View style={styles.locationBlock}>
                        <Text style={styles.locationTitle}>
                          Sunshine Primary School
                        </Text>
                        <Text style={styles.locationAddress}>
                          789 School Road, Pretoria
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Driver */}
                  <View style={styles.driverSection}>
                    <View style={styles.driverInfo}>
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>J</Text>
                      </View>

                      <View>
                        <Text style={styles.driverName}>Driver John</Text>

                        <View style={styles.ratingRow}>
                          <MaterialIcons
                            name="star"
                            size={15}
                            color="#F59E0B"
                          />

                          <Text style={styles.ratingText}>4.8</Text>

                          <Text style={styles.ratingLabel}>• Your driver</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.messageButton}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color="#2563EB"
                      />

                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Live Tracking */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{`Today's Trip`}</Text>

                  <TouchableOpacity>
                    <Text style={styles.viewMapText}>View Map</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.trackingCard}>
                  <View style={styles.mapPlaceholder}>
                    {/* Roads */}
                    <View style={styles.roadOne} />
                    <View style={styles.roadTwo} />
                    <View style={styles.roadThree} />
                    <View style={styles.roadFour} />

                    {/* Route */}
                    <View style={styles.mapRouteLine} />

                    {/* Start */}
                    <View style={styles.mapStartPoint}>
                      <View style={styles.mapStartInner} />
                    </View>

                    {/* Bus */}
                    <View style={styles.busMarker}>
                      <MaterialIcons
                        name="directions-bus"
                        size={23}
                        color="#FFFFFF"
                      />
                    </View>

                    {/* Destination */}
                    <View style={styles.mapEndPoint}>
                      <MaterialIcons name="school" size={20} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Tracking info */}
                  <View style={styles.trackingInfo}>
                    <View style={styles.trackingItem}>
                      <View
                        style={[
                          styles.trackingIcon,
                          { backgroundColor: "#ECFDF5" },
                        ]}
                      >
                        <MaterialIcons
                          name="schedule"
                          size={18}
                          color="#16A34A"
                        />
                      </View>

                      <View>
                        <Text style={styles.trackingLabel}>ETA</Text>
                        <Text style={styles.trackingValue}>07:28 AM</Text>
                      </View>
                    </View>

                    <View style={styles.trackingDivider} />

                    <View style={styles.trackingItem}>
                      <View
                        style={[
                          styles.trackingIcon,
                          { backgroundColor: "#EFF6FF" },
                        ]}
                      >
                        <MaterialIcons
                          name="straighten"
                          size={18}
                          color="#2563EB"
                        />
                      </View>

                      <View>
                        <Text style={styles.trackingLabel}>Distance</Text>
                        <Text style={styles.trackingValue}>4.2 km</Text>
                      </View>
                    </View>

                    <View style={styles.trackingDivider} />

                    <View style={styles.trackingItem}>
                      <View
                        style={[
                          styles.trackingIcon,
                          { backgroundColor: "#F0FDF4" },
                        ]}
                      >
                        <MaterialIcons
                          name="directions"
                          size={18}
                          color="#16A34A"
                        />
                      </View>

                      <View>
                        <Text style={styles.trackingLabel}>Status</Text>
                        <Text style={styles.trackingValue}>On Route</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Trip List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {tab === "upcoming" ? "Upcoming Trips" : "Trip History"}
              </Text>

              <Text style={styles.tripCount}>{trips.length} trips</Text>
            </View>

            <View style={styles.tripList}>
              {trips.map((trip, index) => (
                <TouchableOpacity
                  key={`${trip.time}-${index}`}
                  activeOpacity={0.8}
                  style={styles.tripListItem}
                >
                  {/* Date */}
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateMonth}>{trip.day}</Text>

                    <Text style={styles.dateNumber}>{trip.date}</Text>

                    <Text style={styles.dateLabel}>{trip.label}</Text>
                  </View>

                  <View style={styles.listDivider} />

                  {/* Trip info */}
                  <View style={styles.tripListContent}>
                    <View style={styles.listTimeRow}>
                      <Text style={styles.tripListTime}>{trip.time}</Text>

                      <View
                        style={[
                          styles.smallStatus,
                          trip.status === "Completed"
                            ? styles.completedStatus
                            : styles.scheduledStatus,
                        ]}
                      >
                        <Text
                          style={[
                            styles.smallStatusText,
                            trip.status === "Completed"
                              ? styles.completedText
                              : styles.scheduledText,
                          ]}
                        >
                          {trip.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.tripListRoute} numberOfLines={1}>
                      {trip.route}
                    </Text>

                    <View style={styles.tripMetaRow}>
                      <MaterialIcons
                        name="person-outline"
                        size={15}
                        color="#64748B"
                      />

                      <Text style={styles.tripListMeta}>{trip.driver}</Text>
                    </View>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={25}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Trips;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentView: {
    paddingHorizontal: 20,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  /* Segmented control */

  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5EAF2",
  },

  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  segmentButtonActive: {
    backgroundColor: "#FFFFFF",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  segmentTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  /* Section */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },

  viewMapText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },

  tripCount: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },

  liveText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Next trip */

  nextTripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EAF2",

    padding: 18,
    marginBottom: 24,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  nextTripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  todayLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 3,
  },

  tripTime: {
    fontSize: 22,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  onTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  onTimeText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Route */

  routeContainer: {
    flexDirection: "row",
    minHeight: 128,
  },

  routeTimeline: {
    width: 30,
    alignItems: "center",
    paddingTop: 5,
  },

  startPoint: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DBEAFE",
    borderWidth: 3,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  startPointInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },

  timelineLine: {
    width: 2,
    height: 70,
    backgroundColor: "#BFDBFE",
    marginVertical: 5,
  },

  endPoint: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  routeContent: {
    flex: 1,
    paddingLeft: 8,
  },

  locationBlock: {
    minHeight: 68,
  },

  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },

  locationAddress: {
    fontSize: 11,
    lineHeight: 15,
    color: "#64748B",
  },

  /* Driver */

  driverSection: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F4",
    paddingTop: 15,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  driverAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2563EB",
  },

  driverName: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
    marginBottom: 2,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  ratingText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },

  ratingLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: 2,
  },

  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    backgroundColor: "#EFF6FF",
    borderRadius: 12,

    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  messageButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
  },

  /* Tracking */

  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    overflow: "hidden",
    marginBottom: 24,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  mapPlaceholder: {
    height: 190,
    backgroundColor: "#EAF3E9",
    position: "relative",
    overflow: "hidden",
  },

  roadOne: {
    position: "absolute",
    width: 500,
    height: 14,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "17deg" }],
    top: 55,
    left: -80,
  },

  roadTwo: {
    position: "absolute",
    width: 500,
    height: 11,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-24deg" }],
    top: 105,
    left: -100,
  },

  roadThree: {
    position: "absolute",
    width: 11,
    height: 400,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "21deg" }],
    left: 120,
    top: -100,
  },

  roadFour: {
    position: "absolute",
    width: 9,
    height: 400,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-35deg" }],
    right: 80,
    top: -80,
  },

  mapRouteLine: {
    position: "absolute",
    width: 170,
    height: 5,
    backgroundColor: "#2563EB",
    borderRadius: 5,
    transform: [{ rotate: "-22deg" }],
    left: 75,
    top: 100,
  },

  mapStartPoint: {
    position: "absolute",
    left: 38,
    bottom: 30,

    width: 22,
    height: 22,
    borderRadius: 11,

    backgroundColor: "#DBEAFE",
    borderWidth: 4,
    borderColor: "#2563EB",

    alignItems: "center",
    justifyContent: "center",
  },

  mapStartInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },

  busMarker: {
    position: "absolute",
    left: 132,
    top: 78,

    width: 44,
    height: 44,
    borderRadius: 22,

    backgroundColor: "#2563EB",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: "#FFFFFF",

    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  mapEndPoint: {
    position: "absolute",
    right: 32,
    top: 30,

    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#16A34A",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  trackingInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 8,
  },

  trackingItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  trackingIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  trackingLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },

  trackingValue: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "800",
  },

  trackingDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
  },

  /* Trip list */

  tripList: {
    gap: 10,
  },

  tripListItem: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EAF2",

    paddingVertical: 13,
    paddingHorizontal: 12,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  dateBlock: {
    width: 54,
    alignItems: "center",
  },

  dateMonth: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  dateNumber: {
    fontSize: 25,
    color: "#0F172A",
    fontWeight: "800",
    lineHeight: 28,
  },

  dateLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },

  listDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 11,
  },

  tripListContent: {
    flex: 1,
  },

  listTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  tripListTime: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "800",
    marginRight: 7,
  },

  smallStatus: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },

  scheduledStatus: {
    backgroundColor: "#EFF6FF",
  },

  completedStatus: {
    backgroundColor: "#ECFDF5",
  },

  smallStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  scheduledText: {
    color: "#2563EB",
  },

  completedText: {
    color: "#16A34A",
  },

  tripListRoute: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    marginBottom: 5,
  },

  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  tripListMeta: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  bottomSpacer: {
    height: 20,
  },
});
