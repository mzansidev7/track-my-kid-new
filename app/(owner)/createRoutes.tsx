import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
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
import { AuthContext } from "../../authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
import LocationPicker from "../../components/LocationPicker";
import Notification from "../../components/Notification";
import TimePicker from "../../components/TimePicker";
import { setDepartureTimePreference } from "../../store/asyncStorage/timePreferences.asyncStore";
import { BASE_URL } from "../../url";

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
  const [routeName, setRouteName] = useState("");
  const [departureTime, setDepartureTime] = useState("05:00");
  const [pickupStartTime, setPickupStartTime] = useState("06:00");
  const [pickupEndTime, setPickupEndTime] = useState("07:30");
  const [dropoffStartTime, setDropoffStartTime] = useState("13:00");
  const [dropoffEndTime, setDropoffEndTime] = useState("16:30");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [routePriceCents, setRoutePriceCents] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
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
              Select the pickup and dropoff coordinates for this route.
            </Text>
            <LocationPicker
              title="Pickup Location"
              selectedLocation={pickupLocation.name}
              onLocationSelect={(name: string, coords: any) =>
                setPickupLocation({
                  name,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                })
              }
              placeholder="Tap to set pickup location"
            />
            {pickupLocation.name ? (
              <Text style={styles.selectedLocationText}>
                ✓ {pickupLocation.name}
              </Text>
            ) : null}
            <LocationPicker
              title="Dropoff Location"
              selectedLocation={dropoffLocation.name}
              onLocationSelect={(name: string, coords: any) =>
                setDropoffLocation({
                  name,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                })
              }
              placeholder="Tap to set dropoff location"
            />
            {dropoffLocation.name ? (
              <Text style={styles.selectedLocationText}>
                ✓ {dropoffLocation.name}
              </Text>
            ) : null}
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

  useEffect(() => {
    if (user?.token) {
      fetchDrivers();
      fetchVehicles();
    }
  }, [user?.token]);

  const fetchDrivers = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`${BASE_URL}/owner/drivers`, {
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
      setNotification({
        visible: true,
        message: "Network error while loading drivers.",
        type: "error",
      });
    }
  };

  const fetchVehicles = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/owner/vehicles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setVehicles(data || []);
      } else {
        setNotification({
          visible: true,
          message: data.error || "Unable to load vehicles.",
          type: "error",
        });
      }
    } catch (err) {
      setNotification({
        visible: true,
        message: "Network error while loading vehicles.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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

      const response = await fetch(`${BASE_URL}/owner/routes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to create route.",
        );
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
      // Save time preference
      if (departureTime.trim()) {
        await setDepartureTimePreference(
          departureTime.trim(),
          "year",
          user?.token,
        );
      }
      setRouteName("");
      setRoutePriceCents("");
      setDepartureTime("05:00");
      setSelectedDrivers([]);
      setPickupLocation({ latitude: null, longitude: null, name: "" });
      setDropoffLocation({ latitude: null, longitude: null, name: "" });
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
      <Notification
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
                  onPress={
                    currentStep < stepLabels.length
                      ? () => setCurrentStep(currentStep + 1)
                      : handleCreateRoute
                  }
                  disabled={stepActionDisabled(currentStep) || submitting}
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
        </>
      )}
    </View>
  );
};

export default CreateRoutes;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  labelSubtext: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "grey",
    marginVertical: 20,
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
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
  },
  windowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
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
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  scopeOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  radioButtonSelected: {
    borderColor: "#4A90E2",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A90E2",
  },
  scopeOptionText: {
    fontSize: 14,
    color: "#333",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginTop: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 5,
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
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  selectorButtonText: {
    fontSize: 15,
    color: "#333",
  },
  selectorPlaceholderText: {
    fontSize: 15,
    color: "#999",
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
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  stepperNavButtonDisabled: {
    backgroundColor: "#A0AEC0",
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
  // driverOption: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 10,
  //   borderBottomWidth: 1,
  //   borderBottomColor: "#F0F0F0",
  //   gap: 12,
  // },
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
