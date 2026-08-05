import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useOwnerPageHeader } from "../../ownerHelpers/hooks/useOwnerPageHeader";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

interface RouteDetails {
  id: string;
  route_name: string;
  driver_id: string;
  vehicle_id: string;
  per_child_amount_cents: number;
  departure_time: string;
  pickup_start_time: string;
  pickup_end_time: string;
  dropoff_start_time: string;
  dropoff_end_time: string;
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
}

const RouteDetailsScreen = () => {
  const router = useRouter();
  const { routeId, vehicleId, returnTo } = useLocalSearchParams<{
    routeId?: string;
    vehicleId?: string;
    returnTo?: string;
  }>();
  const { user } = useContext(AuthContext);
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapFullScreen, setMapFullScreen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);

  const handleBack = () => {
    if (returnTo === "vehicle" && vehicleId) {
      router.push({
        pathname: "/(owner)/manage-vehicle/[id]",
        params: { id: vehicleId },
      });
      return;
    }

    router.back();
  };

  const { renderHeader } = useOwnerPageHeader({
    title: "Route Details",
    onBackPress: handleBack,
  });

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

  const vehiclesOnRoute = new Set(
    (assignmentItems || [])
      .map((a: any) => (a?.vehicle_id ? String(a.vehicle_id) : null))
      .filter(Boolean),
  );

  const selectedVehicle = assignedVehicles.find(
    (v: any) => String(v.id) === String(selectedVehicleId),
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

  const selectedVehicleDriverName =
    selectedVehicle?.drivers?.users?.name ||
    selectedVehicle?.drivers?.name ||
    drivers.find(
      (d: any) => String(d.id) === String(selectedVehicle?.driver_id),
    )?.users?.name ||
    drivers.find(
      (d: any) => String(d.id) === String(selectedVehicle?.driver_id),
    )?.name ||
    "";

  const getVehicleAssignedDriverName = (vehicle: any) => {
    return (
      vehicle?.drivers?.users?.name ||
      vehicle?.drivers?.name ||
      drivers.find((d: any) => String(d.id) === String(vehicle?.driver_id))
        ?.users?.name ||
      drivers.find((d: any) => String(d.id) === String(vehicle?.driver_id))
        ?.name ||
      "Unassigned"
    );
  };

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

  const formatTime = (timeString: string) => {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (cents: number) => {
    return `R${(cents / 100).toFixed(2)}`;
  };

  const getStopCoordinate = (stop: RouteDetails["route_stops"][number]) => {
    if (
      typeof stop?.latitude === "number" &&
      typeof stop?.longitude === "number"
    ) {
      return {
        latitude: stop.latitude,
        longitude: stop.longitude,
      };
    }

    const matchingChild = route?.route_children?.find(
      (routeChild) => routeChild.child_id === stop.child_id,
    );
    const child = matchingChild?.children;

    if (!child) return null;

    if (stop.stop_type === "pickup") {
      if (
        typeof child.pickup_latitude === "number" &&
        typeof child.pickup_longitude === "number"
      ) {
        return {
          latitude: child.pickup_latitude,
          longitude: child.pickup_longitude,
        };
      }
    }

    if (stop.stop_type === "dropoff") {
      if (
        typeof child.dropoff_latitude === "number" &&
        typeof child.dropoff_longitude === "number"
      ) {
        return {
          latitude: child.dropoff_latitude,
          longitude: child.dropoff_longitude,
        };
      }
    }

    return null;
  };

  const getMapMarkers = () => {
    if (!route) return [];

    const markers: Array<{
      coordinate: { latitude: number; longitude: number };
      title: string;
      pinColor: string;
    }> = [];

    if (route.start_latitude && route.start_longitude) {
      markers.push({
        coordinate: {
          latitude: route.start_latitude,
          longitude: route.start_longitude,
        },
        title: "Pickup Start",
        pinColor: "#7ED321",
      });
    }

    if (route.end_latitude && route.end_longitude) {
      markers.push({
        coordinate: {
          latitude: route.end_latitude,
          longitude: route.end_longitude,
        },
        title: "Dropoff End",
        pinColor: "#FF6B6B",
      });
    }

    route.route_stops?.forEach((stop, index) => {
      const coordinate = getStopCoordinate(stop);
      if (!coordinate) return;

      const label = stop.children?.name
        ? `${stop.stop_type === "pickup" ? "Pickup" : "Dropoff"} • ${stop.children.name}`
        : `${stop.stop_type === "pickup" ? "Pickup" : "Dropoff"} Stop ${index + 1}`;

      markers.push({
        coordinate,
        title: label,
        pinColor: stop.stop_type === "pickup" ? "#4A90E2" : "#F5A623",
      });
    });

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

  const renderMapContent = (isFullScreen: boolean = false) => {
    if (!route) return null;
    const region = getRoutePreviewRegion();
    if (!region) return null;

    const mapMarkers = getMapMarkers();

    return (
      <MapView
        style={isFullScreen ? styles.mapFullScreen : styles.mapPreview}
        region={region}
        scrollEnabled={isFullScreen}
        zoomEnabled={isFullScreen}
      >
        {mapMarkers.map((marker, index) => (
          <Marker
            key={`${marker.title}-${index}`}
            coordinate={marker.coordinate}
            title={marker.title}
            pinColor={marker.pinColor}
          />
        ))}
      </MapView>
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
              <Text style={styles.legendText}>Pickup Start</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]}
              />
              <Text style={styles.legendText}>Dropoff End</Text>
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
      <View style={styles.container}>
        {renderHeader()}
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
        {renderHeader()}
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
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <LinearGradient
            colors={["#7C3AED", "#5B21B6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.routeHeaderGradient}
          >
            <View style={styles.routeHeaderTop}>
              <View style={styles.routeIconContainer}>
                <MaterialIcons name="route" size={28} color="#FFF" />
              </View>
              <View style={styles.routeHeaderInfo}>
                <Text style={styles.routeTitle}>
                  {route.route_name || route.vehicles?.name || "Unnamed Route"}
                </Text>
                <Text style={styles.routeSubtitle}>
                  {route.vehicles?.license_plate || "No Plate"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Route Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          {assignmentItems.length > 1 && (
            <Text style={styles.sectionDescription}>
              {assignmentItems.length} Vehicles
            </Text>
          )}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Driver</Text>
              {assignmentItems.length > 0 ? (
                <View style={styles.assignmentCard}>
                  <View style={styles.assignmentCardImage}>
                    {currentDriverAvatar ? (
                      <Image
                        key={String(
                          currentAssignment?.driver_id ||
                            currentAssignment?.id ||
                            currentAssignmentIndex,
                        )}
                        source={{ uri: currentDriverAvatar }}
                        style={styles.assignmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.driverAvatarFallback}>
                        <Text style={styles.driverAvatarFallbackText}>
                          {getInitials(currentDriverName) || "D"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.assignmentCardTitle} numberOfLines={1}>
                    {currentDriverName}
                  </Text>
                </View>
              ) : (
                <View style={styles.driverInfoRow}>
                  <View style={styles.driverAvatarContainer}>
                    {getDriverAvatar() ? (
                      <Image
                        source={{ uri: getDriverAvatar()! }}
                        style={styles.driverAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.driverAvatarFallback}>
                        <Text style={styles.driverAvatarFallbackText}>
                          {getInitials(getDriverName()) || "D"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.driverInfoText}>
                    <Text style={styles.infoValue}>{getDriverName()}</Text>
                    <Text style={styles.infoSubValue} numberOfLines={1}>
                      {getVehicleName()}
                    </Text>
                    {getDriverSubtitle() ? (
                      <Text style={styles.infoSubValue} numberOfLines={1}>
                        {getDriverSubtitle()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              {assignmentItems.length > 0 ? (
                <View style={styles.assignmentCard}>
                  <View style={styles.assignmentCardImage}>
                    {getVehicleImage(currentAssignment) ? (
                      <Image
                        source={{ uri: getVehicleImage(currentAssignment)! }}
                        style={styles.assignmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.vehicleImageFallback}>
                        <MaterialIcons
                          name="directions-bus"
                          size={20}
                          color="#FFF"
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.assignmentCardTitle} numberOfLines={1}>
                    {getVehicleName(currentAssignment)}
                  </Text>
                </View>
              ) : (
                <View style={styles.vehicleInfoRow}>
                  <View style={styles.vehicleImageContainer}>
                    {getVehicleImage() ? (
                      <Image
                        source={{ uri: getVehicleImage()! }}
                        style={styles.vehicleImageSmall}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.vehicleImageFallback}>
                        <MaterialIcons
                          name="directions-bus"
                          size={20}
                          color="#FFF"
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.vehicleInfoText}>
                    <Text style={styles.infoValue}>{getVehicleName()}</Text>
                    {getVehicleSubtitle() ? (
                      <Text style={styles.infoSubValue} numberOfLines={1}>
                        {getVehicleSubtitle()}
                      </Text>
                    ) : null}
                    <Text style={styles.infoSubValue} numberOfLines={1}>
                      {getDriverName()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Route Rate</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(route.per_child_amount_cents)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {formatDate(route.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.assignmentFooter}>
            <TouchableOpacity
              style={styles.assignmentButton}
              onPress={openAssignmentModal}
            >
              <Text style={styles.assignmentButtonText}>
                Assign another driver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Windows */}
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

        {/* Students on Route */}
        {route.route_children?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Students assigned to this route (
              {route.route_children?.length || 0})
            </Text>

            {route.route_children && route.route_children.length > 0 ? (
              route.route_children.slice(0, 3).map((routeChild) => (
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
                      <MaterialIcons name="school" size={24} color="#F5A623" />
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
                  <MaterialIcons name="chevron-right" size={20} color="#CCC" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No students assigned</Text>
              </View>
            )}
            <View style={styles.viewAllStopsContainer}>
              <TouchableOpacity
                style={styles.viewAllStopsButton}
                onPress={() =>
                  router.push({
                    pathname: "/view-all-students",
                    params: { routeId: String(routeId) },
                  })
                }
              >
                <Text style={styles.viewAllStopsButtonText}>
                  View All Students
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Stops */}
        {route.route_stops.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Route Stops ({route.route_stops?.length || 0})
            </Text>

            {route.route_stops && route.route_stops.length > 0 ? (
              route.route_stops
                .sort((a, b) => a.stop_order - b.stop_order)
                .slice(0, 4)
                .map((stop) => (
                  <View key={stop.id} style={styles.stopCard}>
                    <View style={styles.stopIcon}>
                      <MaterialIcons
                        name={
                          stop.stop_type === "pickup"
                            ? "arrow-upward"
                            : "arrow-downward"
                        }
                        size={24}
                        color={
                          stop.stop_type === "pickup" ? "#7ED321" : "#FF6B6B"
                        }
                      />
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopType}>
                        {stop.stop_type === "pickup" ? "Pickup" : "Dropoff"}
                      </Text>
                      <Text style={styles.stopAddress}>{stop.address}</Text>
                      <Text style={styles.stopStudent}>
                        {stop.children?.name || "Unknown student"}
                      </Text>
                    </View>
                    <View style={styles.stopOrder}>
                      <Text style={styles.stopOrderText}>
                        {stop.stop_order}
                      </Text>
                    </View>
                  </View>
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No stops defined</Text>
              </View>
            )}
            <View style={styles.viewAllStopsContainer}>
              <TouchableOpacity
                style={styles.viewAllStopsButton}
                onPress={() =>
                  router.push({
                    pathname: "/view-all-stops",
                    params: {
                      routeId: String(routeId),
                    },
                  })
                }
              >
                <Text style={styles.viewAllStopsButtonText}>
                  View All Stops
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Locations */}
        {(route.start_location || route.end_location) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Overview</Text>
            {route.route_stops && route.route_stops.length === 0 && (
              <Text style={styles.sectionDescription}>
                Route stops will be displayed here
              </Text>
            )}

            {renderRouteMapPreview()}

            {route.start_location && (
              <View style={styles.locationItem}>
                <MaterialIcons name="play-arrow" size={20} color="#7ED321" />
                <Text style={styles.locationText}>
                  <Text style={styles.locationLabel}>Start: </Text>
                  {route.start_location}
                </Text>
              </View>
            )}

            {route.end_location && (
              <View style={styles.locationItem}>
                <MaterialIcons name="stop" size={20} color="#FF6B6B" />
                <Text style={styles.locationText}>
                  <Text style={styles.locationLabel}>End: </Text>
                  {route.end_location}
                </Text>
              </View>
            )}
          </View>
        )}

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
                Select a driver and vehicle to add to this route.
              </Text>

              <Text style={styles.modalDescription}>
                Vehicles shown are already assigned to drivers. Choose a vehicle
                to auto-populate its driver.
              </Text>

              {selectedVehicleId ? (
                <View style={[styles.selectionList, { marginBottom: 12 }]}>
                  <Text style={styles.selectionItemTitle}>Driver</Text>
                  <Text style={styles.selectionItemSubtitle}>
                    {selectedVehicleDriverName || "Unassigned"}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Vehicle</Text>
              <View style={styles.selectionList}>
                {assignedVehicles.length > 0 ? (
                  assignedVehicles.map((vehicleItem) => {
                    const isOnRoute = vehiclesOnRoute.has(
                      String(vehicleItem.id),
                    );
                    return (
                      <TouchableOpacity
                        key={vehicleItem.id}
                        style={[
                          styles.selectionItem,
                          styles.selectionItemRow,
                          selectedVehicleId === vehicleItem.id &&
                            styles.selectionItemSelected,
                          isOnRoute && styles.selectionItemDisabled,
                        ]}
                        onPress={() => {
                          if (isOnRoute) return;
                          setSelectedVehicleId(vehicleItem.id);
                          const drvId =
                            vehicleItem.driver_id ||
                            vehicleItem.drivers?.id ||
                            null;
                          setSelectedDriverId(drvId);
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
                            <Text
                              style={styles.vehicleDriverName}
                              numberOfLines={1}
                            >
                              {getVehicleAssignedDriverName(vehicleItem)}
                            </Text>
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
                    No assigned vehicles available.
                  </Text>
                )}
              </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 22,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 9,
  },
  routeHeaderGradient: {
    padding: 24,
    gap: 20,
  },
  routeHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  routeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  routeHeaderInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 6,
  },
  routeSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "500",
    lineHeight: 22,
  },
  routeHeaderStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  routeHeaderStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 16,
  },
  routeHeaderStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
    fontWeight: "700",
  },
  routeHeaderStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
  section: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 18,
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
    gap: 14,
  },
  infoItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F5F7FF",
    borderRadius: 16,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  assignmentButton: {
    backgroundColor: "#7ED321",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  assignmentButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
    backgroundColor: "#7ED321",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  timeGrid: {
    gap: 14,
  },
  timeItem: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
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
    padding: 18,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  studentAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  studentSchool: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  stopIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  stopInfo: {
    flex: 1,
  },
  stopType: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  stopAddress: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4,
    fontWeight: "600",
  },
  stopStudent: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  stopOrder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7ED321",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7ED321",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
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
    marginBottom: 18,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mapPreview: {
    height: 280,
    width: "100%",
    backgroundColor: "#E5E7EB",
  },
  mapFullScreen: {
    flex: 1,
    width: "100%",
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
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
    backgroundColor: "#4A90E2",
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
    backgroundColor: "#4A90E2",
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
