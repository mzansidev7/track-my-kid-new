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
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl, GOOGLE_API_KEY } from "@/url";

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
    if (!childId || !user?.token) return;
    setLoading(true);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/children/${childId}`, {
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

  console.log({ child });
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

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/children/${childId}/link-vehicle`,
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
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/children/${childId}`, {
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
    const BASE_URL = await resolveWorkingBaseUrl();
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

  const openRouteMap = () => {
    const pickupLat = child?.pickup_latitude;
    const pickupLng = child?.pickup_longitude;
    const dropoffLat = child?.dropoff_latitude;
    const dropoffLng = child?.dropoff_longitude;

    const hasPickup =
      typeof pickupLat === "number" &&
      Number.isFinite(pickupLat) &&
      typeof pickupLng === "number" &&
      Number.isFinite(pickupLng);
    const hasDropoff =
      typeof dropoffLat === "number" &&
      Number.isFinite(dropoffLat) &&
      typeof dropoffLng === "number" &&
      Number.isFinite(dropoffLng);

    if (!hasPickup && !hasDropoff) {
      Alert.alert(
        "Location unavailable",
        "Pickup and drop-off coordinates are not available for this child.",
      );
      return;
    }

    const markers: any[] = [];
    if (hasPickup) {
      markers.push({
        id: "pickup",
        title: "Pickup Location",
        coordinate: { latitude: pickupLat, longitude: pickupLng },
        description: pickupAddress,
      });
    }
    if (hasDropoff) {
      markers.push({
        id: "dropoff",
        title: "Drop-off Location",
        coordinate: { latitude: dropoffLat, longitude: dropoffLng },
        description: dropoffAddress,
      });
    }

    const latitudes = markers.map((marker) => marker.coordinate.latitude);
    const longitudes = markers.map((marker) => marker.coordinate.longitude);
    const centerLat =
      latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length;
    const centerLng =
      longitudes.reduce((sum, value) => sum + value, 0) / longitudes.length;

    setMapMarkers(markers);
    setMapRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(...latitudes) - Math.min(...latitudes) || 0.05,
      longitudeDelta: Math.max(...longitudes) - Math.min(...longitudes) || 0.05,
    });
    setMapModalTitle("Pickup and Drop-off Route");
    setIsMapModalVisible(true);
  };

  const openLiveTrip = async () => {
    const BASE_URL = await resolveWorkingBaseUrl();

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

  const handleRemoveChild = async () => {
    const BASE_URL = await resolveWorkingBaseUrl();

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
  const driverInfo = linkedVehicle?.driver || null;
  const vehicleImageUrl =
    Array.isArray(linkedVehicle?.vehicle_images) &&
    linkedVehicle.vehicle_images.length > 0
      ? typeof linkedVehicle.vehicle_images[0] === "string"
        ? linkedVehicle.vehicle_images[0]
        : linkedVehicle.vehicle_images[0]?.url ||
          linkedVehicle.vehicle_images[0]?.uri ||
          null
      : null;

  const childStatus = child?.is_active !== false ? "Active" : "Inactive";
  const memberSince = child?.created_at
    ? new Date(child.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown";

  const pickupAddress =
    child?.pickup_address ||
    child?.route?.start_location ||
    child?.school_location?.address ||
    "Home";

  const dropoffAddress =
    child?.dropoff_address ||
    child?.school_location?.address ||
    child?.school_address ||
    child?.school_name ||
    "School";

  const routeInfo = child?.route;
  const pickupStartTime =
    routeInfo?.pickup_start_time || routeInfo?.departure_time;
  const pickupEndTime = routeInfo?.pickup_end_time;
  const dropoffStartTime = routeInfo?.dropoff_start_time;
  const dropoffEndTime = routeInfo?.dropoff_end_time;

  const formatDisplayTime = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return value;
  };

  const tripPickupTime = formatDisplayTime(pickupStartTime) || "—";
  const tripDropoffTime = formatDisplayTime(dropoffStartTime) || "—";
  const tripStatusText = pickupStartTime
    ? "On the way to school"
    : dropoffStartTime
      ? "School route active"
      : "Route not assigned";

  const activityItems = [
    {
      time: tripPickupTime,
      title: "Pickup window",
      detail: pickupAddress,
      status: "done",
    },
    {
      time: pickupEndTime ? formatDisplayTime(pickupEndTime) : tripPickupTime,
      title: "En route to school",
      detail: routeInfo?.start_location || "Travel in progress",
      status: "progress",
    },
    {
      time: tripDropoffTime,
      title: "Expected arrival at school",
      detail: dropoffAddress,
      status: "pending",
    },
  ];

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
                      {child.id?.slice(0, 8)}
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
                  <Text style={styles.tripStatusText}>{tripStatusText}</Text>
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
                      {pickupEndTime
                        ? formatDisplayTime(pickupEndTime)
                        : tripPickupTime}
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
                      {dropoffEndTime
                        ? formatDisplayTime(dropoffEndTime)
                        : tripDropoffTime}
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
                  {child.school_id?.slice(0, 8) || "--"}
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
                </View>
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
                </View>
                <TouchableOpacity
                  style={styles.locationAction}
                  onPress={openRouteMap}
                >
                  <Text style={styles.locationActionText}>
                    View Route on Map
                  </Text>
                </TouchableOpacity>
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
              {linkedVehicle?.name && (
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
                </View>
              )}
              <TouchableOpacity
                onPress={openScanner}
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
                <Text style={styles.scanButtonText}>Scan vehicle QR</Text>
              </TouchableOpacity>

              {linkedVehicle?.name && (
                <View style={styles.driverSummary}>
                  {/* <Text>{JSON.stringify(linkedVehicle?.driver)}</Text> */}
                  <View style={styles.driverAvatar}>
                    <Image
                      source={
                        linkedVehicle.driver.avatar
                          ? { uri: linkedVehicle?.driver?.avatar }
                          : require("@/assets/images/client.png")
                      }
                      style={styles.driverAvatarImage}
                    />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text
                      style={[
                        styles.driverName,
                        { color: colors.text.primary },
                      ]}
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
              )}
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
              {activityItems.map((item, idx) => (
                <View key={`${item.title}-${idx}`} style={styles.activityRow}>
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
          <View
            style={[
              styles.modalCard,
              styles.scanModalCard,
              { backgroundColor: colors.surface },
            ]}
          >
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
            </View>
            {scanError ? (
              <Text
                style={[styles.scanError, { color: "#EF4444", marginTop: 12 }]}
              >
                {scanError}
              </Text>
            ) : null}
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
                  {mapMarkers.length > 1 && GOOGLE_API_KEY ? (
                    <MapViewDirections
                      origin={mapMarkers[0].coordinate}
                      destination={mapMarkers[mapMarkers.length - 1].coordinate}
                      apikey={GOOGLE_API_KEY}
                      strokeWidth={5}
                      strokeColor="#2563EB"
                      optimizeWaypoints={true}
                    />
                  ) : null}
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

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailsSectionCard}>
                <Text
                  style={[
                    styles.detailSectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Vehicle Information
                </Text>

                {vehicleImageUrl ? (
                  <Image
                    source={{ uri: vehicleImageUrl }}
                    style={styles.vehicleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.vehicleImagePlaceholder}>
                    <MaterialIcons
                      name="directions-car"
                      size={28}
                      color="#94A3B8"
                    />
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Name
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.name || "No assigned vehicle"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Model
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.model || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Registration
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.license_plate || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Color
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.color || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSectionCard}>
                <Text
                  style={[
                    styles.detailSectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Driver Information
                </Text>

                {(driverInfo?.avatar || linkedVehicle?.driver?.avatar) && (
                  <Image
                    source={{
                      uri: driverInfo?.avatar || linkedVehicle?.driver?.avatar,
                    }}
                    style={styles.driverAvatar}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Name
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.name ||
                      linkedVehicle?.driver_name ||
                      linkedVehicle?.driver?.users?.name ||
                      linkedVehicle?.driver?.name ||
                      "No assigned driver"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Email
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.email ||
                      linkedVehicle?.driver?.users?.email ||
                      linkedVehicle?.driver?.email ||
                      "Not available"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Phone
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.phone ||
                      linkedVehicle?.driver?.users?.phone ||
                      linkedVehicle?.driver?.phone ||
                      "Not available"}
                  </Text>
                </View>
              </View>
            </ScrollView>

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

      <Modal visible={isVehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Vehicle & Driver
            </Text>

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailsSectionCard}>
                <Text
                  style={[
                    styles.detailSectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Vehicle Information
                </Text>

                {vehicleImageUrl ? (
                  <Image
                    source={{ uri: vehicleImageUrl }}
                    style={styles.vehicleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.vehicleImagePlaceholder}>
                    <MaterialIcons
                      name="directions-car"
                      size={28}
                      color="#94A3B8"
                    />
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Name
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.name || "No assigned vehicle"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Model
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.model || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Registration
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.license_plate || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Color
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {linkedVehicle?.color || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSectionCard}>
                <Text
                  style={[
                    styles.detailSectionTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  Driver Information
                </Text>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Name
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.name ||
                      linkedVehicle?.driver_name ||
                      linkedVehicle?.driver?.users?.name ||
                      linkedVehicle?.driver?.name ||
                      "No assigned driver"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Email
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.email ||
                      linkedVehicle?.driver?.users?.email ||
                      linkedVehicle?.driver?.email ||
                      "Not available"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Phone
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {driverInfo?.phone ||
                      linkedVehicle?.driver?.users?.phone ||
                      linkedVehicle?.driver?.phone ||
                      "Not available"}
                  </Text>
                </View>
              </View>
            </ScrollView>

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
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* =========================
     HEADER
  ========================= */

  topRowWrapper: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
    zIndex: 10,
  },

  topRowWrapperScrolled: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.045)",
  },

  topRowTitle: {
    flex: 1,
    marginLeft: 11,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 8,
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.045)",
  },

  /* =========================
     GENERAL CARDS
  ========================= */

  heroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 2,
  },

  bannerCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  tripCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  sectionCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  /* =========================
     CHILD HERO
  ========================= */

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    width: 78,
    height: 78,
    borderRadius: 22,
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
    right: 5,
    bottom: 5,
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2563EB",
  },

  heroInfo: {
    flex: 1,
    marginLeft: 13,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  heroName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },

  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },

  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  heroMetaText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },

  childIdRow: {
    marginTop: 9,
  },

  childIdLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },

  childIdValue: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* =========================
     SAFETY BANNER
  ========================= */

  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  bannerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.10)",
  },

  bannerText: {
    flex: 1,
    marginLeft: 11,
  },

  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },

  bannerDescription: {
    fontSize: 12,
    lineHeight: 17,
  },

  /* =========================
     TODAY'S TRIP
  ========================= */

  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  tripTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  tripStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },

  tripStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },

  tripTimeline: {
    gap: 12,
  },

  tripPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  tripDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    marginTop: 4,
    marginRight: 10,
  },

  tripPointContent: {
    flex: 1,
  },

  tripPointTime: {
    fontSize: 14,
    fontWeight: "800",
  },

  tripPointLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  tripPointLocation: {
    fontSize: 12,
    marginTop: 1,
    lineHeight: 17,
  },

  tripSeparator: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.14)",
    marginLeft: 21,
    marginVertical: 4,
  },

  liveTripButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  liveTripButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4338CA",
  },

  /* =========================
     SECTION HEADERS
  ========================= */

  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: -0.2,
  },

  /* =========================
     INFORMATION
  ========================= */

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },

  infoLabel: {
    fontSize: 12,
  },

  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },

  /* =========================
     LOCATIONS
  ========================= */

  locationCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.13)",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.09)",
  },

  locationTextWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  locationTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  locationSubtitle: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },

  locationAction: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "rgba(59,130,246,0.08)",
  },

  locationActionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },

  /* =========================
     VEHICLE
  ========================= */

  vehicleSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  vehicleSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  vehicleSummaryText: {
    flex: 1,
    marginLeft: 10,
  },

  vehicleSummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
  },

  vehicleSummarySubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  vehicleViewButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.09)",
  },

  vehicleViewButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },

  scanButton: {
    marginTop: 2,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },

  scanButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  driverSummary: {
    flexDirection: "row",
    alignItems: "center",
  },

  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
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
    marginLeft: 10,
  },

  driverName: {
    fontSize: 13,
    fontWeight: "800",
  },

  driverRating: {
    fontSize: 11,
    marginTop: 3,
  },

  driverActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.09)",
  },

  driverActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },

  /* =========================
     ACTIVITY
  ========================= */

  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  viewAllText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.09)",
  },

  activityMarker: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 5,
    marginRight: 10,
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
    fontSize: 11,
    fontWeight: "800",
  },

  activityTitle: {
    fontSize: 12,
    marginTop: 2,
  },

  activityDetail: {
    fontSize: 10,
    marginTop: 2,
  },

  /* =========================
     MODALS
  ========================= */

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.48)",
    padding: 16,
  },

  modalCard: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 20,
    padding: 18,
  },

  scanModalCard: {
    maxHeight: "85%",
    flexDirection: "column",
  },

  modalScrollContent: {
    maxHeight: 430,
  },

  detailsSectionCard: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },

  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  detailValue: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: "62%",
    textAlign: "right",
  },

  vehicleImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },

  vehicleImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "rgba(148,163,184,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },

  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* =========================
     MENU
  ========================= */

  menuCard: {
    width: "100%",
    borderRadius: 20,
    padding: 18,
  },

  menuItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },

  menuItemDestructive: {
    borderBottomColor: "rgba(239,68,68,0.12)",
  },

  menuItemText: {
    fontSize: 13,
    fontWeight: "700",
  },

  menuItemTextDestructive: {
    color: "#DC2626",
  },

  /* =========================
     EDIT FORM
  ========================= */

  editForm: {
    width: "100%",
  },

  inputLabel: {
    fontSize: 11,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "800",
  },

  inputField: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },

  primaryButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  /* =========================
     CAMERA
  ========================= */

  cameraContainer: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 12,
    marginTop: 4,
  },

  cameraView: {
    width: "100%",
    height: "100%",
  },

  cameraFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  cameraFallbackText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },

  scanLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  scanLoadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
  },

  scanError: {
    marginBottom: 12,
    fontSize: 12,
    textAlign: "center",
  },

  /* =========================
     MAP
  ========================= */

  mapContainer: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    backgroundColor: "#E5E7EB",
  },

  mapView: {
    width: "100%",
    height: "100%",
  },

  /* =========================
     STATES
  ========================= */

  loadingContainer: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 40,
  },
});
