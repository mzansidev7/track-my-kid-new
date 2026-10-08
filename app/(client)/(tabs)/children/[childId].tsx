import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import CustomMap from "../../../../components/map";
import AppNotification from "../../../../components/Notification";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl, GOOGLE_API_KEY } from "@/url";
import {
  loadChildDetails,
  loadChildren,
  saveChildDetails,
  updateChildInChildrenCache,
} from "../../../../store/asyncStorage/clientCache";

const getLocalDateKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const getScheduleDateKey = (value?: string) => value?.split("T")[0];

const lightRouteMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#EEF2F5" }] },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#607A98" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#BFDBFE" }],
  },
];

const parseVehicleQrData = (rawData: unknown) => {
  if (rawData && typeof rawData === "object")
    return rawData as Record<string, unknown>;
  if (typeof rawData !== "string") return null;

  const value = rawData.trim();
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // QR codes may contain a legacy text payload instead of JSON.
  }

  try {
    const url = new URL(value);
    const vehicleId =
      url.searchParams.get("vehicleId") || url.searchParams.get("vehicle_id");
    if (vehicleId) return { vehicleId };
  } catch {
    // Continue with the legacy payload parser.
  }

  const vehicleIdMatch = value.match(
    /(?:vehicle[_ -]?id|vehicleId|id)\s*[:=]\s*([0-9a-f-]{20,})/i,
  );
  if (vehicleIdMatch) return { vehicleId: vehicleIdMatch[1] };

  const legacyMatch = value.match(/vehicle:([^:|\n\r]+)/i);
  if (legacyMatch) return { licensePlate: legacyMatch[1].trim() };

  const uuidMatch = value.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  );
  return uuidMatch ? { vehicleId: uuidMatch[0] } : null;
};

const ChildDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId: string }>();
  const childId = params.childId;
  const { colors: themeColors } = useTheme();
  const colors = {
    ...themeColors,
    primary: "#159B3A",
    primaryDark: "#087C2B",
    background: "#F4F9FF",
    surface: "#FFFFFF",
    surfaceHover: "#EDF7FF",
    border: "#DCEAF8",
    divider: "#E7EFF7",
    text: {
      ...themeColors.text,
      primary: "#17365E",
      secondary: "#607A98",
      tertiary: "#7D94AC",
    },
  };
  const { user } = useContext(AuthContext);
  const detailScrollRef = useRef<ScrollView>(null);
  const tripCardOffset = useRef(0);

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingChild, setSavingChild] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null,
  );
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [vehicleLinkNotification, setVehicleLinkNotification] = useState({
    visible: false,
    message: "",
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [selectedDetailTab, setSelectedDetailTab] = useState("live");
  const [mapModalTitle, setMapModalTitle] = useState("");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    lastname: "",
    grade: "",
    school_name: "",
  });
  const [isWeekendScheduleVisible, setIsWeekendScheduleVisible] =
    useState(false);
  const [weekendDate, setWeekendDate] = useState(new Date());
  const [weekendPickupTime, setWeekendPickupTime] = useState(new Date());
  const [weekendDropoffTime, setWeekendDropoffTime] = useState(new Date());
  const [showWeekendTimePicker, setShowWeekendTimePicker] = useState(false);
  const [weekendTimeType, setWeekendTimeType] = useState<"pickup" | "dropoff">(
    "pickup",
  );
  const [weekendTripScheduled, setWeekendTripScheduled] = useState(false);
  const [scheduledTrips, setScheduledTrips] = useState<any[]>([]);
  const [weekendScheduleLoading, setWeekendScheduleLoading] = useState(false);
  const [weekendDialog, setWeekendDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({ visible: false, title: "", message: "" });

  const cacheChild = useCallback(
    async (childData: any) => {
      await Promise.all([
        saveChildDetails(childId, childData),
        updateChildInChildrenCache(childId, childData),
      ]);
    },
    [childId],
  );

  const fetchChild = useCallback(
    async (showError = true) => {
      if (!childId || !user?.token) return;

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
        await cacheChild(data);

        const tripsResponse = await fetch(
          `${baseUrl}/client/children/${childId}/scheduled-trips`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        const tripsData = await tripsResponse.json();
        if (!tripsResponse.ok) {
          throw new Error(
            tripsData.detail ||
              tripsData.error ||
              "Unable to load scheduled weekend trips.",
          );
        }
        const trips = Array.isArray(tripsData) ? tripsData : [];
        setScheduledTrips(trips);
        const today = getLocalDateKey();
        const todaysTrip = trips.find(
          (trip) => getScheduleDateKey(trip.schedule_date) === today,
        );
        setWeekendTripScheduled(Boolean(todaysTrip));
      } catch (err: any) {
        console.error("Fetch child detail error:", err);
        if (showError) {
          Alert.alert(
            "Unable to load child",
            err?.message || "Please try again.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [cacheChild, childId, user?.token],
  );

  const getWeekendOptions = () => {
    const today = new Date();
    const weekendStart = new Date(today);
    const daysUntilWeekend = today.getDay() === 0 ? 0 : 6 - today.getDay();
    weekendStart.setDate(today.getDate() + daysUntilWeekend);

    return Array.from({ length: 8 }, (_, index) => {
      const date = new Date(weekendStart);
      date.setDate(weekendStart.getDate() + index);
      return date;
    });
  };

  const weekendOptions = getWeekendOptions();

  useEffect(() => {
    let active = true;

    const loadCachedChildThenRefresh = async () => {
      if (!childId) {
        setLoading(false);
        return;
      }

      const [cachedDetails, cachedChildren] = await Promise.all([
        loadChildDetails(childId),
        loadChildren(),
      ]);
      const cachedChild =
        cachedDetails ||
        cachedChildren?.find((cached) => cached?.id === childId) ||
        null;

      if (!active) return;
      if (cachedChild) {
        setChild(cachedChild);
        setLoading(false);
      }

      await fetchChild(!cachedChild);
    };

    void loadCachedChildThenRefresh();
    return () => {
      active = false;
    };
  }, [childId, fetchChild]);

  useEffect(() => {
    const driverId = child?.vehicle?.driver?.id;
    if (!isMapModalVisible || !driverId || !user?.token) return;

    let active = true;
    const fetchLiveLocation = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/driver/location/${driverId}?child_id=${childId}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );
        if (!response.ok || !active) return;
        const location = await response.json();
        if (location?.is_online !== true) {
          setMapMarkers((current) =>
            current.filter((marker) => marker.id !== "live-driver"),
          );
          return;
        }
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        setMapMarkers((current) => [
          ...current.filter((marker) => marker.id !== "live-driver"),
          {
            id: "live-driver",
            title: "Driver live location",
            description: "Updated just now",
            coordinate: { latitude, longitude },
          },
        ]);
      } catch (error) {
        console.error("Fetch live driver location error:", error);
      }
    };

    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [child?.vehicle?.driver?.id, isMapModalVisible, user?.token]);

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
      const parsed = parseVehicleQrData(rawData);
      const vehicleId = parsed?.vehicleId || parsed?.vehicle_id || parsed?.id;
      const licensePlate = parsed?.licensePlate || parsed?.license_plate;

      if (!vehicleId && !licensePlate) {
        throw new Error("QR code did not contain a valid vehicle reference.");
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
          body: JSON.stringify({ vehicleId, licensePlate }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to link vehicle.",
        );
      }

      setVehicleLinkNotification({
        visible: true,
        message: data.message || "Child linked to vehicle successfully.",
      });
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
      const markers: any[] = [];
      const addMarker = (
        latitude: unknown,
        longitude: unknown,
        marker: Record<string, unknown>,
      ) => {
        const parsedLatitude = Number(latitude);
        const parsedLongitude = Number(longitude);
        if (
          Number.isFinite(parsedLatitude) &&
          Number.isFinite(parsedLongitude)
        ) {
          markers.push({
            ...marker,
            coordinate: {
              latitude: parsedLatitude,
              longitude: parsedLongitude,
            },
          });
        }
      };

      addMarker(child?.route?.start_latitude, child?.route?.start_longitude, {
        id: "route-start",
        title: child?.route?.start_location || "Route pickup",
        type: "pickup",
        endpoint: "start",
      });
      [...stops]
        .sort(
          (first, second) => (first.stop_order || 0) - (second.stop_order || 0),
        )
        .forEach((stop, index) => {
          addMarker(stop.latitude, stop.longitude, {
            id: `${stop.id}-${index}`,
            title: `${stop.stop_type === "pickup" ? "Home" : "School"} · ${child?.name || "Child"}`,
            type: stop.stop_type,
            description: stop.address || stop.stop_type,
          });
        });
      addMarker(child?.route?.end_latitude, child?.route?.end_longitude, {
        id: "route-end",
        title: child?.route?.end_location || "Route drop-off",
        type: "dropoff",
        endpoint: "end",
      });

      if (markers.length === 0) {
        Alert.alert(
          "No trip data",
          "No trip locations are available for this child.",
        );
        return;
      }

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

  const scheduleWeekendTrip = async () => {
    if (!childId || !user?.token) return;

    if (![0, 6].includes(weekendDate.getDay())) {
      setWeekendDialog({
        visible: true,
        title: "Choose a weekend date",
        message:
          "Weekend transport can only be scheduled for Saturday or Sunday.",
      });
      return;
    }

    setWeekendScheduleLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const selectedDate = [
        weekendDate.getFullYear(),
        weekendDate.getMonth() + 1,
        weekendDate.getDate(),
      ]
        .map((part) => String(part).padStart(2, "0"))
        .join("-");
      const formatScheduleTime = (date: Date) =>
        [date.getHours(), date.getMinutes()]
          .map((part) => String(part).padStart(2, "0"))
          .join(":");
      const selectedPickupTime = formatScheduleTime(weekendPickupTime);
      const selectedDropoffTime = formatScheduleTime(weekendDropoffTime);
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(":").map(Number);
        return hours * 60 + minutes;
      };
      const pickupMinutes = toMinutes(selectedPickupTime);
      const dropoffMinutes = toMinutes(selectedDropoffTime);

      if (
        selectedDate === getLocalDateKey() &&
        new Date(`${selectedDate}T${selectedPickupTime}:00`).getTime() <
          Date.now() + 20 * 60 * 1000
      ) {
        setWeekendScheduleLoading(false);
        setWeekendDialog({
          visible: true,
          title: "Pickup time is too soon",
          message: "Today’s pickup must be at least 20 minutes from now.",
        });
        return;
      }

      if (
        dropoffMinutes <= pickupMinutes ||
        dropoffMinutes - pickupMinutes < 30
      ) {
        setWeekendScheduleLoading(false);
        setWeekendDialog({
          visible: true,
          title: "Invalid trip times",
          message: "Drop-off must be at least 30 minutes after pickup.",
        });
        return;
      }

      if (scheduledTrips.some((trip) => trip.schedule_date === selectedDate)) {
        setWeekendScheduleLoading(false);
        setWeekendDialog({
          visible: true,
          title: "Trip already scheduled",
          message: "This child already has a trip scheduled for that date.",
        });
        return;
      }

      console.log("[weekend-schedule] request", {
        baseUrl,
        childId,
        selectedDate,
        selectedPickupTime,
        selectedDropoffTime,
      });

      const response = await fetch(
        `${baseUrl}/client/children/${childId}/scheduled-trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            schedule_date: selectedDate,
            pickup_time: selectedPickupTime,
            dropoff_time: selectedDropoffTime,
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.detail
            ? `${data.error || "Unable to schedule weekend trip."}: ${data.detail}`
            : data.error || "Unable to schedule weekend trip.",
        );
      }

      setIsWeekendScheduleVisible(false);
      setWeekendDialog({
        visible: true,
        title: "Trip scheduled",
        message: `Weekend transport scheduled for ${selectedDate}. Pickup: ${selectedPickupTime}. Drop-off: ${selectedDropoffTime}.`,
      });
      await fetchChild();
    } catch (error) {
      setWeekendDialog({
        visible: true,
        title: "Scheduling failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to schedule weekend transport.",
      });
    } finally {
      setWeekendScheduleLoading(false);
    }
  };

  const cancelWeekendTrip = async (tripId: string) => {
    if (!childId || !user?.token) return;

    setWeekendDialog({
      visible: true,
      title: "Cancel weekend trip",
      message:
        "Are you sure you want to cancel this weekend transport booking?",
      confirmLabel: "Cancel trip",
      destructive: true,
      onConfirm: async () => {
        setWeekendScheduleLoading(true);
        try {
          const baseUrl = await resolveWorkingBaseUrl();
          const response = await fetch(
            `${baseUrl}/client/scheduled-trips/${encodeURIComponent(tripId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${user.token}` },
            },
          );
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Unable to cancel trip.");
          }

          setWeekendDialog({
            visible: true,
            title: "Trip cancelled",
            message: "Weekend transport was cancelled.",
          });
          await fetchChild();
        } catch (error) {
          setWeekendDialog({
            visible: true,
            title: "Cancellation failed",
            message:
              error instanceof Error
                ? error.message
                : "Unable to cancel weekend transport.",
          });
        } finally {
          setWeekendScheduleLoading(false);
        }
      },
    });
  };

  const cancelAllWeekendTrips = async () => {
    if (!user?.token || scheduledTrips.length === 0) return;

    setWeekendDialog({
      visible: true,
      title: "Cancel all weekend trips",
      message:
        "Are you sure you want to cancel all scheduled weekend trips for this child?",
      confirmLabel: "Cancel all",
      destructive: true,
      onConfirm: async () => {
        setWeekendScheduleLoading(true);
        try {
          const baseUrl = await resolveWorkingBaseUrl();
          await Promise.all(
            scheduledTrips.map(async (trip) => {
              const response = await fetch(
                `${baseUrl}/client/scheduled-trips/${encodeURIComponent(trip.id)}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${user.token}` },
                },
              );
              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Unable to cancel trip.");
              }
            }),
          );
          setWeekendDialog({
            visible: true,
            title: "Trips cancelled",
            message: "All weekend trips were cancelled.",
          });
          await fetchChild();
        } catch (error) {
          setWeekendDialog({
            visible: true,
            title: "Cancellation failed",
            message:
              error instanceof Error
                ? error.message
                : "Unable to cancel weekend trips.",
          });
        } finally {
          setWeekendScheduleLoading(false);
        }
      },
    });
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
        router.push("/(client)/pages/attendance" as never);
        break;
      case "absence":
        router.push("/(client)/pages/attendance" as never);
        break;
      case "notifications":
        router.push("/(client)/pages/notifications" as never);
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
  const hasAssignedVehicle = Boolean(linkedVehicle?.id || child?.vehicle_id);
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

  const isWeekend = [0, 6].includes(new Date().getDay());
  const todayDate = getLocalDateKey();
  const displayedScheduledTrip =
    scheduledTrips.find(
      (trip) => getScheduleDateKey(trip.schedule_date) === todayDate,
    ) ||
    scheduledTrips.find(
      (trip) => (getScheduleDateKey(trip.schedule_date) || "") > todayDate,
    );
  const futureScheduledTrip = scheduledTrips.find(
    (trip) => (getScheduleDateKey(trip.schedule_date) || "") > todayDate,
  );
  const hasFutureScheduledTrips = Boolean(futureScheduledTrip);
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

  const parseClockMinutes = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const pickupStartMinutes = parseClockMinutes(pickupStartTime);
  const pickupEndMinutes = parseClockMinutes(pickupEndTime);
  const dropoffStartMinutes = parseClockMinutes(dropoffStartTime);
  const dropoffEndMinutes = parseClockMinutes(dropoffEndTime);
  let activeTimelineStep = 0;
  if (pickupStartMinutes !== null && currentMinutes >= pickupStartMinutes) {
    activeTimelineStep = 1;
  }
  if (pickupEndMinutes !== null && currentMinutes > pickupEndMinutes) {
    activeTimelineStep = 2;
  }
  if (dropoffStartMinutes !== null && currentMinutes >= dropoffStartMinutes) {
    activeTimelineStep = 3;
  }
  if (dropoffEndMinutes !== null && currentMinutes > dropoffEndMinutes) {
    activeTimelineStep = 4;
  }

  const activityItems = [
    {
      time: tripPickupTime,
      title: "Scheduled",
      detail: "Transport is scheduled for today",
      status: activeTimelineStep > 0 ? "done" : "progress",
    },
    {
      time: tripPickupTime,
      title: "Driver arriving",
      detail: pickupAddress,
      status:
        activeTimelineStep > 1
          ? "done"
          : activeTimelineStep === 1
            ? "progress"
            : "pending",
    },
    {
      time: pickupEndTime ? formatDisplayTime(pickupEndTime) : tripPickupTime,
      title: "Picked up",
      detail: `${child?.name || "Your child"} is with the driver`,
      status:
        activeTimelineStep > 2
          ? "done"
          : activeTimelineStep === 2
            ? "progress"
            : "pending",
    },
    {
      time: dropoffStartTime
        ? formatDisplayTime(dropoffStartTime)
        : tripDropoffTime,
      title: "On route",
      detail: routeInfo?.end_location || "Travelling to school",
      status:
        activeTimelineStep > 3
          ? "done"
          : activeTimelineStep === 3
            ? "progress"
            : "pending",
    },
    {
      time: dropoffEndTime
        ? formatDisplayTime(dropoffEndTime)
        : tripDropoffTime,
      title: "Dropped off",
      detail: dropoffAddress,
      status: activeTimelineStep === 4 ? "progress" : "pending",
    },
  ];

  const routePreviewPoints = [
    {
      id: "pickup",
      latitude: Number(child?.pickup_latitude ?? child?.route?.start_latitude),
      longitude: Number(
        child?.pickup_longitude ?? child?.route?.start_longitude,
      ),
      title: "Pickup",
    },
    {
      id: "dropoff",
      latitude: Number(
        child?.dropoff_latitude ??
          child?.school_latitude ??
          child?.route?.end_latitude,
      ),
      longitude: Number(
        child?.dropoff_longitude ??
          child?.school_longitude ??
          child?.route?.end_longitude,
      ),
      title: child?.school_name || "School",
    },
  ].filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const routePreviewRegion =
    routePreviewPoints.length > 0
      ? {
          latitude:
            routePreviewPoints.reduce((sum, point) => sum + point.latitude, 0) /
            routePreviewPoints.length,
          longitude:
            routePreviewPoints.reduce(
              (sum, point) => sum + point.longitude,
              0,
            ) / routePreviewPoints.length,
          latitudeDelta:
            Math.max(...routePreviewPoints.map((point) => point.latitude)) -
              Math.min(...routePreviewPoints.map((point) => point.latitude)) ||
            0.02,
          longitudeDelta:
            Math.max(...routePreviewPoints.map((point) => point.longitude)) -
              Math.min(...routePreviewPoints.map((point) => point.longitude)) ||
            0.02,
        }
      : null;

  const handleDetailTabPress = (tab: string) => {
    setSelectedDetailTab(tab);
    switch (tab) {
      case "live":
        void openLiveTrip();
        break;
      case "trip":
        detailScrollRef.current?.scrollTo({
          y: tripCardOffset.current,
          animated: true,
        });
        break;
      case "history":
        setIsActivityModalVisible(true);
        break;
      case "attendance":
        router.push("/(client)/pages/attendance" as never);
        break;
      default:
        break;
    }
  };

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
            <Text
              numberOfLines={1}
              style={[styles.pageTitle, { color: colors.text.primary }]}
            >
              {child
                ? `${child.name || ""} ${child.lastname || ""}`.trim()
                : "Child details"}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.pageSubtitle, { color: colors.text.secondary }]}
            >
              {child
                ? `${child.grade ? `Grade ${child.grade}` : "Grade not set"} · ${child.school_name || "School not set"}`
                : "Your child's journey"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsEditModalVisible(true)}
            >
              <MaterialIcons
                name="edit"
                size={18}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.detailTabs}
        >
          {[
            { key: "live", label: "Live Tracking", icon: "my-location" },
            { key: "trip", label: "Trip Details", icon: "route" },
            { key: "history", label: "History", icon: "history" },
            { key: "attendance", label: "Attendance", icon: "event-note" },
          ].map((tab) => {
            const selected = selectedDetailTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                style={[styles.detailTab, selected && styles.detailTabSelected]}
                onPress={() => handleDetailTabPress(tab.key)}
              >
                <MaterialIcons
                  name={tab.icon as never}
                  size={14}
                  color={selected ? "#FFFFFF" : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.detailTabText,
                    selected && styles.detailTabTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        ref={detailScrollRef}
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
                      <MaterialIcons name="school" size={16} color="#159B3A" />
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
                        color="#159B3A"
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
                        color="#159B3A"
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
                  <MaterialIcons name="shield" size={24} color="#159B3A" />
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
              style={[
                styles.locationPreviewCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.locationPreviewHeader}>
                <View style={styles.locationPreviewTitleGroup}>
                  <View style={styles.locationPreviewIcon}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.locationPreviewTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      Route Overview
                    </Text>
                    <Text
                      style={[
                        styles.locationPreviewSubtitle,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {child.school_name || "School route"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.mapRefreshButton}
                  onPress={openRouteMap}
                >
                  <Text style={styles.mapRefreshText}>View route</Text>
                  <MaterialIcons name="open-in-new" size={14} color="#087C2B" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openRouteMap}
                style={styles.routePreviewMapWrap}
              >
                {routePreviewRegion ? (
                  <MapView
                    style={styles.routePreviewMap}
                    initialRegion={routePreviewRegion}
                    mapType="standard"
                    customMapStyle={lightRouteMapStyle}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    pointerEvents="none"
                  >
                    {routePreviewPoints.map((point) => (
                      <Marker
                        key={point.id}
                        coordinate={{
                          latitude: point.latitude,
                          longitude: point.longitude,
                        }}
                        title={point.title}
                        pinColor={point.id === "pickup" ? "#087C2B" : "#159B3A"}
                      />
                    ))}
                    {routePreviewPoints.length > 1 && GOOGLE_API_KEY ? (
                      <MapViewDirections
                        origin={{
                          latitude: routePreviewPoints[0].latitude,
                          longitude: routePreviewPoints[0].longitude,
                        }}
                        destination={{
                          latitude: routePreviewPoints[1].latitude,
                          longitude: routePreviewPoints[1].longitude,
                        }}
                        apikey={GOOGLE_API_KEY}
                        strokeWidth={4}
                        strokeColor="#159B3A"
                      />
                    ) : null}
                  </MapView>
                ) : (
                  <View style={styles.routePreviewEmpty}>
                    <MaterialIcons name="map" size={28} color="#607A98" />
                    <Text style={styles.routePreviewEmptyText}>
                      Route map will appear when locations are available
                    </Text>
                  </View>
                )}
                {routePreviewRegion ? (
                  <View style={styles.mapRoutePill}>
                    <View style={styles.mapRouteDot} />
                    <Text style={styles.mapRoutePillText}>
                      {routeInfo?.route_name || "School Route"}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <View style={styles.nextStopRow}>
                <View style={styles.nextStopDetails}>
                  <MaterialIcons name="place" size={17} color="#159B3A" />
                  <View style={styles.nextStopText}>
                    <Text style={styles.nextStopLabel}>Next Stop</Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.nextStopName,
                        { color: colors.text.primary },
                      ]}
                    >
                      {dropoffAddress}
                    </Text>
                    <Text style={styles.nextStopTime}>
                      ETA {formatDisplayTime(dropoffStartTime)}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeStatusSummary}>
                  <MaterialIcons name="schedule" size={18} color="#159B3A" />
                  <View>
                    <Text style={styles.nextStopLabel}>Route Status</Text>
                    <Text style={styles.routeStatusPillText}>
                      {tripStatusText}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {isWeekend && (
              <View style={styles.weekendBanner}>
                <MaterialIcons name="event" size={20} color="#087C2B" />
                <View style={styles.weekendBannerContent}>
                  <Text style={styles.weekendBannerTitle}>
                    It&apos;s the weekend
                  </Text>
                  <Text style={styles.weekendBannerText}>
                    {weekendTripScheduled
                      ? "Weekend transport is scheduled for today."
                      : futureScheduledTrip
                        ? `Future scheduled trips. Next trip: ${new Date(`${futureScheduledTrip.schedule_date}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}.`
                        : "No weekend transport is scheduled. Schedule a trip below."}
                  </Text>
                </View>
              </View>
            )}

            <View
              onLayout={(event) => {
                tripCardOffset.current = event.nativeEvent.layout.y;
              }}
              style={[styles.tripCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.tripHeader}>
                <Text
                  style={[styles.tripTitle, { color: colors.text.primary }]}
                >
                  {isWeekend
                    ? displayedScheduledTrip
                      ? getScheduleDateKey(
                          displayedScheduledTrip.schedule_date,
                        ) !== todayDate
                        ? "Future Scheduled Trip"
                        : "Weekend Trip"
                      : "Monday's Trip"
                    : "Today's Trip"}
                </Text>
                <View style={styles.tripStatusPill}>
                  <MaterialIcons
                    name="directions-car"
                    size={14}
                    color="#159B3A"
                  />
                  <Text style={styles.tripStatusText}>
                    {isWeekend
                      ? weekendTripScheduled
                        ? "Weekend trip scheduled"
                        : hasFutureScheduledTrips
                          ? "Future scheduled trips"
                          : "No weekend trip scheduled"
                      : tripStatusText}
                  </Text>
                </View>
              </View>
              {isWeekend && displayedScheduledTrip && (
                <Text
                  style={[
                    styles.scheduledTripTime,
                    { color: colors.text.secondary },
                  ]}
                >
                  {getScheduleDateKey(displayedScheduledTrip.schedule_date) !==
                  todayDate
                    ? `Scheduled for ${new Date(`${displayedScheduledTrip.schedule_date}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}. `
                    : ""}
                  Pickup:{" "}
                  {displayedScheduledTrip.pickup_time?.slice(0, 5) || "—"} ·
                  Drop-off:{" "}
                  {displayedScheduledTrip.dropoff_time?.slice(0, 5) || "—"}
                </Text>
              )}
              {!isWeekend || displayedScheduledTrip ? (
                <View style={styles.tripTimeline}>
                  <View style={styles.tripPoint}>
                    <View
                      style={[styles.tripDot, { backgroundColor: "#159B3A" }]}
                    />
                    <View style={styles.tripPointContent}>
                      <Text
                        style={[
                          styles.tripPointTime,
                          { color: colors.text.primary },
                        ]}
                      >
                        {isWeekend && displayedScheduledTrip
                          ? displayedScheduledTrip.pickup_time?.slice(0, 5)
                          : pickupEndTime
                            ? formatDisplayTime(pickupEndTime)
                            : tripPickupTime}
                      </Text>
                      {routeInfo?.start_location && (
                        <>
                          <Text
                            style={[
                              styles.tripPointLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Route start
                          </Text>
                          <Text
                            style={[
                              styles.tripPointLocation,
                              { color: colors.text.primary },
                            ]}
                          >
                            {routeInfo?.start_location || "Route start not set"}
                          </Text>
                        </>
                      )}
                      <Text
                        style={[
                          styles.tripPointLabel,
                          styles.childStopLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Child pickup
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
                      style={[styles.tripDot, { backgroundColor: "#087C2B" }]}
                    />
                    <View style={styles.tripPointContent}>
                      <Text
                        style={[
                          styles.tripPointTime,
                          { color: colors.text.primary },
                        ]}
                      >
                        {isWeekend && displayedScheduledTrip
                          ? displayedScheduledTrip.dropoff_time?.slice(0, 5)
                          : dropoffEndTime
                            ? formatDisplayTime(dropoffEndTime)
                            : tripDropoffTime}
                      </Text>

                      {routeInfo?.end_location && (
                        <>
                          <Text
                            style={[
                              styles.tripPointLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Route end
                          </Text>
                          <Text
                            style={[
                              styles.tripPointLocation,
                              { color: colors.text.primary },
                            ]}
                          >
                            {routeInfo?.end_location || "Route end not set"}
                          </Text>
                        </>
                      )}
                      <Text
                        style={[
                          styles.tripPointLabel,
                          styles.childStopLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Child drop-off
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
              ) : (
                <Text
                  style={[
                    styles.weekendTripMessage,
                    { color: colors.text.secondary },
                  ]}
                >
                  No route is shown because no weekend transport has been
                  scheduled.
                </Text>
              )}
              {hasAssignedVehicle && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.weekendScheduleButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setIsWeekendScheduleVisible(true)}
                    disabled={weekendScheduleLoading}
                  >
                    <MaterialIcons
                      name="event-available"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.weekendScheduleButtonText}>
                      Schedule Weekend Trip
                    </Text>
                  </TouchableOpacity>
                  {scheduledTrips.length > 1 && (
                    <TouchableOpacity
                      style={styles.cancelWeekendButton}
                      onPress={() =>
                        scheduledTrips.length > 1
                          ? cancelAllWeekendTrips()
                          : cancelWeekendTrip(scheduledTrips[0].id)
                      }
                      disabled={weekendScheduleLoading}
                    >
                      <MaterialIcons
                        name="event-busy"
                        size={18}
                        color="#DC2626"
                      />
                      <Text style={styles.cancelWeekendButtonText}>
                        {scheduledTrips.length > 1
                          ? "Cancel All Weekend Trips"
                          : "Cancel Weekend Trip"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {scheduledTrips.map((trip) => (
                    <View key={trip.id} style={styles.scheduledTripRow}>
                      <View style={styles.scheduledTripRowText}>
                        <Text style={styles.scheduledTripRowDate}>
                          {new Date(
                            `${trip.schedule_date}T00:00:00`,
                          ).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        <Text style={styles.scheduledTripRowTimes}>
                          Pickup {String(trip.pickup_time).slice(0, 5)} ·
                          Drop-off {String(trip.dropoff_time).slice(0, 5)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => cancelWeekendTrip(trip.id)}
                        disabled={weekendScheduleLoading}
                      >
                        <Text style={styles.cancelTripText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
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
                <View style={[styles.locationRow, { paddingBottom: 10 }]}>
                  <View style={styles.locationIconWrap}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#159B3A"
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
                <View style={[styles.locationRow, { paddingBottom: 10 }]}>
                  <View style={styles.locationIconWrap}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color="#087C2B"
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
                  style={[styles.locationAction, { paddingTop: 10 }]}
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
                      color="#159B3A"
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
                  accessibilityRole="button"
                  onPress={() => setIsActivityModalVisible(true)}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Child details unavailable.
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={scanModalVisible}
        animationType="slide"
        onRequestClose={() => setScanModalVisible(false)}
      >
        <SafeAreaView style={styles.scanFullScreen}>
          <View style={styles.scanTopBar}>
            <TouchableOpacity
              accessibilityLabel="Close vehicle scanner"
              style={styles.scanCloseButton}
              onPress={() => setScanModalVisible(false)}
            >
              <MaterialIcons name="close" size={23} color="#fff" />
            </TouchableOpacity>
            <View style={styles.scanHeading}>
              <Text style={styles.scanEyebrow}>VEHICLE LINKING</Text>
              <Text style={styles.scanTitle}>Scan vehicle QR</Text>
            </View>
            <View style={styles.scanTopBarSpacer} />
          </View>
          <View style={styles.scanCameraStage}>
            {cameraPermission === false ? (
              <View style={styles.cameraFallback}>
                <MaterialIcons name="no-photography" size={38} color="#fff" />
                <Text style={styles.scanPermissionText}>
                  Camera permission is required to scan vehicle QR codes.
                </Text>
              </View>
            ) : (
              <CameraView
                style={styles.cameraView}
                facing="back"
                onBarcodeScanned={
                  scanLoading ? undefined : handleBarcodeScanned
                }
              />
            )}
            <View pointerEvents="none" style={styles.scanViewfinderWrap}>
              <View style={styles.scanViewfinder}>
                <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                <View
                  style={[styles.scanCorner, styles.scanCornerBottomLeft]}
                />
                <View
                  style={[styles.scanCorner, styles.scanCornerBottomRight]}
                />
                {scanLoading ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : null}
              </View>
            </View>
            {scanLoading ? (
              <View style={styles.scanLoadingOverlay}>
                <Text style={styles.scanLoadingText}>Linking vehicle…</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.scanBottomPanel}>
            <View style={styles.scanInstructionIcon}>
              <MaterialIcons name="qr-code-scanner" size={22} color="#fff" />
            </View>
            <Text style={styles.scanInstructionTitle}>Align the QR code</Text>
            <Text style={styles.scanInstructions}>
              Hold the vehicle code inside the frame. It will scan
              automatically.
            </Text>
            {scanError ? (
              <Text style={styles.scanError}>{scanError}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.scanCancelButton}
              onPress={() => setScanModalVisible(false)}
            >
              <Text style={styles.scanCancelText}>Cancel scanning</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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

      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <SafeAreaView style={styles.fullScreenMapScreen}>
          {mapRegion ? (
            <MapView
              key={mapModalTitle}
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              mapType="standard"
              customMapStyle={lightRouteMapStyle}
              loadingEnabled
              showsCompass
              showsScale
            >
              {mapMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={marker.coordinate}
                  title={marker.title}
                  description={marker.description}
                  pinColor={marker.id === "live-driver" ? "#159B3A" : undefined}
                />
              ))}
              {mapMarkers.length > 1 && GOOGLE_API_KEY ? (
                <MapViewDirections
                  origin={mapMarkers[0].coordinate}
                  destination={mapMarkers[mapMarkers.length - 1].coordinate}
                  apikey={GOOGLE_API_KEY}
                  strokeWidth={5}
                  strokeColor="#159B3A"
                  optimizeWaypoints
                />
              ) : null}
            </MapView>
          ) : (
            <View style={styles.mapEmptyState}>
              <MaterialIcons name="map" size={34} color="#607A98" />
              <Text style={styles.mapEmptyTitle}>Map data unavailable</Text>
            </View>
          )}
          <View style={styles.mapScreenHeader}>
            <TouchableOpacity
              accessibilityLabel="Close map"
              style={styles.mapBackButton}
              onPress={() => setIsMapModalVisible(false)}
            >
              <MaterialIcons name="arrow-back" size={22} color="#17365E" />
            </TouchableOpacity>
            <View style={styles.mapHeaderText}>
              <Text style={styles.mapEyebrow}>CHILD ROUTE</Text>
              <Text style={styles.mapScreenTitle} numberOfLines={1}>
                {mapModalTitle}
              </Text>
            </View>
          </View>
          <View style={styles.mapBottomPanel}>
            <View style={styles.mapPanelHandle} />
            <Text style={styles.mapPanelTitle}>Pickup and drop-off</Text>
            {mapMarkers.map((marker) => (
              <View key={marker.id} style={styles.mapLocationRow}>
                <View
                  style={[
                    styles.mapLocationDot,
                    marker.id === "dropoff" && styles.mapDropoffDot,
                    marker.id === "live-driver" && styles.mapDriverDot,
                  ]}
                />
                <View style={styles.mapLocationText}>
                  <Text style={styles.mapLocationTitle} numberOfLines={1}>
                    {marker.title || "Route location"}
                  </Text>
                  {marker.description ? (
                    <Text style={styles.mapLocationAddress} numberOfLines={2}>
                      {marker.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            {!GOOGLE_API_KEY && Platform.OS === "android" ? (
              <Text style={styles.mapKeyHint}>
                Map tiles need EXPO_PUBLIC_GOOGLE_API_KEY in the native app
                configuration. Rebuild the app after adding the key.
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isWeekendScheduleVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Schedule Weekend Trip
            </Text>
            <Text
              style={[
                styles.scheduleDescription,
                { color: colors.text.secondary },
              ]}
            >
              Choose a Saturday or Sunday for {child?.name || "your child"}.
            </Text>
            <View style={styles.weekendDateOptions}>
              {weekendOptions.map((date) => {
                const isSelected =
                  date.toDateString() === weekendDate.toDateString();
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[
                      styles.weekendDateOption,
                      isSelected && styles.weekendDateOptionSelected,
                    ]}
                    onPress={() => setWeekendDate(date)}
                  >
                    <MaterialIcons
                      name="event"
                      size={16}
                      color={isSelected ? "#fff" : "#159B3A"}
                    />
                    <Text
                      style={[
                        styles.weekendDateOptionText,
                        isSelected && styles.weekendDateOptionTextSelected,
                      ]}
                    >
                      {date.toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text
              style={[
                styles.scheduleTimeLabel,
                { color: colors.text.secondary },
              ]}
            >
              {weekendTimeType === "pickup" ? "Pickup time" : "Drop-off time"}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setWeekendTimeType("pickup");
                setShowWeekendTimePicker(true);
              }}
            >
              <MaterialIcons name="schedule" size={18} color="#159B3A" />
              <Text style={styles.pickerButtonText}>
                {(weekendTimeType === "pickup"
                  ? weekendPickupTime
                  : weekendDropoffTime
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
            {showWeekendTimePicker && (
              <DateTimePicker
                value={
                  weekendTimeType === "pickup"
                    ? weekendPickupTime
                    : weekendDropoffTime
                }
                mode="time"
                display="default"
                onChange={(_, selectedTime) => {
                  setShowWeekendTimePicker(false);
                  if (!selectedTime) return;
                  if (weekendTimeType === "pickup") {
                    setWeekendPickupTime(selectedTime);
                  } else {
                    setWeekendDropoffTime(selectedTime);
                  }
                }}
              />
            )}
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setWeekendTimeType("dropoff");
                setShowWeekendTimePicker(true);
              }}
            >
              <MaterialIcons name="schedule" size={18} color="#159B3A" />
              <Text style={styles.pickerButtonText}>
                Drop-off:{" "}
                {weekendDropoffTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                weekendScheduleLoading && styles.disabledButton,
              ]}
              onPress={scheduleWeekendTrip}
              disabled={weekendScheduleLoading}
            >
              {weekendScheduleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm Schedule</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setIsWeekendScheduleVisible(false)}
              disabled={weekendScheduleLoading}
            >
              <Text style={[styles.closeText, { color: colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={weekendDialog.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.weekendDialogIcon}>
              <MaterialIcons
                name={
                  weekendDialog.destructive ? "event-busy" : "event-available"
                }
                size={24}
                color={weekendDialog.destructive ? "#DC2626" : colors.primary}
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {weekendDialog.title}
            </Text>
            <Text
              style={[
                styles.scheduleDescription,
                { color: colors.text.secondary },
              ]}
            >
              {weekendDialog.message}
            </Text>
            <View style={styles.weekendDialogActions}>
              {weekendDialog.onConfirm && (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: weekendDialog.destructive
                        ? "#DC2626"
                        : colors.primary,
                    },
                  ]}
                  onPress={async () => {
                    const confirm = weekendDialog.onConfirm;
                    setWeekendDialog({
                      visible: false,
                      title: "",
                      message: "",
                    });
                    await confirm?.();
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    {weekendDialog.confirmLabel || "Continue"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { borderColor: colors.border }]}
                onPress={() =>
                  setWeekendDialog({ visible: false, title: "", message: "" })
                }
              >
                <Text
                  style={[styles.closeText, { color: colors.text.primary }]}
                >
                  {weekendDialog.onConfirm ? "Keep booking" : "Close"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isVehicleModalVisible}
        animationType="slide"
        onRequestClose={() => setIsVehicleModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.vehicleFullScreen,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.vehicleScreenHeader}>
            <View style={styles.vehicleHeaderCopy}>
              <Text style={[styles.vehicleEyebrow, { color: colors.primary }]}>
                TRANSPORT DETAILS
              </Text>
              <Text
                style={[
                  styles.vehicleScreenTitle,
                  { color: colors.text.primary },
                ]}
              >
                Vehicle & Driver
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close vehicle and driver details"
              style={[
                styles.vehicleCloseButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => setIsVehicleModalVisible(false)}
            >
              <MaterialIcons
                name="close"
                size={22}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.vehicleModalScroll}
            contentContainerStyle={styles.vehicleModalContent}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
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
        </SafeAreaView>
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

      <Modal
        visible={isActivityModalVisible}
        animationType="slide"
        onRequestClose={() => setIsActivityModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.activityModalScreen,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.activityModalHeader,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.activityModalHeading}>
              <Text style={styles.activityModalEyebrow}>TRIP TIMELINE</Text>
              <Text
                style={[
                  styles.activityModalTitle,
                  { color: colors.text.primary },
                ]}
              >
                Recent Activity
              </Text>
              <Text
                style={[
                  styles.activityModalSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                {child?.name || "Your child"} · Today&apos;s trip
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close recent activity"
              style={[
                styles.activityModalClose,
                { backgroundColor: colors.background },
              ]}
              onPress={() => setIsActivityModalVisible(false)}
            >
              <MaterialIcons
                name="close"
                size={21}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.activityModalScroll}
            contentContainerStyle={styles.activityModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.activityModalList}>
              {activityItems.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.activityRow}>
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
                        { color: colors.text.secondary },
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
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <AppNotification
        message={vehicleLinkNotification.message}
        type="success"
        visible={vehicleLinkNotification.visible}
        onHide={() =>
          setVehicleLinkNotification({ visible: false, message: "" })
        }
      />
    </SafeAreaView>
  );
};

export default ChildDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 34,
  },

  /* =========================
     HEADER
  ========================= */

  topRowWrapper: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DCEAF8",
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
    minHeight: 54,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EDF7FF",
  },

  topRowTitle: {
    flex: 1,
    marginLeft: 11,
  },

  pageTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  pageSubtitle: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EDF7FF",
  },

  detailTabs: {
    alignItems: "center",
    gap: 8,
    paddingTop: 9,
    paddingBottom: 2,
  },

  detailTab: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "#EDF7FF",
  },

  detailTabSelected: {
    backgroundColor: "#159B3A",
  },

  detailTabText: {
    color: "#607A98",
    fontSize: 10,
    fontWeight: "600",
  },

  detailTabTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* =========================
     GENERAL CARDS
  ========================= */

  heroCard: {
    borderRadius: 18,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    shadowColor: "#24415D",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.045,
    shadowRadius: 9,
    elevation: 1,
  },

  bannerCard: {
    borderRadius: 15,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#DCEAF8",
  },

  locationPreviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 1,
  },

  locationPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 9,
  },

  locationPreviewTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  locationPreviewIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#159B3A",
  },

  locationPreviewTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  locationPreviewSubtitle: {
    fontSize: 9,
    marginTop: 2,
  },

  mapRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#EDF7FF",
  },

  mapRefreshText: {
    color: "#087C2B",
    fontSize: 9,
    fontWeight: "700",
  },

  routePreviewMapWrap: {
    height: 152,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#EDF7FF",
  },

  routePreviewMap: {
    width: "100%",
    height: "100%",
  },

  routePreviewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 7,
    backgroundColor: "#EDF7FF",
  },

  routePreviewEmptyText: {
    color: "#607A98",
    fontSize: 10,
    textAlign: "center",
  },

  mapRoutePill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  mapRouteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 3,
    backgroundColor: "#159B3A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  mapRoutePillText: {
    color: "#17365E",
    backgroundColor: "rgba(255,255,255,0.94)",
    overflow: "hidden",
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "800",
  },

  nextStopRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 5,
  },

  nextStopDetails: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    paddingRight: 8,
  },

  nextStopText: {
    flex: 1,
  },

  nextStopLabel: {
    color: "#607A98",
    fontSize: 8,
  },

  nextStopName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  nextStopTime: {
    color: "#607A98",
    fontSize: 8,
    marginTop: 2,
  },

  routeStatusSummary: {
    minWidth: 106,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 9,
    borderLeftWidth: 1,
    borderLeftColor: "#DCEAF8",
  },

  routeStatusPillText: {
    color: "#087C2B",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 3,
  },

  weekendBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E9F8EE",
    borderColor: "#DCEAF8",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },

  weekendBannerContent: {
    flex: 1,
    marginLeft: 10,
  },

  weekendBannerTitle: {
    color: "#087C2B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },

  weekendBannerText: {
    color: "#607A98",
    fontSize: 12,
    lineHeight: 18,
  },

  tripCard: {
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  sectionCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#DCEAF8",
    shadowColor: "#24415D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  /* =========================
     CHILD HERO
  ========================= */

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 25,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#EDF7FF",
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
    backgroundColor: "#159B3A",
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
    backgroundColor: "#E9F8EE",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#087C2B",
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
    backgroundColor: "#E9F8EE",
  },

  tripStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#087C2B",
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

  childStopLabel: {
    marginTop: 8,
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
    backgroundColor: "#EDF7FF",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  liveTripButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#087C2B",
  },

  weekendScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },

  weekendScheduleButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  cancelWeekendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },

  cancelWeekendButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },

  scheduledTripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.06)",
  },

  scheduledTripRowText: {
    flex: 1,
  },

  scheduledTripRowDate: {
    color: "#17365E",
    fontSize: 12,
    fontWeight: "800",
  },

  scheduledTripRowTimes: {
    color: "#607A98",
    fontSize: 11,
    marginTop: 3,
  },

  cancelTripText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 10,
  },

  weekendTripMessage: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 10,
  },

  scheduledTripTime: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: "800",
    color: "#159B3A",
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
    color: "#159B3A",
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
    backgroundColor: "#EDF7FF",
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
    color: "#159B3A",
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

  activityModalScreen: {
    flex: 1,
  },

  activityModalHeader: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.24)",
  },

  activityModalHeading: {
    flex: 1,
  },

  activityModalEyebrow: {
    color: "#159B3A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },

  activityModalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  activityModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  activityModalClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },

  activityModalScroll: {
    flex: 1,
  },

  activityModalContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },

  activityModalList: {
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.08)",
  },

  viewAllText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#159B3A",
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
    backgroundColor: "#159B3A",
  },

  activityMarkerProgress: {
    backgroundColor: "#087C2B",
  },

  activityMarkerPending: {
    backgroundColor: "#607A98",
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

  scanFullScreen: {
    flex: 1,
    backgroundColor: "#101820",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },

  scanTopBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scanCloseButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  scanHeading: {
    flex: 1,
    alignItems: "center",
  },

  scanEyebrow: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  scanTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3,
  },

  scanTopBarSpacer: {
    width: 42,
  },

  scanCameraStage: {
    flex: 1,
    minHeight: 240,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#17232C",
    marginTop: 12,
    marginBottom: 18,
  },

  scanViewfinderWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },

  scanViewfinder: {
    width: 252,
    height: 252,
    alignItems: "center",
    justifyContent: "center",
  },

  scanCorner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#A7F3D0",
  },

  scanCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },

  scanCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },

  scanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },

  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },

  scanPermissionText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 260,
  },

  scanBottomPanel: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  scanInstructionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(167,243,208,0.16)",
    marginBottom: 10,
  },

  scanInstructionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  scanCancelButton: {
    minHeight: 48,
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginTop: 8,
  },

  scanCancelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  scanInstructions: {
    fontSize: 13,
    lineHeight: 19,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 10,
  },

  modalScrollContent: {
    maxHeight: 430,
  },

  vehicleFullScreen: {
    flex: 1,
  },

  vehicleScreenHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.28)",
  },

  vehicleHeaderCopy: {
    flex: 1,
  },

  vehicleEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  vehicleScreenTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },

  vehicleCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleModalScroll: {
    flex: 1,
  },

  vehicleModalContent: {
    padding: 18,
    paddingBottom: 32,
  },

  detailsSectionCard: {
    backgroundColor: "rgba(148,163,184,0.10)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
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

  scheduleDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },

  weekendDateOptions: {
    gap: 8,
  },

  weekendDateOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.09)",
  },

  weekendDateOptionSelected: {
    backgroundColor: "#159B3A",
  },

  weekendDateOptionText: {
    color: "#159B3A",
    fontSize: 13,
    fontWeight: "700",
  },

  weekendDateOptionTextSelected: {
    color: "#fff",
  },

  scheduleTimeLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 2,
  },

  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.09)",
  },

  pickerButtonText: {
    color: "#159B3A",
    fontSize: 13,
    fontWeight: "700",
  },

  weekendDialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.09)",
    marginBottom: 12,
  },

  weekendDialogActions: {
    gap: 2,
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
    flex: 1,
    minHeight: 220,
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
    backgroundColor: "#EDF7FF",
  },

  mapView: {
    width: "100%",
    height: "100%",
  },

  fullScreenMapScreen: {
    flex: 1,
    backgroundColor: "#EDF7FF",
  },

  mapScreenHeader: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  mapBackButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF7FF",
  },

  mapHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  mapEyebrow: {
    color: "#607A98",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  mapScreenTitle: {
    color: "#17365E",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  mapBottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },

  mapPanelHandle: {
    width: 38,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 12,
  },

  mapPanelTitle: {
    color: "#17365E",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  mapLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DCEAF8",
  },

  mapLocationDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#159B3A",
    marginTop: 3,
    marginRight: 12,
  },

  mapDropoffDot: {
    backgroundColor: "#087C2B",
  },

  mapDriverDot: {
    backgroundColor: "#087C2B",
  },

  mapLocationText: {
    flex: 1,
  },

  mapLocationTitle: {
    color: "#17365E",
    fontSize: 13,
    fontWeight: "700",
  },

  mapLocationAddress: {
    color: "#607A98",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  mapKeyHint: {
    color: "#087C2B",
    backgroundColor: "#E9F8EE",
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },

  mapEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF7FF",
  },

  mapEmptyTitle: {
    color: "#17365E",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
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
