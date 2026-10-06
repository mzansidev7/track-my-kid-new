import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearOwnerCache } from "../../store/asyncStorage/ownerCache";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import { resolveWorkingBaseUrl } from "../../url";

const AddDriver = ({ setActiveButton }: any) => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleId: params?.vehicleId ? String(params.vehicleId) : "",
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingVehicles, setFetchingVehicles] = useState(true);
  const [disableSubmit, setDisableSubmit] = useState(false);
  // Notification state
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(owner)/(tabs)/drivers");
            }
          }}
          accessibilityLabel="Back to drivers"
        >
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Add Driver</Text>
          <Text style={styles.headerSubtitle}>
            Add a new driver to your fleet
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );

  useEffect(() => {
    if (!user?.token) return;
    fetchVehicles();
  }, [user?.token]);

  const openDriver = (driver: any) => {
    const driverId = typeof driver === "object" ? driver?.id : driver;

    if (driverId == null) return;

    router.push(`/(owner)/driver-details?driverId=${driverId}`);
  };

  const fetchVehicles = async () => {
    if (!user?.token) {
      setFetchingVehicles(false);
      return;
    }

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
        setVehicles(data);
      } else {
        setNotification({
          visible: true,
          message: data.error || "Failed to fetch vehicles",
          type: "error",
        });
      }
    } catch (error) {
      setNotification({
        visible: true,
        message: "Network error",
        type: "error",
      });
    } finally {
      setFetchingVehicles(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setNotification({
        visible: true,
        message: "Please fill all required fields",
        type: "error",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setNotification({
        visible: true,
        message: "Please enter a valid email address",
        type: "error",
      });
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setNotification({
        visible: true,
        message: "Please enter a valid phone number",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      // Add driver via owner endpoint
      const driverPayload: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      };

      // Include vehicle assignment if selected
      if (formData.vehicleId) {
        driverPayload.vehicle_id = formData.vehicleId;
      }

      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(driverPayload),
      };

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/drivers`, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to add driver");
      }

      const createdDriverId =
        data?.driver?.id ?? data?.driverId ?? data?.id ?? null;

      setTimeout(() => {
        setDisableSubmit(true);
        setNotification({
          visible: true,
          message: "Driver added successfully",
          type: "success",
        });
      }, 1000);

      // Clear cached driver and vehicle entries so the vehicle list refreshes correctly.
      try {
        await clearOwnerCache("drivers");
        await clearOwnerCache("vehicles");
      } catch (cacheError) {
        console.warn(
          "Failed to clear owner cache after driver add:",
          cacheError,
        );
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        vehicleId: "",
      });

      if (createdDriverId != null) {
        openDriver(createdDriverId);
        return createdDriverId;
      }

      // Fallback navigation when no driver id is returned.
      if (typeof setActiveButton === "function") {
        setActiveButton("dashboard");
      }

      return createdDriverId ?? null;
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
      setDisableSubmit(false);
    }
  };

  if (fetchingVehicles) {
    return (
      <View style={styles.loadingContainer}>
        {renderHeader()}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#1769D2" />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      </View>
    );
  }

  const selectedVehicle = vehicles.find(
    (v: any) => String(v.id) === String(formData.vehicleId),
  );
  const lockedVehicleId = params?.vehicleId ? String(params.vehicleId) : "";
  const isVehiclePickerLocked = Boolean(lockedVehicleId && selectedVehicle);
  const availableVehicles = vehicles.filter((v: any) => !v.driver_id);
  const assignedVehicles = vehicles.filter((v: any) => !!v.driver_id);

  const getAssignedDriverName = (vehicle: any) => {
    return (
      vehicle.drivers?.users?.name ||
      vehicle.drivers?.users?.email ||
      vehicle.drivers?.users?.phone ||
      "Assigned driver"
    );
  };

  return (
    <View style={styles.container}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.formTitle}>Driver information</Text>
          <Text style={styles.formSubtitle}>
            Enter the driver’s contact details to get started.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Full name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="person-outline" size={19} color="#71869C" />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B3"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                autoCapitalize="words"
                accessibilityLabel="Full name"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Email address <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="mail-outline" size={19} color="#71869C" />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor="#94A3B3"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Phone number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="call" size={19} color="#71869C" />
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#94A3B3"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
              />
            </View>
          </View>
          {selectedVehicle && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Vehicle license plate</Text>
              <View style={[styles.inputRow, styles.readOnlyInput]}>
                <MaterialIcons
                  name="directions-car"
                  size={19}
                  color="#71869C"
                />
                <Text style={styles.readOnlyText}>
                  {selectedVehicle.license_plate || "Not provided"}
                </Text>
              </View>
            </View>
          )}

          {vehicles.length > 0 && (
            <>
              <Text style={styles.label}>
                Assign to vehicle <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  isVehiclePickerLocked && styles.selectorButtonDisabled,
                ]}
                onPress={() => {
                  if (!isVehiclePickerLocked) {
                    setShowVehiclePicker(true);
                  }
                }}
                disabled={isVehiclePickerLocked}
              >
                <MaterialIcons
                  name="directions-car"
                  size={19}
                  color="#71869C"
                />
                <Text
                  style={
                    formData.vehicleId
                      ? styles.selectorButtonText
                      : styles.selectorPlaceholderText
                  }
                >
                  {selectedVehicle
                    ? `${selectedVehicle.name} (${selectedVehicle.license_plate})`
                    : isVehiclePickerLocked
                      ? "Selected vehicle locked"
                      : "Select a vehicle (optional)"}
                </Text>
                {!isVehiclePickerLocked && (
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={21}
                    color="#71869C"
                  />
                )}
              </TouchableOpacity>
              {isVehiclePickerLocked && (
                <View style={styles.lockedNoteContainer}>
                  <Text style={styles.lockedNoteText}>
                    Vehicle assignment is locked because you came from change
                    driver.
                  </Text>
                </View>
              )}
            </>
          )}

          {vehicles.length === 0 && (
            <View style={styles.noVehiclesNote}>
              <Text style={styles.noVehiclesNoteText}>
                No vehicles available yet. You can add the driver now and
                assign a vehicle later.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || disableSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Add Driver</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showVehiclePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <ScrollView style={styles.optionsList}>
              <View
                style={[styles.vehicleOption, styles.vehicleOptionDisabled]}
                pointerEvents="none"
              >
                <View style={styles.vehicleOptionTextWrap}>
                  <Text style={styles.vehicleOptionName}>No vehicle</Text>
                  <Text style={styles.vehicleOptionPlate}>Unassigned</Text>
                </View>
              </View>

              {availableVehicles.length > 0 && (
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>
                    Available vehicles
                  </Text>
                </View>
              )}

              {availableVehicles.map((vehicle: any) => {
                const firstImage =
                  vehicle?.vehicle_images?.[0]?.url || vehicle?.images?.[0];
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={styles.vehicleOption}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        vehicleId: vehicle.id,
                      });
                      setShowVehiclePicker(false);
                    }}
                  >
                    {firstImage ? (
                      <Image
                        source={{ uri: firstImage }}
                        style={styles.vehicleOptionImage}
                      />
                    ) : (
                      <View style={styles.vehicleOptionImagePlaceholder}>
                        <Text style={styles.vehicleOptionImagePlaceholderText}>
                          🚐
                        </Text>
                      </View>
                    )}
                    <View style={styles.vehicleOptionTextWrap}>
                      <Text style={styles.vehicleOptionName}>
                        {vehicle.name}
                      </Text>
                      <Text style={styles.vehicleOptionPlate}>
                        {vehicle.license_plate}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {assignedVehicles.length > 0 && (
                <>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionDividerText}>
                      Assigned vehicles
                    </Text>
                  </View>
                  {assignedVehicles.map((vehicle: any) => {
                    const firstImage =
                      vehicle?.vehicle_images?.[0]?.url || vehicle?.images?.[0];
                    return (
                      <View
                        key={vehicle.id}
                        style={[
                          styles.vehicleOption,
                          styles.vehicleOptionDisabled,
                        ]}
                        pointerEvents="none"
                      >
                        {firstImage ? (
                          <Image
                            source={{ uri: firstImage }}
                            style={styles.vehicleOptionImage}
                          />
                        ) : (
                          <View style={styles.vehicleOptionImagePlaceholder}>
                            <Text
                              style={styles.vehicleOptionImagePlaceholderText}
                            >
                              🚐
                            </Text>
                          </View>
                        )}
                        <View style={styles.vehicleOptionTextWrap}>
                          <Text style={styles.vehicleOptionName}>
                            {" "}
                            {vehicle.name}
                          </Text>
                          <Text style={styles.vehicleOptionPlate}>
                            {vehicle.license_plate}
                          </Text>
                          <Text style={styles.assignedText}>
                            Assigned to {getAssignedDriverName(vehicle)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowVehiclePicker(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddDriver;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FC",
  },
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 11,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 24,
  },
  form: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE8F3",
  },
  formTitle: {
    color: "#17385F",
    fontSize: 17,
    fontWeight: "700",
  },
  formSubtitle: {
    color: "#71869C",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 17,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#465F78",
    marginBottom: 7,
  },
  required: {
    color: "#D94A57",
  },
  optional: {
    color: "#8294A7",
    fontSize: 11,
    fontWeight: "400",
  },
  inputRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D8E4EF",
    borderRadius: 10,
    backgroundColor: "#FBFDFF",
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: "#263B50",
    fontSize: 13,
    paddingVertical: 0,
  },
  readOnlyInput: {
    backgroundColor: "#F2F6FA",
  },
  readOnlyText: {
    color: "#526981",
    fontSize: 13,
    flex: 1,
  },
  inputDisabled: {
    backgroundColor: "#E5E5E5",
    color: "#666",
  },
  button: {
    backgroundColor: "#1769D2",
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#7B8EA3",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  selectorButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#D8E7F6",
    borderRadius: 10,
    backgroundColor: "#FBFDFF",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  selectorButtonText: {
    flex: 1,
    fontSize: 15,
    color: "#263B50",
  },
  selectorPlaceholderText: {
    flex: 1,
    fontSize: 13,
    color: "#8294A7",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "72%",
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE8F3",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17385F",
    marginBottom: 12,
  },
  optionsList: {
    maxHeight: 420,
  },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAF0F6",
    gap: 12,
  },
  vehicleOptionDisabled: {
    opacity: 0.58,
  },
  sectionDivider: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "#EEF4FA",
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#526981",
  },
  assignedText: {
    fontSize: 13,
    color: "#71869C",
    marginTop: 4,
  },
  vehicleOptionImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#EFEFEF",
  },
  vehicleOptionImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#EEF3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleOptionImagePlaceholderText: {
    fontSize: 22,
  },
  vehicleOptionTextWrap: {
    flex: 1,
  },
  vehicleOptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17385F",
    marginBottom: 2,
  },
  vehicleOptionPlate: {
    fontSize: 13,
    color: "#71869C",
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 15,
    color: "#1769D2",
    fontWeight: "700",
  },
  noVehiclesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noVehiclesText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  noVehiclesSubText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F8FC",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#526981",
    marginTop: 16,
    textAlign: "center",
  },
  noVehiclesNote: {
    backgroundColor: "#EEF4FA",
    borderLeftWidth: 3,
    borderLeftColor: "#1769D2",
    padding: 12,
    borderRadius: 9,
    marginVertical: 16,
  },
  noVehiclesNoteText: {
    fontSize: 12,
    color: "#526981",
    lineHeight: 20,
  },
  selectorButtonDisabled: {
    backgroundColor: "#F4F7FF",
    borderColor: "#D6E4FF",
  },
  lockedNoteContainer: {
    marginTop: 10,
    borderRadius: 9,
    backgroundColor: "#EEF4FA",
    borderWidth: 1,
    borderColor: "#D8E7F6",
    padding: 12,
  },
  lockedNoteText: {
    color: "#526981",
    fontSize: 13,
    lineHeight: 19,
  },
});
