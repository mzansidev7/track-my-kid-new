import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ClientHeader from "../components/ClientHeader";
import { useChildren } from "../clientHelpers/hooks/useChildren";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import CustomMap from "../../../components/map";

const formatTime = (value) => {
  if (!value) return "Not scheduled";
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return {
    day: date.toLocaleDateString([], { month: "short" }),
    date: date.getDate().toString(),
    label: date.toLocaleDateString([], { weekday: "short" }),
  };
};

const toMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getRouteDate = (value) => {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getWindowDate = (route, time) => {
  const date = getRouteDate(route.departure_time);
  const minutes = toMinutes(time);
  if (minutes !== null)
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

const isWindowActive = (trip, now) => {
  if (trip.stop?.status === "in_progress") return true;
  if (trip.windowDate > now) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    trip.startMinutes !== null &&
    currentMinutes >= trip.startMinutes &&
    (trip.endMinutes === null || currentMinutes <= trip.endMinutes)
  );
};

const isTripFinished = (trip, now) => {
  if (trip.stop?.status === "in_progress") return false;
  if (trip.stop?.status === "completed" || trip.stop?.status === "skipped") {
    return true;
  }
  return trip.endDate < now;
};

const Trips = () => {
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const { user } = React.useContext(AuthContext);
  const userToken = user?.token;
  const { children, childrenLoading } = useChildren();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [stopsByChild, setStopsByChild] = useState({});
  const [schoolTrips, setSchoolTrips] = useState([]);
  const [schoolTripsLoading, setSchoolTripsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const loadSchoolTrips = useCallback(async () => {
    if (!userToken) {
      setSchoolTripsLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/school-trips`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (response.ok) setSchoolTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load school trips", error);
    } finally {
      setSchoolTripsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadSchoolTrips(), 0);
    return () => clearTimeout(timeout);
  }, [loadSchoolTrips]);

  useEffect(() => {
    if (!schoolTrips.some((trip) => trip.status === "in_progress"))
      return undefined;
    const interval = setInterval(loadSchoolTrips, 10000);
    return () => clearInterval(interval);
  }, [loadSchoolTrips, schoolTrips]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStops = async () => {
      if (!user?.token) return;
      const childrenWithRoutes = children.filter((child) => child.route?.id);
      if (childrenWithRoutes.length === 0) {
        setStopsByChild({});
        return;
      }

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const entries = await Promise.all(
          childrenWithRoutes.map(async (child) => {
            const response = await fetch(
              `${baseUrl}/client/children/${child.id}/route-stops`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            const data = response.ok ? await response.json() : [];
            const stops = (Array.isArray(data) ? data : []).filter(
              (stop) => stop.route_id === child.route.id,
            );
            return [child.id, stops];
          }),
        );
        if (!cancelled) setStopsByChild(Object.fromEntries(entries));
      } catch (error) {
        if (!cancelled) setStopsByChild({});
        console.error("Failed to load trip stops", error);
      }
    };

    loadStops();
    return () => {
      cancelled = true;
    };
  }, [children, user?.token]);

  const windowTrips = useMemo(() => {
    const trips = [];
    children.forEach((child) => {
      const route = child.route;
      if (!route?.id) return;
      const stops = stopsByChild[child.id] || [];
      const windows = [
        {
          direction: "pickup",
          startTime: route.pickup_start_time || route.departure_time,
          endTime: route.pickup_end_time,
          start: route.start_location || child.pickup_address || "Home",
          end: route.end_location || child.school_name || "School",
          stop: stops.find((stop) => stop.stop_type === "pickup"),
        },
        {
          direction: "dropoff",
          startTime: route.dropoff_start_time,
          endTime: route.dropoff_end_time,
          start: route.end_location || child.school_name || "School",
          end: route.start_location || child.pickup_address || "Home",
          stop: stops.find((stop) => stop.stop_type === "dropoff"),
        },
      ];

      windows.forEach((window) => {
        if (!window.startTime) return;
        const windowDate = getWindowDate(route, window.startTime);
        const endDate = getWindowDate(
          route,
          window.endTime || window.startTime,
        );
        if (!window.endTime) endDate.setMinutes(endDate.getMinutes() + 30);
        trips.push({
          id: `${child.id}-${window.direction}`,
          child,
          route,
          ...window,
          windowDate,
          endDate,
          startMinutes: toMinutes(window.startTime),
          endMinutes: toMinutes(window.endTime),
          driver: child.vehicle?.driver,
        });
      });
    });
    return trips.sort((first, second) => first.windowDate - second.windowDate);
  }, [children, stopsByChild]);

  const todayTrips = useMemo(
    () =>
      windowTrips.filter(
        (trip) =>
          isWindowActive(trip, new Date(currentTime)) &&
          !isTripFinished(trip, new Date(currentTime)),
      ),
    [currentTime, windowTrips],
  );
  const activeTrip = todayTrips[0];
  const activeChild = activeTrip?.child;

  useEffect(() => {
    const driverId = activeChild?.vehicle?.driver?.id;
    if (!driverId || !user?.token) return;
    let active = true;
    const fetchLocation = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/driver/location/${driverId}?child_id=${activeChild.id}`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        const data = await response.json();
        if (!active || !data?.is_online) {
          if (active) setDriverLocation(null);
          return;
        }
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setDriverLocation({ latitude, longitude });
        }
      } catch (error) {
        console.error("Failed to load driver location", error);
      }
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeChild?.id, activeChild?.vehicle?.driver?.id, user?.token]);

  const mapMarkers = [
    activeTrip?.direction === "dropoff" &&
    activeChild?.school_latitude != null &&
    activeChild?.school_longitude != null
      ? {
          latitude: Number(activeChild.school_latitude),
          longitude: Number(activeChild.school_longitude),
          title: activeChild.school_name || "School",
          type: "pickup",
        }
      : activeChild?.pickup_latitude != null &&
          activeChild?.pickup_longitude != null
        ? {
            latitude: Number(activeChild.pickup_latitude),
            longitude: Number(activeChild.pickup_longitude),
            title: "Pickup location",
            type: "pickup",
          }
        : null,
    activeTrip?.direction === "dropoff" &&
    activeChild?.pickup_latitude != null &&
    activeChild?.pickup_longitude != null
      ? {
          latitude: Number(activeChild.pickup_latitude),
          longitude: Number(activeChild.pickup_longitude),
          title: "Home",
          type: "dropoff",
        }
      : activeChild?.school_latitude != null &&
          activeChild?.school_longitude != null
        ? {
            latitude: Number(activeChild.school_latitude),
            longitude: Number(activeChild.school_longitude),
            title: activeChild.school_name || "School",
            type: "dropoff",
          }
        : null,
    driverLocation
      ? { ...driverLocation, title: "Driver live location", type: "driver" }
      : null,
  ].filter(Boolean);

  const fetchHistory = useCallback(async () => {
    if (!userToken) return;
    setHistoryLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/route-history`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (response.ok) setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load trip history", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    const timeout = setTimeout(() => void fetchHistory(), 0);
    return () => clearTimeout(timeout);
  }, [fetchHistory]);

  const upcomingTrips = useMemo(() => {
    const now = new Date(currentTime);
    return windowTrips
      .filter((trip) => trip.windowDate > now && !isTripFinished(trip, now))
      .concat(
        windowTrips.filter(
          (trip) => isWindowActive(trip, now) && !isTripFinished(trip, now),
        ),
      )
      .map((trip) => ({
        ...trip,
        ...formatDate(trip.windowDate),
        time: formatTime(trip.startTime),
        route: `${trip.start} → ${trip.end}`,
        driverLabel: trip.driver?.name
          ? `Driver ${trip.driver.name}`
          : "Driver not assigned",
        status: isWindowActive(trip, now) ? "In progress" : "Scheduled",
      }));
  }, [currentTime, windowTrips]);

  const historyTrips = useMemo(
    () =>
      history.map((item) => ({
        ...formatDate(item.start_time),
        time: formatTime(item.start_time),
        route:
          item.route_snapshot?.start_location &&
          item.route_snapshot?.end_location
            ? `${item.route_snapshot.start_location} → ${item.route_snapshot.end_location}`
            : `${item.route_type === "dropoff" ? "School" : "Home"} route`,
        driver: item.drivers?.users?.name
          ? `Driver ${item.drivers.users.name}`
          : "Driver",
        status: item.status === "completed" ? "Completed" : "In progress",
      })),
    [history],
  );

  const trips = useMemo(
    () => (tab === "upcoming" ? upcomingTrips : historyTrips),
    [historyTrips, tab, upcomingTrips],
  );

  const messageDriver = async (driver) => {
    if (!driver?.user_id || !user?.token) {
      Alert.alert("Driver unavailable", "This trip has no linked driver yet.");
      return;
    }

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          otherUserId: driver.user_id,
          conversationType: "client_driver",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to start driver conversation.");
      }
      router.push("/(client)/(tabs)/messages");
    } catch (error) {
      Alert.alert(
        "Message failed",
        error?.message || "Unable to message the driver.",
      );
    }
  };

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

            {tab === "upcoming" && (
              <View style={styles.schoolTripsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>School Trips</Text>
                  <Text style={styles.tripCount}>
                    {schoolTrips.length} trips
                  </Text>
                </View>
                {schoolTripsLoading ? (
                  <Text style={styles.tripCount}>Loading school trips…</Text>
                ) : schoolTrips.length === 0 ? (
                  <View style={styles.schoolTripEmpty}>
                    <MaterialIcons name="school" size={22} color="#2563EB" />
                    <Text style={styles.schoolTripEmptyText}>
                      No upcoming school trips for your children.
                    </Text>
                  </View>
                ) : (
                  schoolTrips.map((trip) => {
                    const tripVehicles = trip.vehicles || [];
                    const locations = tripVehicles
                      .map((assignment) => assignment.tracking)
                      .filter(
                        (location) =>
                          Number.isFinite(Number(location?.latitude)) &&
                          Number.isFinite(Number(location?.longitude)),
                      );
                    const destination =
                      Number.isFinite(Number(trip.destination_latitude)) &&
                      Number.isFinite(Number(trip.destination_longitude))
                        ? {
                            latitude: Number(trip.destination_latitude),
                            longitude: Number(trip.destination_longitude),
                            title: trip.destination,
                            type: "end",
                          }
                        : null;
                    const markers = [
                      ...locations.map((location) => ({
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude),
                        title: "School trip vehicle",
                        type: "driver",
                      })),
                      ...(destination ? [destination] : []),
                    ];
                    return (
                      <View style={styles.schoolTripCard} key={trip.id}>
                        <View style={styles.schoolTripHeading}>
                          <View style={styles.schoolTripIcon}>
                            <MaterialIcons
                              name="school"
                              size={20}
                              color="#2563EB"
                            />
                          </View>
                          <View style={styles.schoolTripHeadingText}>
                            <Text style={styles.schoolTripName}>
                              {trip.name}
                            </Text>
                            <Text style={styles.schoolTripDestination}>
                              {trip.destination}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.schoolTripStatus,
                              trip.status === "in_progress" &&
                                styles.schoolTripStatusLive,
                            ]}
                          >
                            {trip.status.replaceAll("_", " ")}
                          </Text>
                        </View>
                        <View style={styles.schoolTripFacts}>
                          <Text style={styles.schoolTripFact}>
                            Departure ·{" "}
                            {new Date(trip.departure_at).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </Text>
                          <Text style={styles.schoolTripFact}>
                            Return ·{" "}
                            {new Date(trip.return_at).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </Text>
                          <Text style={styles.schoolTripFact}>
                            Price ·{" "}
                            {trip.is_free
                              ? "Free"
                              : `${trip.currency || "ZAR"} ${Number(trip.price || 0).toFixed(2)}`}
                          </Text>
                          {trip.learners?.map((learner) => (
                            <Text
                              style={styles.schoolTripFact}
                              key={learner.child_id}
                            >
                              Child · {learner.child?.name}{" "}
                              {learner.child?.lastname}
                            </Text>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={styles.schoolTripDetailsButton}
                          onPress={() =>
                            router.push({
                              pathname: "/(client)/(tabs)/school-trip/[tripId]",
                              params: { tripId: trip.id },
                            })
                          }
                        >
                          <Text style={styles.schoolTripDetailsButtonText}>
                            View trip details
                          </Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={19}
                            color="#2563EB"
                          />
                        </TouchableOpacity>
                        {tripVehicles.map((assignment) => (
                          <View
                            key={assignment.id}
                            style={styles.schoolTripVehicle}
                          >
                            <MaterialIcons
                              name="directions-bus"
                              size={18}
                              color="#2563EB"
                            />
                            <Text style={styles.schoolTripVehicleText}>
                              {assignment.vehicle?.name || "School vehicle"} ·{" "}
                              {assignment.vehicle?.registration_number ||
                                "Registration unavailable"}
                              {assignment.driver
                                ? ` · Driver ${assignment.driver.first_name} ${assignment.driver.last_name || ""}`
                                : ""}
                              {assignment.coordinator
                                ? ` · Coordinator ${assignment.coordinator.first_name} ${assignment.coordinator.last_name || ""}`
                                : ""}
                            </Text>
                          </View>
                        ))}
                        {trip.status === "in_progress" && (
                          <View style={styles.schoolTripLiveWrap}>
                            {markers.length ? (
                              <CustomMap
                                markers={markers}
                                style={styles.schoolTripMap}
                              />
                            ) : (
                              <View
                                style={styles.schoolTripLocationUnavailable}
                              >
                                <MaterialIcons
                                  name="location-off"
                                  size={19}
                                  color="#B45309"
                                />
                                <Text style={styles.schoolTripLocationText}>
                                  Location unavailable · no current GPS update
                                </Text>
                              </View>
                            )}
                            {locations.map((location, index) => (
                              <Text
                                style={styles.schoolTripLastSeen}
                                key={`${location.trip_vehicle_id}-${index}`}
                              >
                                Last updated{" "}
                                {new Date(
                                  location.recorded_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            ))}
                          </View>
                        )}
                        {trip.emergency_contact ? (
                          <Text style={styles.schoolTripEmergency}>
                            Emergency contact · {trip.emergency_contact}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Next Trip */}
            {tab === "upcoming" && (
              <>
                {upcomingTrips.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Next Trip</Text>

                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Next window</Text>
                      </View>
                    </View>

                    <View style={styles.nextTripCard}>
                      {/* Time */}
                      <View style={styles.nextTripTop}>
                        <View>
                          <Text style={styles.todayLabel}>
                            {upcomingTrips[0].day} {upcomingTrips[0].date}
                          </Text>
                          <Text style={styles.tripTime}>
                            {upcomingTrips[0].time}
                          </Text>
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
                            <Text style={styles.locationTitle}>
                              {upcomingTrips[0].direction === "dropoff"
                                ? "School"
                                : "Home"}
                            </Text>
                            <Text style={styles.locationAddress}>
                              {upcomingTrips[0].start}
                            </Text>
                          </View>

                          <View style={styles.locationBlock}>
                            <Text style={styles.locationTitle}>
                              {upcomingTrips[0].direction === "dropoff"
                                ? "Home"
                                : "School"}
                            </Text>
                            <Text style={styles.locationAddress}>
                              {upcomingTrips[0].end}
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
                            <Text style={styles.driverName}>
                              {upcomingTrips[0].driverLabel}
                            </Text>

                            <View style={styles.ratingRow}>
                              <MaterialIcons
                                name="star"
                                size={15}
                                color="#F59E0B"
                              />

                              <Text style={styles.ratingText}>4.8</Text>

                              <Text style={styles.ratingLabel}>
                                • Your driver
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.messageButton}
                          onPress={() => messageDriver(upcomingTrips[0].driver)}
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
                  </>
                )}

                {/* Live Tracking */}
                {activeTrip && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{`Today's Trip`}</Text>

                      <TouchableOpacity onPress={fetchHistory}>
                        <Text style={styles.viewMapText}>View Map</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.trackingCard}>
                      <View style={styles.mapPlaceholder}>
                        {mapMarkers.length > 0 ? (
                          <CustomMap
                            markers={mapMarkers}
                            origin={mapMarkers[0]}
                            destination={mapMarkers[1] || mapMarkers[0]}
                            style={{ flex: 1, width: "100%" }}
                          />
                        ) : null}
                        {/* Roads */}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.roadOne} />
                        ) : null}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.roadTwo} />
                        ) : null}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.roadThree} />
                        ) : null}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.roadFour} />
                        ) : null}

                        {/* Route */}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.mapRouteLine} />
                        ) : null}

                        {/* Start */}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.mapStartPoint}>
                            <View style={styles.mapStartInner} />
                          </View>
                        ) : null}

                        {/* Bus */}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.busMarker}>
                            <MaterialIcons
                              name="directions-bus"
                              size={23}
                              color="#FFFFFF"
                            />
                          </View>
                        ) : null}

                        {/* Destination */}
                        {mapMarkers.length === 0 ? (
                          <View style={styles.mapEndPoint}>
                            <MaterialIcons
                              name="school"
                              size={20}
                              color="#FFFFFF"
                            />
                          </View>
                        ) : null}
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
                            <Text style={styles.trackingValue}>
                              {activeTrip
                                ? formatTime(activeTrip.startTime)
                                : "—"}
                            </Text>
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
                            <Text style={styles.trackingValue}>
                              Live location
                            </Text>
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
                            <Text style={styles.trackingValue}>
                              {activeTrip ? "In progress" : "No active window"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </>
                )}
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
              {(childrenLoading || historyLoading) && trips.length === 0 ? (
                <Text style={styles.tripCount}>Loading trips...</Text>
              ) : trips.length === 0 ? (
                <Text style={styles.tripCount}>No trips found</Text>
              ) : (
                trips.map((trip, index) => (
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

                        <Text style={styles.tripListMeta}>
                          {trip.driverLabel || trip.driver}
                        </Text>
                      </View>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={25}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                ))
              )}
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
  schoolTripsSection: {
    marginBottom: 22,
  },
  schoolTripEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 14,
    backgroundColor: "#F8FAFF",
  },
  schoolTripEmptyText: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
  },
  schoolTripCard: {
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  schoolTripHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  schoolTripIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  schoolTripHeadingText: {
    flex: 1,
  },
  schoolTripName: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  schoolTripDestination: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },
  schoolTripStatus: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  schoolTripStatusLive: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
  },
  schoolTripFacts: {
    gap: 5,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  schoolTripFact: {
    color: "#475569",
    fontSize: 10,
  },
  schoolTripDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  schoolTripDetailsButtonText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  schoolTripVehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 9,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  schoolTripVehicleText: {
    flex: 1,
    color: "#334155",
    fontSize: 10,
    lineHeight: 15,
  },
  schoolTripLiveWrap: {
    marginTop: 11,
  },
  schoolTripMap: {
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  schoolTripLocationUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 9,
    backgroundColor: "#FFFBEB",
  },
  schoolTripLocationText: {
    flex: 1,
    color: "#92400E",
    fontSize: 10,
  },
  schoolTripLastSeen: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 9,
  },
  schoolTripEmergency: {
    marginTop: 9,
    color: "#B91C1C",
    fontSize: 10,
    fontWeight: "700",
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
