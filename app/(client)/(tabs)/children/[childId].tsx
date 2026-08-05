import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { BASE_URL } from "../../../../url";

const ChildDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId: string }>();
  const childId = params.childId;
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null,
  );
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [mapModalTitle, setMapModalTitle] = useState("");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    lastname: "",
    grade: "",
    school_name: "",
  });
  const [savingChild, setSavingChild] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);

  const fetchChild = useCallback(async () => {
    if (!childId) return;
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/client/children/${childId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to load child details.",
        );
      }
      setChild(data);
    } catch (err: any) {
      console.error("Fetch child detail error:", err);
      Alert.alert("Unable to load child", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [childId, user?.token]);

  useEffect(() => {
    fetchChild();
  }, [fetchChild]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === "granted");
  };

  const handleBarcodeScanned = async (event: any) => {
    if (scanLoading) return;
    setScanLoading(true);
    setScanError(null);

    try {
      const rawData = event?.data;
      const parsed =
        typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      const vehicleId = parsed?.vehicleId || parsed?.vehicle_id || parsed?.id;

      if (!vehicleId) {
        throw new Error("QR code did not contain a valid vehicle id.");
      }

      const response = await fetch(
        `${BASE_URL}/client/children/${childId}/link-vehicle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ vehicleId }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to link vehicle.",
        );
      }

      Alert.alert(
        "Vehicle linked",
        data.message || "Child linked to vehicle successfully.",
      );
      setScanModalVisible(false);
      fetchChild();
    } catch (err: any) {
      console.error("QR scan link error:", err);
      setScanError(err?.message || "Unable to link vehicle.");
    } finally {
      setScanLoading(false);
    }
  };

  const openScanner = async () => {
    await requestCameraPermission();
    setScanModalVisible(true);
  };

  useEffect(() => {
    if (!child) return;
    setEditForm({
      name: child.name || "",
      lastname: child.lastname || "",
      grade: child.grade || "",
      school_name: child.school_name || "",
    });
  }, [child]);

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChild = async () => {
    if (!childId) return;
    setSavingChild(true);

    try {
      const response = await fetch(`${BASE_URL}/client/children/${childId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          lastname: editForm.lastname,
          grade: editForm.grade,
          school_name: editForm.school_name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to save child.");
      }

      setChild(data.child || data);
      setIsEditModalVisible(false);
      Alert.alert("Saved", "Child information updated successfully.");
    } catch (err: any) {
      console.error("Save child error:", err);
      Alert.alert("Unable to save child", err?.message || "Please try again.");
    } finally {
      setSavingChild(false);
    }
  };

  const handlePickChildPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo access to change the child photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if ("canceled" in result && result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPhotoUploading(true);
      const uri = asset.uri;
      const fileName = uri.split("/").pop() || `child-${Date.now()}.jpg`;
      const fileType = asset.type ? `${asset.type}/jpeg` : "image/jpeg";
      const formData = new FormData();
      formData.append("avatar", {
        uri,
        name: fileName,
        type: fileType,
      } as any);

      const uploadResponse = await fetch(
        `${BASE_URL}/client/upload-child-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
          body: formData,
        },
      );

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error || uploadData.message || "Upload failed.",
        );
      }

      const avatarUrl = uploadData.avatarUrl || uploadData.url;
      if (!avatarUrl) {
        throw new Error("Unable to get uploaded avatar URL.");
      }

      const response = await fetch(`${BASE_URL}/client/children/${childId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ avatar: avatarUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to save photo.");
      }

      setChild(data.child || data);
      Alert.alert("Photo updated", "Child photo updated successfully.");
    } catch (err: any) {
      console.error("Photo upload error:", err);
      Alert.alert(
        "Unable to update photo",
        err?.message || "Please try again.",
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const openLocationOnMap = (
    title: string,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
    address: string,
  ) => {
    if (!latitude || !longitude) {
      Alert.alert(
        "Location unavailable",
        "No location coordinates are available for this item.",
      );
      return;
    }
    setMapMarkers([
      {
        id: "location",
        title,
        coordinate: { latitude, longitude },
        description: address,
      },
    ]);
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setMapModalTitle(title);
    setIsMapModalVisible(true);
  };

  const openLiveTrip = async () => {
    if (!childId) return;
    setTripLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/client/children/${childId}/route-stops`,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to load route stops.",
        );
      }
      const stops = Array.isArray(data) ? data : [];
      if (stops.length === 0) {
        Alert.alert(
          "No trip data",
          "There is no trip history available for this child.",
        );
        return;
      }
      const markers = stops
        .filter((stop) => stop.latitude && stop.longitude)
        .map((stop, index) => ({
          id: `${stop.id}-${index}`,
          title: `${stop.stop_type} stop`,
          coordinate: { latitude: stop.latitude, longitude: stop.longitude },
          description: stop.address || stop.stop_type,
        }));

      const latitudes = markers.map((marker) => marker.coordinate.latitude);
      const longitudes = markers.map((marker) => marker.coordinate.longitude);
      const region = {
        latitude: latitudes.reduce((a, b) => a + b, 0) / latitudes.length,
        longitude: longitudes.reduce((a, b) => a + b, 0) / longitudes.length,
        latitudeDelta: Math.max(...latitudes) - Math.min(...latitudes) || 0.01,
        longitudeDelta:
          Math.max(...longitudes) - Math.min(...longitudes) || 0.01,
      };
      setMapMarkers(markers);
      setMapRegion(region);
      setMapModalTitle("Live Trip");
      setIsMapModalVisible(true);
    } catch (err: any) {
      console.error("Open live trip error:", err);
      Alert.alert(
        "Unable to open live trip",
        err?.message || "Please try again.",
      );
    } finally {
      setTripLoading(false);
    }
  };

  const openVehicleDetails = () => {
    if (!linkedVehicle) {
      Alert.alert(
        "No assigned vehicle",
        "This child does not have an assigned vehicle yet.",
      );
      return;
    }
    setIsVehicleModalVisible(true);
  };

  const handleRemoveChild = () => {
    Alert.alert("Remove child", "Are you sure you want to remove this child?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(
              `${BASE_URL}/client/children/${childId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${user?.token}`,
                },
              },
            );
            const data = await response.json();
            if (!response.ok) {
              throw new Error(
                data.error || data.message || "Unable to remove child.",
              );
            }
            Alert.alert("Removed", "Child has been removed successfully.");
            // router.replace("/(client)/(tabs)/children");
          } catch (err: any) {
            console.error("Remove child error:", err);
            Alert.alert(
              "Unable to remove child",
              err?.message || "Please try again.",
            );
          }
        },
      },
    ]);
  };

  const handleMenuAction = async (action: string) => {
    setIsMenuVisible(false);
    switch (action) {
      case "edit":
        setIsEditModalVisible(true);
        break;
      case "photo":
        await handlePickChildPhoto();
        break;
      case "trip":
        await openLiveTrip();
        break;
      case "attendance":
        Alert.alert("Attendance", "Attendance details are coming soon.");
        break;
      case "absence":
        Alert.alert("Report Absence", "Report absence is coming soon.");
        break;
      case "notifications":
        Alert.alert("Notifications", "Notifications are coming soon.");
        break;
      case "support":
        Alert.alert(
          "Contact Support",
          "Please email support@trackmykid.com or call your support hotline.",
        );
        break;
      case "remove":
        handleRemoveChild();
        break;
      default:
        break;
    }
  };

  const linkedVehicle = child?.vehicle;

  const childStatus = child?.is_active !== false ? "Active" : "Inactive";
  const memberSince = child?.created_at
    ? new Date(child.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown";

  const pickupAddress = child?.pickup_address || "Home";
  const dropoffAddress =
    child?.school_address || child?.school_name || "School";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.topRowWrapper,
          { backgroundColor: colors.surface },
          isScrolled && styles.topRowWrapperScrolled,
        ]}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <View style={styles.topRowTitle}>
            <Text style={[styles.pageTitle, { color: colors.text.primary }]}>
              Child Details
            </Text>
            <Text
              style={[styles.pageSubtitle, { color: colors.text.secondary }]}
            >
              View and manage your child&apos;s information
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsEditModalVisible(true)}
            >
              <MaterialIcons
                name="edit"
                size={20}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsMenuVisible(true)}
            >
              <MaterialIcons
                name="more-vert"
                size={20}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) =>
          setIsScrolled(nativeEvent.contentOffset.y > 10)
        }
        scrollEventThrottle={16}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : child ? (
          <>
            <View
              style={[styles.heroCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.heroTop}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={
                      child?.avatar
                        ? { uri: child.avatar }
                        : require("@/assets/images/client.png")
                    }
                    style={styles.heroAvatar}
                  />
                  <TouchableOpacity
                    style={styles.avatarAction}
                    onPress={handlePickChildPhoto}
                    disabled={photoUploading}
                  >
                    {photoUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="camera-alt" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.heroInfo}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.heroName, { color: colors.text.primary }]}
                    >
                      {child.name} {child.lastname || ""}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{childStatus}</Text>
                    </View>
                  </View>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroMetaItem}>
                      <MaterialIcons name="school" size={16} color="#8B5CF6" />
                      <Text
                        style={[
                          styles.heroMetaText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {" "}
                        {child.grade || "Grade not set"}
                      </Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                      <MaterialIcons
                        name="location-city"
                        size={16}
                        color="#10B981"
                      />
                      <Text
                        style={[
                          styles.heroMetaText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {" "}
                        {child.school_name || "School"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroMetaItem}>
                      <MaterialIcons
                        name="calendar-today"
                        size={16}
                        color="#2563EB"
                      />
                      <Text
                        style={[
                          styles.heroMetaText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {" "}
                        Member since {memberSince}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.childIdRow}>
                    <Text
                      style={[
                        styles.childIdLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Child ID
                    </Text>
                    <Text
                      style={[
                        styles.childIdValue,
                        { color: colors.text.primary },
                      ]}
                    >
                      {child.id}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View
              style={[styles.bannerCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.bannerContent}>
                <View style={styles.bannerIconContainer}>
                  <MaterialIcons name="shield" size={24} color="#2563EB" />
                </View>
                <View style={styles.bannerText}>
                  <Text
                    style={[styles.bannerTitle, { color: colors.text.primary }]}
                  >
                    Safety First
                  </Text>
                  <Text
                    style={[
                      styles.bannerDescription,
                      { color: colors.text.secondary },
                    ]}
                  >
                    We notify you when {child.name || "your child"} is picked up
                    and dropped off.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[styles.tripCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.tripHeader}>
                <Text
                  style={[styles.tripTitle, { color: colors.text.primary }]}
                >
                  Today&apos;s Trip
                </Text>
                <View style={styles.tripStatusPill}>
                  <MaterialIcons
                    name="directions-car"
                    size={14}
                    color="#16A34A"
                  />
                  <Text style={styles.tripStatusText}>
                    On the way to school
                  </Text>
                </View>
              </View>
              <View style={styles.tripTimeline}>
                <View style={styles.tripPoint}>
                  <View
                    style={[styles.tripDot, { backgroundColor: "#10B981" }]}
                  />
                  <View style={styles.tripPointContent}>
                    <Text
                      style={[
                        styles.tripPointTime,
                        { color: colors.text.primary },
                      ]}
                    >
                      07:15 AM
                    </Text>
                    <Text
                      style={[
                        styles.tripPointLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Pickup
                    </Text>
                    <Text
                      style={[
                        styles.tripPointLocation,
                        { color: colors.text.primary },
                      ]}
                    >
                      {pickupAddress}
                    </Text>
                  </View>
                </View>
                <View style={styles.tripSeparator} />
                <View style={styles.tripPoint}>
                  <View
                    style={[styles.tripDot, { backgroundColor: "#3B82F6" }]}
                  />
                  <View style={styles.tripPointContent}>
                    <Text
                      style={[
                        styles.tripPointTime,
                        { color: colors.text.primary },
                      ]}
                    >
                      07:45 AM
                    </Text>
                    <Text
                      style={[
                        styles.tripPointLabel,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Drop-off
                    </Text>
                    <Text
                      style={[
                        styles.tripPointLocation,
                        { color: colors.text.primary },
                      ]}
                    >
                      {dropoffAddress}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.liveTripButton,
                  tripLoading && styles.disabledButton,
                ]}
                onPress={openLiveTrip}
                disabled={tripLoading}
              >
                {tripLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.liveTripButtonText}>View Live Trip</Text>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[styles.sectionCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.sectionHeader, { color: colors.text.primary }]}
              >
                Child Information
              </Text>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  Full Name
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {child.name} {child.lastname || ""}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  Grade
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {child.grade || "Grade not set"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  School
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {child.school_name || "School not set"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.text.secondary }]}
                >
                  School ID
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {child.school_id || "--"}
                </Text>
              </View>
            </View>

            <View
              style={[styles.sectionCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.sectionHeader, { color: colors.text.primary }]}
              >
                Locations
              </Text>
              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIconWrap}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#10B981"
                    />
                  </View>
                  <View style={styles.locationTextWrap}>
                    <Text
                      style={[
                        styles.locationTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      Pickup Location (Home)
                    </Text>
                    <Text
                      style={[
                        styles.locationSubtitle,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {pickupAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.locationAction}
                    onPress={() =>
                      openLocationOnMap(
                        "Pickup Location",
                        child?.pickup_latitude,
                        child?.pickup_longitude,
                        pickupAddress,
                      )
                    }
                  >
                    <Text style={styles.locationActionText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationIconWrap}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#3B82F6"
                    />
                  </View>
                  <View style={styles.locationTextWrap}>
                    <Text
                      style={[
                        styles.locationTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      Drop-off Location (School)
                    </Text>
                    <Text
                      style={[
                        styles.locationSubtitle,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {dropoffAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.locationAction}
                    onPress={() =>
                      openLocationOnMap(
                        "Drop-off Location",
                        child?.dropoff_latitude,
                        child?.dropoff_longitude,
                        dropoffAddress,
                      )
                    }
                  >
                    <Text style={styles.locationActionText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View
              style={[styles.sectionCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.sectionHeader, { color: colors.text.primary }]}
              >
                Assigned Vehicle & Driver
              </Text>
              <View style={styles.vehicleSummary}>
                <View style={styles.vehicleSummaryLeft}>
                  <MaterialIcons
                    name="directions-car"
                    size={20}
                    color="#2563EB"
                  />
                  <View style={styles.vehicleSummaryText}>
                    <Text
                      style={[
                        styles.vehicleSummaryTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      {linkedVehicle?.name || "No vehicle assigned"}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleSummarySubtitle,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {linkedVehicle?.license_plate || "No registration"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={openVehicleDetails}
                  style={styles.vehicleViewButton}
                >
                  <Text style={styles.vehicleViewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={openScanner}
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
                <Text style={styles.scanButtonText}>Scan vehicle QR</Text>
              </TouchableOpacity>
              <View style={styles.driverSummary}>
                <View style={styles.driverAvatar}>
                  <Image
                    source={require("@/assets/images/client.png")}
                    style={styles.driverAvatarImage}
                  />
                </View>
                <View style={styles.driverDetails}>
                  <Text
                    style={[styles.driverName, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.driver?.name ||
                      linkedVehicle?.driver_name ||
                      "No driver linked"}
                  </Text>
                  <Text
                    style={[
                      styles.driverRating,
                      { color: colors.text.secondary },
                    ]}
                  >
                    ⭐ 4.9
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={openVehicleDetails}
                  style={styles.driverActionButton}
                >
                  <Text style={styles.driverActionText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[styles.sectionCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.activityHeader}>
                <Text
                  style={[styles.sectionHeader, { color: colors.text.primary }]}
                >
                  Recent Activity
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Activity",
                      "Recent activity details will be available in a future update.",
                    )
                  }
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {[
                {
                  time: "07:15 AM",
                  title: "Picked up from Home",
                  detail: "Today",
                  status: "done",
                },
                {
                  time: "07:22 AM",
                  title: "On the way to School",
                  detail: "Today",
                  status: "progress",
                },
                {
                  time: "07:45 AM",
                  title: "Expected at School",
                  detail: "Today",
                  status: "pending",
                },
              ].map((item, idx) => (
                <View key={idx} style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityMarker,
                      item.status === "done"
                        ? styles.activityMarkerDone
                        : item.status === "progress"
                          ? styles.activityMarkerProgress
                          : styles.activityMarkerPending,
                    ]}
                  />
                  <View style={styles.activityTextWrap}>
                    <Text
                      style={[
                        styles.activityTime,
                        { color: colors.text.primary },
                      ]}
                    >
                      {item.time}
                    </Text>
                    <Text
                      style={[
                        styles.activityTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.activityDetail,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Child details unavailable.
          </Text>
        )}
      </ScrollView>

      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Scan vehicle QR
            </Text>
            <View style={styles.cameraContainer}>
              {cameraPermission === false ? (
                <View style={styles.cameraFallback}>
                  <Text
                    style={[
                      styles.cameraFallbackText,
                      { color: colors.text.primary },
                    ]}
                  >
                    Camera permission is required to scan vehicle QR codes.
                  </Text>
                </View>
              ) : (
                <CameraView
                  style={styles.cameraView}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              )}
              {scanLoading ? (
                <View style={styles.scanLoadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.scanLoadingText}>Linking vehicle…</Text>
                </View>
              ) : null}
              {scanError ? (
                <Text
                  style={[
                    styles.scanError,
                    { color: "#EF4444", marginTop: 12 },
                  ]}
                >
                  {scanError}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setScanModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMenuVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Actions
            </Text>
            {[
              { key: "edit", label: "✏️ Edit Details" },
              { key: "photo", label: "📸 Change Photo" },
              { key: "trip", label: "📍 Trip History" },
              { key: "attendance", label: "📄 Attendance" },
              { key: "absence", label: "🚨 Report Absence" },
              { key: "notifications", label: "🔔 Notifications" },
              { key: "support", label: "💬 Contact Support" },
              { key: "remove", label: "🗑️ Remove Child", destructive: true },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleMenuAction(item.key)}
                style={[
                  styles.menuItem,
                  item.destructive && styles.menuItemDestructive,
                ]}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    item.destructive && styles.menuItemTextDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsMenuVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Edit Child Details
            </Text>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.editForm}
            >
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                First Name
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholder="First name"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                Last Name
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.lastname}
                onChangeText={(value) => handleInputChange("lastname", value)}
                placeholder="Last name"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                Grade
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.grade}
                onChangeText={(value) => handleInputChange("grade", value)}
                placeholder="Grade"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                School
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.school_name}
                onChangeText={(value) =>
                  handleInputChange("school_name", value)
                }
                placeholder="School name"
                placeholderTextColor={colors.text.secondary}
              />
            </KeyboardAvoidingView>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSaveChild}
              disabled={savingChild}
            >
              {savingChild ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMapModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {mapModalTitle}
            </Text>
            <View style={styles.mapContainer}>
              {mapRegion ? (
                <MapView style={styles.mapView} initialRegion={mapRegion}>
                  {mapMarkers.map((marker) => (
                    <Marker
                      key={marker.id}
                      coordinate={marker.coordinate}
                      title={marker.title}
                      description={marker.description}
                    />
                  ))}
                </MapView>
              ) : (
                <View style={styles.cameraFallback}>
                  <Text
                    style={[
                      styles.cameraFallbackText,
                      { color: colors.text.primary },
                    ]}
                  >
                    Map data unavailable.
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsMapModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isVehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Vehicle & Driver
            </Text>
            <View style={styles.vehicleDetailsCard}>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary },
                ]}
              >
                Vehicle
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.name || "No assigned vehicle"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Registration
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.license_plate || "N/A"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Driver
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.driver?.users?.name ||
                  linkedVehicle?.driver_name ||
                  "No assigned driver"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Contact
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.driver?.users?.phone || "Not available"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsVehicleModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMenuVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Actions
            </Text>
            {[
              { key: "edit", label: "✏️ Edit Details" },
              { key: "photo", label: "📸 Change Photo" },
              { key: "trip", label: "📍 Trip History" },
              { key: "attendance", label: "📄 Attendance" },
              { key: "absence", label: "🚨 Report Absence" },
              { key: "notifications", label: "🔔 Notifications" },
              { key: "support", label: "💬 Contact Support" },
              { key: "remove", label: "🗑️ Remove Child", destructive: true },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleMenuAction(item.key)}
                style={[
                  styles.menuItem,
                  item.destructive && styles.menuItemDestructive,
                ]}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    item.destructive && styles.menuItemTextDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsMenuVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Edit Child Details
            </Text>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.editForm}
            >
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                First Name
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholder="First name"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                Last Name
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.lastname}
                onChangeText={(value) => handleInputChange("lastname", value)}
                placeholder="Last name"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                Grade
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.grade}
                onChangeText={(value) => handleInputChange("grade", value)}
                placeholder="Grade"
                placeholderTextColor={colors.text.secondary}
              />
              <Text
                style={[styles.inputLabel, { color: colors.text.secondary }]}
              >
                School
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  { color: colors.text.primary, borderColor: colors.border },
                ]}
                value={editForm.school_name}
                onChangeText={(value) =>
                  handleInputChange("school_name", value)
                }
                placeholder="School name"
                placeholderTextColor={colors.text.secondary}
              />
            </KeyboardAvoidingView>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSaveChild}
              disabled={savingChild}
            >
              {savingChild ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMapModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {mapModalTitle}
            </Text>
            <View style={styles.mapContainer}>
              {mapRegion ? (
                <MapView style={styles.mapView} initialRegion={mapRegion}>
                  {mapMarkers.map((marker) => (
                    <Marker
                      key={marker.id}
                      coordinate={marker.coordinate}
                      title={marker.title}
                      description={marker.description}
                    />
                  ))}
                </MapView>
              ) : (
                <View style={styles.cameraFallback}>
                  <Text
                    style={[
                      styles.cameraFallbackText,
                      { color: colors.text.primary },
                    ]}
                  >
                    Map data unavailable.
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsMapModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isVehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Vehicle & Driver
            </Text>
            <View style={styles.vehicleDetailsCard}>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary },
                ]}
              >
                Vehicle
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.name || "No assigned vehicle"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Registration
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.license_plate || "N/A"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Driver
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.driver?.users?.name ||
                  linkedVehicle?.driver_name ||
                  "No assigned driver"}
              </Text>
              <Text
                style={[
                  styles.vehicleDetailLabel,
                  { color: colors.text.secondary, marginTop: 12 },
                ]}
              >
                Contact
              </Text>
              <Text
                style={[
                  styles.vehicleDetailValue,
                  { color: colors.text.primary },
                ]}
              >
                {linkedVehicle?.driver?.users?.phone || "Not available"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsVehicleModalVisible(false)}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChildDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 120, paddingBottom: 120 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.04)",
  },
  title: { fontSize: 28, fontWeight: "800" },
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  value: { fontSize: 16, lineHeight: 24 },
  vehicleCard: { marginTop: 18, borderRadius: 20, padding: 16 },
  vehicleTitle: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  vehicleText: { fontSize: 14, lineHeight: 20 },
  scanButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  scanButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  scanError: { marginTop: 12, fontSize: 13 },
  emptyText: { fontSize: 15, lineHeight: 22 },
  loadingContainer: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 20,
  },
  modalCard: { width: "100%", borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  cameraContainer: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraView: { width: "100%", height: "100%" },
  cameraFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraFallbackText: { textAlign: "center", fontSize: 15, lineHeight: 22 },
  scanLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  scanLoadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 15,
    fontWeight: "700",
  },
  closeButton: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: { fontSize: 15, fontWeight: "700" },
  menuCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.14)",
  },
  menuItemDestructive: {
    borderBottomColor: "rgba(239,68,68,0.2)",
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "700",
  },
  menuItemTextDestructive: {
    color: "#DC2626",
  },
  editForm: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 13,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "700",
  },
  inputField: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  mapContainer: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 14,
    backgroundColor: "#E5E7EB",
  },
  mapView: {
    width: "100%",
    height: "100%",
  },
  vehicleDetailsCard: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(15,23,42,0.04)",
    marginTop: 14,
  },
  vehicleDetailLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  vehicleDetailValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  topRowWrapper: {
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  topRowWrapperScrolled: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  topRowTitle: {
    flex: 1,
    marginLeft: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.04)",
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    gap: 18,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  heroAvatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarAction: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2563EB",
  },
  heroInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  childIdRow: {
    marginTop: 18,
  },
  childIdLabel: {
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  childIdValue: {
    fontSize: 14,
    lineHeight: 22,
  },
  bannerCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tripCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  tripStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  tripStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  tripTimeline: {
    gap: 18,
  },
  tripPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tripDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginTop: 6,
  },
  tripPointContent: {
    flex: 1,
  },
  tripPointTime: {
    fontSize: 16,
    fontWeight: "800",
  },
  tripPointLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  tripPointLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  tripSeparator: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.2)",
    marginVertical: 14,
  },
  liveTripButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  liveTripButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
  },
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  locationAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  locationActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  vehicleSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  vehicleSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  vehicleSummaryText: {
    flex: 1,
  },
  vehicleSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  vehicleSummarySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  vehicleViewButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  vehicleViewButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  driverSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  driverAvatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
  },
  driverRating: {
    fontSize: 13,
    marginTop: 4,
  },
  driverActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  driverActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  activityMarker: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  activityMarkerDone: {
    backgroundColor: "#10B981",
  },
  activityMarkerProgress: {
    backgroundColor: "#F59E0B",
  },
  activityMarkerPending: {
    backgroundColor: "#60A5FA",
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: "700",
  },
  activityTitle: {
    fontSize: 14,
    marginTop: 4,
  },
  activityDetail: {
    fontSize: 13,
    marginTop: 2,
  },
});
