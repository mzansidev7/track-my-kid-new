import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSchoolDashboard } from "@/app-support/school/schoolHelpers/hooks/useSchoolDashboard";
import { usePresence } from "@/components/presence/PresenceProvider";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useTheme } from "../../../styles/theme";

type RouteFilter = "all" | "student" | "trip";
type SchoolTripVehicle = {
  id: string;
  driver?: any;
  coordinator?: any;
  tracking?: { recorded_at?: string | null } | null;
  vehicle?: {
    name?: string;
    registration_number?: string;
    make?: string;
    model?: string;
    vehicle_type?: string;
    passenger_capacity?: number | null;
    status?: string;
  } | null;
};
type SchoolTrip = {
  id: string;
  name?: string;
  destination?: string;
  destination_address?: string;
  departure_at?: string;
  return_at?: string;
  status?: string;
  vehicle?: {
    name?: string;
    registration_number?: string;
    make?: string;
    model?: string;
    vehicle_type?: string;
    passenger_capacity?: number | null;
    status?: string;
  } | null;
  learners?: { id: string; child?: any }[];
  vehicles?: SchoolTripVehicle[];
};
const distanceKm = (
  latitudeA: unknown,
  longitudeA: unknown,
  latitudeB: unknown,
  longitudeB: unknown,
) => {
  if (
    [latitudeA, longitudeA, latitudeB, longitudeB].some(
      (coordinate) => coordinate === null || coordinate === undefined || coordinate === "",
    )
  ) {
    return null;
  }
  const coordinates = [latitudeA, longitudeA, latitudeB, longitudeB].map(
    Number,
  );
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }
  const [latA, lonA, latB, lonB] = coordinates;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(latB - latA);
  const longitudeDelta = radians(lonB - lonA);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latA)) *
      Math.cos(radians(latB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const displayDistance = (distance: number | null) =>
  distance === null ? "Distance unavailable" : `About ${distance.toFixed(1)} km`;

const getDriverUserId = (driver: any) =>
  driver?.user_id || driver?.users?.id || driver?.user?.id || null;

const getDriverName = (driver: any) =>
  [driver?.first_name, driver?.last_name].filter(Boolean).join(" ") ||
  driver?.users?.name ||
  driver?.name ||
  "Driver not assigned";

const getStudentName = (student: any) =>
  [student?.name, student?.lastname].filter(Boolean).join(" ") ||
  "Unnamed student";

const isRecentTracking = (recordedAt?: string | null) => {
  if (!recordedAt) return false;
  const timestamp = new Date(recordedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 2 * 60 * 1000;
};

const Routes = () => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const { school, students, routes, loading, error, refresh } =
    useSchoolDashboard();
  const { ready: presenceReady, onlineUserIds } = usePresence();
  const token = user?.token;
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [query, setQuery] = useState("");
  const [trips, setTrips] = useState<SchoolTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    { kind: "student"; data: any } | { kind: "trip"; data: SchoolTrip } | null
  >(null);

  const loadTrips = useCallback(async () => {
    if (!token) {
      setTripsLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/school/trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load school trip routes.");
      }
      setTrips(Array.isArray(result) ? result : []);
      setTripsError("");
    } catch (loadError) {
      setTripsError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load school trip routes.",
      );
    } finally {
      setTripsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadTrips();
      return undefined;
    }, [loadTrips]),
  );

  const refreshPage = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadTrips()]);
    } finally {
      setRefreshing(false);
    }
  };

  const studentRoutes = useMemo(
    () =>
      (routes || []).map((route: any) => {
        const routeStudents = (students || []).filter(
          (student: any) =>
            route.student_ids?.some(
              (studentId: string | number) =>
                String(studentId) === String(student.id),
            ) ||
            (!route.student_ids &&
              student.route_name &&
              student.route_name === route.route_name),
        );
        const assignment = (route.assignments || []).find(
          (item: any) => item.is_active !== false,
        );
        const driver = assignment?.drivers || null;
        const driverUserId = getDriverUserId(driver);
        const driverOnline = driverUserId
          ? presenceReady
            ? onlineUserIds.has(String(driverUserId))
            : null
          : null;

        return {
          ...route,
          linkedStudents: routeStudents,
          driver,
          vehicle: assignment?.vehicles || null,
          driverOnline,
        };
      }),
    [onlineUserIds, presenceReady, routes, students],
  );

  const searchableItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingStudentRoutes =
      filter === "trip"
        ? []
        : studentRoutes.filter((route: any) => {
            const searchText = [
              route.route_name,
              route.start_location,
              route.end_location,
              getDriverName(route.driver),
              ...route.linkedStudents.map(getStudentName),
            ]
              .join(" ")
              .toLowerCase();
            return !normalizedQuery || searchText.includes(normalizedQuery);
          });
    const matchingTrips =
      filter === "student"
        ? []
        : trips.filter((trip) => {
            const names = (trip.learners || []).map((learner) =>
              getStudentName(learner.child),
            );
            const drivers = (trip.vehicles || []).map((vehicle) =>
              getDriverName(vehicle.driver),
            );
            const searchText = [
              trip.name,
              trip.destination,
              trip.destination_address,
              trip.status,
              ...names,
              ...drivers,
            ]
              .join(" ")
              .toLowerCase();
            return !normalizedQuery || searchText.includes(normalizedQuery);
          });
    return { studentRoutes: matchingStudentRoutes, trips: matchingTrips };
  }, [filter, query, studentRoutes, trips]);

  const getStudentDistance = (student: any) =>
    distanceKm(
      student.pickup_latitude,
      student.pickup_longitude,
      school?.latitude,
      school?.longitude,
    );

  const isTripDriverOnline = (assignment: SchoolTripVehicle): boolean | null => {
    const userId = getDriverUserId(assignment.driver);
    if (userId && presenceReady) {
      return onlineUserIds.has(String(userId));
    }
    if (userId && !presenceReady) return null;
    if (assignment.tracking?.recorded_at) {
      return isRecentTracking(assignment.tracking.recorded_at);
    }
    return null;
  };

  const filterOptions: { key: RouteFilter; title: string }[] = [
    { key: "all", title: "All" },
    { key: "student", title: "Student routes" },
    { key: "trip", title: "School trips" },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshPage} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SCHOOL TRANSPORT</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Routes
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Student transport and scheduled school trips
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="alt-route" size={24} color="#2563EB" />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Student routes" value={studentRoutes.length} />
          <SummaryCard label="School trips" value={trips.length} />
          <SummaryCard
            label="Students assigned"
            value={
              new Set(
                studentRoutes.flatMap((route: any) =>
                  route.linkedStudents.map((student: any) => String(student.id)),
                ),
              ).size
            }
          />
        </View>

        <View style={styles.filterRow}>
          {filterOptions.map((option) => {
            const active = filter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search route, student, driver or trip"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
            >
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.distanceNote}>
          Student distances are approximate straight-line distances from home
          to school; no map or driving route is shown.
        </Text>

        {error && !routes?.length ? (
          <Notice
            icon="error-outline"
            title="Routes could not be loaded"
            message={error}
          />
        ) : null}

        {filter !== "trip" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Student routes</Text>
              <Text style={styles.sectionCount}>
                {searchableItems.studentRoutes.length}
              </Text>
            </View>
            {loading && studentRoutes.length === 0 ? (
              <LoadingNotice label="Loading student routes..." />
            ) : searchableItems.studentRoutes.length ? (
              searchableItems.studentRoutes.map((route: any) => (
                <TouchableOpacity
                  key={route.id}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedItem({ kind: "student", data: route })
                  }
                  style={styles.routeCard}
                >
                  <View style={styles.cardHeading}>
                    <View style={styles.routeIcon}>
                      <MaterialIcons
                        name="alt-route"
                        size={21}
                        color="#2563EB"
                      />
                    </View>
                    <View style={styles.cardHeadingCopy}>
                      <Text style={styles.cardTitle}>
                        {route.route_name || "Unnamed route"}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {route.linkedStudents.length}{" "}
                        {route.linkedStudents.length === 1
                          ? "student"
                          : "students"}
                        {route.departure_time
                          ? ` · ${route.departure_time.slice(0, 5)}`
                          : ""}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={23}
                      color="#94A3B8"
                    />
                  </View>
                  <View style={styles.driverRow}>
                    <MaterialIcons
                      name="person-outline"
                      size={17}
                      color="#64748B"
                    />
                    <Text style={styles.driverName}>
                      {getDriverName(route.driver)}
                    </Text>
                    {route.driverOnline === true ? (
                      <StatusPill label="Online" online />
                    ) : route.driverOnline === false ? (
                      <StatusPill label="Offline" />
                    ) : (
                      <StatusPill label="Checking" muted />
                    )}
                  </View>
                  {route.driverOnline === false ? (
                    <OfflineNotice
                      message="The assigned driver is offline and may not be sharing their live status. Please check with the transport office before the next pickup."
                    />
                  ) : null}
                  <View style={styles.studentPreviewList}>
                    {route.linkedStudents.slice(0, 3).map((student: any) => (
                      <StudentDistanceRow
                        key={student.id}
                        student={student}
                        distance={getStudentDistance(student)}
                      />
                    ))}
                    {route.linkedStudents.length > 3 ? (
                      <Text style={styles.moreStudents}>
                        +{route.linkedStudents.length - 3} more students
                      </Text>
                    ) : null}
                    {!route.linkedStudents.length ? (
                      <Text style={styles.noStudents}>
                        No students are linked to this route yet.
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyNotice message="No student routes match your filters." />
            )}
          </View>
        ) : null}

        {filter !== "student" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>School trips</Text>
              <Text style={styles.sectionCount}>
                {searchableItems.trips.length}
              </Text>
            </View>
            {tripsLoading && trips.length === 0 ? (
              <LoadingNotice label="Loading school trips..." />
            ) : tripsError && trips.length === 0 ? (
              <Notice
                icon="info-outline"
                title="School trips unavailable"
                message={tripsError}
              />
            ) : searchableItems.trips.length ? (
              searchableItems.trips.map((trip) => {
                const assignments = trip.vehicles || [];
                const assignedDrivers = assignments.map(
                  (assignment) => assignment.driver,
                );
                const driverOnlineStates = assignments.map((assignment) =>
                  isTripDriverOnline(assignment),
                );
                const hasOfflineDriver = driverOnlineStates.some(
                  (isOnline) => isOnline === false,
                );
                const allDriversOnline =
                  driverOnlineStates.length > 0 &&
                  driverOnlineStates.every((isOnline) => isOnline === true);
                return (
                  <TouchableOpacity
                    key={trip.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedItem({ kind: "trip", data: trip })}
                    style={styles.routeCard}
                  >
                    <View style={styles.cardHeading}>
                      <View style={[styles.routeIcon, styles.tripIcon]}>
                        <MaterialIcons
                          name="directions-bus"
                          size={21}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={styles.cardHeadingCopy}>
                        <Text style={styles.cardTitle}>
                          {trip.name || "School trip"}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {trip.destination || trip.destination_address || "Destination not set"}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={23}
                        color="#94A3B8"
                      />
                    </View>
                    <View style={styles.tripMeta}>
                      <StatusPill
                        label={(trip.status || "scheduled").replaceAll("_", " ")}
                        muted
                      />
                      <Text style={styles.metaText}>
                        {(trip.learners || []).length}{" "}
                        {(trip.learners || []).length === 1
                          ? "student"
                          : "students"}
                      </Text>
                      {trip.departure_at ? (
                        <Text style={styles.metaText}>
                          {new Date(trip.departure_at).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.driverRow}>
                      <MaterialIcons
                        name="person-outline"
                        size={17}
                        color="#64748B"
                      />
                      <Text style={styles.driverName} numberOfLines={1}>
                        {assignedDrivers.length
                          ? assignedDrivers.map(getDriverName).join(", ")
                          : "No driver assigned"}
                      </Text>
                      {assignments.length > 0 ? (
                        <StatusPill
                          label={
                            hasOfflineDriver
                              ? "Driver offline"
                              : allDriversOnline
                                ? "Online"
                                : "Checking"
                          }
                          online={allDriversOnline}
                          muted={!hasOfflineDriver && !allDriversOnline}
                        />
                      ) : null}
                    </View>
                    {hasOfflineDriver ? (
                      <OfflineNotice
                        message="A trip driver has no recent live connection. Please confirm the driver and vehicle arrangements before departure."
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            ) : (
              <EmptyNotice message="No school trips match your filters." />
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailHeader}>
              <View
                style={[
                  styles.detailTypeIcon,
                  selectedItem?.kind === "trip" && styles.tripDetailTypeIcon,
                ]}
              >
                <MaterialIcons
                  name={
                    selectedItem?.kind === "trip"
                      ? "directions-bus"
                      : "alt-route"
                  }
                  size={22}
                  color={selectedItem?.kind === "trip" ? "#7C3AED" : "#2563EB"}
                />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailEyebrow}>
                  {selectedItem?.kind === "trip"
                    ? "SCHOOL TRIP"
                    : "STUDENT ROUTE"}
                </Text>
                <Text style={styles.detailTitle} numberOfLines={2}>
                  {selectedItem?.kind === "trip"
                    ? selectedItem.data.name || "School trip"
                    : selectedItem?.data.route_name || "Unnamed route"}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close route details"
                onPress={() => setSelectedItem(null)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={21} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedItem?.kind === "student" ? (
                <>
                  <Text style={styles.detailSectionTitle}>Route overview</Text>
                  <View style={styles.routeOverviewCard}>
                    <View style={styles.routeLocationRow}>
                      <View style={styles.locationDotStart} />
                      <View style={styles.routeLocationCopy}>
                        <Text style={styles.detailMetaLabel}>START</Text>
                        <Text style={styles.detailBody}>
                          {selectedItem.data.start_location ||
                            "Start location not provided"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.routePathLine} />
                    <View style={styles.routeLocationRow}>
                      <View style={styles.locationDotEnd} />
                      <View style={styles.routeLocationCopy}>
                        <Text style={styles.detailMetaLabel}>DESTINATION</Text>
                        <Text style={styles.detailBody}>
                          {selectedItem.data.end_location ||
                            "Destination not provided"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.detailSectionTitle}>
                    Driver connection
                  </Text>
                  {selectedItem.data.driverOnline === false ? (
                    <OfflineNotice message="The assigned driver is offline and may not be sharing their live status. Contact the transport office if a pickup is expected." />
                  ) : (
                    <View style={styles.detailDriverCard}>
                      <View style={styles.detailPersonIcon}>
                        <MaterialIcons
                          name="person-outline"
                          size={20}
                          color="#475569"
                        />
                      </View>
                      <Text style={styles.detailBody}>
                        {getDriverName(selectedItem.data.driver)}
                      </Text>
                      <StatusPill
                        label={
                          selectedItem.data.driverOnline
                            ? "Online"
                            : "Checking"
                        }
                        online={selectedItem.data.driverOnline === true}
                        muted={selectedItem.data.driverOnline === null}
                      />
                    </View>
                  )}
                  <Text style={styles.detailSectionTitle}>Assigned vehicle</Text>
                  {selectedItem.data.vehicle ? (
                    <View style={styles.studentRouteVehicleCard}>
                      <View style={styles.assignmentIcon}>
                        <MaterialIcons
                          name="directions-bus"
                          size={20}
                          color="#2563EB"
                        />
                      </View>
                      <View style={styles.tripVehicleCopy}>
                        <Text style={styles.detailBody}>
                          {selectedItem.data.vehicle.name ||
                            selectedItem.data.vehicle.model ||
                            "Assigned vehicle"}
                        </Text>
                        <Text style={styles.metaText}>
                          {[
                            selectedItem.data.vehicle.license_plate,
                            selectedItem.data.vehicle.color,
                            selectedItem.data.vehicle.capacity != null
                              ? `${selectedItem.data.vehicle.capacity} seats`
                              : null,
                            selectedItem.data.vehicle.status,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Vehicle details unavailable"}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.detailBody}>
                      No vehicle is assigned to this route.
                    </Text>
                  )}
                  <Text style={styles.detailSectionTitle}>
                    Linked students
                    <Text style={styles.sectionTitleCount}>
                      {" "}
                      · {selectedItem.data.linkedStudents.length}
                    </Text>
                  </Text>
                  {selectedItem.data.linkedStudents.length ? (
                    selectedItem.data.linkedStudents.map((student: any) => (
                      <StudentDistanceRow
                        key={student.id}
                        student={student}
                        distance={getStudentDistance(student)}
                        expanded
                      />
                    ))
                  ) : (
                    <Text style={styles.detailBody}>
                      No students are linked to this route.
                    </Text>
                  )}
                </>
              ) : selectedItem?.kind === "trip" ? (
                <>
                  <View style={styles.destinationCard}>
                    <View style={styles.destinationIcon}>
                      <MaterialIcons
                        name="place"
                        size={20}
                        color="#7C3AED"
                      />
                    </View>
                    <View style={styles.destinationCopy}>
                      <Text style={styles.detailMetaLabel}>DESTINATION</Text>
                      <Text style={styles.detailBody}>
                        {selectedItem.data.destination_address ||
                          selectedItem.data.destination ||
                          "Trip destination not provided"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleCard}>
                      <View style={styles.scheduleIcon}>
                        <MaterialIcons
                          name="event-available"
                          size={17}
                          color="#2563EB"
                        />
                      </View>
                      <Text style={styles.detailMetaLabel}>DEPARTURE</Text>
                      <Text style={styles.scheduleValue}>
                        {selectedItem.data.departure_at
                          ? new Date(
                              selectedItem.data.departure_at,
                            ).toLocaleString()
                          : "Not scheduled"}
                      </Text>
                    </View>
                    <View style={styles.scheduleCard}>
                      <View style={styles.scheduleIcon}>
                        <MaterialIcons
                          name="event"
                          size={17}
                          color="#7C3AED"
                        />
                      </View>
                      <Text style={styles.detailMetaLabel}>RETURN</Text>
                      <Text style={styles.scheduleValue}>
                        {selectedItem.data.return_at
                          ? new Date(
                              selectedItem.data.return_at,
                            ).toLocaleString()
                          : "Not scheduled"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailSectionTitle}>
                    Drivers & vehicles
                  </Text>
                  {(selectedItem.data.vehicles || []).length ? (
                    (selectedItem.data.vehicles || []).map((assignment) => {
                      const online = isTripDriverOnline(assignment);
                      const vehicle = assignment.vehicle;
                      const vehicleName =
                        vehicle?.name ||
                        [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
                        "Vehicle not specified";
                      const vehicleDetails = [
                        vehicle?.registration_number,
                        vehicle?.vehicle_type,
                        vehicle?.passenger_capacity != null
                          ? `${vehicle.passenger_capacity} seats`
                          : null,
                        vehicle?.status,
                      ].filter(Boolean);
                      return (
                        <View key={assignment.id} style={styles.tripDetailCard}>
                          <View style={styles.tripAssignmentCopy}>
                            <View style={styles.tripDriverInfo}>
                              <View style={styles.assignmentIcon}>
                                <MaterialIcons
                                  name="person-outline"
                                  size={18}
                                  color="#475569"
                                />
                              </View>
                              <View style={styles.tripVehicleCopy}>
                                <Text style={styles.assignmentLabel}>DRIVER</Text>
                                <Text style={styles.detailBody}>
                                  {getDriverName(assignment.driver)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.tripVehicleInfo}>
                              <View style={styles.assignmentIcon}>
                                <MaterialIcons
                                  name="directions-bus"
                                  size={18}
                                  color="#7C3AED"
                                />
                              </View>
                              <View style={styles.tripVehicleCopy}>
                                <Text style={styles.assignmentLabel}>VEHICLE</Text>
                                <Text style={styles.detailBody}>
                                  {vehicleName}
                                </Text>
                                {vehicleDetails.length ? (
                                  <Text style={styles.metaText}>
                                    {vehicleDetails.join(" · ")}
                                  </Text>
                                ) : (
                                  <Text style={styles.metaText}>
                                    Vehicle details unavailable
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          {online === true ? (
                            <StatusPill label="Online" online />
                          ) : online === false ? (
                            <StatusPill label="Offline" />
                          ) : (
                            <StatusPill label="Checking" muted />
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <EmptyNotice message="No drivers or vehicles are assigned to this trip." />
                  )}
                  <Text style={styles.detailSectionTitle}>
                    Registered students
                    <Text style={styles.sectionTitleCount}>
                      {" "}
                      · {(selectedItem.data.learners || []).length}
                    </Text>
                  </Text>
                  {(selectedItem.data.learners || []).length ? (
                    (selectedItem.data.learners || []).map((learner) => (
                      <View key={learner.id} style={styles.tripStudentRow}>
                        <View style={styles.studentIcon}>
                          <MaterialIcons
                            name="school"
                            size={17}
                            color="#64748B"
                          />
                        </View>
                        <View style={styles.tripStudentCopy}>
                          <Text style={styles.detailBody}>
                            {getStudentName(learner.child)}
                          </Text>
                        </View>
                        {learner.child?.grade ? (
                          <Text style={styles.studentGrade}>
                            {learner.child.grade}
                          </Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <EmptyNotice message="No students are registered for this trip yet." />
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const StatusPill = ({
  label,
  online = false,
  muted = false,
}: {
  label: string;
  online?: boolean;
  muted?: boolean;
}) => (
  <View
    style={[
      styles.statusPill,
      online ? styles.onlinePill : muted ? styles.mutedPill : styles.offlinePill,
    ]}
  >
    <View
      style={[
        styles.statusDot,
        online
          ? styles.onlineDot
          : muted
            ? styles.mutedDot
            : styles.offlineDot,
      ]}
    />
    <Text
      style={[
        styles.statusText,
        online ? styles.onlineText : muted ? styles.mutedText : styles.offlineText,
      ]}
    >
      {label}
    </Text>
  </View>
);

const OfflineNotice = ({ message }: { message: string }) => (
  <View style={styles.offlineNotice}>
    <MaterialIcons name="warning-amber" size={18} color="#B45309" />
    <Text style={styles.offlineNoticeText}>{message}</Text>
  </View>
);

const EmptyNotice = ({ message }: { message: string }) => (
  <View style={styles.emptyCard}>
    <MaterialIcons name="alt-route" size={24} color="#94A3B8" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const LoadingNotice = ({ label }: { label: string }) => (
  <View style={styles.emptyCard}>
    <ActivityIndicator size="small" color="#2563EB" />
    <Text style={styles.emptyText}>{label}</Text>
  </View>
);

const Notice = ({
  icon,
  title,
  message,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
}) => (
  <View style={styles.notice}>
    <MaterialIcons name={icon} size={21} color="#B45309" />
    <View style={styles.noticeCopy}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeMessage}>{message}</Text>
    </View>
  </View>
);

const StudentDistanceRow = ({
  student,
  distance,
  expanded = false,
}: {
  student: any;
  distance: number | null;
  expanded?: boolean;
}) => (
  <View style={[styles.studentRow, expanded && styles.expandedStudentRow]}>
    <View style={styles.studentIcon}>
      <MaterialIcons name="person" size={17} color="#64748B" />
    </View>
    <View style={styles.studentCopy}>
      <Text style={styles.studentName}>{getStudentName(student)}</Text>
      <Text style={styles.studentDistance}>
        {displayDistance(distance)} from home to school
      </Text>
    </View>
    {student.grade ? (
      <Text style={styles.studentGrade}>{student.grade}</Text>
    ) : null}
  </View>
);

export default Routes;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 132 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 25, fontWeight: "800", marginTop: 3 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  headerIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#DBEAFE",
  },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 15 },
  summaryCard: {
    flex: 1,
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  summaryValue: { color: "#172033", fontSize: 20, fontWeight: "800" },
  summaryLabel: { color: "#64748B", fontSize: 9, fontWeight: "600", marginTop: 3 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: { borderColor: "#2563EB", backgroundColor: "#2563EB" },
  filterText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#FFFFFF" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  searchInput: { flex: 1, color: "#172033", fontSize: 12, paddingVertical: 0 },
  distanceNote: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
    paddingHorizontal: 2,
  },
  section: { marginTop: 22 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 11,
  },
  sectionTitle: { color: "#172033", fontSize: 17, fontWeight: "800" },
  sectionCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  routeCard: {
    marginBottom: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
  },
  tripIcon: { backgroundColor: "#F3E8FF" },
  cardHeadingCopy: { flex: 1 },
  cardTitle: { color: "#172033", fontSize: 14, fontWeight: "800" },
  cardSubtitle: { color: "#64748B", fontSize: 11, marginTop: 3 },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  driverName: { flex: 1, color: "#475569", fontSize: 11, fontWeight: "600" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onlinePill: { backgroundColor: "#DCFCE7" },
  offlinePill: { backgroundColor: "#FEF3C7" },
  mutedPill: { backgroundColor: "#F1F5F9" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  onlineDot: { backgroundColor: "#16A34A" },
  offlineDot: { backgroundColor: "#D97706" },
  mutedDot: { backgroundColor: "#94A3B8" },
  statusText: { fontSize: 9, fontWeight: "800", textTransform: "capitalize" },
  onlineText: { color: "#15803D" },
  offlineText: { color: "#B45309" },
  mutedText: { color: "#64748B" },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 11,
    backgroundColor: "#FFFBEB",
  },
  offlineNoticeText: { flex: 1, color: "#92400E", fontSize: 10, lineHeight: 15 },
  studentPreviewList: { marginTop: 9 },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  expandedStudentRow: {
    marginBottom: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  studentIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
  },
  studentCopy: { flex: 1 },
  studentName: { color: "#334155", fontSize: 11, fontWeight: "700" },
  studentDistance: { color: "#64748B", fontSize: 9, marginTop: 3 },
  studentGrade: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  moreStudents: { color: "#2563EB", fontSize: 10, fontWeight: "700", paddingTop: 7 },
  noStudents: { color: "#94A3B8", fontSize: 10, paddingTop: 9 },
  tripMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11 },
  metaText: { color: "#64748B", fontSize: 10 },
  emptyCard: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  emptyText: { color: "#64748B", fontSize: 11, textAlign: "center" },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 13,
    backgroundColor: "#FFFBEB",
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  noticeMessage: { color: "#92400E", fontSize: 10, lineHeight: 15, marginTop: 3 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  detailSheet: {
    maxHeight: "90%",
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#F8FAFC",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    marginBottom: 16,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailTypeIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#DBEAFE",
  },
  tripDetailTypeIcon: { backgroundColor: "#EDE9FE" },
  detailHeaderCopy: { flex: 1, paddingVertical: 2 },
  detailEyebrow: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  detailTitle: {
    color: "#172033",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#E9EEF5",
  },
  detailScroll: { flexGrow: 0 },
  detailContent: { paddingTop: 17, paddingBottom: 16 },
  detailSectionTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 21,
    marginBottom: 10,
  },
  sectionTitleCount: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  detailBody: { color: "#334155", fontSize: 12, lineHeight: 18 },
  routeOverviewCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  routeLocationRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  routeLocationCopy: { flex: 1 },
  routePathLine: {
    height: 18,
    width: 1,
    marginLeft: 5,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
  },
  locationDotStart: {
    width: 11,
    height: 11,
    marginTop: 3,
    borderWidth: 3,
    borderColor: "#BFDBFE",
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  locationDotEnd: {
    width: 11,
    height: 11,
    marginTop: 3,
    borderWidth: 3,
    borderColor: "#DDD6FE",
    borderRadius: 6,
    backgroundColor: "#7C3AED",
  },
  detailMetaLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  detailDriverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  studentRouteVehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  detailPersonIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  scheduleRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  scheduleCard: {
    flex: 1,
    minHeight: 112,
    padding: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  scheduleIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  scheduleValue: { color: "#334155", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  tripDetailCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  tripAssignmentCopy: { flex: 1, gap: 12 },
  tripDriverInfo: { flexDirection: "row", alignItems: "center", gap: 9 },
  tripVehicleInfo: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  assignmentIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
  },
  assignmentLabel: {
    color: "#94A3B8",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  tripVehicleCopy: { flex: 1 },
  destinationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
  },
  destinationIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#EDE9FE",
  },
  destinationCopy: { flex: 1, paddingTop: 2 },
  tripStudentCopy: { flex: 1 },
  tripStudentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 9,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
});
