import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { useTheme } from "@/styles/theme";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CustomMap from "../../components/map";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getAllDepartureTimePreferences,
  TimePreference,
} from "../../store/asyncStorage/timePreferences.asyncStore";

interface RouteDetails {
  id: string;
  route_name: string;
  description?: string | null;
  estimated_distance_km?: number | null;
  estimated_duration?: string | null;
  route_type?: "one_way" | "round_trip" | "multi_stop";
  time_reference?: string | null;
  driver_id?: string | null;
  vehicle_id?: string | null;
  per_child_amount_cents: number;
  departure_time?: string | null;
  status?: "active" | "inactive";
  time_scope?: string | null;
  pickup_start_time?: string | null;
  pickup_end_time?: string | null;
  dropoff_start_time?: string | null;
  dropoff_end_time?: string | null;
  created_at: string;
  start_location: string;
  end_location: string;
  start_latitude?: number;
  start_longitude?: number;
  end_latitude?: number;
  end_longitude?: number;
  drivers: {
    id: string;
    user_id: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string | { url?: string; avatar_url?: string } | null;
    profile_picture?: string | null;
    users?: {
      name?: string;
      email?: string;
      phone?: string;
      avatar?: string | { url?: string; avatar_url?: string } | null;
    };
  } | null;
  vehicles: {
    id: string;
    name: string;
    license_plate: string;
    model: string;
    capacity: number;
    vehicle_images?: { url: string }[];
    images?: string[];
  } | null;
  route_assignments?: {
    id: string;
    route_id?: string;
    driver_id?: string;
    vehicle_id?: string;
    drivers?: {
      id: string;
      user_id: string;
      name?: string;
      email?: string;
      phone?: string;
      avatar?: string | { url?: string; avatar_url?: string } | null;
      profile_picture?: string | null;
      users?: {
        name?: string;
        email?: string;
        phone?: string;
        avatar?: string | { url?: string; avatar_url?: string } | null;
      };
    } | null;
    vehicles?: {
      id: string;
      name: string;
      license_plate: string;
      model: string;
      capacity: number;
      vehicle_images?: { url: string }[];
      images?: string[];
    } | null;
  }[];
  route_children: {
    id: string;
    child_id: string;
    children: {
      id: string;
      name: string;
      school_name: string;
      pickup_latitude: number;
      pickup_longitude: number;
      dropoff_latitude: number;
      dropoff_longitude: number;
      avatar?: string | { url?: string; avatar_url?: string } | null;
    };
  }[];
  route_stops: {
    id: string;
    child_id: string;
    stop_type: "pickup" | "dropoff";
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    stop_order: number;
    status: string;
    children: {
      id: string;
      name: string;
    };
  }[];
  route_waypoints?: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    stop_order: number;
  }[];
}

const RouteDetailsScreen = () => {
  const router = useRouter();
  const { routeId, vehicleId, returnTo } = useLocalSearchParams<{
    routeId?: string;
    vehicleId?: string;
    returnTo?: string;
  }>();
  const { user } = useContext(AuthContext);
  const { colors, getBrandColors } = useTheme();
  const ownerColors = getBrandColors("owner");
  const styles: Record<string, any> = {
    ...baseStyles,
    container: [baseStyles.container, { backgroundColor: colors.background }],
    loadingContainer: [
      baseStyles.loadingContainer,
      { backgroundColor: colors.background },
    ],
    loadingText: [baseStyles.loadingText, { color: colors.text.secondary }],
    errorContainer: [
      baseStyles.errorContainer,
      { backgroundColor: colors.background },
    ],
    errorText: [baseStyles.errorText, { color: colors.text.secondary }],
    retryButton: [
      baseStyles.retryButton,
      { backgroundColor: ownerColors.primary },
    ],
    routeTitle: [baseStyles.routeTitle, { color: "#16365E" }],
    routeSubtitle: [baseStyles.routeSubtitle, { color: "#607A98" }],
    section: [baseStyles.section, { backgroundColor: colors.surface }],
    sectionTitle: [baseStyles.sectionTitle, { color: colors.text.primary }],
    sectionDescription: [
      baseStyles.sectionDescription,
      { color: colors.text.secondary },
    ],
    infoItem: [baseStyles.infoItem, { backgroundColor: colors.surfaceHover }],
    infoLabel: [baseStyles.infoLabel, { color: colors.text.secondary }],
    infoValue: [baseStyles.infoValue, { color: colors.text.primary }],
    infoSubValue: [baseStyles.infoSubValue, { color: colors.text.secondary }],
    driverAvatarContainer: [
      baseStyles.driverAvatarContainer,
      { backgroundColor: colors.surfaceHover },
    ],
    driverAvatarFallback: [
      baseStyles.driverAvatarFallback,
      { backgroundColor: ownerColors.primary },
    ],
    vehicleImageContainer: [
      baseStyles.vehicleImageContainer,
      { backgroundColor: colors.surfaceHover },
    ],
    vehicleImageFallback: [
      baseStyles.vehicleImageFallback,
      { backgroundColor: ownerColors.primary },
    ],
    assignmentFooter: [
      baseStyles.assignmentFooter,
      { borderTopColor: colors.divider },
    ],
    assignmentButton: [
      baseStyles.assignmentButton,
      { backgroundColor: "#1769D2" },
    ],
    assignmentCardImage: [
      baseStyles.assignmentCardImage,
      { backgroundColor: colors.surfaceHover },
    ],
    assignmentCardTitle: [
      baseStyles.assignmentCardTitle,
      { color: colors.text.primary },
    ],
    assignmentCardSubtitle: [
      baseStyles.assignmentCardSubtitle,
      { color: colors.text.secondary },
    ],
    modalContent: [
      baseStyles.modalContent,
      { backgroundColor: colors.surface },
    ],
    modalTitle: [baseStyles.modalTitle, { color: colors.text.primary }],
    modalDescription: [
      baseStyles.modalDescription,
      { color: colors.text.secondary },
    ],
    modalLabel: [baseStyles.modalLabel, { color: colors.text.secondary }],
    selectionList: [
      baseStyles.selectionList,
      { backgroundColor: colors.surfaceHover },
    ],
    selectionItem: [
      baseStyles.selectionItem,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ],
    selectionItemSelected: [
      baseStyles.selectionItemSelected,
      {
        borderColor: "#1769D2",
        backgroundColor: "#EDF6FF",
      },
    ],
    selectionItemDisabled: [
      baseStyles.selectionItemDisabled,
      { backgroundColor: colors.surfaceHover },
    ],
    vehicleIconSmall: [
      baseStyles.vehicleIconSmall,
      { backgroundColor: "#1769D2" },
    ],
    vehicleDriverName: [
      baseStyles.vehicleDriverName,
      { color: colors.text.primary },
    ],
    selectionItemTitle: [
      baseStyles.selectionItemTitle,
      { color: colors.text.primary },
    ],
    selectionItemSubtitle: [
      baseStyles.selectionItemSubtitle,
      { color: colors.text.secondary },
    ],
    assignmentErrorText: [
      baseStyles.assignmentErrorText,
      { color: colors.error },
    ],
    modalCancelButton: [
      baseStyles.modalCancelButton,
      { backgroundColor: colors.surfaceHover },
    ],
    modalSaveButton: [
      baseStyles.modalSaveButton,
      { backgroundColor: "#1769D2" },
    ],
    modalButtonText: [
      baseStyles.modalButtonText,
      { color: colors.text.primary },
    ],
    timeItem: [baseStyles.timeItem, { backgroundColor: colors.surface }],
    timeLabel: [baseStyles.timeLabel, { color: colors.text.secondary }],
    timeValue: [baseStyles.timeValue, { color: colors.text.primary }],
    studentCard: [baseStyles.studentCard, { backgroundColor: colors.surface }],
    studentAvatar: [
      baseStyles.studentAvatar,
      { backgroundColor: colors.surfaceHover },
    ],
    studentName: [baseStyles.studentName, { color: colors.text.primary }],
    studentSchool: [baseStyles.studentSchool, { color: colors.text.secondary }],
    stopCard: [baseStyles.stopCard, { backgroundColor: colors.surface }],
    stopIcon: [baseStyles.stopIcon, { backgroundColor: colors.surfaceHover }],
    stopType: [baseStyles.stopType, { color: colors.text.primary }],
    stopAddress: [baseStyles.stopAddress, { color: colors.text.primary }],
    stopStudent: [baseStyles.stopStudent, { color: colors.text.secondary }],
    stopOrder: [baseStyles.stopOrder, { backgroundColor: "#1769D2" }],
    locationItem: [
      baseStyles.locationItem,
      { backgroundColor: colors.surface },
    ],
    locationText: [baseStyles.locationText, { color: colors.text.primary }],
    locationLabel: [
      baseStyles.locationLabel,
      { color: ownerColors.primaryDark },
    ],
    mapPreview: [
      baseStyles.mapPreview,
      { backgroundColor: colors.surfaceHover },
    ],
    mapLegend: [baseStyles.mapLegend, { backgroundColor: colors.surface }],
    legendText: [baseStyles.legendText, { color: colors.text.secondary }],
    emptyState: [
      baseStyles.emptyState,
      { backgroundColor: colors.surfaceHover },
    ],
    emptyStateText: [
      baseStyles.emptyStateText,
      { color: colors.text.secondary },
    ],
    viewAllStopsButton: [
      baseStyles.viewAllStopsButton,
      { backgroundColor: ownerColors.primary },
    ],
    viewAllStudentsButton: [
      baseStyles.viewAllStudentsButton,
      { backgroundColor: "#1769D2" },
    ],
  };
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapFullScreen, setMapFullScreen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  // no static image state needed when using interactive preview
  const [timePrefs, setTimePrefs] = useState<TimePreference[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showRouteActions, setShowRouteActions] = useState(false);
  const [showRouteEditModal, setShowRouteEditModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState(false);
  const [routeEditError, setRouteEditError] = useState<string | null>(null);
  const [editRouteName, setEditRouteName] = useState("");
  const [editStartLocation, setEditStartLocation] = useState("");
  const [editEndLocation, setEditEndLocation] = useState("");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editPickupStartTime, setEditPickupStartTime] = useState("");
  const [editPickupEndTime, setEditPickupEndTime] = useState("");
  const [editDropoffStartTime, setEditDropoffStartTime] = useState("");
  const [editDropoffEndTime, setEditDropoffEndTime] = useState("");
  const [editRouteFare, setEditRouteFare] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [liveDriverLocation, setLiveDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    const driverId = route?.driver_id || route?.drivers?.id;
    if (!driverId || !user?.token) {
      setLiveDriverLocation(null);
      return;
    }

    let active = true;
    const fetchLiveDriverLocation = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/driver/location/${driverId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!response.ok || !active) return;
        const data = await response.json();
        const latitude = Number(data?.latitude);
        const longitude = Number(data?.longitude);
        if (
          data?.is_online &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          setLiveDriverLocation({ latitude, longitude });
        } else {
          setLiveDriverLocation(null);
        }
      } catch (locationError) {
        console.error("Owner live driver location error:", locationError);
      }
    };

    fetchLiveDriverLocation();
    const interval = setInterval(fetchLiveDriverLocation, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [route?.driver_id, route?.drivers?.id, user?.token]);

  const fetchRouteDetails = useCallback(async () => {
    if (!routeId || !user?.token) {
      setLoading(false);
      setError("Unable to load route details right now.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/routes/${routeId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRoute(data.route);
      } else {
        setError(data.error || "Failed to load route details");
      }
    } catch (err) {
      console.error("Error fetching route details:", err);
      setError("Failed to load route details");
    } finally {
      setLoading(false);
    }
  }, [routeId, user?.token]);

  useEffect(() => {
    if (!routeId || !user?.token) {
      setLoading(false);
      return;
    }

    fetchRouteDetails();
  }, [fetchRouteDetails, routeId, user?.token]);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await getAllDepartureTimePreferences(user?.token);
        setTimePrefs(prefs || []);
      } catch (err) {
        console.warn("Failed to load time prefs:", err);
      }
    };

    if (user?.token) loadPrefs();
  }, [user?.token]);

  const fetchDrivers = useCallback(async () => {
    if (!user?.token) return;

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/drivers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setDrivers(data || []);
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  }, [user?.token]);

  const fetchVehicles = useCallback(async () => {
    if (!user?.token) return;

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setVehicles(data || []);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    fetchDrivers();
    fetchVehicles();
  }, [fetchDrivers, fetchVehicles, user?.token]);

  const assignmentItems = route?.route_assignments || [];

  const assignedVehicles = vehicles.filter(
    (vehicle: any) =>
      Boolean(vehicle?.driver_id) || Boolean(vehicle?.drivers?.id),
  );
  const selectedDriver = drivers.find(
    (driver: any) => String(driver.id) === String(selectedDriverId),
  );
  const vehiclesForSelectedDriver = assignedVehicles.filter(
    (vehicle: any) =>
      String(vehicle?.driver_id || vehicle?.drivers?.id || "") ===
      String(selectedDriverId || ""),
  );

  const vehiclesOnRoute = new Set(
    (assignmentItems || [])
      .map((a: any) => (a?.vehicle_id ? String(a.vehicle_id) : null))
      .filter(Boolean),
  );

  const currentAssignment =
    assignmentItems.length > 0
      ? assignmentItems[currentAssignmentIndex % assignmentItems.length]
      : null;

  useEffect(() => {
    if (assignmentItems.length <= 1) {
      setCurrentAssignmentIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentAssignmentIndex((prevIndex) =>
        assignmentItems.length > 0
          ? (prevIndex + 1) % assignmentItems.length
          : 0,
      );
    }, 4500);

    return () => clearInterval(interval);
  }, [assignmentItems.length]);

  const getDriverName = (assignment?: any) => {
    const driver = assignment?.drivers || route?.drivers;
    return driver?.users?.name || driver?.name || "Not assigned";
  };

  const getDriverAvatar = (assignment?: any) => {
    const avatarData = assignment
      ? assignment?.drivers?.users?.avatar ||
        assignment?.drivers?.avatar ||
        assignment?.drivers?.profile_picture ||
        null
      : route?.drivers?.users?.avatar ||
        route?.drivers?.avatar ||
        route?.drivers?.profile_picture ||
        null;

    if (!avatarData) return null;
    if (typeof avatarData === "string") return avatarData;
    return avatarData.url || avatarData.avatar_url || null;
  };

  const currentDriverAvatar = getDriverAvatar(currentAssignment);
  const currentDriverName = getDriverName(currentAssignment);

  const getDriverSubtitle = (assignment?: any) => {
    const driver = assignment?.drivers || route?.drivers;
    return driver?.users?.email || driver?.email || driver?.phone || "";
  };

  const getVehicleImage = (assignment?: any) => {
    return (
      assignment?.vehicles?.vehicle_images?.[0]?.url ||
      assignment?.vehicles?.images?.[0] ||
      route?.vehicles?.vehicle_images?.[0]?.url ||
      route?.vehicles?.images?.[0] ||
      null
    );
  };

  const getVehicleName = (assignment?: any) => {
    return (
      assignment?.vehicles?.name || route?.vehicles?.name || "Not assigned"
    );
  };

  const getVehicleSubtitle = (assignment?: any) => {
    return (
      assignment?.vehicles?.license_plate ||
      route?.vehicles?.license_plate ||
      ""
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  };

  const openAssignmentModal = () => {
    setSelectedDriverId(null);
    setSelectedVehicleId(null);
    setAssignmentError(null);
    setShowAssignmentModal(true);
  };

  const renderRouteHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace("/(owner)/(tabs)/routes")}
          accessibilityLabel="Back to routes"
        >
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.pageHeaderTitle}>Route Overview</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowRouteActions(true)}
          accessibilityLabel="Route actions"
        >
          <MaterialIcons name="more-vert" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setAssignmentError(null);
  };

  const assignRouteDriverVehicle = async () => {
    if (!selectedDriverId) {
      setAssignmentError("Please select a driver.");
      return;
    }

    if (!user?.token || !routeId) return;

    setAssigning(true);
    setAssignmentError(null);

    try {
      if (!selectedVehicleId) {
        setAssignmentError("Please select a vehicle.");
        setAssigning(false);
        return;
      }

      const payload: { driver_id: string; vehicle_id: string } = {
        driver_id: selectedDriverId,
        vehicle_id: selectedVehicleId,
      };

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/routes/${routeId}/driver`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (response.ok) {
        await fetchRouteDetails();
        closeAssignmentModal();
      } else {
        setAssignmentError(data.error || "Failed to assign driver or vehicle.");
      }
    } catch (err) {
      console.error("Error assigning route driver/vehicle:", err);
      setAssignmentError("Failed to assign driver or vehicle.");
    } finally {
      setAssigning(false);
    }
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return "N/A";

    const normalized = String(timeString).trim();

    // Handle time-only strings (H:MM, HH:MM, H:MM:SS, HH:MM:SS)
    const timeOnlyMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const hour24 = parseInt(timeOnlyMatch[1], 10);
      const minutes = timeOnlyMatch[2];
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? "PM" : "AM";
      return `${hour12}:${minutes} ${ampm}`;
    }

    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "Invalid Time";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeOnly = (value: string | null | undefined) => {
    if (!value) return null;
    const normalized = String(value).trim();
    const timeOnlyMatch = normalized.match(/(\d{1,2}:\d{2})(?::\d{2})?$/);
    if (timeOnlyMatch) return timeOnlyMatch[1];
    try {
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return null;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return null;
    }
  };

  const formatPreferenceScope = (scope?: string | null) => {
    if (!scope) return null;
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  };

  const getPreferenceScopeForTime = (
    value: string | null | undefined,
    routeId?: string | number | null,
    routeScope?: string | null,
  ) => {
    const scopeFromRoute = routeScope?.trim();
    if (scopeFromRoute) return scopeFromRoute;

    const normalizedRouteId = routeId != null ? String(routeId).trim() : "";
    const timeOnly = getTimeOnly(value);
    if (!timeOnly && !normalizedRouteId) return null;
    const today = new Date().toISOString().split("T")[0];

    if (normalizedRouteId) {
      const byRoute = timePrefs.find(
        (p) =>
          String(p.routeId ?? "") === normalizedRouteId &&
          (!p.expiryDate || p.expiryDate >= today),
      );
      if (byRoute) return byRoute.scope;
    }

    if (!timeOnly) return null;

    const pref = timePrefs.find(
      (p) => p.time === timeOnly && (!p.expiryDate || p.expiryDate >= today),
    );
    return pref ? pref.scope : null;
  };

  const getStopCoordinate = (stop: RouteDetails["route_stops"][number]) => {
    const stopLatitude = Number(stop?.latitude);
    const stopLongitude = Number(stop?.longitude);
    if (Number.isFinite(stopLatitude) && Number.isFinite(stopLongitude)) {
      return {
        latitude: stopLatitude,
        longitude: stopLongitude,
      };
    }

    const matchingChild = route?.route_children?.find(
      (routeChild) => routeChild.child_id === stop.child_id,
    );
    const child = matchingChild?.children;

    if (!child) return null;

    if (stop.stop_type === "pickup") {
      const pickupLatitude = Number(child.pickup_latitude);
      const pickupLongitude = Number(child.pickup_longitude);
      if (Number.isFinite(pickupLatitude) && Number.isFinite(pickupLongitude)) {
        return {
          latitude: pickupLatitude,
          longitude: pickupLongitude,
        };
      }
    }

    if (stop.stop_type === "dropoff") {
      const dropoffLatitude = Number(child.dropoff_latitude);
      const dropoffLongitude = Number(child.dropoff_longitude);
      if (
        Number.isFinite(dropoffLatitude) &&
        Number.isFinite(dropoffLongitude)
      ) {
        return {
          latitude: dropoffLatitude,
          longitude: dropoffLongitude,
        };
      }
    }

    return null;
  };

  const getMapMarkers = () => {
    if (!route) return [];

    const markers: {
      coordinate: { latitude: number; longitude: number };
      title: string;
      type: "pickup" | "dropoff" | "driver" | "waypoint";
      endpoint?: "start" | "end";
    }[] = [];

    const startLatitude = Number(route.start_latitude);
    const startLongitude = Number(route.start_longitude);
    const endLatitude = Number(route.end_latitude);
    const endLongitude = Number(route.end_longitude);
    const hasStart =
      Number.isFinite(startLatitude) && Number.isFinite(startLongitude);
    const hasEnd =
      Number.isFinite(endLatitude) && Number.isFinite(endLongitude);

    if (hasStart) {
      markers.push({
        coordinate: {
          latitude: startLatitude,
          longitude: startLongitude,
        },
        title: route.start_location || "Pickup Start",
        type: "pickup",
        endpoint: "start",
      });
    }

    routeWaypoints.forEach((waypoint, index) => {
      const latitude = Number(waypoint.latitude);
      const longitude = Number(waypoint.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      markers.push({
        coordinate: { latitude, longitude },
        title: waypoint.name || waypoint.address || `Via Stop ${index + 1}`,
        type: "waypoint",
      });
    });

    [...(route.route_stops || [])]
      .sort((first, second) => first.stop_order - second.stop_order)
      .forEach((stop, index) => {
        const coordinate = getStopCoordinate(stop);
        if (!coordinate) return;

        const childName =
          stop.children?.name ||
          route.route_children?.find(
            (routeChild) => routeChild.child_id === stop.child_id,
          )?.children?.name;
        const label = childName
          ? `${stop.stop_type === "pickup" ? "Pickup" : "Dropoff"} • ${childName}`
          : `${stop.stop_type === "pickup" ? "Pickup" : "Dropoff"} Stop ${index + 1}`;

        markers.push({
          coordinate,
          title: label,
          type: stop.stop_type,
        });
      });

    if (hasEnd) {
      markers.push({
        coordinate: {
          latitude: endLatitude,
          longitude: endLongitude,
        },
        title: route.end_location || "Dropoff End",
        type: "dropoff",
        endpoint: "end",
      });
    }

    if (liveDriverLocation) {
      markers.push({
        coordinate: liveDriverLocation,
        title: "Driver live location",
        type: "driver",
      });
    }

    return markers;
  };

  const getRoutePreviewRegion = () => {
    if (!route) return null;

    const points = getMapMarkers().map((marker) => marker.coordinate);

    if (points.length === 0) {
      return null;
    }

    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latDelta = maxLat - minLat || 0.01;
    const lngDelta = maxLng - minLng || 0.01;

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta * 1.2,
      longitudeDelta: lngDelta * 1.2,
    };
  };

  const routePreferenceScope = getPreferenceScopeForTime(
    route?.departure_time,
    route?.id,
    route?.time_scope ||
      (route as any)?.raw?.time_scope ||
      (route as any)?.raw?.timeScope,
  );
  const routeDistance =
    route?.estimated_distance_km ??
    (route as any)?.distance_km ??
    (route as any)?.estimated_distance_km ??
    (route as any)?.raw?.distance_km ??
    (route as any)?.raw?.estimated_distance_km;
  const routeDuration =
    route?.estimated_duration ||
    (() => {
      const start = route?.pickup_start_time || route?.departure_time;
      const end = route?.dropoff_end_time || route?.dropoff_start_time;
      if (!start || !end) return "—";
      const parseTime = (value: string) => {
        const match = String(value).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        return match ? Number(match[1]) * 60 + Number(match[2]) : null;
      };
      const startMinutes = parseTime(start);
      const endMinutes = parseTime(end);
      let minutes: number;
      if (startMinutes != null && endMinutes != null) {
        minutes = endMinutes - startMinutes;
      } else {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(endDate.getTime())
        ) {
          return "—";
        }
        minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      }
      if (minutes < 0) minutes += 24 * 60;
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      return hours > 0 ? `${hours} h ${remainder} min` : `${remainder} min`;
    })();
  const rawRouteStatus = String(route?.status || "Active");
  const routeStatus =
    rawRouteStatus.charAt(0).toUpperCase() + rawRouteStatus.slice(1);
  const routeStops = [...(route?.route_stops || [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  );
  const completedStopCount = routeStops.filter(
    (stop) => stop.status === "completed",
  ).length;
  const inProgressStopCount = routeStops.filter(
    (stop) => stop.status === "in_progress",
  ).length;
  const skippedStopCount = routeStops.filter(
    (stop) => stop.status === "skipped",
  ).length;
  const stopCompletionPercentage =
    routeStops.length > 0
      ? Math.round((completedStopCount / routeStops.length) * 100)
      : null;
  const routeWaypoints = [...(route?.route_waypoints || [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  );
  const viaStopLabels = [
    ...routeWaypoints.map((waypoint) => waypoint.address || waypoint.name),
    ...routeStops.map((stop) => stop.address),
  ].filter(Boolean);

  const getEditableTime = (value?: string | null) => {
    if (!value) return "";
    const match = String(value).match(/(?:T|^)(\d{1,2}:\d{2})/);
    return match?.[1] || "";
  };

  const openRouteEditModal = () => {
    if (!route) return;
    setEditRouteName(route.route_name || "");
    setEditStartLocation(route.start_location || "");
    setEditEndLocation(route.end_location || "");
    setEditDepartureTime(getEditableTime(route.departure_time));
    setEditPickupStartTime(getEditableTime(route.pickup_start_time));
    setEditPickupEndTime(getEditableTime(route.pickup_end_time));
    setEditDropoffStartTime(getEditableTime(route.dropoff_start_time));
    setEditDropoffEndTime(getEditableTime(route.dropoff_end_time));
    setEditRouteFare(
      route.per_child_amount_cents != null
        ? (route.per_child_amount_cents / 100).toFixed(2)
        : "",
    );
    setRouteEditError(null);
    setShowRouteEditModal(true);
  };

  const saveRouteEdits = async () => {
    if (!routeId || !user?.token || !route) return;
    if (
      !editRouteName.trim() ||
      !editStartLocation.trim() ||
      !editEndLocation.trim()
    ) {
      setRouteEditError("Route name and both locations are required.");
      return;
    }
    const scheduleValues = [
      editDepartureTime,
      editPickupStartTime,
      editPickupEndTime,
      editDropoffStartTime,
      editDropoffEndTime,
    ];
    const hasSchedule = scheduleValues.some((value) => value.trim());
    const validTime = (value: string) => /^\d{1,2}:\d{2}$/.test(value.trim());
    if (hasSchedule && scheduleValues.some((value) => !validTime(value))) {
      setRouteEditError(
        "Enter all times in 24-hour HH:mm format or leave them all blank.",
      );
      return;
    }
    const fare = Number(editRouteFare);
    if (!Number.isFinite(fare) || fare < 0) {
      setRouteEditError("Enter a valid non-negative fare.");
      return;
    }

    setSavingRoute(true);
    setRouteEditError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const routeDate =
        String(route.departure_time || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] ||
        new Date().toISOString().slice(0, 10);
      const response = await fetch(
        `${baseUrl}/owner/routes/${encodeURIComponent(String(routeId))}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + String(user.token),
          },
          body: JSON.stringify({
            route_name: editRouteName.trim(),
            start_location: editStartLocation.trim(),
            end_location: editEndLocation.trim(),
            departure_time: editDepartureTime.trim()
              ? `${routeDate}T${editDepartureTime.trim()}:00`
              : null,
            pickup_start_time: editPickupStartTime.trim(),
            pickup_end_time: editPickupEndTime.trim(),
            dropoff_start_time: editDropoffStartTime.trim(),
            dropoff_end_time: editDropoffEndTime.trim(),
            per_child_amount_cents: Math.round(fare * 100),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setRouteEditError(
          data?.error || data?.message || "Could not save route changes.",
        );
        return;
      }
      setShowRouteEditModal(false);
      await fetchRouteDetails();
    } catch (saveError) {
      console.error("Failed to update route:", saveError);
      setRouteEditError("Could not save route changes. Please try again.");
    } finally {
      setSavingRoute(false);
    }
  };

  const deleteCurrentRoute = async () => {
    if (!routeId || !user?.token) return;
    setDeletingRoute(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/routes/${encodeURIComponent(String(routeId))}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + String(user.token) },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        Alert.alert(
          "Delete failed",
          data?.error || data?.message || "Could not delete this route.",
        );
        return;
      }
      setShowDeleteConfirmation(false);
      router.replace("/(owner)/(tabs)/routes");
    } catch (deleteError) {
      console.error("Failed to delete route:", deleteError);
      Alert.alert("Delete failed", "Could not delete this route.");
    } finally {
      setDeletingRoute(false);
    }
  };

  const renderMapContent = (isFullScreen: boolean = false) => {
    if (!route) return null;
    const region = getRoutePreviewRegion();
    if (!region) return null;

    const mapMarkers = getMapMarkers();
    const coords = mapMarkers
      .filter((marker) => marker.type !== "driver")
      .map((m) => m.coordinate);
    const origin = coords.length > 0 ? coords[0] : null;
    const destination = coords.length > 1 ? coords[coords.length - 1] : null;
    const waypoints = coords.length > 2 ? coords.slice(1, -1) : [];
    const returnWaypoints = [...waypoints].reverse();

    if (isFullScreen) {
      return (
        <CustomMap
          markers={mapMarkers.map((m) => ({
            latitude: m.coordinate.latitude,
            longitude: m.coordinate.longitude,
            title: m.title,
            type: m.type,
            endpoint: m.endpoint,
          }))}
          origin={origin}
          destination={destination}
          waypoints={waypoints}
          returnWaypoints={returnWaypoints}
          showReturnDirection={true}
          style={styles.mapFullScreen}
          centerOnUser={true}
          showMarkerLabels={true}
        />
      );
    }

    // Use interactive CustomMap for non-fullscreen preview for consistency
    return (
      <CustomMap
        markers={mapMarkers.map((m) => ({
          latitude: m.coordinate.latitude,
          longitude: m.coordinate.longitude,
          title: m.title,
          type: m.type,
          endpoint: m.endpoint,
        }))}
        origin={origin}
        destination={destination}
        waypoints={waypoints}
        returnWaypoints={returnWaypoints}
        showReturnDirection={true}
        style={styles.mapPreview}
        showMarkerLabels={true}
      />
    );
  };

  const renderRouteMapPreview = () => {
    const region = getRoutePreviewRegion();

    if (!region) return null;

    return (
      <>
        <View style={styles.mapPreviewContainer}>
          {renderMapContent(false)}
          <TouchableOpacity
            style={styles.mapFullScreenButton}
            onPress={() => setMapFullScreen(true)}
          >
            <MaterialIcons name="fullscreen" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#7ED321" }]}
              />
              <Text
                style={styles.legendText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                Pickup Start
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]}
              />
              <Text
                style={styles.legendText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                Dropoff End
              </Text>
            </View>
          </View>
        </View>
        <Modal
          visible={mapFullScreen}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setMapFullScreen(false)}
        >
          <View style={styles.fullScreenMapContainer}>
            {renderMapContent(true)}
            <TouchableOpacity
              style={styles.mapCloseButton}
              onPress={() => setMapFullScreen(false)}
            >
              <MaterialIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </Modal>
      </>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderRouteHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7ED321" />
          <Text style={styles.loadingText}>Loading route details...</Text>
        </View>
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.container}>
        {renderRouteHeader()}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || "Route not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRouteDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderRouteHeader()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routeHeader}>
          <View style={styles.routeSummaryTop}>
            <View style={styles.routeIconContainer}>
              <MaterialIcons name="alt-route" size={22} color="#1769D2" />
            </View>
            <View style={styles.routeHeaderInfo}>
              <Text style={styles.routeEyebrow} maxFontSizeMultiplier={1.2}>
                ROUTE OVERVIEW
              </Text>
              <Text
                style={styles.routeTitle}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
              >
                {route.route_name || "Route"}
              </Text>
              <Text
                style={styles.routeSubtitle}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {`${route.start_location || "Start"}  →  ${route.end_location || "Destination"}`}
              </Text>
            </View>
            <View
              style={[
                styles.routeStatusBadge,
                String(route?.status || "").toLowerCase() === "inactive" &&
                  styles.routeStatusBadgeInactive,
              ]}
            >
              <View
                style={[
                  styles.routeStatusDot,
                  String(route?.status || "").toLowerCase() === "inactive" &&
                    styles.routeStatusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.routeStatus,
                  String(route?.status || "").toLowerCase() === "inactive" &&
                    styles.routeStatusInactive,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {routeStatus}
              </Text>
            </View>
          </View>
          <View style={styles.routeProgressPanel}>
            <View style={styles.routeProgressRing}>
              {Array.from({ length: 20 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.routeProgressSegment,
                    stopCompletionPercentage != null &&
                      index < Math.round((stopCompletionPercentage / 100) * 20)
                      ? styles.routeProgressSegmentComplete
                      : styles.routeProgressSegmentRemaining,
                    {
                      transform: [
                        { rotate: `${index * 18}deg` },
                        { translateY: -31 },
                      ],
                    },
                  ]}
                />
              ))}
              <View style={styles.routeProgressCenter}>
                <Text style={styles.routeProgressValue}>
                  {stopCompletionPercentage != null
                    ? `${stopCompletionPercentage}%`
                    : "—"}
                </Text>
                <Text style={styles.routeProgressCaption}>
                  {routeStops.length} stops
                </Text>
              </View>
            </View>
            <View style={styles.routeStopCounts}>
              <View style={styles.routeStopCountRow}>
                <View
                  style={[
                    styles.routeStopCountDot,
                    styles.routeStopCountCompleted,
                  ]}
                />
                <Text style={styles.routeStopCountLabel}>Completed</Text>
                <Text style={styles.routeStopCountValue}>
                  {completedStopCount}
                </Text>
              </View>
              <View style={styles.routeStopCountRow}>
                <View
                  style={[
                    styles.routeStopCountDot,
                    styles.routeStopCountInProgress,
                  ]}
                />
                <Text style={styles.routeStopCountLabel}>In progress</Text>
                <Text style={styles.routeStopCountValue}>
                  {inProgressStopCount}
                </Text>
              </View>
              <View style={styles.routeStopCountRow}>
                <View
                  style={[
                    styles.routeStopCountDot,
                    styles.routeStopCountSkipped,
                  ]}
                />
                <Text style={styles.routeStopCountLabel}>Skipped</Text>
                <Text style={styles.routeStopCountValue}>
                  {skippedStopCount}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.routeSummaryStats}>
            {[
              {
                label: "TOTAL DISTANCE",
                value: routeDistance != null ? `${routeDistance} km` : "—",
                icon: "near-me" as const,
              },
              {
                label: "EST. DURATION",
                value: routeDuration,
                icon: "schedule" as const,
              },
              {
                label: "BILLING",
                value: routePreferenceScope
                  ? formatPreferenceScope(routePreferenceScope)
                  : "—",
                icon: "event-repeat" as const,
              },
            ].map((stat) => (
              <View key={stat.label} style={styles.routeSummaryStat}>
                <View style={styles.routeSummaryStatIcon}>
                  <MaterialIcons name={stat.icon} size={16} color="#1769D2" />
                </View>
                <View style={styles.routeSummaryStatText}>
                  <Text
                    style={styles.routeSummaryStatLabel}
                    maxFontSizeMultiplier={1.2}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={styles.routeSummaryStatValue}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {stat.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {renderRouteMapPreview()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
            Route Details
          </Text>
          <View style={styles.routeTimeline}>
            <View style={styles.timelineMarkerColumn}>
              <View style={[styles.timelineDot, styles.timelineStartDot]} />
              <View style={styles.timelineLine} />
              {viaStopLabels.length > 0 ? (
                <>
                  <View style={styles.timelineStopDot} />
                  <View style={styles.timelineLine} />
                </>
              ) : null}
              <View style={[styles.timelineDot, styles.timelineEndDot]} />
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineLocation}>
                <Text style={styles.timelineLabel} maxFontSizeMultiplier={1.2}>
                  Start Location
                </Text>
                <Text
                  style={styles.timelineAddress}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.start_location || "Not provided"}
                </Text>
                <Text
                  style={styles.timelineCoordinates}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.start_latitude != null && route.start_longitude != null
                    ? `${route.start_latitude}, ${route.start_longitude}`
                    : "Coordinates unavailable"}
                </Text>
              </View>
              {viaStopLabels.length > 0 ? (
                <View style={styles.timelineLocation}>
                  <Text
                    style={styles.timelineLabel}
                    maxFontSizeMultiplier={1.2}
                  >
                    Via Stops
                  </Text>
                  <Text
                    style={styles.timelineAddress}
                    maxFontSizeMultiplier={1.2}
                  >
                    {viaStopLabels.length}{" "}
                    {viaStopLabels.length === 1 ? "stop" : "stops"}
                  </Text>
                  <Text
                    style={styles.timelineCoordinates}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {viaStopLabels.slice(0, 2).join(" · ")}
                  </Text>
                </View>
              ) : (
                <View style={styles.timelineLocation}>
                  <Text
                    style={styles.timelineLabel}
                    maxFontSizeMultiplier={1.2}
                  >
                    Via Stops
                  </Text>
                  <Text
                    style={styles.timelineCoordinates}
                    maxFontSizeMultiplier={1.2}
                  >
                    None
                  </Text>
                </View>
              )}
              <View style={[styles.timelineLocation, styles.timelineLast]}>
                <Text style={styles.timelineLabel} maxFontSizeMultiplier={1.2}>
                  End Location
                </Text>
                <Text
                  style={styles.timelineAddress}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.end_location || "Not provided"}
                </Text>
                <Text
                  style={styles.timelineCoordinates}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.end_latitude != null && route.end_longitude != null
                    ? `${route.end_latitude}, ${route.end_longitude}`
                    : "Coordinates unavailable"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.routeAdditionalDetails}>
            {route.description ? (
              <View style={styles.routeDescriptionCard}>
                <Text
                  style={styles.routeAdditionalLabel}
                  maxFontSizeMultiplier={1.2}
                >
                  DESCRIPTION
                </Text>
                <Text
                  style={styles.routeDescription}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.description}
                </Text>
              </View>
            ) : null}
            <View style={styles.routeDetailPills}>
              {route.route_type ? (
                <View style={styles.routeDetailPill}>
                  <MaterialIcons name="alt-route" size={14} color="#1769D2" />
                  <Text
                    style={styles.routeDetailPillText}
                    maxFontSizeMultiplier={1.2}
                  >
                    {route.route_type
                      .split("_")
                      .map(
                        (part) => part.charAt(0).toUpperCase() + part.slice(1),
                      )
                      .join(" ")}
                  </Text>
                </View>
              ) : null}
              <View style={styles.routeDetailPill}>
                <MaterialIcons name="payments" size={14} color="#1769D2" />
                <Text
                  style={styles.routeDetailPillText}
                  maxFontSizeMultiplier={1.2}
                >
                  R
                  {((Number(route.per_child_amount_cents) || 0) / 100).toFixed(
                    2,
                  )}
                </Text>
              </View>
              <View style={styles.routeDetailPill}>
                <MaterialIcons name="schedule" size={14} color="#1769D2" />
                <Text
                  style={styles.routeDetailPillText}
                  maxFontSizeMultiplier={1.2}
                >
                  {route.time_reference}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.assignmentCards}>
          <View style={styles.assignmentOverviewCard}>
            <View style={styles.assignmentOverviewHeading}>
              <MaterialIcons name="directions-bus" size={16} color="#1769D2" />
              <Text style={styles.assignmentOverviewLabel}>
                Assigned Vehicle
              </Text>
            </View>
            <View style={styles.assignmentOverviewContent}>
              <View style={styles.overviewVehicleImage}>
                {getVehicleImage(currentAssignment) ? (
                  <Image
                    source={{ uri: getVehicleImage(currentAssignment)! }}
                    style={styles.assignmentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="airport-shuttle"
                    size={27}
                    color="#1769D2"
                  />
                )}
              </View>
              <View style={styles.assignmentOverviewText}>
                <Text style={styles.assignmentOverviewName} numberOfLines={1}>
                  {getVehicleName(currentAssignment)}
                </Text>
                <Text
                  style={styles.assignmentOverviewSubtitle}
                  numberOfLines={1}
                >
                  {getVehicleSubtitle(currentAssignment) || "No plate provided"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.assignmentOverviewCard}>
            <View style={styles.assignmentOverviewHeading}>
              <MaterialIcons name="person" size={16} color="#1769D2" />
              <Text style={styles.assignmentOverviewLabel}>Driver</Text>
            </View>
            <View style={styles.assignmentOverviewContent}>
              <View style={styles.overviewDriverAvatar}>
                {currentDriverAvatar ? (
                  <Image
                    source={{ uri: currentDriverAvatar }}
                    style={styles.assignmentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.driverAvatarFallbackText}>
                    {getInitials(currentDriverName) || "D"}
                  </Text>
                )}
              </View>
              <View style={styles.assignmentOverviewText}>
                <Text style={styles.assignmentOverviewName} numberOfLines={1}>
                  {currentDriverName}
                </Text>
                <Text
                  style={styles.assignmentOverviewSubtitle}
                  numberOfLines={1}
                >
                  {getDriverSubtitle(currentAssignment) ||
                    "Driver not assigned"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.assignmentFooter, styles.assignmentFooterCompact]}>
          <TouchableOpacity
            style={styles.assignmentButton}
            onPress={openAssignmentModal}
          >
            <Text style={styles.assignmentButtonText}>
              Assign Driver / Vehicle
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routeStopsSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Route Stops
            </Text>
            {routeStops.length > 4 ? (
              <TouchableOpacity
                style={styles.sectionAction}
                onPress={() =>
                  router.push({
                    pathname: "/view-all-stops",
                    params: { routeId: String(routeId) },
                  })
                }
              >
                <Text style={styles.sectionActionText}>View All</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {routeWaypoints.map((waypoint, index) => (
            <View key={waypoint.id} style={styles.routeStopRow}>
              <View
                style={[styles.routeStopBadge, styles.routeStopWaypointBadge]}
              >
                <Text style={styles.routeStopBadgeText}>V</Text>
              </View>
              <View style={styles.routeStopInfo}>
                <Text style={styles.routeStopAddress} numberOfLines={1}>
                  {waypoint.name || waypoint.address}
                </Text>
                <Text style={styles.routeStopSubtext} numberOfLines={1}>
                  Via Stop {index + 1}
                  {waypoint.name && waypoint.address !== waypoint.name
                    ? ` · ${waypoint.address}`
                    : ""}
                </Text>
              </View>
            </View>
          ))}
          {routeStops.length > 0 ? (
            routeStops.slice(0, 4).map((stop, index) => (
              <View key={stop.id} style={styles.routeStopRow}>
                <View
                  style={[
                    styles.routeStopBadge,
                    stop.stop_type === "pickup"
                      ? styles.routeStopPickup
                      : styles.routeStopDropoff,
                  ]}
                >
                  <Text style={styles.routeStopBadgeText}>
                    {stop.stop_type === "pickup" ? "A" : "B"}
                  </Text>
                </View>
                <View style={styles.routeStopInfo}>
                  <Text style={styles.routeStopAddress} numberOfLines={1}>
                    {stop.address || stop.children?.name || "Route stop"}
                  </Text>
                  <Text style={styles.routeStopSubtext} numberOfLines={1}>
                    {stop.stop_type === "pickup" ? "Departure" : "Arrival"}:{" "}
                    {formatTime(
                      stop.stop_type === "pickup"
                        ? route.pickup_start_time
                        : route.dropoff_end_time,
                    )}
                    {stop.children?.name ? ` · ${stop.children.name}` : ""}
                  </Text>
                </View>
                {index === 0 ? (
                  <Text style={styles.routeStopDistance}>
                    {routeDistance != null ? `${routeDistance} km` : ""}
                  </Text>
                ) : null}
              </View>
            ))
          ) : routeWaypoints.length === 0 ? (
            <Text style={styles.emptyStateText}>No route stops added</Text>
          ) : null}
        </View>

        {route.pickup_start_time ||
        route.pickup_end_time ||
        route.dropoff_start_time ||
        route.dropoff_end_time ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Windows</Text>

            <View style={styles.timeGrid}>
              <View style={styles.timeItem}>
                <MaterialIcons
                  name="schedule"
                  size={24}
                  color="#4A90E2"
                  style={styles.timeIcon}
                />
                <View style={styles.timeContent}>
                  <Text style={styles.timeLabel}>Pickup Window</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(route.pickup_start_time)} -{" "}
                    {formatTime(route.pickup_end_time)}
                  </Text>
                </View>
              </View>

              <View style={styles.timeItem}>
                <MaterialIcons
                  name="access-time"
                  size={24}
                  color="#4A90E2"
                  style={styles.timeIcon}
                />
                <View style={styles.timeContent}>
                  <Text style={styles.timeLabel}>Dropoff Window</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(route.dropoff_start_time)} -{" "}
                    {formatTime(route.dropoff_end_time)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Students on Route */}
        {route.route_children?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                Students Assigned ({route.route_children?.length || 0})
              </Text>
              {route.route_children.length > 3 ? (
                <TouchableOpacity
                  style={styles.sectionAction}
                  onPress={() =>
                    router.push({
                      pathname: "/view-all-students",
                      params: { routeId: String(routeId) },
                    })
                  }
                >
                  <Text style={styles.sectionActionText}>View All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {route.route_children && route.route_children.length > 0 ? (
              route.route_children.slice(0, 4).map((routeChild) => (
                <TouchableOpacity
                  key={routeChild.id}
                  style={styles.studentCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(owner)/students-view",
                      params: {
                        routeId: String(routeId),
                        studentData: JSON.stringify(routeChild.children || {}),
                      },
                    })
                  }
                >
                  <View style={styles.studentAvatar}>
                    {routeChild.children?.avatar ? (
                      <Image
                        source={{
                          uri:
                            typeof routeChild.children.avatar === "string"
                              ? routeChild.children.avatar
                              : routeChild.children.avatar?.url ||
                                routeChild.children.avatar?.avatar_url ||
                                "",
                        }}
                        style={styles.studentAvatarImage}
                      />
                    ) : (
                      <MaterialIcons
                        name="school"
                        size={24}
                        color={colors.warning}
                      />
                    )}
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {routeChild.children?.name || "Unknown"}
                    </Text>
                    <Text style={styles.studentSchool}>
                      {routeChild.children?.school_name ||
                        "School not specified"}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No students assigned</Text>
              </View>
            )}
          </View>
        )}

        <Modal
          visible={showRouteActions}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowRouteActions(false)}
        >
          <View style={styles.routeActionsOverlay}>
            <TouchableOpacity
              style={styles.routeActionsBackdrop}
              activeOpacity={1}
              onPress={() => setShowRouteActions(false)}
              accessibilityLabel="Close route actions"
            />
            <View style={styles.routeActionsSheet}>
              <View style={styles.routeActionsHandle} />
              <View style={styles.routeActionsHeader}>
                <View>
                  <Text style={styles.routeActionsTitle}>Route actions</Text>
                  <Text style={styles.routeActionsSubtitle}>
                    Manage this route
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.routeActionsClose}
                  onPress={() => setShowRouteActions(false)}
                  accessibilityLabel="Close"
                >
                  <MaterialIcons name="close" size={20} color="#5C7085" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.routeActionItem}
                onPress={() => {
                  setShowRouteActions(false);
                  fetchRouteDetails();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeActionIcon}>
                  <MaterialIcons name="refresh" size={20} color="#1769D2" />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeActionTitle}>Refresh route</Text>
                  <Text style={styles.routeActionDescription}>
                    Reload the latest route information
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#91A1B1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeActionItem}
                onPress={() => {
                  setShowRouteActions(false);
                  openAssignmentModal();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeActionIcon}>
                  <MaterialIcons
                    name="assignment-ind"
                    size={20}
                    color="#1769D2"
                  />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeActionTitle}>
                    Assign driver / vehicle
                  </Text>
                  <Text style={styles.routeActionDescription}>
                    Change the route assignment
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#91A1B1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeActionItem}
                onPress={() => {
                  setShowRouteActions(false);
                  openRouteEditModal();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeActionIcon}>
                  <MaterialIcons name="edit" size={20} color="#1769D2" />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeActionTitle}>Edit route</Text>
                  <Text style={styles.routeActionDescription}>
                    Update route details, schedule, or fare
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#91A1B1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeActionItem}
                onPress={() => {
                  setShowRouteActions(false);
                  router.push({
                    pathname: "/view-all-stops",
                    params: { routeId: String(routeId) },
                  });
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeActionIcon}>
                  <MaterialIcons name="place" size={20} color="#1769D2" />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeActionTitle}>View stops</Text>
                  <Text style={styles.routeActionDescription}>
                    See all pickup and drop-off stops
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#91A1B1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeActionItem}
                onPress={() => {
                  setShowRouteActions(false);
                  router.push({
                    pathname: "/view-all-students",
                    params: { routeId: String(routeId) },
                  });
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeActionIcon}>
                  <MaterialIcons name="groups" size={20} color="#1769D2" />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeActionTitle}>
                    View assigned students
                  </Text>
                  <Text style={styles.routeActionDescription}>
                    See the students assigned to this route
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#91A1B1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.routeActionItem, styles.routeDeleteAction]}
                onPress={() => {
                  setShowRouteActions(false);
                  setShowDeleteConfirmation(true);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.routeDeleteIcon}>
                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color="#C43B46"
                  />
                </View>
                <View style={styles.routeActionText}>
                  <Text style={styles.routeDeleteTitle}>Delete route</Text>
                  <Text style={styles.routeActionDescription}>
                    Permanently remove this route
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={21} color="#C43B46" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeActionsCancel}
                onPress={() => setShowRouteActions(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.routeActionsCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showRouteEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRouteEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.routeEditModal}>
              <Text style={styles.modalTitle}>Edit route</Text>
              <Text style={styles.modalDescription}>
                Update the route information and schedule.
              </Text>
              <ScrollView
                style={styles.routeEditFields}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.routeEditLabel}>Route name</Text>
                <TextInput
                  style={styles.routeEditInput}
                  value={editRouteName}
                  onChangeText={setEditRouteName}
                  placeholder="Route name"
                />
                <Text style={styles.routeEditLabel}>Start location</Text>
                <TextInput
                  style={styles.routeEditInput}
                  value={editStartLocation}
                  onChangeText={setEditStartLocation}
                  placeholder="Start location"
                />
                <Text style={styles.routeEditLabel}>End location</Text>
                <TextInput
                  style={styles.routeEditInput}
                  value={editEndLocation}
                  onChangeText={setEditEndLocation}
                  placeholder="End location"
                />
                <Text style={styles.routeEditLabel}>
                  Departure time (24-hour)
                </Text>
                <TextInput
                  style={styles.routeEditInput}
                  value={editDepartureTime}
                  onChangeText={setEditDepartureTime}
                  placeholder="05:00"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.routeEditLabel}>Pickup window</Text>
                <View style={styles.routeEditTimeRow}>
                  <TextInput
                    style={[styles.routeEditInput, styles.routeEditTimeInput]}
                    value={editPickupStartTime}
                    onChangeText={setEditPickupStartTime}
                    placeholder="06:00"
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.routeEditTimeSeparator}>to</Text>
                  <TextInput
                    style={[styles.routeEditInput, styles.routeEditTimeInput]}
                    value={editPickupEndTime}
                    onChangeText={setEditPickupEndTime}
                    placeholder="07:30"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <Text style={styles.routeEditLabel}>Drop-off window</Text>
                <View style={styles.routeEditTimeRow}>
                  <TextInput
                    style={[styles.routeEditInput, styles.routeEditTimeInput]}
                    value={editDropoffStartTime}
                    onChangeText={setEditDropoffStartTime}
                    placeholder="13:00"
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.routeEditTimeSeparator}>to</Text>
                  <TextInput
                    style={[styles.routeEditInput, styles.routeEditTimeInput]}
                    value={editDropoffEndTime}
                    onChangeText={setEditDropoffEndTime}
                    placeholder="16:30"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <Text style={styles.routeEditLabel}>Fare per child (R)</Text>
                <TextInput
                  style={styles.routeEditInput}
                  value={editRouteFare}
                  onChangeText={setEditRouteFare}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </ScrollView>
              {routeEditError ? (
                <Text style={styles.routeEditError}>{routeEditError}</Text>
              ) : null}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowRouteEditModal(false)}
                  disabled={savingRoute}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.routeEditSaveButton]}
                  onPress={saveRouteEdits}
                  disabled={savingRoute}
                >
                  {savingRoute ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.routeEditSaveText}>Save changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDeleteConfirmation}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirmation(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteConfirmModal}>
              <View style={styles.deleteConfirmIcon}>
                <MaterialIcons
                  name="delete-outline"
                  size={25}
                  color="#C43B46"
                />
              </View>
              <Text style={styles.deleteConfirmTitle}>Delete this route?</Text>
              <Text style={styles.deleteConfirmDescription}>
                This permanently removes the route. This action cannot be
                undone.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowDeleteConfirmation(false)}
                  disabled={deletingRoute}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteConfirmButton]}
                  onPress={deleteCurrentRoute}
                  disabled={deletingRoute}
                >
                  {deletingRoute ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showAssignmentModal}
          transparent
          animationType="slide"
          onRequestClose={closeAssignmentModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Driver / Vehicle</Text>
              <Text style={styles.modalDescription}>
                Select a driver, then choose one of their assigned vehicles.
              </Text>

              <Text style={styles.modalLabel}>Select Driver</Text>
              <ScrollView
                style={styles.modalSelectionScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {drivers.length > 0 ? (
                  drivers.map((driverItem: any) => {
                    const driverName =
                      driverItem?.users?.name || driverItem?.name || "Driver";
                    const isSelected =
                      String(selectedDriverId) === String(driverItem.id);
                    return (
                      <TouchableOpacity
                        key={String(driverItem.id)}
                        style={[
                          styles.selectionItem,
                          styles.selectionItemRow,
                          isSelected && styles.selectionItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedDriverId(String(driverItem.id));
                          setSelectedVehicleId(null);
                        }}
                      >
                        <View style={styles.vehicleItemRow}>
                          <View style={styles.vehicleIconSmall}>
                            <MaterialIcons
                              name="person"
                              size={19}
                              color="#FFF"
                            />
                          </View>
                          <View style={styles.vehicleItemText}>
                            <Text
                              style={styles.selectionItemTitle}
                              numberOfLines={1}
                            >
                              {driverName}
                            </Text>
                            <Text
                              style={styles.selectionItemSubtitle}
                              numberOfLines={1}
                            >
                              {driverItem?.users?.phone ||
                                driverItem?.phone ||
                                driverItem?.users?.email ||
                                driverItem?.email ||
                                "Driver"}
                            </Text>
                          </View>
                          {isSelected ? (
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color="#1769D2"
                            />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyStateText}>
                    No drivers available.
                  </Text>
                )}
              </ScrollView>

              <Text style={styles.modalLabel}>
                Select Vehicle
                {selectedDriver
                  ? ` - ${selectedDriver?.users?.name || selectedDriver?.name || "Driver"}`
                  : ""}
              </Text>
              <ScrollView
                style={styles.modalSelectionScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {selectedDriverId && vehiclesForSelectedDriver.length > 0 ? (
                  vehiclesForSelectedDriver.map((vehicleItem: any) => {
                    const isOnRoute = vehiclesOnRoute.has(
                      String(vehicleItem.id),
                    );
                    const isSelected =
                      String(selectedVehicleId) === String(vehicleItem.id);
                    return (
                      <TouchableOpacity
                        key={String(vehicleItem.id)}
                        style={[
                          styles.selectionItem,
                          styles.selectionItemRow,
                          isSelected && styles.selectionItemSelected,
                          isOnRoute && styles.selectionItemDisabled,
                        ]}
                        onPress={() => {
                          if (isOnRoute) return;
                          setSelectedVehicleId(String(vehicleItem.id));
                        }}
                        disabled={isOnRoute}
                      >
                        <View style={styles.vehicleItemRow}>
                          <View style={styles.vehicleIconSmall}>
                            <MaterialIcons
                              name="directions-bus"
                              size={18}
                              color="#FFF"
                            />
                          </View>

                          <View style={styles.vehicleItemText}>
                            <Text
                              style={styles.selectionItemTitle}
                              numberOfLines={1}
                            >
                              {vehicleItem.name || "Unnamed Vehicle"}
                            </Text>
                            {vehicleItem.license_plate ? (
                              <Text
                                style={styles.selectionItemSubtitle}
                                numberOfLines={1}
                              >
                                {vehicleItem.license_plate}
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.vehicleItemRight}>
                            {isSelected ? (
                              <MaterialIcons
                                name="check-circle"
                                size={20}
                                color="#1769D2"
                              />
                            ) : null}
                            {isOnRoute ? (
                              <Text
                                style={[
                                  styles.selectionItemSubtitle,
                                  { color: "#9CA3AF", marginTop: 4 },
                                ]}
                              >
                                Already added
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyStateText}>
                    {selectedDriverId
                      ? "No assigned vehicles available for this driver."
                      : "Select a driver to see their vehicles."}
                  </Text>
                )}
              </ScrollView>

              {assignmentError ? (
                <Text style={styles.assignmentErrorText}>
                  {assignmentError}
                </Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={closeAssignmentModal}
                  disabled={assigning}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton]}
                  onPress={assignRouteDriverVehicle}
                  disabled={assigning}
                >
                  <Text style={styles.modalButtonText}>
                    {assigning ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 12,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  pageHeaderTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#7ED321",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#7ED321",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  routeHeader: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1EAF3",
    backgroundColor: "#FFFFFF",
    shadowColor: "#17385F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  routeSummaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  routeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EDF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  routeHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  routeEyebrow: {
    marginBottom: 3,
    color: "#7489A0",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  routeTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    color: "#16365E",
  },
  routeSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#71869C",
    fontWeight: "500",
    flexShrink: 1,
  },
  routeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E9F8F0",
  },
  routeStatusBadgeInactive: {
    backgroundColor: "#F0F3F6",
  },
  routeStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#21885A",
  },
  routeStatusDotInactive: {
    backgroundColor: "#7B8794",
  },
  routeStatus: {
    color: "#21885A",
    fontSize: 11,
    fontWeight: "700",
  },
  routeStatusInactive: {
    color: "#637083",
  },
  routeProgressPanel: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E5EEF7",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  routeProgressRing: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  routeProgressSegment: {
    position: "absolute",
    top: 34.5,
    left: 37,
    width: 4,
    height: 9,
    borderRadius: 2,
  },
  routeProgressSegmentComplete: {
    backgroundColor: "#16A66A",
  },
  routeProgressSegmentRemaining: {
    backgroundColor: "#DDE8F0",
  },
  routeProgressCenter: {
    width: 53,
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
  },
  routeProgressValue: {
    color: "#17385F",
    fontSize: 15,
    fontWeight: "800",
  },
  routeProgressCaption: {
    marginTop: 1,
    color: "#71869C",
    fontSize: 8,
    fontWeight: "600",
  },
  routeStopCounts: {
    flex: 1,
    gap: 9,
    marginLeft: 14,
  },
  routeStopCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  routeStopCountDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  routeStopCountCompleted: {
    backgroundColor: "#16A66A",
  },
  routeStopCountInProgress: {
    backgroundColor: "#F59E0B",
  },
  routeStopCountSkipped: {
    backgroundColor: "#EF4444",
  },
  routeStopCountLabel: {
    flex: 1,
    color: "#526981",
    fontSize: 10,
    fontWeight: "500",
  },
  routeStopCountValue: {
    minWidth: 14,
    color: "#24415D",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
  routeEndpoints: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F6F9FC",
  },
  routeEndpoint: {
    flex: 1,
    minWidth: 0,
  },
  routeEndpointLabel: {
    marginBottom: 5,
    color: "#8293A5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  routeEndpointText: {
    color: "#24415D",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  routeEndpointConnector: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    borderRadius: 15,
    backgroundColor: "#E7F1FC",
  },
  routeSummaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },
  routeSummaryStat: {
    flex: 1,
    minWidth: "30%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E7EEF5",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  routeSummaryStatIcon: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#EDF5FF",
  },
  routeSummaryStatText: {
    flex: 1,
    minWidth: 0,
  },
  routeSummaryStatLabel: {
    color: "#8293A5",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  routeSummaryStatValue: {
    marginTop: 3,
    color: "#24415D",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#FFF",
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D6E9FC",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  routeTimeline: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timelineMarkerColumn: {
    width: 16,
    alignItems: "center",
    paddingTop: 3,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  timelineStartDot: {
    borderColor: "#24A56A",
  },
  timelineEndDot: {
    borderColor: "#E44752",
  },
  timelineStopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1769D2",
  },
  timelineLine: {
    width: 1,
    height: 25,
    backgroundColor: "#C7DDF3",
  },
  timelineContent: {
    flex: 1,
    marginLeft: 7,
    minWidth: 0,
  },
  timelineLocation: {
    minHeight: 44,
    paddingBottom: 6,
    marginBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5EDF5",
  },
  timelineLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  timelineLabel: {
    color: "#17385F",
    fontSize: 10,
    fontWeight: "700",
  },
  timelineAddress: {
    color: "#4B647E",
    fontSize: 10,
    marginTop: 2,
  },
  timelineCoordinates: {
    color: "#8193A5",
    fontSize: 8,
    marginTop: 1,
  },
  routeAdditionalDetails: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5EDF5",
    gap: 9,
  },
  routeDescriptionCard: {
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#F5F8FC",
  },
  routeAdditionalLabel: {
    color: "#8293A5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  routeDescription: {
    marginTop: 4,
    color: "#526981",
    fontSize: 12,
    lineHeight: 18,
  },
  routeDetailPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  routeDetailPill: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#DFEAF5",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  routeDetailPillText: {
    color: "#526981",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  assignmentCards: {
    flexDirection: "row",
    gap: 7,
    marginHorizontal: 10,
  },
  assignmentOverviewCard: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6E9FC",
    backgroundColor: "#FFFFFF",
  },
  assignmentOverviewHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  assignmentOverviewLabel: {
    color: "#17385F",
    fontSize: 9,
    fontWeight: "700",
  },
  assignmentOverviewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overviewVehicleImage: {
    width: 38,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#EDF5FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  overviewDriverAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1769D2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  assignmentOverviewText: {
    flex: 1,
    minWidth: 0,
  },
  assignmentOverviewName: {
    color: "#17385F",
    fontSize: 10,
    fontWeight: "700",
  },
  assignmentOverviewSubtitle: {
    color: "#71869C",
    fontSize: 8,
    marginTop: 2,
  },
  assignmentFooterCompact: {
    marginTop: 6,
    marginHorizontal: 10,
  },
  routeStopsSection: {
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E9FC",
    backgroundColor: "#FFFFFF",
  },
  routeStopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5EDF5",
  },
  routeStopBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  routeStopPickup: {
    backgroundColor: "#24A56A",
  },
  routeStopDropoff: {
    backgroundColor: "#E44752",
  },
  routeStopWaypointBadge: {
    backgroundColor: "#1769D2",
  },
  routeStopBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  routeStopInfo: {
    flex: 1,
    minWidth: 0,
  },
  routeStopAddress: {
    color: "#17385F",
    fontSize: 10,
    fontWeight: "600",
  },
  routeStopSubtext: {
    color: "#71869C",
    fontSize: 8,
    marginTop: 2,
  },
  routeStopDistance: {
    color: "#68829D",
    fontSize: 9,
  },
  sectionAction: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#EAF4FF",
  },
  sectionActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1769D2",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  infoItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F5F9FE",
    borderColor: "#E4EFFA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  infoSubValue: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  driverInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  driverAvatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  driverAvatarImage: {
    width: "100%",
    height: "100%",
  },
  driverAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
  },
  driverAvatarFallbackText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  driverInfoText: {
    flex: 1,
    minWidth: 0,
  },
  vehicleInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vehicleImageContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vehicleImageSmall: {
    width: "100%",
    height: "100%",
  },
  vehicleImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E2",
  },
  vehicleInfoText: {
    flex: 1,
    minWidth: 0,
  },
  assignmentFooter: {
    marginTop: 12,
  },
  assignmentButton: {
    backgroundColor: "#1769D2",
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  assignmentButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  assignmentListContainer: {
    paddingVertical: 0,
    gap: 10,
  },
  assignmentCard: {
    width: 128,
    marginRight: 10,
    padding: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  assignmentCardImage: {
    width: "100%",
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentImage: {
    width: "100%",
    height: "100%",
  },
  assignmentCombinedCard: {
    width: 260,
    marginRight: 12,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  assignmentCombinedVehicleImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentCombinedDriverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  assignmentCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
  },
  assignmentCardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  routeActionsOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  routeActionsBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(13, 31, 51, 0.48)",
  },
  routeActionsSheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFFFF",
    maxHeight: "90%",
  },
  routeActionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "#D8E1EA",
  },
  routeActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  routeActionsTitle: {
    color: "#17385F",
    fontSize: 17,
    fontWeight: "700",
  },
  routeActionsSubtitle: {
    color: "#71869C",
    fontSize: 12,
    marginTop: 3,
  },
  routeActionsClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  routeActionItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5EDF5",
  },
  routeActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF5FD",
  },
  routeDeleteAction: {
    borderBottomWidth: 0,
  },
  routeDeleteIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDEEEF",
  },
  routeActionText: {
    flex: 1,
  },
  routeActionTitle: {
    color: "#243B53",
    fontSize: 13,
    fontWeight: "600",
  },
  routeActionDescription: {
    color: "#71869C",
    fontSize: 11,
    marginTop: 3,
  },
  routeActionsCancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
  },
  routeActionsCancelText: {
    color: "#526981",
    fontSize: 13,
    fontWeight: "700",
  },
  routeEditModal: {
    width: "100%",
    maxHeight: "90%",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  routeEditFields: {
    maxHeight: 440,
  },
  routeEditLabel: {
    marginTop: 10,
    marginBottom: 5,
    color: "#526981",
    fontSize: 12,
    fontWeight: "600",
  },
  routeEditInput: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#D8E7F6",
    borderRadius: 9,
    color: "#243B53",
    backgroundColor: "#FAFCFE",
    fontSize: 13,
  },
  routeEditTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeEditTimeInput: {
    flex: 1,
  },
  routeEditTimeSeparator: {
    color: "#71869C",
    fontSize: 12,
  },
  routeEditError: {
    marginTop: 8,
    color: "#C43B46",
    fontSize: 12,
  },
  routeEditSaveButton: {
    backgroundColor: "#1769D2",
  },
  routeEditSaveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteConfirmModal: {
    width: "100%",
    padding: 22,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  deleteConfirmIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDEEEF",
    marginBottom: 12,
  },
  deleteConfirmTitle: {
    color: "#17385F",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  deleteConfirmDescription: {
    marginTop: 7,
    marginBottom: 18,
    color: "#71869C",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  deleteConfirmButton: {
    backgroundColor: "#C43B46",
  },
  deleteConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 10,
  },
  selectionList: {
    borderRadius: 18,
    backgroundColor: "#F5F7FF",
    padding: 12,
    marginBottom: 18,
  },
  modalSelectionScroll: {
    maxHeight: 150,
    borderRadius: 14,
    backgroundColor: "#F5F9FE",
    padding: 8,
    marginBottom: 12,
  },
  selectionItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  selectionItemSelected: {
    borderColor: "#7ED321",
    backgroundColor: "#ECFDF5",
  },
  selectionItemDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.9,
  },
  selectionItemRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleItemText: {
    flex: 1,
    minWidth: 0,
  },
  vehicleItemRight: {
    marginLeft: 12,
    alignItems: "flex-end",
    maxWidth: 120,
  },
  vehicleDriverName: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  selectionItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  selectionItemSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  assignmentErrorText: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalSaveButton: {
    backgroundColor: "#7C3AED",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  timeGrid: {
    gap: 9,
  },
  timeItem: {
    backgroundColor: "#FFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E4EFFA",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#4B83B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  timeIcon: {
    marginRight: 14,
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0EDFA",
    marginBottom: 8,
  },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    overflow: "hidden",
  },
  studentAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  studentSchool: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0EDFA",
    marginBottom: 8,
  },
  stopIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stopInfo: {
    flex: 1,
  },
  stopType: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 3,
    textTransform: "capitalize",
  },
  stopAddress: {
    fontSize: 11,
    color: "#4B5563",
    marginBottom: 4,
    fontWeight: "600",
  },
  stopStudent: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  stopOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1769D2",
    alignItems: "center",
    justifyContent: "center",
  },
  stopOrderText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  locationText: {
    fontSize: 15,
    color: "#111827",
    marginLeft: 12,
    fontWeight: "600",
    lineHeight: 22,
  },
  locationLabel: {
    fontWeight: "800",
    color: "#4A90E2",
  },
  mapPreviewContainer: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapPreview: {
    height: 195,
    width: "100%",
    backgroundColor: "#E5E7EB",
  },
  mapFullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  mapFullScreenButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fullScreenMapContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  mapCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  mapLegend: {
    backgroundColor: "#FFF",
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 16,
    rowGap: 7,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 28,
    backgroundColor: "#F8F9FA",
    borderRadius: 18,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewAllStopsContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  viewAllStopsButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  viewAllStopsButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  viewAllStudentsContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  viewAllStudentsButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  viewAllStudentsButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default RouteDetailsScreen;
