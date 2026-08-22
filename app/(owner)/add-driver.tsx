import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";
import { clearOwnerCache } from "../../store/asyncStorage/ownerCache";
import { AuthContext } from "../../context/authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
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

  const { renderHeader } = useOwnerPageHeader({
    title: "Add Driver",
    subtitle: "Add a new driver to your fleet",
    // onBackPress: () => router.push("/(owner)/drivers"),
  });

  useEffect(() => {
    if (!user?.token) return;
    fetchVehicles();
  }, [user?.token]);

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
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
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

      setNotification({
        visible: true,
        message: "Driver added successfully",
        type: "success",
      });

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

      // Navigate to the drivers list when the driver is added successfully.
      if (typeof setActiveButton === "function") {
        setActiveButton("dashboard");
      } else {
        // router.push("/(owner)/drivers");
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingVehicles) {
    return (
      <View style={styles.loadingContainer}>
        {renderHeader()}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>Loading Vehicles...</Text>
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
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <FloatingInput
            label="Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            autoCapitalize="words"
          />

          <FloatingInput
            label="Email *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FloatingInput
            label="Phone *"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
          {selectedVehicle && (
            <FloatingInput
              label="Vehicle License Plate"
              value={selectedVehicle.license_plate || ""}
              editable={false}
            />
          )}

          {vehicles.length > 0 && (
            <>
              <Text style={styles.label}>Assign to Vehicle (Optional)</Text>
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
                💡 No vehicles available yet. You can add the driver now and
                assign a vehicle later.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Add Driver</Text>
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
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  form: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  inputDisabled: {
    backgroundColor: "#E5E5E5",
    color: "#666",
  },
  button: {
    backgroundColor: "#EC4899",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#CCC",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
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
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  vehicleOptionDisabled: {
    opacity: 0.55,
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
  assignedText: {
    fontSize: 13,
    color: "#A00",
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
    color: "#333",
    marginBottom: 2,
  },
  vehicleOptionPlate: {
    fontSize: 13,
    color: "#666",
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
    backgroundColor: "#F8F9FA",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  noVehiclesNote: {
    backgroundColor: "#FFF9E6",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
    padding: 12,
    borderRadius: 6,
    marginVertical: 16,
  },
  noVehiclesNoteText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  selectorButtonDisabled: {
    backgroundColor: "#F4F7FF",
    borderColor: "#D6E4FF",
  },
  lockedNoteContainer: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#EBF2FF",
    borderWidth: 1,
    borderColor: "#C6D9FF",
    padding: 12,
  },
  lockedNoteText: {
    color: "#1F3B7A",
    fontSize: 13,
    lineHeight: 19,
  },
});
