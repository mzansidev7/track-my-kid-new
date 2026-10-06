import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { useRouter } from "expo-router";
import { default as React, useContext, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import { resolveWorkingBaseUrl } from "../../url";
import { useDrivers } from "./ownerHelpers/hooks/useDrivers";

export default function AddVehicle({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const { drivers, loadingDrivers, error: driversError, refreshDrivers } =
    useDrivers();

  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [newVehicleName, setNewVehicleName] = useState("Mecerdes-Benz");
  const [newVehiclePlate, setNewVehiclePlate] = useState("lgp234gp");
  const [newVehicleModel, setNewVehicleModel] = useState("Iveco");
  const [newVehicleColor, setNewVehicleColor] = useState("Black");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState("22");
  const [newVehicleDriverId, setNewVehicleDriverId] = useState("");
  const [newVehicleImages, setNewVehicleImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const selectedDriver = drivers.find(
    (driver: any) => String(driver.id) === String(newVehicleDriverId),
  );

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotification({
          visible: true,
          message: "Image library permission is required.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedUris = result.assets
          .map((asset) => asset.uri)
          .filter((uri): uri is string => Boolean(uri));

        if (selectedUris.length > 0) {
          setNewVehicleImages((prev) =>
            [...prev, ...selectedUris].slice(0, 10),
          );
        }
      }
    } catch (error) {
      console.error("Error picking vehicle image:", error);
      setNotification({
        visible: true,
        message: "Unable to select images.",
        type: "error",
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewVehicleImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (
      !newVehicleName ||
      !newVehiclePlate ||
      !newVehicleModel ||
      !newVehicleCapacity
    ) {
      setNotification({
        visible: true,
        message: "Please fill in all required vehicle fields.",
        type: "error",
      });
      return;
    }
    if (newVehicleImages.length < 3) {
      setNotification({
        visible: true,
        message: "Please add at least 3 vehicle images.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData to send multipart/form-data with files
      const formData = new FormData();
      formData.append("name", newVehicleName);
      formData.append("license_plate", newVehiclePlate);
      formData.append("model", newVehicleModel);
      formData.append("color", newVehicleColor);
      formData.append("capacity", String(Number(newVehicleCapacity)));
      formData.append("driverId", newVehicleDriverId || "");

      for (let i = 0; i < newVehicleImages.length; i++) {
        const imageUri = newVehicleImages[i];
        const fileName = imageUri.split("/").pop() || `vehicle_image_${i}.jpg`;

        if (Platform.OS === "web") {
          const imageResponse = await fetch(imageUri);
          const imageBlob = await imageResponse.blob();
          formData.append("images", imageBlob as any, fileName);
        } else {
          formData.append("images", new ExpoFile(imageUri), fileName);
        }
      }

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setNotification({
          visible: true,
          message: "Vehicle added successfully.",
          type: "success",
        });
        setNewVehicleName("");
        setNewVehiclePlate("");
        setNewVehicleModel("");
        setNewVehicleColor("");
        setNewVehicleCapacity("");
        setNewVehicleDriverId("");
        setNewVehicleImages([]);
        router.push("/(owner)/(tabs)/vehicles");
      } else {
        console.error("Server error:", data);
        setNotification({
          visible: true,
          message: data.error || "Failed to add vehicle.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setNotification({
        visible: true,
        message: "Network error while adding vehicle.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.pageHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/(owner)/(tabs)/vehicles")}
            accessibilityLabel="Back to vehicles"
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageHeaderTitle}>Add Vehicle</Text>
            <Text style={styles.pageHeaderSubtitle}>
              Create a new vehicle for your fleet
            </Text>
          </View>
          <View style={styles.headerVehicleIcon}>
            <MaterialIcons
              name="directions-bus"
              size={19}
              color="#FFFFFF"
            />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.formHeading}>
            <View style={styles.formHeadingIcon}>
              <MaterialIcons
                name="directions-bus"
                size={17}
                color="#1769D2"
              />
            </View>
            <View>
              <Text style={styles.formHeadingTitle}>Vehicle Information</Text>
              <Text style={styles.formHeadingSubtitle}>
                Enter the details for your vehicle
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Vehicle Name *</Text>
            <TextInput
              style={styles.textInput}
              value={newVehicleName}
              onChangeText={setNewVehicleName}
              placeholder="e.g. Ford Transit"
              placeholderTextColor="#91A1B5"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>License Plate *</Text>
            <TextInput
              style={styles.textInput}
              value={newVehiclePlate}
              onChangeText={setNewVehiclePlate}
              placeholder="e.g. CAA 123-456"
              placeholderTextColor="#91A1B5"
              maxLength={12}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Vehicle Model *</Text>
            <TextInput
              style={styles.textInput}
              value={newVehicleModel}
              onChangeText={setNewVehicleModel}
              placeholder="e.g. Transit"
              placeholderTextColor="#91A1B5"
            />
          </View>
          <View style={styles.formRow}>
            <View style={styles.formRowField}>
              <Text style={styles.formLabel}>Color</Text>
              <TextInput
                style={styles.textInput}
                value={newVehicleColor}
                onChangeText={setNewVehicleColor}
                placeholder="e.g. White"
                placeholderTextColor="#91A1B5"
              />
            </View>
            <View style={styles.formRowField}>
              <Text style={styles.formLabel}>Capacity *</Text>
              <TextInput
                style={styles.textInput}
                value={newVehicleCapacity}
                onChangeText={setNewVehicleCapacity}
                placeholder="Seats"
                placeholderTextColor="#91A1B5"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Driver (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              activeOpacity={0.8}
              onPress={() => setShowDriverPicker(true)}
            >
              <View style={styles.driverPickerLabel}>
                <MaterialIcons
                  name={selectedDriver ? "person" : "person-outline"}
                  size={17}
                  color={selectedDriver ? "#1769D2" : "#71869C"}
                />
                <Text
                  style={[
                    styles.pickerPlaceholder,
                    selectedDriver && styles.selectedDriverText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedDriver
                    ? selectedDriver.name
                    : "Select a driver (optional)"}
                </Text>
              </View>
              <View style={styles.driverPickerActions}>
                {newVehicleDriverId ? (
                  <TouchableOpacity
                    onPress={() => setNewVehicleDriverId("")}
                    accessibilityLabel="Clear selected driver"
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={17} color="#71869C" />
                  </TouchableOpacity>
                ) : null}
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={21}
                  color="#71869C"
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.fieldHint}>
              You can assign a driver now or leave this blank and assign later.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.imageHeaderRow}>
              <Text style={styles.formLabel}>Vehicle Images *</Text>
              <Text style={styles.imageCount}>
                {newVehicleImages.length}/10
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.addImageBtn,
                newVehicleImages.length >= 10 && styles.addImageBtnDisabled,
              ]}
              onPress={handlePickImage}
              disabled={newVehicleImages.length >= 10}
            >
              <View
                style={[
                  styles.imagePickerIcon,
                  newVehicleImages.length >= 10 && styles.imagePickerIconDisabled,
                ]}
              >
                <MaterialIcons
                  name="add-a-photo"
                  size={21}
                  color={newVehicleImages.length >= 10 ? "#A9B7C6" : "#1769D2"}
                />
              </View>
              <Text style={styles.addImageBtnText}>
                {newVehicleImages.length > 0
                  ? "Add more photos"
                  : "Tap to add vehicle photos"}
              </Text>
              <Text style={styles.imagePickerHint}>
                Add at least 3 images, up to 10
              </Text>
            </TouchableOpacity>

            {newVehicleImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {newVehicleImages.map((imageUri, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <MaterialIcons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <View style={styles.submitBtnGradient}>
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Text style={styles.submitBtnText}>Add Vehicle</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showDriverPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverPicker(false)}
      >
        <View style={styles.driverModalOverlay}>
          <View style={styles.driverModal}>
            <View style={styles.driverModalHeader}>
              <View>
                <Text style={styles.driverModalTitle}>Select Driver</Text>
                <Text style={styles.driverModalSubtitle}>
                  The selected driver will be assigned to this vehicle.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.driverModalClose}
                onPress={() => setShowDriverPicker(false)}
                accessibilityLabel="Close driver selection"
              >
                <MaterialIcons name="close" size={20} color="#50677F" />
              </TouchableOpacity>
            </View>

            {loadingDrivers ? (
              <View style={styles.driverModalLoading}>
                <ActivityIndicator size="small" color="#1769D2" />
                <Text style={styles.driverModalEmptyText}>
                  Loading drivers...
                </Text>
              </View>
            ) : drivers.length > 0 ? (
              <ScrollView
                style={styles.driverOptionsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[
                    styles.driverOption,
                    !newVehicleDriverId && styles.driverOptionSelected,
                  ]}
                  onPress={() => {
                    setNewVehicleDriverId("");
                    setShowDriverPicker(false);
                  }}
                >
                  <View style={styles.driverOptionIcon}>
                    <MaterialIcons
                      name="person-outline"
                      size={18}
                      color="#71869C"
                    />
                  </View>
                  <View style={styles.driverOptionInfo}>
                    <Text style={styles.driverOptionName}>No driver</Text>
                    <Text style={styles.driverOptionMeta}>
                      Assign a driver later
                    </Text>
                  </View>
                  {!newVehicleDriverId ? (
                    <MaterialIcons
                      name="check-circle"
                      size={19}
                      color="#1769D2"
                    />
                  ) : null}
                </TouchableOpacity>
                {drivers.map((driver: any) => {
                  const driverId = String(driver.id);
                  const isSelected = driverId === String(newVehicleDriverId);
                  const isAssigned = Boolean(
                    driver.hasAssignedVehicle ||
                      (Array.isArray(driver.vehicles) &&
                        driver.vehicles.length > 0),
                  );
                  return (
                    <TouchableOpacity
                      key={driverId}
                      style={[
                        styles.driverOption,
                        isSelected && styles.driverOptionSelected,
                        isAssigned && styles.driverOptionDisabled,
                      ]}
                      disabled={isAssigned}
                      onPress={() => {
                        if (isAssigned) return;
                        setNewVehicleDriverId(driverId);
                        setShowDriverPicker(false);
                      }}
                    >
                      <View style={styles.driverOptionIcon}>
                        <MaterialIcons
                          name="person"
                          size={18}
                          color={isAssigned ? "#9AAABC" : "#1769D2"}
                        />
                      </View>
                      <View style={styles.driverOptionInfo}>
                        <Text
                          style={styles.driverOptionName}
                          numberOfLines={1}
                        >
                          {driver.name || "Driver"}
                        </Text>
                        <Text
                          style={styles.driverOptionMeta}
                          numberOfLines={1}
                        >
                          {driver.phone || driver.email || "Driver"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.driverAvailability,
                          isAssigned && styles.driverAssignedBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.driverAvailabilityText,
                            isAssigned && styles.driverAssignedText,
                          ]}
                        >
                          {isAssigned
                            ? "Already assigned"
                            : "Available"}
                        </Text>
                      </View>
                      {isSelected ? (
                        <MaterialIcons
                          name="check-circle"
                          size={19}
                          color="#1769D2"
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.driverModalEmpty}>
                <MaterialIcons
                  name="person-search"
                  size={34}
                  color="#91A1B5"
                />
                <Text style={styles.driverModalEmptyTitle}>
                  {driversError ? "Could not load drivers" : "No drivers found"}
                </Text>
                <Text style={styles.driverModalEmptyText}>
                  {driversError ||
                    "You can add a driver later from driver management."}
                </Text>
                {driversError ? (
                  <TouchableOpacity
                    style={styles.driverRetryButton}
                    onPress={() => refreshDrivers(true)}
                  >
                    <Text style={styles.driverRetryText}>Try Again</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={styles.driverModalDone}
              onPress={() => setShowDriverPicker(false)}
            >
              <Text style={styles.driverModalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FC",
  },
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 9,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderText: {
    flex: 1,
  },
  pageHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pageHeaderSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    marginTop: 2,
  },
  headerVehicleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 36,
  },
  formContainer: {
    backgroundColor: "#FFF",
    borderColor: "#DDEBFA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#4D7EA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingBottom: 12,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0F8",
  },
  formHeadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF3FE",
    alignItems: "center",
    justifyContent: "center",
  },
  formHeadingTitle: {
    color: "#17385F",
    fontSize: 13,
    fontWeight: "700",
  },
  formHeadingSubtitle: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 2,
  },
  formGroup: {
    marginTop: 13,
  },
  formLabel: {
    color: "#526981",
    fontSize: 11,
    marginBottom: 6,
    fontWeight: "600",
  },
  textInput: {
    minHeight: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E7F6",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    color: "#1F3552",
    fontSize: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },
  formRowField: {
    flex: 1,
  },
  pickerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D8E7F6",
    borderRadius: 9,
    paddingHorizontal: 11,
    minHeight: 40,
    backgroundColor: "#FFFFFF",
  },
  driverPickerLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pickerPlaceholder: {
    color: "#71869C",
    fontSize: 12,
    flexShrink: 1,
  },
  selectedDriverText: {
    color: "#1F3552",
    fontWeight: "600",
  },
  driverPickerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fieldHint: {
    color: "#8497AA",
    fontSize: 9,
    marginTop: 5,
  },
  driverModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,37,62,0.45)",
  },
  driverModal: {
    maxHeight: "78%",
    backgroundColor: "#F4F8FC",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#DDEBFA",
    paddingBottom: 20,
    overflow: "hidden",
  },
  driverModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DDEBFA",
  },
  driverModalTitle: {
    color: "#17385F",
    fontSize: 15,
    fontWeight: "700",
  },
  driverModalSubtitle: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 3,
  },
  driverModalClose: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#F1F6FB",
    alignItems: "center",
    justifyContent: "center",
  },
  driverOptionsList: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  driverOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDEBFA",
    borderRadius: 11,
    padding: 10,
    marginBottom: 8,
  },
  driverOptionSelected: {
    backgroundColor: "#EDF6FF",
    borderColor: "#1769D2",
  },
  driverOptionDisabled: {
    backgroundColor: "#F1F4F7",
    borderColor: "#E1E7EE",
    opacity: 0.7,
  },
  driverOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF3FE",
    alignItems: "center",
    justifyContent: "center",
  },
  driverOptionInfo: {
    flex: 1,
    minWidth: 0,
  },
  driverOptionName: {
    color: "#17385F",
    fontSize: 12,
    fontWeight: "700",
  },
  driverOptionMeta: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 3,
  },
  driverAvailability: {
    backgroundColor: "#E5F8ED",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  driverAssignedBadge: {
    backgroundColor: "#FFF4DC",
  },
  driverAvailabilityText: {
    color: "#20864B",
    fontSize: 9,
    fontWeight: "600",
  },
  driverAssignedText: {
    color: "#B7791F",
  },
  driverModalLoading: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  driverModalEmpty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  driverModalEmptyTitle: {
    color: "#17385F",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  driverModalEmptyText: {
    color: "#71869C",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 5,
  },
  driverRetryButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#EAF3FE",
  },
  driverRetryText: {
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "700",
  },
  driverModalDone: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    backgroundColor: "#1769D2",
  },
  driverModalDoneText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  imageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  imageCount: {
    color: "#71869C",
    fontSize: 10,
    fontWeight: "600",
  },
  addImageBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9CC5EF",
    backgroundColor: "#F8FBFF",
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 10,
  },
  addImageBtnDisabled: {
    borderColor: "#D8E2EC",
    backgroundColor: "#F5F7FA",
  },
  imagePickerIcon: {
    width: 36,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FE",
    marginBottom: 6,
  },
  imagePickerIconDisabled: {
    backgroundColor: "#EEF1F4",
  },
  addImageBtnText: {
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "700",
  },
  imagePickerHint: {
    marginTop: 3,
    fontSize: 9,
    color: "#8497AA",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imagePreviewItem: {
    width: 68,
    height: 60,
    borderRadius: 9,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnGradient: {
    backgroundColor: "#1769D2",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
