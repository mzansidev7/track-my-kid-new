import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useState, useRef } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { AuthContext } from "../../context/authContext/auth-context";
import GooglePlacesAutoComplete from "../../components/GooglePlacesAutoComplete";
import TimePicker from "../../components/TimePicker";
import Map from "../../components/map";
import AppNotification from "../../components/Notification";
import { resolveWorkingBaseUrl } from "../../url";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TimeScope } from "../../store/asyncStorage/timePreferences.asyncStore";

type RouteLocation = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
    2,
    "0",
  );
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  return `${formatLocalDate(date)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${offsetSign}${offsetHours}:${offsetRemainder}`;
};

const clockMinutes = (time: string) => {
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const CreateRoutes = ({ setActiveButton }: any) => {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const routePage = () => router.push("/routes");
  const [routeName, setRouteName] = useState("");
  const [description, setDescription] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [routeEstimate, setRouteEstimate] = useState<{
    distanceKm: number;
    durationMinutes: number;
    signature: string;
  } | null>(null);
  const [routeEstimateError, setRouteEstimateError] = useState<{
    signature: string;
    message: string;
  } | null>(null);
  const [perChildAmount, setPerChildAmount] = useState("200");
  const [timeReference, setTimeReference] = useState<TimeScope>("year");
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [showDepartureDatePicker, setShowDepartureDatePicker] = useState(false);
  const [departureTime, setDepartureTime] = useState("");
  const [pickupStartTime, setPickupStartTime] = useState("");
  const [pickupEndTime, setPickupEndTime] = useState("");
  const [dropoffStartTime, setDropoffStartTime] = useState("");
  const [dropoffEndTime, setDropoffEndTime] = useState("");
  const [routeType, setRouteType] = useState<
    "one_way" | "round_trip" | "multi_stop"
  >("one_way");
  const [routeStatus, setRouteStatus] = useState<"active" | "inactive">(
    "active",
  );
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  // vehicles list not stored in this component (fetched when needed)
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  // Location state for pickup (start) and dropoff (end)
  const [pickupLocation, setPickupLocation] = useState<RouteLocation>({
    latitude: null,
    longitude: null,
    name: "",
    address: "",
  });
  const [dropoffLocation, setDropoffLocation] = useState<RouteLocation>({
    latitude: null,
    longitude: null,
    name: "",
    address: "",
  });
  const [viaStops, setViaStops] = useState<RouteLocation[]>([]);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  // snapPoints removed (no bottom sheet) — kept for potential future use
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const steps = [
    { title: "Details", icon: "alt-route" as const },
    { title: "Stops", icon: "place" as const },
    { title: "Schedule", icon: "schedule" as const },
    { title: "Settings", icon: "tune" as const },
  ];
  const routeCoordinates = [
    pickupLocation,
    ...viaStops,
    dropoffLocation,
  ].filter(
    (
      location,
    ): location is RouteLocation & { latitude: number; longitude: number } =>
      location.latitude !== null && location.longitude !== null,
  );
  const routeCoordinateSignature = routeCoordinates
    .map(({ latitude, longitude }) => `${latitude},${longitude}`)
    .join("|");
  const hasCompleteEndpoints =
    pickupLocation.latitude !== null &&
    pickupLocation.longitude !== null &&
    dropoffLocation.latitude !== null &&
    dropoffLocation.longitude !== null;
  const routeOrigin = React.useMemo(
    () =>
      pickupLocation.latitude !== null &&
      pickupLocation.longitude !== null
        ? {
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
          }
        : null,
    [pickupLocation.latitude, pickupLocation.longitude],
  );
  const routeDestination = React.useMemo(
    () =>
      dropoffLocation.latitude !== null &&
      dropoffLocation.longitude !== null
        ? {
            latitude: dropoffLocation.latitude,
            longitude: dropoffLocation.longitude,
          }
        : null,
    [dropoffLocation.latitude, dropoffLocation.longitude],
  );
  const routeWaypoints = React.useMemo(
    () =>
      viaStops
        .filter(
          (stop) => stop.latitude !== null && stop.longitude !== null,
        )
        .map((stop) => ({
          latitude: stop.latitude!,
          longitude: stop.longitude!,
        })),
    [viaStops],
  );
  const handleRouteReady = React.useCallback(
    (estimate: { distanceKm: number; durationMinutes: number }) => {
      if (
        Number.isFinite(estimate.distanceKm) &&
        estimate.distanceKm > 0 &&
        Number.isFinite(estimate.durationMinutes) &&
        estimate.durationMinutes > 0
      ) {
        setRouteEstimateError(null);
        setRouteEstimate({ ...estimate, signature: routeCoordinateSignature });
      }
    },
    [routeCoordinateSignature],
  );
  const handleRouteError = React.useCallback(
    (message: string) => {
      setRouteEstimate(null);
      setRouteEstimateError({
        signature: routeCoordinateSignature,
        message:
          message ||
          "Route estimate could not be calculated. Check the selected stops.",
      });
    },
    [routeCoordinateSignature],
  );
  const currentRouteEstimateError =
    routeEstimateError?.signature === routeCoordinateSignature
      ? routeEstimateError.message
      : null;
  const currentRouteEstimate =
    routeEstimate?.signature === routeCoordinateSignature
      ? routeEstimate
      : null;
  const formattedEstimateDuration = currentRouteEstimate
    ? (() => {
        const minutes = Math.round(currentRouteEstimate.durationMinutes);
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return hours > 0
          ? `${hours} hr ${remainder} min`
          : `${remainder} min`;
      })()
    : null;

  const validateAndAdvance = () => {
    if (currentStep === 0 && !routeName.trim()) {
      setNotification({
        visible: true,
        message: "Please enter a route name before continuing.",
        type: "error",
      });
      return;
    }
    if (
      currentStep === 1 &&
      (!hasCompleteEndpoints ||
        routeCoordinates.length !== viaStops.length + 2)
    ) {
      setNotification({
        visible: true,
        message: "Select valid start, via, and end stops to continue.",
        type: "error",
      });
      return;
    }
    if (currentStep === 1 && !currentRouteEstimate) {
      setNotification({
        visible: true,
        message:
          currentRouteEstimateError ||
          "Wait for the route distance and duration to be calculated.",
        type: "error",
      });
      return;
    }
    if (
      currentStep === 2 &&
      (!departureDate ||
        clockMinutes(departureTime) === null ||
        clockMinutes(pickupStartTime) === null ||
        clockMinutes(pickupEndTime) === null ||
        clockMinutes(dropoffStartTime) === null ||
        clockMinutes(dropoffEndTime) === null)
    ) {
      setNotification({
        visible: true,
        message: "Complete the departure date and all schedule times.",
        type: "error",
      });
      return;
    }
    if (currentStep === 2) {
      const departureMinutes = clockMinutes(departureTime)!;
      const pickupStartMinutes = clockMinutes(pickupStartTime)!;
      const pickupEndMinutes = clockMinutes(pickupEndTime)!;
      const dropoffStartMinutes = clockMinutes(dropoffStartTime)!;
      const dropoffEndMinutes = clockMinutes(dropoffEndTime)!;
      if (
        departureMinutes >= pickupStartMinutes ||
        pickupStartMinutes >= pickupEndMinutes ||
        pickupEndMinutes > dropoffStartMinutes ||
        dropoffStartMinutes >= dropoffEndMinutes
      ) {
        setNotification({
          visible: true,
          message:
            "Set valid times in order: departure, pickup window, then drop-off window.",
          type: "error",
        });
        return;
      }
    }
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.fieldLabel}>
              Route Name <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={styles.routeTextInput}
              placeholder="e.g. Pretoria → Johannesburg"
              placeholderTextColor="#89A2BF"
              value={routeName}
              onChangeText={setRouteName}
              maxLength={80}
            />
            <Text style={styles.fieldLabel}>
              Description <Text style={styles.optionalText}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.routeTextInput, styles.descriptionInput]}
              placeholder="Add a short description of this route..."
              placeholderTextColor="#89A2BF"
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              multiline
              textAlignVertical="top"
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.fieldLabel}>
              Start Location <Text style={styles.requiredMark}>*</Text>
            </Text>
            <View style={styles.locationEntryRow}>
              <View style={styles.locationRail}>
                <View style={styles.startLocationDot} />
                <View style={styles.locationRailLine} />
              </View>
              <View style={styles.routePlaceField}>
                <GooglePlacesAutoComplete
                  compact
                  value={pickupLocation.name}
                  placeholder="Search or select start location"
                  onChangeText={(name) =>
                    setPickupLocation((current) => ({
                      ...current,
                      name,
                      latitude: name === current.name ? current.latitude : null,
                      longitude:
                        name === current.name ? current.longitude : null,
                    }))
                  }
                  onSelect={(name, coords, details) =>
                    setPickupLocation({
                      name,
                      address: details?.address || name,
                      latitude: coords?.latitude ?? null,
                      longitude: coords?.longitude ?? null,
                    })
                  }
                />
              </View>
              <TouchableOpacity
                style={styles.mapLocationButton}
                onPress={() => {
                  setPickupConfirmed(false);
                  setShowMapPicker(true);
                }}
                accessibilityLabel="Choose start and end locations on map"
              >
                <MaterialIcons name="my-location" size={15} color="#1769D2" />
              </TouchableOpacity>
            </View>

            <View style={styles.viaHeading}>
              <Text style={styles.fieldLabel}>
                Via Stops <Text style={styles.optionalText}>(optional)</Text>
              </Text>
              <TouchableOpacity
                style={styles.addStopButton}
                onPress={() =>
                  setViaStops((current) => [
                    ...current,
                    {
                      name: "",
                      address: "",
                      latitude: null,
                      longitude: null,
                    },
                  ])
                }
                disabled={viaStops.length >= 20}
              >
                <MaterialIcons name="add" size={15} color="#1769D2" />
                <Text style={styles.addStopText}>Add Stop</Text>
              </TouchableOpacity>
            </View>
            {viaStops.map((stop, index) => (
              <View key={`via-stop-${index}`} style={styles.viaStopRow}>
                <View style={styles.viaStopIcon}>
                  <MaterialIcons name="place" size={14} color="#1769D2" />
                </View>
                <View style={styles.routePlaceField}>
                  <GooglePlacesAutoComplete
                    compact
                    value={stop.name}
                    placeholder="Add intermediate stop..."
                    onChangeText={(name) =>
                      setViaStops((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                name,
                                address: name === item.name ? item.address : "",
                                latitude:
                                  name === item.name ? item.latitude : null,
                                longitude:
                                  name === item.name ? item.longitude : null,
                              }
                            : item,
                        ),
                      )
                    }
                    onSelect={(name, coords, details) =>
                      setViaStops((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                name,
                                address: details?.address || name,
                                latitude: coords?.latitude ?? null,
                                longitude: coords?.longitude ?? null,
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeStopButton}
                  onPress={() =>
                    setViaStops((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  accessibilityLabel={`Remove via stop ${index + 1}`}
                >
                  <MaterialIcons name="close" size={15} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.fieldLabel, styles.endLocationLabel]}>
              End Location <Text style={styles.requiredMark}>*</Text>
            </Text>
            <View style={styles.locationEntryRow}>
              <View style={styles.locationRail}>
                <View style={styles.endLocationDot} />
              </View>
              <View style={styles.routePlaceField}>
                <GooglePlacesAutoComplete
                  compact
                  value={dropoffLocation.name}
                  placeholder="Search or select end location"
                  onChangeText={(name) =>
                    setDropoffLocation((current) => ({
                      ...current,
                      name,
                      latitude: name === current.name ? current.latitude : null,
                      longitude:
                        name === current.name ? current.longitude : null,
                    }))
                  }
                  onSelect={(name, coords, details) =>
                    setDropoffLocation({
                      name,
                      address: details?.address || name,
                      latitude: coords?.latitude ?? null,
                      longitude: coords?.longitude ?? null,
                    })
                  }
                />
              </View>
              <TouchableOpacity
                style={styles.mapLocationButton}
                onPress={() => {
                  setPickupConfirmed(false);
                  setShowMapPicker(true);
                }}
                accessibilityLabel="Choose route locations on map"
              >
                <MaterialIcons name="my-location" size={15} color="#1769D2" />
              </TouchableOpacity>
            </View>
          </>
        );
      case 5:
        return (
          <>
            <TouchableOpacity
              style={styles.assignmentSelectButton}
              onPress={() => setShowDriverPicker(true)}
              activeOpacity={0.8}
            >
              <Text
                style={
                  selectedDrivers.length > 0
                    ? styles.assignmentSelectText
                    : styles.assignmentSelectPlaceholder
                }
              >
                {selectedDrivers.length > 0
                  ? `${selectedDrivers.length} vehicle${selectedDrivers.length === 1 ? "" : "s"} selected`
                  : "Select vehicle (required)"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color="#71869C"
              />
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const fetchDrivers = React.useCallback(async () => {
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
      } else {
        setNotification({
          visible: true,
          message: data.error || "Unable to load drivers.",
          type: "error",
        });
      }
    } catch (err) {
      console.warn("Error fetching drivers:", err);
      setNotification({
        visible: true,
        message: "Network error while loading drivers.",
        type: "error",
      });
    }
  }, [user?.token]);

  const fetchVehicles = React.useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
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
        // vehicles stored elsewhere; no-op here
      } else {
        setNotification({
          visible: true,
          message: data.error || "Unable to load vehicles.",
          type: "error",
        });
      }
    } catch (err) {
      console.warn("Error fetching vehicles:", err);
      setNotification({
        visible: true,
        message: "Network error while loading vehicles.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) {
      fetchDrivers();
      fetchVehicles();
    }
  }, [user?.token, fetchDrivers, fetchVehicles]);

  const [pickupConfirmed, setPickupConfirmed] = useState(false);

  // Animated sheet value (0 = hidden, 1 = visible)
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: showMapPicker ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showMapPicker, sheetAnim]);

  const isDriverActive = (driver: any) =>
    String(driver?.status || "active").toLowerCase() === "active";

  const getAssignedVehicle = (driver: any) => {
    if (!driver) return null;
    const assigned = Array.isArray(driver.vehicles)
      ? driver.vehicles
      : driver.vehicles
        ? [driver.vehicles]
        : driver.vehicle
          ? [driver.vehicle]
          : [];
    const vehicle = assigned.length > 0 ? assigned[0] : driver.vehicle || null;
    if (!vehicle) return null;
    return {
      ...vehicle,
      id: vehicle.id || vehicle.vehicle_id || vehicle.vehicleId || null,
    };
  };

  const activeDrivers = drivers.filter(isDriverActive);
  const assignedDrivers = activeDrivers.filter((d) => !!getAssignedVehicle(d));

  const handleCreateRoute = async () => {
    const parsedChildAmount = Number(perChildAmount);
    if (!routeName.trim()) {
      setNotification({
        visible: true,
        message: "Please enter a route name.",
        type: "error",
      });
      return;
    }

    const departureMinutes = clockMinutes(departureTime);
    const pickupStartMinutes = clockMinutes(pickupStartTime);
    const pickupEndMinutes = clockMinutes(pickupEndTime);
    const dropoffStartMinutes = clockMinutes(dropoffStartTime);
    const dropoffEndMinutes = clockMinutes(dropoffEndTime);
    if (
      !departureDate ||
      departureMinutes === null ||
      pickupStartMinutes === null ||
      pickupEndMinutes === null ||
      dropoffStartMinutes === null ||
      dropoffEndMinutes === null
    ) {
      setNotification({
        visible: true,
        message: "Select a departure date and all route schedule times.",
        type: "error",
      });
      return;
    }

    if (
      departureMinutes >= pickupStartMinutes ||
      pickupStartMinutes >= pickupEndMinutes ||
      pickupEndMinutes > dropoffStartMinutes ||
      dropoffStartMinutes >= dropoffEndMinutes
    ) {
      setNotification({
        visible: true,
        message:
          "Set valid times in order: departure, pickup window, then drop-off window.",
        type: "error",
      });
      return;
    }

    if (!currentRouteEstimate) {
      setNotification({
        visible: true,
        message:
          currentRouteEstimateError ||
          "Wait for the route distance and duration to be calculated.",
        type: "error",
      });
      return;
    }

    if (
      perChildAmount.trim() === "" ||
      !Number.isFinite(parsedChildAmount) ||
      parsedChildAmount < 0
    ) {
      setNotification({
        visible: true,
        message: "Enter a valid non-negative price per child.",
        type: "error",
      });
      return;
    }

    const assignmentPayload = selectedDrivers.map((driverId) => {
      const driver = activeDrivers.find((d) => String(d.id) === driverId);
      const assignedVehicle = getAssignedVehicle(driver);
      return {
        driver_id: driverId,
        vehicle_id: assignedVehicle?.id || assignedVehicle?.vehicle_id,
      };
    });

    if (assignmentPayload.length === 0) {
      setNotification({
        visible: true,
        message: "Please assign at least one vehicle to this route.",
        type: "error",
      });
      return;
    }

    if (assignmentPayload.some((assignment) => !assignment.vehicle_id)) {
      setNotification({
        visible: true,
        message:
          "All selected drivers must have an assigned vehicle before creating the route.",
        type: "error",
      });
      return;
    }

    if (description.trim().length > 1000) {
      setNotification({
        visible: true,
        message: "Description must be 1000 characters or fewer.",
        type: "error",
      });
      return;
    }

    if (
      pickupLocation.latitude === null ||
      pickupLocation.longitude === null ||
      !pickupLocation.address.trim()
    ) {
      setNotification({
        visible: true,
        message: "Please select a valid start location from the suggestions.",
        type: "error",
      });
      return;
    }

    if (
      dropoffLocation.latitude === null ||
      dropoffLocation.longitude === null ||
      !dropoffLocation.address.trim()
    ) {
      setNotification({
        visible: true,
        message: "Please select a valid end location from the suggestions.",
        type: "error",
      });
      return;
    }

    const submittedViaStops = viaStops.filter(
      (stop) =>
        stop.name.trim() ||
        stop.address.trim() ||
        stop.latitude !== null ||
        stop.longitude !== null,
    );
    if (
      submittedViaStops.some(
        (stop) =>
          !stop.name.trim() ||
          !stop.address.trim() ||
          stop.latitude === null ||
          stop.longitude === null,
      )
    ) {
      setNotification({
        visible: true,
        message: "Choose a location for each via stop or remove the empty row.",
        type: "error",
      });
      return;
    }

    if (!user?.token) {
      setNotification({
        visible: true,
        message: "Authentication is required.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const requestBody: Record<string, any> = {
        route_name: routeName.trim(),
        description: description.trim() || null,
        estimated_distance_km: currentRouteEstimate?.distanceKm ?? null,
        estimated_duration: formattedEstimateDuration,
        departure_time: formatLocalDateTime(departureDate, departureTime),
        pickup_start_time: pickupStartTime,
        pickup_end_time: pickupEndTime,
        dropoff_start_time: dropoffStartTime,
        dropoff_end_time: dropoffEndTime,
        per_child_amount_cents: Math.round(parsedChildAmount * 100),
        time_reference: timeReference,
        route_type: routeType,
        status: routeStatus,
        assignments: assignmentPayload,
        start_latitude: pickupLocation.latitude,
        start_longitude: pickupLocation.longitude,
        start_location: pickupLocation.address,
        end_latitude: dropoffLocation.latitude,
        end_longitude: dropoffLocation.longitude,
        end_location: dropoffLocation.address,
        via_stops: submittedViaStops,
      };
      const baseUrl = await resolveWorkingBaseUrl();

      console.log("[createRoutes] creating route", {
        routeType,
        assignmentCount: assignmentPayload.length,
        viaStopCount: submittedViaStops.length,
      });
      const response = await fetch(`${baseUrl}/owner/routes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      console.log("[createRoutes] create route response", {
        status: response.status,
        succeeded: response.ok,
      });

      if (!response.ok) {
        setNotification({
          visible: true,
          message: data.error || data.message || "Failed to create route.",
          type: "error",
        });
        setSubmitting(false);
        // Stop here on server error
        return;
      }

      const stopsCount = submittedViaStops.length;
      setNotification({
        visible: true,
        message:
          stopsCount > 0
            ? `Route created successfully with ${stopsCount} via stop${stopsCount === 1 ? "" : "s"}.`
            : "Route created successfully.",
        type: "success",
      });

      setRouteName("");
      setDescription("");
      setCurrentStep(0);
      setRouteEstimate(null);
      setRouteEstimateError(null);
      setDepartureDate(null);
      setDepartureTime("");
      setPickupStartTime("");
      setPickupEndTime("");
      setDropoffStartTime("");
      setDropoffEndTime("");
      setPerChildAmount("200");
      setTimeReference("year");
      setRouteType("one_way");
      setRouteStatus("active");
      setSelectedDrivers([]);
      setViaStops([]);
      setPickupLocation({
        latitude: null,
        longitude: null,
        name: "",
        address: "",
      });
      setDropoffLocation({
        latitude: null,
        longitude: null,
        name: "",
        address: "",
      });
      setSubmitting(false);

      console.log("[createRoutes] navigation to /routes");
      router.push("/routes");
    } catch (err: any) {
      setNotification({
        visible: true,
        message: err.message || "Unable to create route.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.pageHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={routePage}
            accessibilityLabel="Back to route management"
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Route</Text>
          <View style={styles.headerStepBadge}>
            <Text style={styles.headerStepText}>
              {currentStep + 1}/{steps.length}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <>
          <View style={styles.stepperCard}>
            {steps.map((step, index) => {
              const complete = index < currentStep;
              const active = index === currentStep;
              return (
                <React.Fragment key={step.title}>
                  <TouchableOpacity
                    style={styles.stepItem}
                    onPress={() => {
                      if (index < currentStep) setCurrentStep(index);
                    }}
                    disabled={index >= currentStep}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        active && styles.stepCircleActive,
                        complete && styles.stepCircleComplete,
                      ]}
                    >
                      <MaterialIcons
                        name={complete ? "check" : step.icon}
                        size={16}
                        color={active || complete ? "#FFFFFF" : "#8293A8"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        active && styles.stepLabelActive,
                        complete && styles.stepLabelComplete,
                      ]}
                    >
                      {step.title}
                    </Text>
                  </TouchableOpacity>
                  {index < steps.length - 1 ? (
                    <View
                      style={[
                        styles.stepConnector,
                        complete && styles.stepConnectorComplete,
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCanvas}>
              {currentStep === 0 ? (
                <View style={styles.formSection}>
                  <View style={styles.formSectionHeading}>
                    <View style={styles.formSectionIcon}>
                      <MaterialIcons
                        name="alt-route"
                        size={20}
                        color="#1769D2"
                      />
                    </View>
                    <View>
                      <Text style={styles.formSectionTitle}>
                        Route Information
                      </Text>
                      <Text style={styles.sectionHint}>
                        Give this route a name and description.
                      </Text>
                    </View>
                  </View>
                  {renderStepContent(1)}
                </View>
              ) : null}

              {currentStep === 1 ? (
                <View style={styles.formSection}>
                  <View style={styles.formSectionHeading}>
                    <View style={styles.formSectionIcon}>
                      <MaterialIcons name="place" size={20} color="#1769D2" />
                    </View>
                    <View>
                      <Text style={styles.formSectionTitle}>Route Stops</Text>
                      <Text style={styles.sectionHint}>
                        Add the start, optional stops, and destination.
                      </Text>
                    </View>
                  </View>
                  {renderStepContent(4)}
                  {hasCompleteEndpoints &&
                  routeCoordinates.length === viaStops.length + 2 ? (
                    <>
                      <Map
                        style={styles.routePreviewMap}
                        requestLocationPermission={false}
                        origin={routeOrigin}
                        destination={routeDestination}
                        waypoints={routeWaypoints}
                        onRouteReady={handleRouteReady}
                        onRouteError={handleRouteError}
                      />
                      <View style={styles.estimateCard}>
                        <View style={styles.estimateItem}>
                          <MaterialIcons
                            name="near-me"
                            size={17}
                            color="#1769D2"
                          />
                          <View>
                            <Text style={styles.estimateLabel}>
                              Estimated distance
                            </Text>
                            <Text style={styles.estimateValue}>
                              {currentRouteEstimate
                                ? `${currentRouteEstimate.distanceKm.toFixed(1)} km`
                                : "Calculating…"}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.estimateDivider} />
                        <View style={styles.estimateItem}>
                          <MaterialIcons
                            name="schedule"
                            size={17}
                            color="#1769D2"
                          />
                          <View>
                            <Text style={styles.estimateLabel}>
                              Estimated duration
                            </Text>
                            <Text style={styles.estimateValue}>
                              {formattedEstimateDuration ||
                                "Calculating…"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {currentRouteEstimateError ? (
                        <View style={styles.estimatePlaceholder}>
                          <MaterialIcons
                            name="error-outline"
                            size={17}
                            color="#B54745"
                          />
                          <Text style={styles.estimateErrorText}>
                            {currentRouteEstimateError}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.estimatePlaceholder}>
                      <MaterialIcons
                        name="info-outline"
                        size={17}
                        color="#72849A"
                      />
                      <Text style={styles.estimatePlaceholderText}>
                        Select all route stops to calculate distance and travel
                        time.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {currentStep === 2 ? (
                <View style={styles.formSection}>
                  <View style={styles.formSectionHeading}>
                    <View style={styles.formSectionIcon}>
                      <MaterialIcons
                        name="schedule"
                        size={20}
                        color="#1769D2"
                      />
                    </View>
                    <View>
                      <Text style={styles.formSectionTitle}>Route Schedule</Text>
                      <Text style={styles.sectionHint}>
                        Set the date and time windows for this route.
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>
                    Departure Date <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.scheduleDateButton}
                    onPress={() => setShowDepartureDatePicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select departure date"
                  >
                    <Text
                      style={[
                        styles.scheduleDateText,
                        !departureDate && styles.scheduleDatePlaceholder,
                      ]}
                    >
                      {departureDate
                        ? departureDate.toLocaleDateString()
                        : "Select departure date"}
                    </Text>
                    <MaterialIcons
                      name="calendar-today"
                      size={18}
                      color="#1769D2"
                    />
                  </TouchableOpacity>
                  {showDepartureDatePicker && (
                    <DateTimePicker
                      value={departureDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDepartureDatePicker(false);
                        if (event.type === "set" && selectedDate) {
                          setDepartureDate(selectedDate);
                        }
                      }}
                    />
                  )}
                  <View style={styles.scheduleTimesColumn}>
                    <Text style={styles.fieldLabel}>
                      Departure Time <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <TimePicker
                      compact
                      value={departureTime}
                      placeholder="Select departure time"
                      onChangeTime={setDepartureTime}
                    />
                  </View>
                  <View style={styles.scheduleTimeRow}>
                    <View style={styles.scheduleTimeField}>
                      <Text style={styles.fieldLabel}>
                        Pickup Starts <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <TimePicker
                        compact
                        value={pickupStartTime}
                        placeholder="Select time"
                        onChangeTime={setPickupStartTime}
                      />
                    </View>
                    <View style={styles.scheduleTimeField}>
                      <Text style={styles.fieldLabel}>
                        Pickup Ends <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <TimePicker
                        compact
                        value={pickupEndTime}
                        placeholder="Select time"
                        onChangeTime={setPickupEndTime}
                      />
                    </View>
                  </View>
                  <View style={styles.scheduleTimeRow}>
                    <View style={styles.scheduleTimeField}>
                      <Text style={styles.fieldLabel}>
                        Drop-off Starts{" "}
                        <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <TimePicker
                        compact
                        value={dropoffStartTime}
                        placeholder="Select time"
                        onChangeTime={setDropoffStartTime}
                      />
                    </View>
                    <View style={styles.scheduleTimeField}>
                      <Text style={styles.fieldLabel}>
                        Drop-off Ends{" "}
                        <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <TimePicker
                        compact
                        value={dropoffEndTime}
                        placeholder="Select time"
                        onChangeTime={setDropoffEndTime}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {currentStep === 3 ? (
                <View style={styles.formSection}>
                  <View style={styles.formSectionHeading}>
                    <View style={styles.formSectionIcon}>
                      <MaterialIcons name="tune" size={20} color="#1769D2" />
                    </View>
                    <View>
                      <Text style={styles.formSectionTitle}>Route Settings</Text>
                      <Text style={styles.sectionHint}>
                        Assign a vehicle and set the route fare.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.finalEstimateCard}>
                    <View style={styles.finalEstimateMetric}>
                      <Text style={styles.estimateLabel}>Distance</Text>
                      <Text style={styles.estimateValue}>
                        {currentRouteEstimate
                          ? `${currentRouteEstimate.distanceKm.toFixed(1)} km`
                          : "Not calculated"}
                      </Text>
                    </View>
                    <View style={styles.finalEstimateMetric}>
                      <Text style={styles.estimateLabel}>Duration</Text>
                      <Text style={styles.estimateValue}>
                        {formattedEstimateDuration || "Not calculated"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>
                    Per Child Amount (R){" "}
                    <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.routeTextInput}
                    value={perChildAmount}
                    onChangeText={setPerChildAmount}
                    placeholder="e.g. 200"
                    placeholderTextColor="#89A2BF"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.fieldLabel}>Time Reference</Text>
                  <View style={styles.timeReferenceRow}>
                    {(["today", "week", "month", "year"] as const).map(
                      (reference) => (
                        <TouchableOpacity
                          key={reference}
                          style={[
                            styles.timeReferenceOption,
                            timeReference === reference &&
                              styles.timeReferenceOptionSelected,
                          ]}
                          onPress={() => setTimeReference(reference)}
                        >
                          <Text
                            style={[
                              styles.timeReferenceText,
                              timeReference === reference &&
                                styles.timeReferenceTextSelected,
                            ]}
                          >
                            {reference.charAt(0).toUpperCase() +
                              reference.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  <Text style={styles.fieldLabel}>
                    Vehicle Assignment{" "}
                    <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  {renderStepContent(5)}

                  <Text style={styles.fieldLabel}>Route Type</Text>
                  <View style={styles.routeTypeRow}>
                    {(
                      [
                        ["one_way", "One Way"],
                        ["round_trip", "Round Trip"],
                        ["multi_stop", "Multi Stop"],
                      ] as const
                    ).map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.routeTypeOption,
                          routeType === value && styles.routeTypeOptionSelected,
                        ]}
                        onPress={() => setRouteType(value)}
                      >
                        <Text
                          style={[
                            styles.routeTypeText,
                            routeType === value && styles.routeTypeTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Status</Text>
                  <TouchableOpacity
                    style={styles.statusSelector}
                    onPress={() =>
                      setRouteStatus((current) =>
                        current === "active" ? "inactive" : "active",
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Route status ${routeStatus}; tap to change`}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        routeStatus === "inactive" &&
                          styles.statusDotInactive,
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {routeStatus === "active" ? "Active" : "Inactive"}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={17}
                      color="#71869C"
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.formActions}>
            {currentStep === 0 ? (
              <TouchableOpacity
                style={styles.cancelRouteButton}
                onPress={routePage}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelRouteButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.previousButton}
                onPress={() => setCurrentStep((step) => Math.max(step - 1, 0))}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={17}
                  color="#23476D"
                />
                <Text style={styles.previousButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            {currentStep < steps.length - 1 ? (
              <TouchableOpacity
                style={styles.saveRouteButton}
                onPress={validateAndAdvance}
                activeOpacity={0.85}
              >
                <Text style={styles.saveRouteButtonText}>Continue</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={17}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.saveRouteButton}
                onPress={handleCreateRoute}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={17} color="#FFFFFF" />
                    <Text style={styles.saveRouteButtonText}>Save Route</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Modal
            visible={showDriverPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDriverPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Vehicle and Driver</Text>
                <ScrollView style={styles.optionsList}>
                  {assignedDrivers.length > 0 ? (
                    <>
                      <View style={styles.sectionDivider}>
                        <Text style={styles.sectionDividerText}>
                          Available driver-vehicle assignments
                        </Text>
                      </View>
                      {assignedDrivers.map((driver: any) => {
                        const assignedVehicle = getAssignedVehicle(driver);
                        const driverId = String(driver.id);
                        const selected = selectedDrivers.includes(driverId);
                        return (
                          <TouchableOpacity
                            key={driver.id}
                            style={[
                              styles.driverOption,
                              selected && styles.driverOptionSelected,
                            ]}
                            onPress={() => {
                              const driverId = String(driver.id);
                              setSelectedDrivers((current) => {
                                if (current.includes(driverId)) {
                                  return current.filter(
                                    (id) => id !== driverId,
                                  );
                                }
                                return [...current, driverId];
                              });
                            }}
                          >
                            <View style={styles.driverOptionTextWrap}>
                              <Text style={styles.driverOptionName}>
                                {driver.users?.name || "Unknown"}
                              </Text>
                              <Text style={styles.driverOptionLicense}>
                                {driver.vehicle_plate_number || "No license"}
                              </Text>
                              <Text style={styles.assignedText}>
                                {assignedVehicle?.name || "vehicle"} (
                                {assignedVehicle?.license_plate})
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <MaterialIcons
                        name="people"
                        size={48}
                        color="#B0B0B0"
                        style={styles.emptyStateIcon}
                      />
                      <Text style={styles.emptyStateTitle}>
                        No drivers available
                      </Text>
                      <Text style={styles.emptyStateText}>
                        Please assign a vehicle to a driver first.
                      </Text>
                    </View>
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowDriverPicker(false)}
                >
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {showMapPicker && (
            <Modal
              visible={showMapPicker}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => {
                setShowMapPicker(false);
                setPickupConfirmed(false);
              }}
            >
              <SafeAreaView
                style={locationPickerStyles.fullscreenOverlay}
                edges={["top", "bottom"]}
              >
                {/* MAP */}
                <View
                  style={locationPickerStyles.mapContainer}
                  pointerEvents="box-none"
                >
                  <Map
                    style={locationPickerStyles.fullscreenMap}
                    markers={[
                      ...(pickupLocation.latitude != null &&
                      pickupLocation.longitude != null
                        ? [
                            {
                              latitude: pickupLocation.latitude,
                              longitude: pickupLocation.longitude,
                              title: "Pickup",
                              type: "pickup" as const,
                            },
                          ]
                        : []),

                      ...(dropoffLocation.latitude != null &&
                      dropoffLocation.longitude != null
                        ? [
                            {
                              latitude: dropoffLocation.latitude,
                              longitude: dropoffLocation.longitude,
                              title: "Dropoff",
                              type: "dropoff" as const,
                            },
                          ]
                        : []),
                    ]}
                    origin={
                      pickupLocation.latitude != null &&
                      pickupLocation.longitude != null
                        ? {
                            latitude: pickupLocation.latitude,
                            longitude: pickupLocation.longitude,
                          }
                        : null
                    }
                    destination={
                      dropoffLocation.latitude != null &&
                      dropoffLocation.longitude != null
                        ? {
                            latitude: dropoffLocation.latitude,
                            longitude: dropoffLocation.longitude,
                          }
                        : null
                    }
                    centerOnUser={true}
                    focus={mapFocus}
                  />

                  {/* Close button */}
                  <TouchableOpacity
                    style={locationPickerStyles.closeMapButton}
                    onPress={() => {
                      setShowMapPicker(false);
                      setPickupConfirmed(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={24} color="#222" />
                  </TouchableOpacity>

                  {/* Current location button */}
                  <TouchableOpacity
                    style={locationPickerStyles.myLocationButton}
                    onPress={() => {
                      // Your existing current-location logic
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="my-location"
                      size={22}
                      color="#4A90E2"
                    />
                  </TouchableOpacity>
                </View>

                {/* BOTTOM PANEL */}
                <View style={locationPickerStyles.locationPanel}>
                  {/* Drag indicator */}
                  <View style={locationPickerStyles.dragIndicator} />

                  {/* Header */}
                  <View style={locationPickerStyles.panelHeader}>
                    <View>
                      <Text style={locationPickerStyles.sheetTitle}>
                        Select locations
                      </Text>
                      <Text style={locationPickerStyles.sheetSubtitle}>
                        Set the start and end points for this route
                      </Text>
                    </View>

                    <View style={locationPickerStyles.routeIcon}>
                      <MaterialIcons
                        name="alt-route"
                        size={22}
                        color="#4A90E2"
                      />
                    </View>
                  </View>

                  {/* START */}
                  <View style={locationPickerStyles.locationSection}>
                    <View style={locationPickerStyles.locationIconColumn}>
                      <View
                        style={[
                          locationPickerStyles.locationDot,
                          locationPickerStyles.pickupDot,
                        ]}
                      >
                        <MaterialIcons
                          name="radio-button-checked"
                          size={12}
                          color="#fff"
                        />
                      </View>

                      {!pickupConfirmed && (
                        <View style={locationPickerStyles.locationLine} />
                      )}
                    </View>

                    <View style={locationPickerStyles.locationInputContainer}>
                      <Text style={locationPickerStyles.inputLabel}>
                        Start location
                      </Text>

                      <View style={locationPickerStyles.inputWrapper}>
                        <GooglePlacesAutoComplete
                          value={pickupLocation.name}
                          placeholder="Search start location"
                          debounce={400}
                          onChangeText={(name) =>
                            setPickupLocation((current) => ({
                              ...current,
                              name,
                              address: name ? current.address : "",
                              latitude: name ? current.latitude : null,
                              longitude: name ? current.longitude : null,
                            }))
                          }
                          onSelect={(address, coords) => {
                            if (!address || !address.trim()) {
                              setPickupLocation({
                                name: "",
                                address: "",
                                latitude: null,
                                longitude: null,
                              });
                              setMapFocus(null);
                              return;
                            }

                            if (coords) {
                              setPickupLocation({
                                name: address,
                                address,
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                              });

                              setMapFocus({
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                              });
                            } else {
                              setPickupLocation({
                                name: address,
                                address,
                                latitude: null,
                                longitude: null,
                              });
                              setMapFocus(null);
                            }
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* START ACTION */}
                  {!pickupConfirmed ? (
                    <View style={locationPickerStyles.actionRow}>
                      <TouchableOpacity
                        style={[
                          locationPickerStyles.primaryButton,
                          !pickupLocation.name &&
                            locationPickerStyles.disabledButton,
                        ]}
                        disabled={!pickupLocation.name}
                        onPress={() => setPickupConfirmed(true)}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="check" size={20} color="#fff" />

                        <Text style={locationPickerStyles.primaryButtonText}>
                          Confirm start location
                        </Text>
                      </TouchableOpacity>

                      {pickupLocation.name ? (
                        <TouchableOpacity
                          style={locationPickerStyles.secondaryButton}
                          onPress={() => {
                            setPickupLocation({
                              name: "",
                              address: "",
                              latitude: null,
                              longitude: null,
                            });
                            setMapFocus(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="close" size={18} color="#666" />

                          <Text
                            style={locationPickerStyles.secondaryButtonText}
                          >
                            Clear
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : (
                    <>
                      {/* End */}
                      <View style={locationPickerStyles.locationSection}>
                        <View style={locationPickerStyles.locationIconColumn}>
                          <View
                            style={[
                              locationPickerStyles.locationDot,
                              locationPickerStyles.dropoffDot,
                            ]}
                          >
                            <MaterialIcons
                              name="location-on"
                              size={14}
                              color="#fff"
                            />
                          </View>
                        </View>

                        <View
                          style={locationPickerStyles.locationInputContainer}
                        >
                          <Text style={locationPickerStyles.inputLabel}>
                            End location
                          </Text>

                          <View style={locationPickerStyles.inputWrapper}>
                            <GooglePlacesAutoComplete
                              value={dropoffLocation.name}
                              placeholder="Search end location"
                              debounce={400}
                              onChangeText={(name) =>
                                setDropoffLocation((current) => ({
                                  ...current,
                                  name,
                                  address: name ? current.address : "",
                                  latitude: name ? current.latitude : null,
                                  longitude: name ? current.longitude : null,
                                }))
                              }
                              onSelect={(address, coords) => {
                                if (!address || !address.trim()) {
                                  setDropoffLocation({
                                    name: "",
                                    address: "",
                                    latitude: null,
                                    longitude: null,
                                  });
                                  setMapFocus(null);
                                  return;
                                }

                                if (coords) {
                                  setDropoffLocation({
                                    name: address,
                                    address,
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                  });

                                  setMapFocus({
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                  });
                                } else {
                                  setDropoffLocation({
                                    name: address,
                                    address,
                                    latitude: null,
                                    longitude: null,
                                  });
                                  setMapFocus(null);
                                }
                              }}
                            />
                          </View>
                        </View>
                      </View>

                      {/* FINAL ACTIONS */}
                      <View style={locationPickerStyles.actionRow}>
                        <TouchableOpacity
                          style={[
                            locationPickerStyles.primaryButton,
                            !dropoffLocation.name &&
                              locationPickerStyles.disabledButton,
                          ]}
                          disabled={!dropoffLocation.name}
                          onPress={() => {
                            setShowMapPicker(false);
                            setPickupConfirmed(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#fff"
                          />

                          <Text style={locationPickerStyles.primaryButtonText}>
                            Use these locations
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={locationPickerStyles.secondaryButton}
                          onPress={() => {
                            setPickupConfirmed(false);
                            setMapFocus(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="edit" size={18} color="#666" />

                          <Text
                            style={locationPickerStyles.secondaryButtonText}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* SELECTED LOCATIONS */}
                  {(pickupLocation.name || dropoffLocation.name) && (
                    <View style={locationPickerStyles.selectedContainer}>
                      <Text style={locationPickerStyles.selectedTitle}>
                        Selected locations
                      </Text>

                      {pickupLocation.name && (
                        <View style={locationPickerStyles.selectedLocation}>
                          <View
                            style={[
                              locationPickerStyles.smallDot,
                              locationPickerStyles.pickupDot,
                            ]}
                          />

                          <View
                            style={locationPickerStyles.selectedTextContainer}
                          >
                            <Text style={locationPickerStyles.selectedType}>
                              PICKUP
                            </Text>

                            <Text
                              style={locationPickerStyles.selectedAddress}
                              numberOfLines={1}
                            >
                              {pickupLocation.name}
                            </Text>
                          </View>

                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#22C55E"
                          />
                        </View>
                      )}

                      {dropoffLocation.name && (
                        <View style={locationPickerStyles.selectedLocation}>
                          <View
                            style={[
                              locationPickerStyles.smallDot,
                              locationPickerStyles.dropoffDot,
                            ]}
                          />

                          <View
                            style={locationPickerStyles.selectedTextContainer}
                          >
                            <Text style={locationPickerStyles.selectedType}>
                              DROP-OFF
                            </Text>

                            <Text
                              style={locationPickerStyles.selectedAddress}
                              numberOfLines={1}
                            >
                              {dropoffLocation.name}
                            </Text>
                          </View>

                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#22C55E"
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </SafeAreaView>
            </Modal>
          )}
        </>
      )}
    </View>
  );
};

export default CreateRoutes;

const locationPickerStyles = StyleSheet.create({
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 999,
  },

  mapContainer: {
    flex: 1,
    position: "relative",
  },

  fullscreenMap: {
    flex: 1,
  },

  closeMapButton: {
    position: "absolute",
    top: 55,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  myLocationButton: {
    position: "absolute",
    right: 18,
    bottom: 25,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  locationPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
    position: "relative",
  },

  dragIndicator: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 18,
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  sheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  routeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  locationSection: {
    flexDirection: "row",
    marginBottom: 14,
    zIndex: 1001,
  },

  locationIconColumn: {
    width: 34,
    alignItems: "center",
  },

  locationDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  pickupDot: {
    backgroundColor: "#22C55E",
  },

  dropoffDot: {
    backgroundColor: "#EF4444",
  },

  locationLine: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: "#D1D5DB",
    marginVertical: 4,
  },

  locationInputContainer: {
    flex: 1,
    marginLeft: 8,
    zIndex: 1002,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
  },

  inputWrapper: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    overflow: "visible",
    zIndex: 1003,
    elevation: 12,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },

  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  disabledButton: {
    backgroundColor: "#CBD5E1",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  secondaryButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },

  selectedContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 2,
  },

  selectedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  selectedLocation: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  smallDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },

  selectedTextContainer: {
    flex: 1,
  },

  selectedType: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 2,
  },

  selectedAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FC" },
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 46,
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
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  headerStepBadge: {
    minWidth: 42,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerStepText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1EAF3",
    backgroundColor: "#FFFFFF",
    shadowColor: "#17385F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepItem: {
    minWidth: 48,
    alignItems: "center",
    gap: 5,
  },
  stepCircle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#EDF2F7",
  },
  stepCircleActive: {
    backgroundColor: "#1769D2",
  },
  stepCircleComplete: {
    backgroundColor: "#1EA56B",
  },
  stepLabel: {
    color: "#8293A8",
    fontSize: 10,
    fontWeight: "600",
  },
  stepLabelActive: {
    color: "#1769D2",
    fontWeight: "700",
  },
  stepLabelComplete: {
    color: "#1A8059",
  },
  stepConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: "#E4EAF1",
  },
  stepConnectorComplete: {
    backgroundColor: "#8ACFB2",
  },
  content: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  formCanvas: {
    flex: 1,
  },
  formSection: {
    padding: 17,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1EAF3",
    backgroundColor: "#FFFFFF",
    shadowColor: "#17385F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  formSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 17,
  },
  formSectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EDF5FF",
  },
  formSectionTitle: {
    color: "#17385F",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHint: {
    marginTop: 3,
    color: "#71849A",
    fontSize: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    color: "#17385F",
    fontSize: 13,
    fontWeight: "600",
  },
  optionalText: {
    color: "#647C95",
    fontWeight: "400",
  },
  requiredMark: {
    color: "#E44752",
  },
  routeTextInput: {
    minHeight: 48,
    marginBottom: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    color: "#17385F",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 64,
    marginBottom: 0,
  },
  locationEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 11,
  },
  locationRail: {
    width: 20,
    alignItems: "center",
    alignSelf: "stretch",
  },
  startLocationDot: {
    width: 11,
    height: 11,
    marginTop: 15,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#21B56B",
    backgroundColor: "#FFFFFF",
  },
  endLocationDot: {
    width: 11,
    height: 11,
    marginTop: 15,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#EF4444",
    backgroundColor: "#FFFFFF",
  },
  locationRailLine: {
    width: 1,
    flex: 1,
    marginVertical: 2,
    backgroundColor: "#C7D8E8",
  },
  routePlaceField: {
    flex: 1,
    minWidth: 0,
  },
  mapLocationButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  viaHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 1,
  },
  addStopButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  addStopText: {
    color: "#1769D2",
    fontSize: 13,
    fontWeight: "600",
  },
  viaStopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  viaStopIcon: {
    width: 20,
    alignItems: "center",
  },
  removeStopButton: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  endLocationLabel: {
    marginTop: 1,
  },
  scheduleDateButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  scheduleDateText: {
    color: "#17385F",
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleDatePlaceholder: {
    color: "#71869C",
    fontWeight: "400",
  },
  scheduleTimesColumn: {
    marginBottom: 2,
  },
  scheduleTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  scheduleTimeField: {
    flex: 1,
    minWidth: 0,
  },
  routePreviewMap: {
    height: 185,
    marginTop: 3,
    borderRadius: 13,
  },
  estimateCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DBE9F7",
    borderRadius: 13,
    backgroundColor: "#F7FAFE",
  },
  estimateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  estimateDivider: {
    width: 1,
    height: 35,
    marginHorizontal: 12,
    backgroundColor: "#D8E3EF",
  },
  estimateLabel: {
    color: "#72849A",
    fontSize: 11,
    fontWeight: "500",
  },
  estimateValue: {
    marginTop: 3,
    color: "#17385F",
    fontSize: 15,
    fontWeight: "700",
  },
  estimatePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
    padding: 12,
    borderRadius: 11,
    backgroundColor: "#F2F6FA",
  },
  estimatePlaceholderText: {
    flex: 1,
    color: "#71849A",
    fontSize: 12,
    lineHeight: 17,
  },
  estimateErrorText: {
    flex: 1,
    color: "#A33836",
    fontSize: 12,
    lineHeight: 17,
  },
  finalEstimateCard: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  finalEstimateMetric: {
    flex: 1,
    padding: 13,
    borderWidth: 1,
    borderColor: "#DBE9F7",
    borderRadius: 12,
    backgroundColor: "#F7FAFE",
  },
  timeReferenceRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 13,
  },
  timeReferenceOption: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  timeReferenceOptionSelected: {
    backgroundColor: "#1769D2",
    borderColor: "#1769D2",
  },
  timeReferenceText: {
    color: "#31516F",
    fontSize: 12,
    fontWeight: "600",
  },
  timeReferenceTextSelected: {
    color: "#FFFFFF",
  },
  assignmentSelectButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  assignmentSelectText: {
    flex: 1,
    color: "#17385F",
    fontSize: 14,
    fontWeight: "600",
  },
  assignmentSelectPlaceholder: {
    flex: 1,
    color: "#71869C",
    fontSize: 14,
  },
  routeTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  routeTypeOption: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },
  routeTypeOptionSelected: {
    borderColor: "#8BBEFF",
    backgroundColor: "#8BBEFF",
  },
  routeTypeText: {
    color: "#31516F",
    fontSize: 12,
    fontWeight: "500",
  },
  routeTypeTextSelected: {
    color: "#FFFFFF",
  },
  statusSelector: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 2,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#C9E4FA",
    borderRadius: 8,
    backgroundColor: "#F8FBFE",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#20B26B",
  },
  statusDotInactive: {
    backgroundColor: "#94A3B8",
  },
  statusText: {
    flex: 1,
    color: "#24415D",
    fontSize: 14,
    fontWeight: "600",
  },
  compactInput: {
    minHeight: 48,
    marginBottom: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
    fontSize: 14,
  },
  timeColumnLabel: {
    marginBottom: 6,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  timeWindowSection: {
    marginTop: 10,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 13,
    borderTopWidth: 1,
    borderTopColor: "#E4EBF3",
    backgroundColor: "#FFFFFF",
  },
  saveRouteButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 12,
    backgroundColor: "#1769D2",
    shadowColor: "#1769D2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 3,
  },
  saveRouteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelRouteButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E3EF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  cancelRouteButtonText: {
    color: "#526A82",
    fontSize: 14,
    fontWeight: "600",
  },
  previousButton: {
    minWidth: 105,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#D8E3EF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  previousButtonText: {
    color: "#23476D",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1E293B",
  },
  labelSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 22,
  },
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 14,
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  pickerContainer: {
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#F9F9F9",
  },
  picker: {
    height: 50,
    color: "#333",
  },
  disabledPickerContainer: {
    opacity: 0.65,
  },
  driverOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#F9F9F9",
  },
  driverOptionSelected: {
    backgroundColor: "#E3F2FD",
  },
  driverOptionText: {
    fontSize: 14,
    color: "#333",
  },
  driverOptionTextSelected: {
    fontWeight: "600",
    color: "#4A90E2",
  },
  childOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#F9F9F9",
    flexDirection: "row",
    alignItems: "center",
  },
  childOptionSelected: {
    backgroundColor: "#E3F2FD",
  },
  childOptionText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  childOptionTextSelected: {
    color: "#1E88E5",
  },
  childInfo: {
    flex: 1,
  },
  childDetails: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  childAddresses: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  windowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: 8,
  },
  windowColumn: {
    flex: 1,
  },
  windowColumnLeft: {
    marginRight: 0,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  vehicleOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#F9F9F9",
  },
  vehicleOptionSelected: {
    backgroundColor: "#E8F5E9",
  },
  vehicleOptionText: {
    fontSize: 14,
    color: "#333",
  },
  vehicleOptionTextSelected: {
    fontWeight: "600",
    color: "#4CAF50",
  },
  noDriversText: {
    fontSize: 14,
    color: "#666",
    padding: 14,
    textAlign: "center",
  },
  noChildrenText: {
    fontSize: 14,
    color: "#666",
    padding: 14,
    textAlign: "center",
  },
  noVehiclesText: {
    fontSize: 14,
    color: "#666",
    padding: 14,
    textAlign: "center",
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  fullscreenMap: {
    width: "100%",
    height: "100%",
  },
  bsContent: {
    padding: 12,
    backgroundColor: "#fff",
    flex: 1,
  },
  mapTop: {
    height: "55%",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomWidth: 0,
  },
  overlayBottom: {
    height: "45%",
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomWidth: 0,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    color: "#0F172A",
  },
  sheetSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#E6EEF8",
    alignSelf: "center",
    marginBottom: 10,
  },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  inputIcon: { width: 40, alignItems: "center", justifyContent: "center" },
  selectedRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedText: { color: "#333", marginBottom: 4 },
  inputLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  selectedChip: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  useButton: {
    flex: 1,
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  useButtonText: { color: "#fff", fontWeight: "800", letterSpacing: 0.2 },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 8,
    gap: 10,
  },
  confirmButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#A0AEC0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: { color: "#FFF", fontWeight: "700" },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  clearButtonText: { color: "#334155", fontWeight: "700" },
  useButtonDisabled: {
    marginTop: 16,
    backgroundColor: "#A0AEC0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  inputWrapper: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  bsButtonsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  bsDone: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E6EEF8",
  },
  selectedChipText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F7F9FC",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6EAF0",
    marginHorizontal: 10,
  },
  emptyStateIcon: {
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#7A7A7A",
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#EC4899",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  defaultTimeContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  checkboxChecked: {
    backgroundColor: "#4A90E2",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  saveDefaultButton: {
    backgroundColor: "#28A745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  saveDefaultButtonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  saveDefaultButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  defaultTimeInfo: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  timeScopeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
    marginBottom: 8,
  },
  scopeLabel: {
    width: "100%",
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  scopeOption: {
    minHeight: 34,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },
  scopeOptionSelected: {
    borderColor: "#1769D2",
    backgroundColor: "#1769D2",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  radioButtonSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  scopeOptionText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  scopeOptionTextSelected: {
    color: "#FFFFFF",
  },
  savePreferenceButton: {
    backgroundColor: "#28A745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  savePreferenceButtonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  savePreferenceButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  preferencesContainer: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
  },
  preferenceItem: {
    fontSize: 12,
    color: "#2E7D32",
    marginBottom: 4,
  },
  previewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 20,
  },

  previewHeader: {
    marginBottom: 18,
  },

  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  previewSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
  },

  previewContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewItem: {
    flex: 1,
    alignItems: "center",
  },

  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },

  driverAvatarImage: {
    width: "100%",
    height: "100%",
  },

  driverInitials: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#4A90E2",
    textAlign: "center",
    lineHeight: 90,
  },

  vehicleImageWrapper: {
    width: 130,
    height: 90,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },

  vehiclePreviewImage: {
    width: "100%",
    height: "100%",
  },

  previewItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  previewItemSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },

  previewDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  selectorButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 10,
  },
  selectorButtonText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "700",
  },
  selectorPlaceholderText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  stepperHeader: {
    marginBottom: 20,
  },
  stepperTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  stepperSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  stepperProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  stepperDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  stepperDotActive: {
    backgroundColor: "#4A90E2",
  },
  stepperNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  stepperNavButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  stepperNavButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  stepperNavButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  stepperNavButtonTextDisabled: {
    color: "#F3F4F6",
    fontSize: 15,
    fontWeight: "700",
  },
  stepperNavSpacer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "72%",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  optionsList: {
    maxHeight: 420,
  },
  driverOptionDisabled: {
    opacity: 0.55,
  },
  driverOptionTextWrap: {
    flex: 1,
  },
  driverOptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  driverOptionLicense: {
    fontSize: 13,
    color: "#666",
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  assignmentText: {
    flex: 1,
  },
  assignedText: {
    fontSize: 13,
    color: "#A00",
    marginTop: 4,
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 15,
    color: "#4A90E2",
    fontWeight: "700",
  },
  sectionDivider: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "#F4F6F8",
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
  },
  selectedLocationText: {
    fontSize: 13,
    color: "#28A745",
    fontWeight: "600",
    marginBottom: 16,
    marginTop: -8,
  },
});
