import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import GooglePlacesAutoComplete from "../../../../components/GooglePlacesAutoComplete";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useClientTheme } from "../../../../styles/theme";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl, GOOGLE_API_KEY } from "@/url";
import {
  ClientRouteStop,
  getActiveRouteWindow,
  getTodayRouteStops,
  isStopBoardedToday,
  isStopCompletedToday,
} from "@/app-support/client/clientHelpers/utils/routeStops";
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

const formatLastLocation = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const isLongOffline = (value?: string | null, timestamp = Date.now()) => {
  const recordedAt = new Date(value || "").getTime();
  return Number.isFinite(recordedAt) && timestamp - recordedAt >= 10 * 60_000;
};

const getScheduleDateKey = (value?: string) => value?.split("T")[0];

const lightRouteMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#EEF2F5" }] },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#B9AFC4" }],
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
  const params = useLocalSearchParams<{
    childId: string;
    openLiveTrip?: string;
  }>();
  const childId = params.childId;
  const { colors } = useClientTheme();
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const userId = user?.userData?.id || user?.id;
  const detailScrollRef = useRef<ScrollView>(null);
  const tripCardOffset = useRef(0);
  const liveMapRef = useRef<MapView | null>(null);
  const autoOpenedLiveTripForChild = useRef<string | null>(null);

  const [child, setChild] = useState<any>(null);
  const [paymentAccessVerified, setPaymentAccessVerified] = useState(false);
  const [paymentAccessBlocked, setPaymentAccessBlocked] = useState(false);
  const [paymentAccessError, setPaymentAccessError] = useState<string | null>(
    null,
  );
  const routeAccessBlocked = !paymentAccessVerified || paymentAccessBlocked;
  const [routeStops, setRouteStops] = useState<ClientRouteStop[]>([]);
  const [routeMapStops, setRouteMapStops] = useState<ClientRouteStop[]>([]);
  const [previewDriverLocation, setPreviewDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [previewDriverLocationAt, setPreviewDriverLocationAt] = useState<
    string | null
  >(null);
  const [previewDriverStatus, setPreviewDriverStatus] = useState<
    "loading" | "online" | "connection_lost" | "offline" | "unavailable"
  >("loading");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
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
  const [liveLocationStatus, setLiveLocationStatus] = useState<
    "loading" | "live" | "offline" | "unavailable"
  >("loading");
  const [editForm, setEditForm] = useState({
    name: "",
    lastname: "",
    grade: "",
    school_name: "",
    school_address: "",
    school_latitude: null as number | null,
    school_longitude: null as number | null,
  });
  const editSchoolMapRegion = useMemo(() => {
    if (
      editForm.school_latitude === null ||
      editForm.school_longitude === null
    ) {
      return null;
    }

    const latitude = Number(editForm.school_latitude);
    const longitude = Number(editForm.school_longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [editForm.school_latitude, editForm.school_longitude]);
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
        saveChildDetails(childId, childData, userId),
        updateChildInChildrenCache(childId, childData, userId),
      ]);
    },
    [childId, userId],
  );

  const refreshPaymentAccess = useCallback(async () => {
    if (!userToken || !childId) {
      setPaymentAccessVerified(false);
      setPaymentAccessError("Unable to verify payment status.");
      return;
    }
    setPaymentAccessError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/transport-access`, {
        headers: { Authorization: "Bearer " + userToken },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to verify payment status.");
      }
      const unpaidIds = Array.isArray(data?.unpaid_child_ids)
        ? data.unpaid_child_ids
        : [];
      const isUnpaid = unpaidIds.includes(childId);
      setPaymentAccessBlocked(isUnpaid);
      setPaymentAccessVerified(true);
    } catch (error) {
      setPaymentAccessVerified(false);
      console.error("Failed to verify child transport payment access:", error);
      setPaymentAccessError(
        error instanceof Error
          ? error.message
          : "Unable to verify payment status.",
      );
    }
  }, [childId, userToken]);

  useEffect(() => {
    void refreshPaymentAccess();
    const interval = setInterval(() => void refreshPaymentAccess(), 30_000);
    return () => clearInterval(interval);
  }, [refreshPaymentAccess]);

  useEffect(() => {
    if (paymentAccessVerified && !paymentAccessBlocked) return;
    setScanModalVisible(false);
    setIsMapModalVisible(false);
    setIsWeekendScheduleVisible(false);
    setIsActivityModalVisible(false);
  }, [paymentAccessBlocked, paymentAccessVerified]);

  const fetchChild = useCallback(
    async (showError = true) => {
      if (!childId || !user?.token) return;

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/client/children/${childId}?include_restricted_vehicle=true`,
          {
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
        if (data.transport_restricted) {
          setScheduledTrips([]);
          setWeekendTripScheduled(false);
          return;
        }

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

  useEffect(() => {
    if (
      paymentAccessVerified &&
      !paymentAccessBlocked &&
      child?.transport_restricted
    ) {
      void fetchChild(false);
    }
  }, [
    child?.transport_restricted,
    fetchChild,
    paymentAccessBlocked,
    paymentAccessVerified,
  ]);

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
        loadChildDetails(childId, userId),
        loadChildren(userId),
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
  }, [childId, fetchChild, userId]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const routeId = child?.route?.id;
    if (routeAccessBlocked || !routeId || !childId || !user?.token) return;

    let active = true;
    const loadRouteStops = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/client/children/${childId}/route-stops`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        if (!response.ok) {
          throw new Error(`Unable to load route stops (${response.status}).`);
        }
        const data = await response.json();
        if (!active) return;
        setRouteStops(
          (Array.isArray(data) ? data : []).filter(
            (stop) => stop.route_id === routeId,
          ),
        );
      } catch (error) {
        if (active) {
          console.error("Failed to load child route activity", error);
        }
      }
    };

    void loadRouteStops();
    const interval = setInterval(() => void loadRouteStops(), 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [child?.route?.id, childId, routeAccessBlocked, user?.token]);

  const currentRouteStops = routeStops.filter(
    (stop) => stop.route_id === child?.route?.id,
  );
  const todayRouteStops = getTodayRouteStops(
    currentRouteStops,
    new Date(currentTime),
  );
  const activeRouteWindow = getActiveRouteWindow(
    child?.route,
    new Date(currentTime),
    todayRouteStops,
  );
  const activeRouteDirection = activeRouteWindow?.direction;
  const driverId = child?.vehicle?.driver?.id;
  const routePreviewStatus = !activeRouteDirection
    ? "unavailable"
    : !driverId
      ? "offline"
      : !user?.token
        ? "unavailable"
        : previewDriverStatus;
  const routePreviewLongOffline =
    routePreviewStatus === "connection_lost" &&
    isLongOffline(previewDriverLocationAt, currentTime);
  const routePreviewDriverLocation =
    activeRouteDirection &&
    driverId &&
    routePreviewStatus === "online"
      ? previewDriverLocation
      : null;

  useEffect(() => {
    if (
      routeAccessBlocked ||
      !activeRouteDirection ||
      !driverId ||
      !childId ||
      !user?.token
    ) {
      return;
    }

    let active = true;
    const loadDriverAndRoute = async () => {
      setPreviewDriverStatus("loading");
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const locationResponse = await fetch(
          `${baseUrl}/driver/location/${driverId}?child_id=${childId}&route_id=${encodeURIComponent(child.route.id)}`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        if (!locationResponse.ok) {
          throw new Error("Unable to read current driver location.");
        }
        const location = await locationResponse.json();
        if (active) {
          setPreviewDriverLocationAt(location?.recorded_at || null);
        }
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        const trackingThisRoute =
          location?.is_tracking === true &&
          location?.tracking_route_id === child.route.id;
        if (
          !active ||
          !trackingThisRoute ||
          location?.is_online !== true ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          if (active) {
            setPreviewDriverLocation(null);
            setRouteMapStops([]);
            setPreviewDriverStatus(
              trackingThisRoute ? "connection_lost" : "offline",
            );
          }
          return;
        }

        const stopsResponse = await fetch(
          `${baseUrl}/client/children/${childId}/route-stops?route_id=${encodeURIComponent(child.route.id)}&include_route_stops=true`,
          { headers: { Authorization: `Bearer ${user.token}` } },
        );
        if (!stopsResponse.ok) {
          throw new Error("Unable to load active driver stops.");
        }
        const stops = await stopsResponse.json();
        if (!active) return;
        setPreviewDriverLocation({ latitude, longitude });
        setRouteMapStops(Array.isArray(stops) ? stops : []);
        setPreviewDriverStatus("online");
      } catch (error) {
        if (active) {
          setPreviewDriverLocation(null);
          setRouteMapStops([]);
          setPreviewDriverStatus("unavailable");
          console.error("Failed to load live route overview", error);
        }
      }
    };

    void loadDriverAndRoute();
    const interval = setInterval(() => void loadDriverAndRoute(), 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    activeRouteDirection,
    child?.route?.id,
    driverId,
    childId,
    routeAccessBlocked,
    user?.token,
  ]);

  useEffect(() => {
    if (
      routeAccessBlocked ||
      !isMapModalVisible ||
      mapModalTitle !== "Live Trip"
    ) {
      return;
    }

    const driverId = child?.vehicle?.driver?.id;
    if (!driverId || !user?.token) return;
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
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "LIVE_LOCATION_UNAVAILABLE");
        }
        if (!active) return;
        const location = await response.json();
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        if (
          location?.is_online !== true ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          setLiveLocationStatus("offline");
          setMapMarkers((current) =>
            current.filter((marker) => marker.id !== "live-driver"),
          );
          return;
        }

        const coordinate = { latitude, longitude };
        setLiveLocationStatus("live");
        setMapMarkers((current) => [
          ...current.filter((marker) => marker.id !== "live-driver"),
          {
            id: "live-driver",
            title: "Driver live location",
            description: `Updated ${new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            coordinate,
          },
        ]);
        liveMapRef.current?.animateToRegion(
          { ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 },
          600,
        );
      } catch (error) {
        if (active) setLiveLocationStatus("unavailable");
        console.error("Fetch live driver location error:", error);
      }
    };

    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    child?.vehicle?.driver?.id,
    childId,
    isMapModalVisible,
    mapModalTitle,
    routeAccessBlocked,
    user?.token,
  ]);

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
      school_address:
        child.school_address ||
        child.school_location?.address ||
        child.dropoff_address ||
        "",
      school_latitude:
        child.dropoff_latitude ??
        child.school_latitude ??
        child.school_location?.latitude ??
        null,
      school_longitude:
        child.dropoff_longitude ??
        child.school_longitude ??
        child.school_location?.longitude ??
        null,
    });
  }, [child]);

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSchoolInputChange = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      school_name: value,
      school_address: value,
      school_latitude: null,
      school_longitude: null,
    }));
  };

  const handleSchoolSelect = (
    name: string,
    coordinates: { latitude: number; longitude: number } | null,
    details?: { address?: string },
  ) => {
    setEditForm((prev) => ({
      ...prev,
      school_name: name,
      school_address: details?.address || name,
      school_latitude: coordinates?.latitude ?? null,
      school_longitude: coordinates?.longitude ?? null,
    }));
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
          school_address: editForm.school_address,
          school_latitude: editForm.school_latitude,
          school_longitude: editForm.school_longitude,
          dropoff_address: editForm.school_address,
          dropoff_latitude: editForm.school_latitude,
          dropoff_longitude: editForm.school_longitude,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to save child.");
      }

      const updatedChild = {
        ...child,
        ...(data.child || data),
        name: editForm.name,
        lastname: editForm.lastname,
        grade: editForm.grade,
        school_name: editForm.school_name,
        school_address: editForm.school_address,
        school_latitude: editForm.school_latitude,
        school_longitude: editForm.school_longitude,
        dropoff_address: editForm.school_address,
        dropoff_latitude: editForm.school_latitude,
        dropoff_longitude: editForm.school_longitude,
      };
      setChild(updatedChild);
      await cacheChild(updatedChild);
      setIsEditModalVisible(false);
      void fetchChild(false);
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
    const markers: any[] = routePreviewPoints.map((point) => ({
      id: point.id,
      title: point.title,
      coordinate: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
    }));
    if (activeRouteWindow && routePreviewDriverLocation) {
      markers.push({
        id: "live-driver",
        title: "Driver live location",
        coordinate: routePreviewDriverLocation,
      });
    }

    if (markers.length === 0) {
      Alert.alert(
        "Location unavailable",
        "Pickup and drop-off coordinates are not available for this child.",
      );
      return;
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
    setMapModalTitle(activeRouteWindow ? "Live Trip" : "Pickup and Drop-off Route");
    setIsMapModalVisible(true);
  };

  const openLiveTrip = useCallback(async () => {
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
      setLiveLocationStatus("loading");
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
  }, [child, childId, user]);

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
        if (!routeAccessBlocked) await openLiveTrip();
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
  const detailNow = new Date(currentTime);
  const detailCurrentMinutes =
    detailNow.getHours() * 60 + detailNow.getMinutes();
  const getClockMinutes = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes)
        ? hours * 60 + minutes
        : null;
  };
  const pickupMinutes = getClockMinutes(pickupStartTime);
  const dropoffMinutes = getClockMinutes(dropoffStartTime);
  const nextWindowLabel =
    pickupMinutes !== null && pickupMinutes > detailCurrentMinutes
        ? `Pickup at ${tripPickupTime}`
        : dropoffMinutes !== null && dropoffMinutes > detailCurrentMinutes
          ? `Drop-off at ${tripDropoffTime}`
          : `Pickup at ${tripPickupTime} next school day`;
  const pickupStop = todayRouteStops.find(
    (stop) => stop.stop_type === "pickup",
  );
  const dropoffStop = todayRouteStops.find(
    (stop) => stop.stop_type === "dropoff",
  );
  const pickupCompleted = isStopCompletedToday(
    pickupStop,
    new Date(currentTime),
  );
  const dropoffCompleted = isStopCompletedToday(
    dropoffStop,
    new Date(currentTime),
  ) && Boolean(dropoffStop?.handoff_verified_at);
  const schoolBoarded = isStopBoardedToday(
    dropoffStop,
    new Date(currentTime),
  );
  const childBoarded = pickupCompleted || schoolBoarded;
  const tripStatusText = dropoffCompleted
    ? "Completed · handoff verified"
    : childBoarded
      ? dropoffStop?.status === "in_progress"
        ? "Arrived at destination · handoff pending"
        : schoolBoarded
          ? "Picked up · on the way home"
          : "Picked up · on the way to school"
      : activeRouteWindow
        ? pickupStop?.status === "in_progress" ||
            dropoffStop?.status === "in_progress"
          ? "Driver arrived · pickup not confirmed"
          : "Awaiting pickup confirmation"
        : pickupStartTime || dropoffStartTime
          ? `Next window · ${nextWindowLabel}`
          : "Route not assigned";
  const pickupConfirmed = Boolean(
    pickupStop &&
      ["in_progress", "completed"].includes(pickupStop.status || ""),
  );
  const formatActivityTime = (value?: string | null, fallback = "—") => {
    if (!value) return fallback;
    return formatDisplayTime(value);
  };

  const activityItems = [
    {
      time: tripPickupTime,
      title: "Scheduled",
      detail: `Pickup planned for ${tripPickupTime}`,
      status: "pending",
    },
    {
      time: formatActivityTime(pickupStop?.status_updated_at, tripPickupTime),
      title: "Driver arriving",
      detail: pickupAddress,
      status: pickupConfirmed ? (pickupCompleted ? "done" : "progress") : "pending",
    },
    {
      time: formatActivityTime(
        schoolBoarded
          ? dropoffStop?.boarded_at
          : pickupStop?.status_updated_at,
        pickupEndTime ? formatDisplayTime(pickupEndTime) : tripPickupTime,
      ),
      title: "Picked up",
      detail: schoolBoarded
        ? `${child?.name || "Your child"} boarded at school`
        : `${child?.name || "Your child"} is with the driver`,
      status: childBoarded ? "done" : "pending",
    },
    {
      time: formatActivityTime(
        dropoffCompleted
          ? dropoffStop?.handoff_verified_at || dropoffStop?.status_updated_at
          : null,
        dropoffStartTime ? formatDisplayTime(dropoffStartTime) : tripDropoffTime,
      ),
      title: "On route",
      detail: routeInfo?.end_location || "Travelling to school",
      status: dropoffCompleted
        ? "done"
        : childBoarded
          ? "progress"
          : "pending",
    },
    {
      time: formatActivityTime(
        dropoffStop?.handoff_verified_at || dropoffStop?.status_updated_at,
        dropoffEndTime ? formatDisplayTime(dropoffEndTime) : tripDropoffTime,
      ),
      title: "Dropped off",
      detail: dropoffAddress,
      status: dropoffCompleted ? "done" : "pending",
    },
  ];

  const plannedRoutePoints = [
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
          child?.school_location?.latitude ??
          child?.route?.end_latitude,
      ),
      longitude: Number(
        child?.dropoff_longitude ??
          child?.school_longitude ??
          child?.school_location?.longitude ??
          child?.route?.end_longitude,
      ),
      title: child?.school_name || "School",
    },
  ].filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const activeDriverStopPoints =
    activeRouteWindow && routePreviewStatus === "online"
      ? routeMapStops
          .slice()
          .sort((first, second) => (first.stop_order || 0) - (second.stop_order || 0))
          .map((stop, index) => {
            const isChildStop = String(stop.child_id) === String(childId);
            const isSchoolStop = stop.stop_type === "dropoff";
            const childLatitude = Number(
              isSchoolStop
                ? (child?.dropoff_latitude ??
                    child?.school_latitude ??
                    child?.school_location?.latitude)
                : child?.pickup_latitude,
            );
            const childLongitude = Number(
              isSchoolStop
                ? (child?.dropoff_longitude ??
                    child?.school_longitude ??
                    child?.school_location?.longitude)
                : child?.pickup_longitude,
            );
            const useUpdatedChildLocation =
              isChildStop &&
              Number.isFinite(childLatitude) &&
              Number.isFinite(childLongitude);

            return {
              id: `driver-stop-${index}`,
              latitude: useUpdatedChildLocation
                ? childLatitude
                : Number(stop.latitude),
              longitude: useUpdatedChildLocation
                ? childLongitude
                : Number(stop.longitude),
              title: isChildStop
                ? isSchoolStop
                  ? `${child?.school_name || "School"} · ${child?.name || "Child"}`
                  : `Pickup · ${child?.name || "Child"}`
                : `Driver stop ${index + 1}`,
            };
          })
          .filter(
            (point) =>
              Number.isFinite(point.latitude) &&
              Number.isFinite(point.longitude),
          )
      : [];
  const routePreviewPoints =
    activeDriverStopPoints.length > 1
      ? activeDriverStopPoints
      : plannedRoutePoints;
  const previewMapPoints = [
    ...routePreviewPoints,
    ...(activeRouteWindow && routePreviewDriverLocation
      ? [
          {
            id: "live-driver",
            latitude: routePreviewDriverLocation.latitude,
            longitude: routePreviewDriverLocation.longitude,
            title: "Driver live location",
          },
        ]
      : []),
  ];
  const routePreviewRegion =
    previewMapPoints.length > 0
      ? {
          latitude:
            previewMapPoints.reduce((sum, point) => sum + point.latitude, 0) /
            previewMapPoints.length,
          longitude:
            previewMapPoints.reduce(
              (sum, point) => sum + point.longitude,
              0,
            ) / previewMapPoints.length,
          latitudeDelta:
            Math.max(...previewMapPoints.map((point) => point.latitude)) -
              Math.min(...previewMapPoints.map((point) => point.latitude)) ||
            0.02,
          longitudeDelta:
            Math.max(...previewMapPoints.map((point) => point.longitude)) -
              Math.min(...previewMapPoints.map((point) => point.longitude)) ||
            0.02,
        }
      : null;
  const visibleLiveLocationStatus =
    !routeAccessBlocked && child?.vehicle?.driver?.id && user?.token
      ? liveLocationStatus
      : "unavailable";

  const handleDetailTabPress = (tab: string) => {
    if (routeAccessBlocked && tab !== "attendance") return;
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

  const detailTabs = routeAccessBlocked
    ? [{ key: "attendance", label: "Attendance", icon: "event-note" }]
    : [
        { key: "live", label: "Live Tracking", icon: "my-location" },
        { key: "trip", label: "Trip Details", icon: "route" },
        { key: "history", label: "History", icon: "history" },
        { key: "attendance", label: "Attendance", icon: "event-note" },
      ];

  useEffect(() => {
    if (
      params.openLiveTrip !== "true" ||
      !child ||
      routeAccessBlocked ||
      loading ||
      tripLoading ||
      autoOpenedLiveTripForChild.current === childId
    ) {
      return;
    }

    autoOpenedLiveTripForChild.current = childId;
    setSelectedDetailTab("live");
    void openLiveTrip();
  }, [
    child,
    childId,
    loading,
    openLiveTrip,
    params.openLiveTrip,
    routeAccessBlocked,
    tripLoading,
  ]);

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
          {detailTabs.map((tab) => {
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
        {loading && !child ? (
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
                      <MaterialIcons name="school" size={16} color="#C14BFF" />
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
                        color="#C14BFF"
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
                        color="#C14BFF"
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
                    <MaterialIcons
                      name="fingerprint"
                      size={16}
                      color="#C14BFF"
                    />
                    <Text style={[styles.childIdLabel, { color: "#527064" }]}>
                      CHILD ID
                    </Text>
                    <Text style={[styles.childIdValue, { color: "#FBF8FF" }]}>
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
                  <MaterialIcons name="shield" size={24} color="#C14BFF" />
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

            {routeAccessBlocked ? (
              <View
                style={{
                  marginBottom: 18,
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#F59E0B",
                  backgroundColor: "#2A1B0A",
                }}
              >
                <Text style={{ color: "#FDE68A", fontWeight: "800" }}>
                  {paymentAccessError
                    ? "Route details are temporarily hidden"
                    : paymentAccessVerified
                      ? "Transport services paused"
                      : "Checking payment status"}
                </Text>
                <Text
                  style={{
                    color: "#FCD34D",
                    fontSize: 12,
                    lineHeight: 17,
                    marginTop: 5,
                  }}
                >
                  {paymentAccessError
                    ? "Route information remains hidden until payment status can be verified."
                    : paymentAccessVerified
                      ? "This child has an outstanding owner payment. Route details and trip tracking are hidden; child, school, vehicle, and driver details remain available."
                      : "Route information is hidden until payment status is verified. Child, school, vehicle, and driver details remain available."}
                </Text>
                {paymentAccessBlocked ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/(client)/pages/payments" as never)
                    }
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: "#F59E0B",
                    }}
                  >
                    <Text style={{ color: "#1C1205", fontWeight: "800" }}>
                      View payments
                    </Text>
                  </TouchableOpacity>
                ) : paymentAccessError ? (
                  <TouchableOpacity
                    onPress={() => void refreshPaymentAccess()}
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: "#F59E0B",
                    }}
                  >
                    <Text style={{ color: "#1C1205", fontWeight: "800" }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
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
                  <MaterialIcons name="open-in-new" size={14} color="#C14BFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openRouteMap}
                style={styles.routePreviewMapWrap}
              >
                {routePreviewRegion ? (
                  <MapView
                    key={routePreviewPoints
                      .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
                      .join("|")}
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
                        pinColor={
                          point.id === "pickup" || point.id === "driver-stop-0"
                            ? "#C14BFF"
                            : "#C14BFF"
                        }
                      />
                    ))}
                    {activeRouteWindow &&
                    routePreviewStatus === "online" &&
                    routePreviewDriverLocation ? (
                      <Marker
                        key="driver-live"
                        coordinate={routePreviewDriverLocation}
                        title="Driver live location"
                        pinColor="#2563EB"
                      />
                    ) : null}
                    {routePreviewPoints.length > 1 && GOOGLE_API_KEY ? (
                      <MapViewDirections
                        origin={{
                          latitude: routePreviewPoints[0].latitude,
                          longitude: routePreviewPoints[0].longitude,
                        }}
                        destination={{
                          latitude:
                            routePreviewPoints[routePreviewPoints.length - 1]
                              .latitude,
                          longitude:
                            routePreviewPoints[routePreviewPoints.length - 1]
                              .longitude,
                        }}
                        waypoints={routePreviewPoints.slice(1, -1).map((point) => ({
                          latitude: point.latitude,
                          longitude: point.longitude,
                        }))}
                        apikey={GOOGLE_API_KEY}
                        strokeWidth={4}
                        strokeColor="#C14BFF"
                      />
                    ) : null}
                  </MapView>
                ) : (
                  <View style={styles.routePreviewEmpty}>
                    <MaterialIcons name="map" size={28} color="#B9AFC4" />
                    <Text style={styles.routePreviewEmptyText}>
                      Route map will appear when locations are available
                    </Text>
                  </View>
                )}
                {routePreviewRegion ? (
                  <View style={styles.mapRoutePill}>
                    <View style={styles.mapRouteDot} />
                    <Text style={styles.mapRoutePillText}>
                      {activeRouteWindow && routePreviewStatus === "online"
                        ? "Live driver route"
                        : routeInfo?.route_name || "Home to school"}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              {activeRouteWindow ? (
                <View style={styles.routeLiveStatus}>
                  <View
                    style={[
                      styles.routeLiveStatusDot,
                      {
                        backgroundColor:
                          routePreviewStatus === "online"
                            ? "#C14BFF"
                            : routePreviewStatus === "loading" ||
                                routePreviewStatus === "connection_lost"
                              ? routePreviewLongOffline
                                ? "#B91C1C"
                                : "#D97706"
                              : "#DC2626",
                      },
                    ]}
                  />
                  <Text style={styles.routeLiveStatusText}>
                    {routePreviewStatus === "online"
                      ? "Driver is online · all route stops are shown"
                      : routePreviewStatus === "loading"
                        ? "Active window · checking driver connection"
                        : routePreviewStatus === "connection_lost"
                          ? `${routePreviewLongOffline ? "Warning · no driver location for 10+ min" : "Trip active · driver connection lost"}${formatLastLocation(previewDriverLocationAt) ? ` · last location ${formatLastLocation(previewDriverLocationAt)}` : ""}`
                        : routePreviewStatus === "offline"
                          ? "Active window · driver is offline; live tracking is unavailable"
                          : "Active window · driver location is unavailable"}
                  </Text>
                </View>
              ) : null}
              <View style={styles.nextStopRow}>
                <View style={styles.nextStopDetails}>
                  <MaterialIcons name="place" size={17} color="#C14BFF" />
                  <View style={styles.nextStopText}>
                    <Text style={styles.nextStopLabel}>Next Stop</Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.nextStopName,
                        { color: colors.text.primary },
                      ]}
                    >
                      {activeRouteWindow?.direction === "dropoff"
                        ? pickupAddress
                        : dropoffAddress}
                    </Text>
                    <Text style={styles.nextStopTime}>
                      {activeRouteWindow
                        ? `ETA ${formatDisplayTime(
                            activeRouteWindow.direction === "dropoff"
                              ? dropoffEndTime
                              : pickupEndTime,
                          )}`
                        : `Next window · ${nextWindowLabel}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeStatusSummary}>
                  <MaterialIcons name="schedule" size={18} color="#C14BFF" />
                  <View>
                    <Text style={styles.nextStopLabel}>Route Status</Text>
                    <Text style={styles.routeStatusPillText}>
                      {tripStatusText}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            )}

            {!routeAccessBlocked && isWeekend && (
              <View style={styles.weekendBanner}>
                <MaterialIcons name="event" size={20} color="#C14BFF" />
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

            {!routeAccessBlocked && (
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
                    color="#C14BFF"
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
                      style={[styles.tripDot, { backgroundColor: "#9B2BE7" }]}
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
                      style={[styles.tripDot, { backgroundColor: "#9B2BE7" }]}
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
            )}

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
                      color="#C14BFF"
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
              {!routeAccessBlocked ? (
                <TouchableOpacity
                  onPress={openScanner}
                  style={[
                    styles.scanButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.scanButtonText}>Scan vehicle QR</Text>
                </TouchableOpacity>
              ) : null}

              {linkedVehicle?.name && (
                <View style={styles.driverSummary}>
                  <View style={styles.driverAvatar}>
                    <Image
                      source={
                        linkedVehicle.driver?.avatar
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

            {!routeAccessBlocked ? (
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
            ) : null}
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Child details unavailable.
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={
          scanModalVisible && paymentAccessVerified && !paymentAccessBlocked
        }
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
            ]
              .filter((item) => !routeAccessBlocked || item.key !== "trip")
              .map((item) => (
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
              <GooglePlacesAutoComplete
                value={editForm.school_name}
                onChangeText={handleSchoolInputChange}
                onSelect={handleSchoolSelect}
                placeholder="Search or select school"
                suggestionsPlacement="below"
              />
              <View
                pointerEvents="none"
                style={{
                  height: 160,
                  marginTop: 10,
                  overflow: "hidden",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {editSchoolMapRegion ? (
                  <MapView
                    key={`${editSchoolMapRegion.latitude},${editSchoolMapRegion.longitude}`}
                    style={{ flex: 1 }}
                    initialRegion={editSchoolMapRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    moveOnMarkerPress={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: editSchoolMapRegion.latitude,
                        longitude: editSchoolMapRegion.longitude,
                      }}
                      title={editForm.school_name || "School"}
                    />
                  </MapView>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surface,
                    }}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={24}
                      color={colors.text.secondary}
                    />
                    <Text
                      style={{
                        marginTop: 4,
                        color: colors.text.secondary,
                        fontSize: 12,
                      }}
                    >
                      Select a school to show its location
                    </Text>
                  </View>
                )}
              </View>
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
        visible={
          isMapModalVisible && paymentAccessVerified && !paymentAccessBlocked
        }
        animationType="slide"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <SafeAreaView style={styles.fullScreenMapScreen}>
          {mapRegion ? (
            <MapView
              ref={liveMapRef}
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
                  pinColor={marker.id === "live-driver" ? "#C14BFF" : undefined}
                />
              ))}
              {mapMarkers.length > 1 && GOOGLE_API_KEY ? (
                <MapViewDirections
                  origin={mapMarkers[0].coordinate}
                  destination={mapMarkers[mapMarkers.length - 1].coordinate}
                  apikey={GOOGLE_API_KEY}
                  strokeWidth={5}
                  strokeColor="#C14BFF"
                  optimizeWaypoints
                />
              ) : null}
            </MapView>
          ) : (
            <View style={styles.mapEmptyState}>
              <MaterialIcons name="map" size={34} color="#B9AFC4" />
              <Text style={styles.mapEmptyTitle}>Map data unavailable</Text>
            </View>
          )}
          <View style={styles.mapScreenHeader}>
            <TouchableOpacity
              accessibilityLabel="Close map"
              style={styles.mapBackButton}
              onPress={() => setIsMapModalVisible(false)}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FBF8FF" />
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
            {mapModalTitle === "Live Trip" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor:
                    visibleLiveLocationStatus === "live"
                      ? "#1C1026"
                      : "#F3F4F6",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      visibleLiveLocationStatus === "live"
                        ? "#C14BFF"
                        : "#94A3B8",
                  }}
                />
                <Text style={styles.mapLocationAddress}>
                  {visibleLiveLocationStatus === "live"
                    ? "LIVE · Driver location updates automatically"
                    : visibleLiveLocationStatus === "loading"
                      ? "Connecting to driver location…"
                      : visibleLiveLocationStatus === "offline"
                        ? "Driver is offline or has not shared a recent location"
                        : "Live driver location is currently unavailable"}
                </Text>
              </View>
            )}
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
        visible={
          isWeekendScheduleVisible &&
          paymentAccessVerified &&
          !paymentAccessBlocked
        }
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
                      color={isSelected ? "#fff" : "#C14BFF"}
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
              <MaterialIcons name="schedule" size={18} color="#C14BFF" />
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
              <MaterialIcons name="schedule" size={18} color="#C14BFF" />
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
              <GooglePlacesAutoComplete
                value={editForm.school_name}
                onChangeText={handleSchoolInputChange}
                onSelect={handleSchoolSelect}
                placeholder="Search or select school"
                suggestionsPlacement="below"
              />
              <View
                pointerEvents="none"
                style={{
                  height: 160,
                  marginTop: 10,
                  overflow: "hidden",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {editSchoolMapRegion ? (
                  <MapView
                    key={`${editSchoolMapRegion.latitude},${editSchoolMapRegion.longitude}`}
                    style={{ flex: 1 }}
                    initialRegion={editSchoolMapRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    moveOnMarkerPress={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: editSchoolMapRegion.latitude,
                        longitude: editSchoolMapRegion.longitude,
                      }}
                      title={editForm.school_name || "School"}
                    />
                  </MapView>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surface,
                    }}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={24}
                      color={colors.text.secondary}
                    />
                    <Text
                      style={{
                        marginTop: 4,
                        color: colors.text.secondary,
                        fontSize: 12,
                      }}
                    >
                      Select a school to show its location
                    </Text>
                  </View>
                )}
              </View>
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
        visible={
          isActivityModalVisible && paymentAccessVerified && !paymentAccessBlocked
        }
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
    borderBottomColor: "#352341",
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
    backgroundColor: "#1C1026",
  },

  topRowTitle: {
    flex: 1,
    marginLeft: 11,
  },

  pageTitle: {
    fontSize: 14,
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
    backgroundColor: "#1C1026",
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
    backgroundColor: "#1C1026",
  },

  detailTabSelected: {
    backgroundColor: "#9B2BE7",
  },

  detailTabText: {
    color: "#B9AFC4",
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
    borderColor: "#352341",
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
    borderColor: "#352341",
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
    backgroundColor: "#9B2BE7",
  },

  locationPreviewTitle: {
    fontSize: 11,
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
    backgroundColor: "#1C1026",
  },

  mapRefreshText: {
    color: "#C14BFF",
    fontSize: 9,
    fontWeight: "700",
  },

  routePreviewMapWrap: {
    height: 152,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#1C1026",
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
    backgroundColor: "#1C1026",
  },

  routePreviewEmptyText: {
    color: "#B9AFC4",
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
    backgroundColor: "#9B2BE7",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  mapRoutePillText: {
    color: "#FBF8FF",
    backgroundColor: "rgba(255,255,255,0.94)",
    overflow: "hidden",
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "800",
  },

  routeLiveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "#1C1026",
  },

  routeLiveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  routeLiveStatusText: {
    flex: 1,
    color: "#40566E",
    fontSize: 10,
    fontWeight: "600",
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
    color: "#B9AFC4",
    fontSize: 8,
  },

  nextStopName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  nextStopTime: {
    color: "#B9AFC4",
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
    borderLeftColor: "#352341",
  },

  routeStatusPillText: {
    color: "#C14BFF",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 3,
  },

  weekendBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1C1026",
    borderColor: "#352341",
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
    color: "#C14BFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },

  weekendBannerText: {
    color: "#B9AFC4",
    fontSize: 11,
    lineHeight: 18,
  },

  tripCard: {
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#352341",
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
    borderColor: "#352341",
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
    backgroundColor: "#1C1026",
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
    backgroundColor: "#9B2BE7",
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
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#1C1026",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C14BFF",
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
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },

  childIdRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8EFE0",
    backgroundColor: "#1C1026",
  },

  childIdLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  childIdValue: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },

  bannerDescription: {
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: "800",
  },

  tripStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#1C1026",
  },

  tripStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C14BFF",
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
    fontSize: 13,
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
    fontSize: 11,
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
    backgroundColor: "#1C1026",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  liveTripButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C14BFF",
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
    fontSize: 12,
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
    backgroundColor: "#35151D",
  },

  cancelWeekendButtonText: {
    color: "#DC2626",
    fontSize: 12,
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
    color: "#FBF8FF",
    fontSize: 11,
    fontWeight: "800",
  },

  scheduledTripRowTimes: {
    color: "#B9AFC4",
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
    fontSize: 12,
    lineHeight: 20,
    paddingVertical: 10,
  },

  scheduledTripTime: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },

  /* =========================
     SECTION HEADERS
  ========================= */

  sectionHeader: {
    fontSize: 13,
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
    fontSize: 11,
  },

  infoValue: {
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: "800",
  },

  locationSubtitle: {
    fontSize: 10,
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
    fontSize: 11,
    fontWeight: "800",
    color: "#C14BFF",
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
    fontSize: 12,
    fontWeight: "800",
  },

  vehicleSummarySubtitle: {
    fontSize: 10,
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
    color: "#C14BFF",
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
    fontSize: 12,
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
    backgroundColor: "#1C1026",
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
    fontSize: 12,
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
    color: "#C14BFF",
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
    color: "#C14BFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },

  activityModalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  activityModalSubtitle: {
    fontSize: 10,
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
    color: "#C14BFF",
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
    backgroundColor: "#9B2BE7",
  },

  activityMarkerProgress: {
    backgroundColor: "#9B2BE7",
  },

  activityMarkerPending: {
    backgroundColor: "#B9AFC4",
  },

  activityTextWrap: {
    flex: 1,
  },

  activityTime: {
    fontSize: 11,
    fontWeight: "800",
  },

  activityTitle: {
    fontSize: 11,
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
    fontSize: 15,
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
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: "700",
  },

  scanInstructions: {
    fontSize: 12,
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
    fontSize: 17,
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
    fontSize: 13,
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
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },

  scheduleDescription: {
    fontSize: 12,
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
    backgroundColor: "#9B2BE7",
  },

  weekendDateOptionText: {
    color: "#C14BFF",
    fontSize: 12,
    fontWeight: "700",
  },

  weekendDateOptionTextSelected: {
    color: "#fff",
  },

  scheduleTimeLabel: {
    fontSize: 11,
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
    color: "#C14BFF",
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
  },

  primaryButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  primaryButtonText: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "800",
  },

  scanError: {
    marginBottom: 12,
    fontSize: 11,
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
    backgroundColor: "#1C1026",
  },

  mapView: {
    width: "100%",
    height: "100%",
  },

  fullScreenMapScreen: {
    flex: 1,
    backgroundColor: "#1C1026",
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
    backgroundColor: "#1C1026",
  },

  mapHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  mapEyebrow: {
    color: "#B9AFC4",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  mapScreenTitle: {
    color: "#FBF8FF",
    fontSize: 13,
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
    backgroundColor: "#130D1A",
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
    color: "#FBF8FF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  mapLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#352341",
  },

  mapLocationDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#9B2BE7",
    marginTop: 3,
    marginRight: 12,
  },

  mapDropoffDot: {
    backgroundColor: "#9B2BE7",
  },

  mapDriverDot: {
    backgroundColor: "#9B2BE7",
  },

  mapLocationText: {
    flex: 1,
  },

  mapLocationTitle: {
    color: "#FBF8FF",
    fontSize: 12,
    fontWeight: "700",
  },

  mapLocationAddress: {
    color: "#B9AFC4",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },

  mapKeyHint: {
    color: "#C14BFF",
    backgroundColor: "#1C1026",
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
    backgroundColor: "#1C1026",
  },

  mapEmptyTitle: {
    color: "#FBF8FF",
    fontSize: 13,
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
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 40,
  },
});
