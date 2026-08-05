import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { default as React, useContext, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerPageHeader } from "../../ownerHelpers/hooks/useOwnerPageHeader";
import { AuthContext } from "../../authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
import Notification from "../../components/Notification";
import { BASE_URL } from "../../url";

export default function AddVehicle({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const API_BASE_URL = BASE_URL;

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

  const { renderHeader } = useOwnerPageHeader({
    title: "Add Vehicle",
    subtitle: "Create a new vehicle for your fleet",
    onBackPress: () => router.push("/(owner)/(tabs)/vehicles"),
  });

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      const getMimeType = (uri: string) => {
        const ext = uri.split(".").pop()?.toLowerCase();
        if (ext === "png") return "image/png";
        if (ext === "webp") return "image/webp";
        if (ext === "gif") return "image/gif";
        return "image/jpeg";
      };

      for (let i = 0; i < newVehicleImages.length; i++) {
        const imageUri = newVehicleImages[i];
        const fileName = imageUri.split("/").pop() || `vehicle_image_${i}.jpg`;
        const fileType = getMimeType(imageUri);

        if (Platform.OS === "web") {
          const imageResponse = await fetch(imageUri);
          const imageBlob = await imageResponse.blob();
          formData.append("images", imageBlob as any, fileName);
        } else {
          formData.append("images", {
            uri: imageUri,
            name: fileName,
            type: fileType,
          } as any);
        }
      }

      const response = await fetch(`${API_BASE_URL}/owner/vehicles`, {
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
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <FloatingInput
            label="Vehicle Name *"
            value={newVehicleName}
            onChangeText={setNewVehicleName}
          />
          <FloatingInput
            label="License Plate *"
            value={newVehiclePlate}
            onChangeText={setNewVehiclePlate}
            maxLength={12}
          />
          <FloatingInput
            label="Vehicle Model *"
            value={newVehicleModel}
            onChangeText={setNewVehicleModel}
          />
          <FloatingInput
            label="Vehicle Color"
            value={newVehicleColor}
            onChangeText={setNewVehicleColor}
          />
          <FloatingInput
            label="Capacity *"
            value={newVehicleCapacity}
            onChangeText={setNewVehicleCapacity}
            keyboardType="numeric"
          />

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Driver (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() =>
                setNotification({
                  visible: true,
                  message: "Driver selection is not available yet.",
                  type: "warning",
                })
              }
            >
              <Text style={styles.pickerPlaceholder}>Select driver</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.imageHeaderRow}>
              <Text style={styles.formLabel}>Vehicle Images * (3 minimum)</Text>
              <Text style={styles.imageCount}>
                {newVehicleImages.length}/3+
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
              <MaterialIcons
                name="image"
                size={20}
                color={newVehicleImages.length >= 10 ? "#AAA" : "#4A90E2"}
              />
              <Text
                style={[
                  styles.addImageBtnText,
                  newVehicleImages.length >= 10 &&
                    styles.addImageBtnTextDisabled,
                ]}
              >
                Select Images
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
            <LinearGradient
              colors={["#EC4899", "#EC4899"]}
              style={styles.submitBtnGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Text style={styles.submitBtnText}>Add Vehicle</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  formGroup: {
    marginTop: 18,
  },
  formLabel: {
    color: "#666",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  pickerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
  },
  pickerPlaceholder: {
    color: "#999",
    flex: 1,
  },
  imageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  imageCount: {
    color: "#666",
    fontSize: 12,
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4A90E2",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addImageBtnDisabled: {
    borderColor: "#DDD",
  },
  addImageBtnText: {
    color: "#4A90E2",
    marginLeft: 8,
    fontWeight: "700",
  },
  addImageBtnTextDisabled: {
    color: "#AAA",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imagePreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
    marginBottom: 10,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
