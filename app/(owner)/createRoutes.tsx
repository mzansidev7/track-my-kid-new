import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { AuthContext } from "../../context/authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
import GooglePlacesAutoComplete from "../../components/GooglePlacesAutoComplete";
import Map from "../../components/map";
import AppNotification from "../../components/Notification";
import TimePicker from "../../components/TimePicker";
import {
  setDepartureTimePreference,
  getDepartureTimePreference,
  getAllDepartureTimePreferences,
  TimeScope,
} from "../../store/asyncStorage/timePreferences.asyncStore";
import { resolveWorkingBaseUrl } from "../../url";

const timeToMinutes = (value: string) => {
  const m = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const normalizePriceInput = (value: string) => {
  const price = String(value || "").trim();
  if (!price.includes(".")) {
    return price;
  }
  return price.replace(/\.?0+$/, "");
};

const CreateRoutes = ({ setActiveButton }: any) => {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const routePage = () => router.push("/routes");

  const { renderHeader } = useOwnerPageHeader({
    title: "Create Route",
    subtitle: "Plan a new route for your fleet",
    onBackPress: routePage,
  });
  const [routeName, setRouteName] = useState("Route");
  const [departureTime, setDepartureTime] = useState("05:00");
  const [timeScope, setTimeScope] = useState<TimeScope>("year");
  const [pickupStartTime, setPickupStartTime] = useState("06:00");
  const [pickupEndTime, setPickupEndTime] = useState("07:30");
  const [dropoffStartTime, setDropoffStartTime] = useState("13:00");
  const [dropoffEndTime, setDropoffEndTime] = useState("16:30");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [routePriceCents, setRoutePriceCents] = useState("200");
  const [drivers, setDrivers] = useState<any[]>([]);
  // vehicles list not stored in this component (fetched when needed)
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  // Location state for pickup (start) and dropoff (end)
  const [pickupLocation, setPickupLocation] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    name: "",
  });
  const [dropoffLocation, setDropoffLocation] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    name: "",
  });
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  // snapPoints removed (no bottom sheet) — kept for potential future use
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const stepLabels = [
    "Route details",
    "Pickup window",
    "Dropoff window",
    "Locations",
    "Driver assignment",
  ];

  const isStepOneComplete = () => {
    const normalizedPrice = normalizePriceInput(routePriceCents);
    const parsedPrice = parseFloat(normalizedPrice || "0");
    const isRouteNameValid = routeName.trim() !== "";
    return (
      !!routePriceCents.trim() &&
      !isNaN(parsedPrice) &&
      parsedPrice >= 0 &&
      !!departureTime.trim() &&
      isRouteNameValid
    );
  };

  const isStepTwoComplete = () =>
    pickupStartTime.trim() !== "" && pickupEndTime.trim() !== "";

  const isStepThreeComplete = () =>
    dropoffStartTime.trim() !== "" && dropoffEndTime.trim() !== "";

  const isStepFourComplete = () =>
    pickupLocation.name.trim() !== "" && dropoffLocation.name.trim() !== "";

  const stepActionDisabled = (step: number) => {
    if (step === 1) return !isStepOneComplete();
    if (step === 2) return !isStepTwoComplete();
    if (step === 3) return !isStepThreeComplete();
    if (step === 4) return !isStepFourComplete();
    if (step === 5) return selectedDrivers.length === 0;
    return false;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.labelSubtext}>
              Set the route name, price per child and the departure time.
            </Text>
            <Text style={styles.stepTitle}>Route Details</Text>
            <FloatingInput
              label="Route name"
              value={routeName}
              onChangeText={setRouteName}
            />
            <FloatingInput
              label="Route price..."
              value={routePriceCents}
              onChangeText={setRoutePriceCents}
              keyboardType="number-pad"
            />
            <View style={styles.divider} />
            <Text style={styles.stepTitle}>Departure time</Text>
            <Text style={styles.labelSubtext}>
              This is the time when the vehicle will start the route.
            </Text>
            <TimePicker
              value={departureTime}
              onChangeTime={setDepartureTime}
              minHour="05"
              maxHour="08"
            />

            <View style={styles.timeScopeContainer}>
              <Text style={styles.scopeLabel}>Save as preference</Text>
              {(["today", "week", "month", "year"] as TimeScope[]).map(
                (scope) => (
                  <TouchableOpacity
                    key={scope}
                    style={styles.scopeOption}
                    onPress={() => setTimeScope(scope)}
                  >
                    <View
                      style={[
                        styles.radioButton,
                        timeScope === scope && styles.radioButtonSelected,
                      ]}
                    >
                      {timeScope === scope && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={styles.scopeOptionText}>
                      {scope.charAt(0).toUpperCase() + scope.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
              <Text style={styles.defaultTimeInfo}>
                Preference will be saved when you click Next or Create.
              </Text>
            </View>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Pickup window</Text>
            <Text style={styles.labelSubtext}>
              Choose the home-to-school pickup window.
            </Text>
            <View style={styles.windowRow}>
              <View style={[styles.windowColumn, styles.windowColumnLeft]}>
                <Text style={styles.labelSubtext}>Start</Text>
                <TimePicker
                  value={pickupStartTime}
                  onChangeTime={setPickupStartTime}
                  minHour="05"
                  maxHour="10"
                  minTime={departureTime}
                />
              </View>
              <View style={styles.windowColumn}>
                <Text style={styles.labelSubtext}>End</Text>
                <TimePicker
                  value={pickupEndTime}
                  onChangeTime={setPickupEndTime}
                  minHour="05"
                  maxHour="10"
                  minTime={pickupStartTime}
                />
              </View>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Dropoff window</Text>
            <Text style={styles.labelSubtext}>
              Choose the school-to-home dropoff window.
            </Text>
            <View style={styles.windowRow}>
              <View style={[styles.windowColumn, styles.windowColumnLeft]}>
                <Text style={styles.labelSubtext}>Start</Text>
                <TimePicker
                  value={dropoffStartTime}
                  onChangeTime={setDropoffStartTime}
                  minHour="13"
                  maxHour="17"
                />
              </View>
              <View style={styles.windowColumn}>
                <Text style={styles.labelSubtext}>End</Text>
                <TimePicker
                  value={dropoffEndTime}
                  onChangeTime={setDropoffEndTime}
                  minHour="13"
                  maxHour="17"
                  minTime={dropoffStartTime}
                />
              </View>
            </View>
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Locations</Text>
            <Text style={styles.labelSubtext}>
              Select the start and stop coordinates for this route.
            </Text>
            <TouchableOpacity
  style={styles.selectorButton}
  onPress={() => setShowMapPicker(true)}
  activeOpacity={0.8}
>
  <View style={selectLocationButtonStyles.selectorIconContainer}>
    <MaterialIcons
      name="route"
      size={22}
      color="#4A90E2"
    />
  </View>

  <View style={selectLocationButtonStyles.selectorContent}>
    {!pickupLocation.name && !dropoffLocation.name ? (
      <>
        <Text style={selectLocationButtonStyles.selectorTitle}>
          Select route locations
        </Text>

        <Text style={selectLocationButtonStyles.selectorPlaceholderText}>
          Choose a start and stop location
        </Text>
      </>
    ) : (
      <>
        {pickupLocation.name && (
          <View style={selectLocationButtonStyles.selectorLocationRow}>
            <View style={selectLocationButtonStyles.startDot} />

            <View style={selectLocationButtonStyles.selectorTextContainer}>
              <Text style={selectLocationButtonStyles.selectorLabel}>
                START
              </Text>

              <Text
                style={selectLocationButtonStyles.selectorLocationText}
                numberOfLines={1}
              >
                {pickupLocation.name}
              </Text>
            </View>
          </View>
        )}

        {pickupLocation.name && dropoffLocation.name && (
          <View style={selectLocationButtonStyles.selectorConnector} />
        )}

        {dropoffLocation.name && (
          <View style={selectLocationButtonStyles.selectorLocationRow}>
            <View style={selectLocationButtonStyles.stopDot} />

            <View style={selectLocationButtonStyles.selectorTextContainer}>
              <Text style={selectLocationButtonStyles.selectorLabel}>
                STOP
              </Text>

              <Text
                style={selectLocationButtonStyles.selectorLocationText}
                numberOfLines={1}
              >
                {dropoffLocation.name}
              </Text>
            </View>
          </View>
        )}
      </>
    )}
  </View>

  <MaterialIcons
    name="chevron-right"
    size={24}
    color="#9CA3AF"
  />
</TouchableOpacity>

            {(pickupLocation.name || dropoffLocation.name) && (
              <View style={selectedLocationStyles.selectedLocationsCard}>
                <View style={selectedLocationStyles.selectedHeader}>
                  <Text style={selectedLocationStyles.selectedHeaderTitle}>
                    Selected Locations
                  </Text>

                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color="#22C55E"
                  />
                </View>

                {pickupLocation.name && (
                  <View style={selectedLocationStyles.locationRow}>
                    <View style={selectedLocationStyles.pickupIndicator}>
                      <MaterialIcons
                        name="radio-button-checked"
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={selectedLocationStyles.locationContent}>
                      <Text style={selectedLocationStyles.locationType}>
                        START
                      </Text>

                      <Text
                        style={selectedLocationStyles.locationAddress}
                        numberOfLines={2}
                      >
                        {pickupLocation.name}
                      </Text>
                    </View>

                    <MaterialIcons name="check" size={20} color="#22C55E" />
                  </View>
                )}

                {pickupLocation.name && dropoffLocation.name && (
                  <View style={selectedLocationStyles.locationConnector}>
                    <View style={selectedLocationStyles.connectorLine} />
                  </View>
                )}

                {dropoffLocation.name && (
                  <View style={selectedLocationStyles.locationRow}>
                    <View style={selectedLocationStyles.dropoffIndicator}>
                      <MaterialIcons
                        name="location-on"
                        size={14}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={selectedLocationStyles.locationContent}>
                      <Text style={selectedLocationStyles.locationType}>
                        STOP
                      </Text>

                      <Text
                        style={selectedLocationStyles.locationAddress}
                        numberOfLines={2}
                      >
                        {dropoffLocation.name}
                      </Text>
                    </View>

                    <MaterialIcons name="check" size={20} color="#22C55E" />
                  </View>
                )}
              </View>
            )}
          </>
        );
      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>Assign drivers</Text>
            <Text style={styles.labelSubtext}>
              Choose one or more drivers assigned to vehicles for this route.
            </Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowDriverPicker(true)}
            >
              <Text
                style={
                  selectedDrivers.length > 0
                    ? styles.selectorButtonText
                    : styles.selectorPlaceholderText
                }
              >
                {selectedDrivers.length > 0
                  ? `${selectedDrivers.length} driver${
                      selectedDrivers.length === 1 ? "" : "s"
                    } selected`
                  : "Select drivers"}
              </Text>
            </TouchableOpacity>
            {selectedDrivers.length > 0 && (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Selected Assignments</Text>
                  <Text style={styles.previewSubtitle}>
                    Multiple drivers and their assigned vehicles will run this
                    route.
                  </Text>
                </View>
                <View style={styles.previewContent}>
                  {selectedDrivers.map((driverId) => {
                    const driver = activeDrivers.find(
                      (d) => String(d.id) === driverId,
                    );
                    const assignedVehicle = getAssignedVehicle(driver);
                    return (
                      <View key={driverId} style={styles.assignmentRow}>
                        <View style={styles.assignmentText}>
                          <Text style={styles.previewItemTitle}>
                            {driver?.users?.name ||
                              driver?.name ||
                              "Unknown Driver"}
                          </Text>
                          <Text style={styles.previewItemSubtext}>
                            {assignedVehicle
                              ? `${assignedVehicle.name} (${assignedVehicle.license_plate})`
                              : "No vehicle assigned"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
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

  // Prefill departure time and scope from stored preferences (local or backend)
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const prefTime = await getDepartureTimePreference(user?.token);
        if (prefTime) setDepartureTime(prefTime);

        const prefs = await getAllDepartureTimePreferences(user?.token);
        if (prefs && prefs.length > 0) {
          const today = new Date().toISOString().split("T")[0];
          const priority: TimeScope[] = ["today", "week", "month", "year"];
          for (const scope of priority) {
            const p = prefs.find((x) => x.scope === scope);
            if (p && (!p.expiryDate || p.expiryDate >= today)) {
              setTimeScope(p.scope as TimeScope);
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Error loading preferences:", err);
      }
    };

    loadPreference();
  }, [user?.token]);

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
    const normalizedPriceValue = normalizePriceInput(routePriceCents);
    const parsedPrice = parseFloat(normalizedPriceValue || "0");
    if (
      isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      routePriceCents.trim() === ""
    ) {
      setNotification({
        visible: true,
        message: "Please enter a valid non-negative price per child.",
        type: "error",
      });
      return;
    }

    // Check if at least one driver is selected
    if (selectedDrivers.length === 0) {
      setNotification({
        visible: true,
        message: "Please select at least one driver for this route.",
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

    if (assignmentPayload.some((assignment) => !assignment.vehicle_id)) {
      setNotification({
        visible: true,
        message:
          "All selected drivers must have an assigned vehicle before creating the route.",
        type: "error",
      });
      return;
    }

    // Check if pickup location is selected
    if (
      pickupLocation.latitude === null ||
      pickupLocation.longitude === null ||
      !pickupLocation.name.trim()
    ) {
      setNotification({
        visible: true,
        message: "Please select a pickup location.",
        type: "error",
      });
      return;
    }

    // Check if dropoff location is selected
    if (
      dropoffLocation.latitude === null ||
      dropoffLocation.longitude === null ||
      !dropoffLocation.name.trim()
    ) {
      setNotification({
        visible: true,
        message: "Please select a dropoff location.",
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

    if (
      !departureTime.trim() ||
      !pickupStartTime.trim() ||
      !pickupEndTime.trim() ||
      !dropoffStartTime.trim() ||
      !dropoffEndTime.trim()
    ) {
      setNotification({
        visible: true,
        message:
          "Please complete departure time, pickup window, and dropoff window before creating the route.",
        type: "error",
      });
      return;
    }

    const pickupStartM = timeToMinutes(pickupStartTime);
    const pickupEndM = timeToMinutes(pickupEndTime);
    if (
      pickupStartM == null ||
      pickupEndM == null ||
      pickupStartM >= pickupEndM
    ) {
      setNotification({
        visible: true,
        message: "Pickup start time must be before pickup end time.",
        type: "error",
      });
      return;
    }

    const dropoffStartM = timeToMinutes(dropoffStartTime);
    const dropoffEndM = timeToMinutes(dropoffEndTime);
    if (
      dropoffStartM == null ||
      dropoffEndM == null ||
      dropoffStartM >= dropoffEndM
    ) {
      setNotification({
        visible: true,
        message: "Dropoff start time must be before dropoff end time.",
        type: "error",
      });
      return;
    }

    // Validate pickup window: 05:00 to 10:00
    const pickupStartLimit = 5 * 60; // 05:00
    const pickupEndLimit = 10 * 60; // 10:00
    if (pickupStartM < pickupStartLimit || pickupEndM > pickupEndLimit) {
      setNotification({
        visible: true,
        message: "Pickup window must be between 05:00 and 10:00.",
        type: "error",
      });
      return;
    }

    // Validate dropoff window: 13:00 to 17:00
    const dropoffStartLimit = 13 * 60; // 13:00
    const dropoffEndLimit = 17 * 60; // 17:00
    if (dropoffStartM < dropoffStartLimit || dropoffEndM > dropoffEndLimit) {
      setNotification({
        visible: true,
        message: "Dropoff window must be between 13:00 and 17:00.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const requestBody: Record<string, any> = {
        route_name: routeName.trim(),
        assignments: assignmentPayload,
        per_child_amount_cents: Math.round(parsedPrice * 100),
        // Add location fields
        start_latitude: pickupLocation.latitude,
        start_longitude: pickupLocation.longitude,
        start_location: pickupLocation.name,
        end_latitude: dropoffLocation.latitude,
        end_longitude: dropoffLocation.longitude,
        end_location: dropoffLocation.name,
      };

      const today = new Date().toISOString().split("T")[0];
      requestBody.departure_time = `${today}T${departureTime.trim()}:00`;
      requestBody.pickup_start_time = pickupStartTime.trim();
      requestBody.pickup_end_time = pickupEndTime.trim();
      requestBody.dropoff_start_time = dropoffStartTime.trim();
      requestBody.dropoff_end_time = dropoffEndTime.trim();
      // Include time preference in the create-route request so the server
      // can persist `owner_time_preferences` in the same transaction.
      requestBody.time_scope = timeScope;
      requestBody.time_value = departureTime.trim();
      const baseUrl = await resolveWorkingBaseUrl();

      console.log("[createRoutes] creating route", {
        baseUrl,
        tokenPresent: !!user?.token,
        requestBody,
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
        data,
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

      const stopsCount =
        typeof data.stops_count === "number" ? data.stops_count : 0;
      setNotification({
        visible: true,
        message:
          stopsCount > 0
            ? `Route created successfully with ${stopsCount} stop${stopsCount === 1 ? "" : "s"}.`
            : "Route created successfully.",
        type: "success",
      });
      // Save time preference and associate it with the created route
      const createdRouteId = data?.route?.id || null;
      if (departureTime.trim()) {
        // Fire-and-forget preference sync so UI isn't blocked if backend is slow
        setDepartureTimePreference(
          departureTime.trim(),
          timeScope,
          user?.token,
          createdRouteId || undefined,
        )
          .then(() => console.log("[createRoutes] preference sync complete"))
          .catch((err) =>
            console.warn("[createRoutes] preference sync failed", err),
          );
      }

      setRouteName("");
      setRoutePriceCents("");
      setDepartureTime("05:00");
      setSelectedDrivers([]);
      setPickupLocation({ latitude: null, longitude: null, name: "" });
      setDropoffLocation({ latitude: null, longitude: null, name: "" });
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

  const handleNext = async () => {
    if (currentStep < stepLabels.length) {
      // Advance immediately (don't block UI on save)
      if (currentStep === 1) {
        // Validate route name and price before advancing
        const normalizedPrice = normalizePriceInput(routePriceCents);
        const parsedPrice = parseFloat(normalizedPrice || "0");
        const isRouteNameValid = routeName.trim() !== "";

        if (
          !isRouteNameValid ||
          routePriceCents.trim() === "" ||
          isNaN(parsedPrice) ||
          parsedPrice < 0
        ) {
          setNotification({
            visible: true,
            message:
              "Please enter a valid route name and non-negative price before proceeding.",
            type: "error",
          });
          return;
        }

        setCurrentStep((s) => s + 1);

        if (departureTime.trim()) {
          // Fire-and-forget preference save; report result when done
          setDepartureTimePreference(
            departureTime.trim(),
            timeScope,
            user?.token,
          )
            .then(() => {
              setNotification({
                visible: true,
                message: `Saved ${departureTime.trim()} (${timeScope})`,
                type: "success",
              });
            })
            .catch((err: any) => {
              setNotification({
                visible: true,
                message: err?.message || "Failed to save time preference.",
                type: "warning",
              });
            });
        }

        return;
      }

      setCurrentStep((s) => s + 1);
    } else {
      await handleCreateRoute();
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
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.stepperHeader}>
                <View>
                  <Text style={styles.stepperTitle}>Create Route</Text>
                  <Text style={styles.stepperSubtitle}>
                    Step {currentStep} of {stepLabels.length}
                  </Text>
                </View>
                <View style={styles.stepperProgress}>
                  {stepLabels.map((label, index) => (
                    <View
                      key={label}
                      style={[
                        styles.stepperDot,
                        index + 1 <= currentStep && styles.stepperDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {renderStepContent()}

              <View style={styles.stepperNavRow}>
                {currentStep > 1 ? (
                  <TouchableOpacity
                    style={styles.stepperNavButton}
                    onPress={() => setCurrentStep(currentStep - 1)}
                  >
                    <Text style={styles.stepperNavButtonText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.stepperNavSpacer} />
                )}
                <TouchableOpacity
                  style={
                    stepActionDisabled(currentStep)
                      ? [
                          styles.stepperNavButton,
                          styles.stepperNavButtonDisabled,
                        ]
                      : styles.stepperNavButton
                  }
                  onPress={handleNext}
                  disabled={
                    (currentStep === 1
                      ? false
                      : stepActionDisabled(currentStep)) || submitting
                  }
                >
                  {submitting && currentStep === stepLabels.length ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text
                      style={
                        stepActionDisabled(currentStep)
                          ? styles.stepperNavButtonTextDisabled
                          : styles.stepperNavButtonText
                      }
                    >
                      {currentStep < stepLabels.length
                        ? "Next"
                        : "Create Route"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Route Details</Text>
              <Text style={styles.infoText}>
                • The system will include the linked children in this route
                after the parents confirm their participation..
              </Text>
              <Text style={styles.infoText}>
                • The system will automatically create pickup and drop-off stops
                based on children&apos;s addresses
              </Text>
              <Text style={styles.infoText}>
                • Select a driver to assign them to this route
              </Text>
              <Text style={styles.infoText}>
                • Optionally assign a vehicle and departure time
              </Text>
              <Text style={styles.infoText}>
                • Parents will receive notifications when their children are
                picked up or dropped off
              </Text>
            </View>
          </ScrollView>

          <Modal
            visible={showDriverPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDriverPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Driver</Text>
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
            <View style={locationPickerStyles.fullscreenOverlay}>
              {/* MAP */}
              <View style={locationPickerStyles.mapContainer}>
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
                  <MaterialIcons name="my-location" size={22} color="#4A90E2" />
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
                      Set the pickup and drop-off points for this route
                    </Text>
                  </View>

                  <View style={locationPickerStyles.routeIcon}>
                    <MaterialIcons name="alt-route" size={22} color="#4A90E2" />
                  </View>
                </View>

                {/* PICKUP */}
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
                      Pickup location
                    </Text>

                    <View style={locationPickerStyles.inputWrapper}>
                      <GooglePlacesAutoComplete
                        value={pickupLocation.name}
                        placeholder="Search pickup location"
                        debounce={400}
                        onSelect={(address, coords) => {
                          if (!address || !address.trim()) {
                            setPickupLocation({
                              name: "",
                              latitude: null,
                              longitude: null,
                            });
                            setMapFocus(null);
                            return;
                          }

                          if (coords) {
                            setPickupLocation({
                              name: address,
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

                {/* PICKUP ACTION */}
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
                        Confirm pickup
                      </Text>
                    </TouchableOpacity>

                    {pickupLocation.name ? (
                      <TouchableOpacity
                        style={locationPickerStyles.secondaryButton}
                        onPress={() => {
                          setPickupLocation({
                            name: "",
                            latitude: null,
                            longitude: null,
                          });
                          setMapFocus(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="close" size={18} color="#666" />

                        <Text style={locationPickerStyles.secondaryButtonText}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (
                  <>
                    {/* DROPOFF */}
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

                      <View style={locationPickerStyles.locationInputContainer}>
                        <Text style={locationPickerStyles.inputLabel}>
                          Drop-off location
                        </Text>

                        <View style={locationPickerStyles.inputWrapper}>
                          <GooglePlacesAutoComplete
                            value={dropoffLocation.name}
                            placeholder="Search drop-off location"
                            debounce={400}
                            onSelect={(address, coords) => {
                              if (!address || !address.trim()) {
                                setDropoffLocation({
                                  name: "",
                                  latitude: null,
                                  longitude: null,
                                });
                                setMapFocus(null);
                                return;
                              }

                              if (coords) {
                                setDropoffLocation({
                                  name: address,
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

                        <Text style={locationPickerStyles.secondaryButtonText}>
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
            </View>
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
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, paddingBottom: 40 },
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
    marginBottom: 16,
    gap: 12,
  },
  windowColumn: {
    flex: 1,
  },
  windowColumnLeft: {
    marginRight: 12,
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
    ...StyleSheet.absoluteFillObject,
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
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  scopeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
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
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
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
    fontSize: 32,
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
    borderWidth: 1.5,
    borderColor: "#D9E4F3",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  selectorButtonText: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "700",
  },
  selectorPlaceholderText: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "600",
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

const selectedLocationStyles = StyleSheet.create({
  selectedLocationsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 12,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  selectedHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
  },

  locationContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  locationType: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  locationAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 19,
  },

  pickupIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },

  dropoffIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  locationConnector: {
    width: 32,
    alignItems: "center",
    height: 18,
  },

  connectorLine: {
    width: 2,
    height: 18,
    backgroundColor: "#D1D5DB",
    borderRadius: 1,
  },
});

const selectLocationButtonStyles = StyleSheet.create({
selectorButton: {
  width: "100%",
  minHeight: 76,

  flexDirection: "row",
  alignItems: "center",

  backgroundColor: "#FFFFFF",

  borderRadius: 18,

  paddingHorizontal: 14,
  paddingVertical: 12,

  borderWidth: 1,
  borderColor: "#E5E7EB",

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
},

selectorIconContainer: {
  width: 42,
  height: 42,

  borderRadius: 13,

  backgroundColor: "#EFF6FF",

  alignItems: "center",
  justifyContent: "center",

  marginRight: 12,
},

selectorContent: {
  flex: 1,
},

selectorTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: "#111827",
  marginBottom: 3,
},

selectorPlaceholderText: {
  fontSize: 13,
  color: "#9CA3AF",
},

selectorLocationRow: {
  flexDirection: "row",
  alignItems: "center",
  minHeight: 30,
},

selectorTextContainer: {
  flex: 1,
  marginLeft: 10,
},

selectorLabel: {
  fontSize: 9,
  fontWeight: "800",
  color: "#9CA3AF",
  letterSpacing: 0.8,
  marginBottom: 2,
},

selectorLocationText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#111827",
},

startDot: {
  width: 10,
  height: 10,

  borderRadius: 5,

  backgroundColor: "#22C55E",

  borderWidth: 2,
  borderColor: "#DCFCE7",
},

stopDot: {
  width: 10,
  height: 10,

  borderRadius: 5,

  backgroundColor: "#EF4444",

  borderWidth: 2,
  borderColor: "#FEE2E2",
},

selectorConnector: {
  width: 1,
  height: 10,

  backgroundColor: "#D1D5DB",

  marginLeft: 4.5,
  marginVertical: 1,
},
})