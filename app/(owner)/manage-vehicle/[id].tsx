import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
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
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { useOwnerProfile } from "../ownerHelpers/hooks/useOwnerProfile";
import { AuthContext } from "../../../context/authContext/auth-context";
import AppNotification from "../../../components/Notification";
import { resolveWorkingBaseUrl } from "../../../url";
import { SelectedVehicle } from "../ownerHelpers/interface/owner.interfece";
import CustomMap from "../../../components/map";

export default function ManageVehicle() {
  const router = useRouter();
  const { user, driverMode } = useContext(AuthContext);
  const { id: vehicleId } = useLocalSearchParams<{ id: string }>();
  const { owner } = useOwnerProfile();
  const { drivers, refreshDrivers } = useDrivers();

  // Vehicle state
  const [vehicle, setVehicle] = useState<SelectedVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  // Driver modal state
  const [showSwitchDriverModal, setShowSwitchDriverModal] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [selectedSwitchingDriverId, setSelectedSwitchingDriverId] = useState<
    string | null
  >(null);
  // Carousel state
  const [imageCarouselWidth, setImageCarouselWidth] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<ScrollView | null>(null);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  // Action states
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingMaintenance, setSettingMaintenance] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [showOptionsDrawer, setShowOptionsDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalOpenedFromParams, setEditModalOpenedFromParams] =
    useState(false);
  const [editName, setEditName] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [driverGpsStatus, setDriverGpsStatus] = useState<{
    isOnline: boolean;
    lastUpdatedAt: string | null;
  }>({
    isOnline: false,
    lastUpdatedAt: null,
  });
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [loadingGpsStatus, setLoadingGpsStatus] = useState(false);
  const [vehicleStats, setVehicleStats] = useState({
    trips: 0,
    avgSpeedKmh: 0,
    activeRoutes: 0,
    totalDistanceKm: 0,
  });
  const [loadingVehicleStats, setLoadingVehicleStats] = useState(false);

  // Memoized vehicle image URLs
  const vehicleImageUrls = useMemo<string[]>(
    () =>
      vehicle?.vehicle_images?.length
        ? vehicle.vehicle_images.map((image) => image.url)
        : vehicle?.images || [],
    [vehicle],
  );

  // Image carousel auto-scroll
  useEffect(() => {
    if (vehicleImageUrls.length <= 1 || imageCarouselWidth <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = (prev + 1) % vehicleImageUrls.length;
        imageScrollRef.current?.scrollTo({
          x: nextIndex * imageCarouselWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [vehicleImageUrls.length, imageCarouselWidth]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [vehicleImageUrls.length]);

  // Handle carousel scroll
  const handleCarouselMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (imageCarouselWidth <= 0) return;
      const index = Math.round(
        event.nativeEvent.contentOffset.x / imageCarouselWidth,
      );
      setCurrentImageIndex(index);
    },
    [imageCarouselWidth],
  );

  // Get QR code URI
  const getVehicleQrUri = useCallback((qr: any) => {
    if (!qr) return undefined;
    if (typeof qr === "object") {
      return qr.dataUrl || qr.uri || undefined;
    }
    if (typeof qr === "string") {
      try {
        const parsed = JSON.parse(qr);
        return parsed.dataUrl || parsed.uri || qr;
      } catch {
        return qr;
      }
    }
    return undefined;
  }, []);

  // Normalize vehicle ID
  const normalizedVehicleId = Array.isArray(vehicleId)
    ? vehicleId[0]
    : vehicleId;

  // Fetch vehicle details
  const fetchVehicleDetails = useCallback(async () => {
    if (!normalizedVehicleId || !user?.token) return;

    setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/vehicles/${normalizedVehicleId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch vehicle details");
      }

      const data = await response.json();
      setVehicle({
        ...data,
        status: data.display_status || data.status,
        display_status: data.display_status || data.status,
      });
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      setNotification({
        visible: true,
        message: "Failed to load vehicle details",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [normalizedVehicleId, user?.token]);

  const formatLastSeenText = useCallback((lastUpdatedAt?: string | null) => {
    if (!lastUpdatedAt) {
      return "No GPS updates yet";
    }

    const lastUpdated = new Date(lastUpdatedAt);
    const diffMs = Date.now() - lastUpdated.getTime();

    if (Number.isNaN(lastUpdated.getTime())) {
      return "No GPS updates yet";
    }

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) {
      return "just now";
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }, []);

  useEffect(() => {
    const fetchDriverGpsStatus = async () => {
      const driverId = vehicle?.drivers?.id;
      if (!driverId || !user?.token) {
        setDriverGpsStatus({ isOnline: false, lastUpdatedAt: null });
        setDriverLocation(null);
        return;
      }

      try {
        setLoadingGpsStatus(true);
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/driver/location/${driverId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch driver GPS status");
        }

        const location = await response.json().catch(() => null);
        const lastUpdatedAt = location?.recorded_at || null;
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        setDriverLocation(
          Number.isFinite(latitude) && Number.isFinite(longitude)
            ? { latitude, longitude }
            : null,
        );
        const lastUpdatedTime = lastUpdatedAt
          ? new Date(lastUpdatedAt).getTime()
          : null;
        const isOnline =
          !!lastUpdatedTime && Date.now() - lastUpdatedTime <= 3 * 60 * 1000;

        setDriverGpsStatus({
          isOnline,
          lastUpdatedAt: lastUpdatedAt || null,
        });
      } catch (error) {
        console.error("Error fetching driver GPS status:", error);
        setDriverGpsStatus({ isOnline: false, lastUpdatedAt: null });
        setDriverLocation(null);
      } finally {
        setLoadingGpsStatus(false);
      }
    };

    fetchDriverGpsStatus();
  }, [vehicle?.drivers?.id, user?.token]);

  useEffect(() => {
    const fetchVehicleStats = async () => {
      if (!vehicle?.id || !user?.token) {
        setVehicleStats({
          trips: 0,
          avgSpeedKmh: 0,
          activeRoutes: 0,
          totalDistanceKm: 0,
        });
        return;
      }

      try {
        setLoadingVehicleStats(true);
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/owner/route-history`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch vehicle statistics");
        }

        const history = await response.json().catch(() => []);
        const routeIds = (vehicle.route_assignments || [])
          .map(
            (assignment: any) => assignment?.route_id || assignment?.routes?.id,
          )
          .filter(Boolean);
        const assignedDriverId = vehicle.drivers?.id;

        const relevantHistory = (Array.isArray(history) ? history : []).filter(
          (entry: any) => {
            const matchesRoute =
              routeIds.length === 0 || routeIds.includes(entry?.route_id);
            const matchesDriver =
              !assignedDriverId || entry?.driver_id === assignedDriverId;
            return matchesRoute && matchesDriver;
          },
        );

        const completedHistory = relevantHistory.filter(
          (entry: any) => entry?.status === "completed",
        );

        const totalDistanceKm = completedHistory.reduce(
          (total: number, entry: any) =>
            total + Number(entry?.distance_meters || 0) / 1000,
          0,
        );
        const totalDurationSeconds = completedHistory.reduce(
          (total: number, entry: any) =>
            total + Number(entry?.duration_seconds || 0),
          0,
        );
        const avgSpeedKmh =
          totalDistanceKm > 0 && totalDurationSeconds > 0
            ? totalDistanceKm / (totalDurationSeconds / 3600)
            : 0;

        setVehicleStats({
          trips: completedHistory.length,
          avgSpeedKmh: Number(avgSpeedKmh.toFixed(1)),
          activeRoutes: (vehicle.route_assignments || []).filter(
            (assignment: any) => assignment?.is_active,
          ).length,
          totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
        });
      } catch (error) {
        console.error("Error fetching vehicle statistics:", error);
        setVehicleStats({
          trips: 0,
          avgSpeedKmh: 0,
          activeRoutes: 0,
          totalDistanceKm: 0,
        });
      } finally {
        setLoadingVehicleStats(false);
      }
    };

    fetchVehicleStats();
  }, [
    vehicle?.id,
    vehicle?.route_assignments,
    vehicle?.drivers?.id,
    user?.token,
  ]);

  // Handle driver switch
  const handleSwitchDriver = useCallback(
    async (driver: any) => {
      if (!vehicle?.id || !user?.token || !owner) return;

      const resolveDriverSelectionId = (candidate: any) => {
        if (!candidate) return null;

        const candidateIds = [
          candidate.driverProfileId,
          candidate.id,
          candidate.userId,
          candidate.user_id,
          candidate.driver_id,
        ].filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            String(value).trim() !== "",
        );

        return candidateIds[0] || null;
      };

      let selectedDriverId = resolveDriverSelectionId(driver);
      const isPlaceholderOwnerDriver =
        driver?.is_owner_driver === true &&
        (!driver?.driverProfileId ||
          String(driver.driverProfileId) === String(owner.id)) &&
        (!driver?.userId || String(driver.userId) === String(user.userData.id));

      if (isPlaceholderOwnerDriver) {
        setNotification({
          visible: true,
          message: "Creating your driver profile...",
          type: "success",
        });

        try {
          const baseUrl = await resolveWorkingBaseUrl();
          const payload = {
            name: user.userData.name || "Owner Driver",
            email: user.userData.email || "",
            phone: user.userData.phone || "",
          };

          const createResponse = await fetch(`${baseUrl}/owner/drivers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              ...payload,
              is_self_assigned: true,
            }),
          });

          const createData = await createResponse.json().catch(() => ({}));
          if (!createResponse.ok) {
            throw new Error(
              createData.error || "Failed to create owner driver profile.",
            );
          }

          const createdDriverId =
            createData?.driver?.id || createData?.driverId;
          const refreshedDrivers = await refreshDrivers(true);
          const currentUserId = user.userData.id;
          const currentUserEmail = String(
            user.userData.email || "",
          ).toLowerCase();

          const selfDriver = refreshedDrivers.find((candidate: any) => {
            const candidateIds = [
              candidate.id,
              candidate.driverProfileId,
              candidate.userId,
              candidate.user_id,
              candidate.driver_id,
            ];
            const matchesId = candidateIds.some(
              (value) => value && String(value) === String(currentUserId),
            );
            const matchesEmail = [candidate.email, candidate.users?.email].some(
              (value) =>
                value && String(value).toLowerCase() === currentUserEmail,
            );
            return matchesId || matchesEmail;
          });

          if (!selfDriver && !createdDriverId) {
            throw new Error(
              "Could not resolve owner driver record after creation.",
            );
          }

          selectedDriverId =
            createdDriverId ||
            selfDriver?.driverProfileId ||
            selfDriver?.id ||
            selfDriver?.userId ||
            selfDriver?.user_id ||
            null;
        } catch (creationError) {
          console.error("Error creating owner driver record:", creationError);
          setNotification({
            visible: true,
            message:
              "Unable to create your driver profile. Please try again or contact support.",
            type: "error",
          });
          return;
        }
      }

      if (!selectedDriverId) {
        setNotification({
          visible: true,
          message: "Unable to resolve the selected driver. Please try again.",
          type: "error",
        });
        return;
      }

      if (selectedDriverId === vehicle.drivers?.id) {
        setShowSwitchDriverModal(false);
        return;
      }

      setAssigningDriver(true);
      setSelectedSwitchingDriverId(selectedDriverId);

      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/owner/vehicles/${vehicle.id}/assign-driver`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ driverId: selectedDriverId }),
          },
        );
        const data = await response.json();

        if (response.ok) {
          setNotification({
            visible: true,
            message: data.message || "Driver switched successfully.",
            type: "success",
          });
          setShowSwitchDriverModal(false);
          fetchVehicleDetails();
          refreshDrivers(true);
        } else {
          setNotification({
            visible: true,
            message: data.error || "Failed to switch driver.",
            type: "error",
          });
        }
      } catch (error) {
        console.error("Error switching driver:", error);
        setNotification({
          visible: true,
          message: "Network error while switching driver.",
          type: "error",
        });
      } finally {
        setAssigningDriver(false);
        setSelectedSwitchingDriverId(null);
      }
    },
    [
      vehicle?.drivers?.id,
      vehicle?.id,
      refreshDrivers,
      user?.token,
      fetchVehicleDetails,
      owner,
      user.userData.email,
      user.userData.id,
      user.userData.name,
      user.userData.phone,
    ],
  );

  // Include owner in drivers list if driver mode is enabled
  const driversWithOwner = useMemo(() => {
    let driversList = [...drivers];

    if (driverMode && owner && user?.userData) {
      const currentUserId = user.userData.id;
      const currentUserEmail = user.userData.email?.toLowerCase();
      const existingSelfDriver = driversList.find((driver: any) => {
        const candidateIds = [
          driver.id,
          driver.driverProfileId,
          driver.userId,
          driver.user_id,
          driver.driver_id,
        ];
        const matchesId = candidateIds.some(
          (value) => value && String(value) === String(currentUserId),
        );
        const matchesEmail = [driver.email, driver.users?.email].some(
          (value) => value && String(value).toLowerCase() === currentUserEmail,
        );
        return matchesId || matchesEmail;
      });

      if (existingSelfDriver) {
        driversList = driversList.map((driver: any) =>
          driver === existingSelfDriver
            ? { ...driver, is_owner_driver: true }
            : driver,
        );
      } else {
        const ownerDriver = {
          id: owner.id,
          driverProfileId: owner.id,
          userId: user.userData.id,
          name: owner.name || user.userData.name || "Owner Driver",
          email: owner.email || user.userData.email || "",
          phone: owner.phone || user.userData.phone || "",
          vehicle_plate_number: owner.vehicle_plate_number || "",
          created_at: owner.created_at || "",
          avatar: owner.avatar || user.userData.avatar || null,
          status: "inactive",
          hasAssignedVehicle: false,
          vehicles: [],
          routes: 0,
          students: 0,
          is_owner_driver: true,
          placeholder: true,
          raw: owner,
        };

        driversList = [ownerDriver, ...driversList];
      }
    }

    return driversList;
  }, [drivers, driverMode, owner, user?.userData]);

  // Fetch vehicle details on mount
  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  useEffect(() => {
    if (driverMode) {
      refreshDrivers(true);
    }
  }, [driverMode, refreshDrivers]);

  const openEditVehicle = useCallback(() => {
    if (!vehicle) return;
    setEditName(vehicle.name || "");
    setEditLicensePlate(vehicle.license_plate || "");
    setEditModel(vehicle.model || "");
    setEditColor(vehicle.color || "");
    setEditCapacity(vehicle.capacity ? String(vehicle.capacity) : "");
    setShowEditModal(true);
  }, [vehicle]);

  const openDriverPage = useCallback(() => {
    if (vehicle?.drivers?.id) {
      router.push({
        pathname: "/(owner)/driver-details",
        params: {
          driverId: vehicle.drivers.id,
          vehicleId: vehicle.id,
          returnTo: "vehicle",
        },
      });
      return;
    }

    router.push("/(owner)/(tabs)/drivers");
  }, [router, vehicle?.drivers?.id, vehicle?.id]);

  const openRoutePage = useCallback(() => {
    const routeId =
      vehicle?.route_id ||
      vehicle?.route_assignments?.find((assignment) => assignment.is_active)
        ?.route_id ||
      vehicle?.route_assignments?.[0]?.route_id;

    if (routeId) {
      router.push({
        pathname: "/(owner)/route-details",
        params: {
          routeId: String(routeId),
          vehicleId: vehicle?.id,
          returnTo: "vehicle",
        },
      });
      return;
    }

    router.push("/(owner)/(tabs)/routes");
  }, [router, vehicle?.id, vehicle?.route_id, vehicle?.route_assignments]);

  const openDocsPage = useCallback(() => {
    router.push({
      pathname: "/(owner)/help/vehicle-management",
      params: {
        vehicleId: vehicle?.id,
        returnTo: "vehicle",
      },
    });
  }, [router, vehicle?.id]);

  const params = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => {
    if (params?.edit === "true" && vehicle && !editModalOpenedFromParams) {
      setEditModalOpenedFromParams(true);
      openEditVehicle();
    }
  }, [params?.edit, vehicle, openEditVehicle, editModalOpenedFromParams]);

  const handleSaveVehicle = async () => {
    if (!vehicle || !user?.token) return;
    if (!editName.trim() || !editLicensePlate.trim() || !editModel.trim()) {
      setNotification({
        visible: true,
        message: "Please complete the required fields.",
        type: "error",
      });
      return;
    }

    setSavingVehicle(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/vehicles/${normalizedVehicleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            name: editName.trim(),
            license_plate: editLicensePlate.trim(),
            model: editModel.trim(),
            color: editColor.trim(),
            capacity: Number(editCapacity) || vehicle.capacity || 0,
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setNotification({
          visible: true,
          message: data.message || "Vehicle updated successfully.",
          type: "success",
        });
        setShowEditModal(false);
        setEditModalOpenedFromParams(false);
        router.replace({
          pathname: "/(owner)/manage-vehicle/[id]",
          params: { id: normalizedVehicleId },
        });
        fetchVehicleDetails();
      } else {
        setNotification({
          visible: true,
          message: data.error || "Failed to update vehicle.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating vehicle:", error);
      setNotification({
        visible: true,
        message: "Network error while saving vehicle.",
        type: "error",
      });
    } finally {
      setSavingVehicle(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "maintenance":
        return "#F59E0B";
      case "offline":
        return "#EF4444";
      case "inactive":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "maintenance":
        return "Maintenance";
      case "offline":
        return "Offline";
      case "inactive":
        return "Inactive";
      default:
        return status
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : "Unknown";
    }
  };

  const handleDeactivateVehicle = async () => {
    Alert.alert(
      "Deactivate Vehicle",
      "Are you sure you want to deactivate this vehicle? It will no longer be available for assignment.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Deactivate",
          onPress: async () => {
            if (!normalizedVehicleId || !user?.token) return;

            setDeactivating(true);
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/owner/vehicles/${normalizedVehicleId}/deactivate`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                  },
                },
              );

              const data = await response.json().catch(() => ({}));

              if (response.ok) {
                const nextStatus = data?.vehicle?.display_status || "inactive";
                setVehicle((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: nextStatus,
                        display_status: nextStatus,
                      }
                    : prev,
                );
                setNotification({
                  visible: true,
                  message: data.message || "Vehicle deactivated successfully",
                  type: "success",
                });
                fetchVehicleDetails();
              } else {
                setNotification({
                  visible: true,
                  message: data.error || "Failed to deactivate vehicle",
                  type: "error",
                });
              }
            } catch (error) {
              console.error("Error deactivating vehicle:", error);
              setNotification({
                visible: true,
                message: "Error deactivating vehicle",
                type: "error",
              });
            } finally {
              setDeactivating(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleChangeStatus = () => {
    const statusOptions = [
      { label: "🟢 Active", value: "active" },
      { label: "🟡 Available", value: "available" },
      { label: "🔴 Offline", value: "offline" },
      { label: "🟠 Maintenance", value: "maintenance" },
    ];

    Alert.alert(
      "Change Vehicle Status",
      "Select a new status for this vehicle",
      [
        ...statusOptions.map((option) => ({
          text: option.label,
          onPress: () => updateVehicleStatus(option.value),
        })),
        { text: "Cancel", onPress: () => {}, style: "cancel" },
      ],
    );
  };

  const updateVehicleStatus = async (newStatus: string) => {
    if (newStatus === vehicle?.status) {
      setNotification({
        visible: true,
        message: `Vehicle is already ${newStatus}`,
        type: "warning",
      });
      return;
    }

    if (!normalizedVehicleId || !user?.token) return;

    setChangingStatus(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/vehicles/${normalizedVehicleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const resolvedStatus =
          data?.vehicle?.display_status ||
          (newStatus === "maintenance"
            ? "maintenance"
            : newStatus === "offline"
              ? "offline"
              : newStatus);
        const statusLabel = getStatusLabel(resolvedStatus);
        setVehicle((prev) =>
          prev
            ? {
                ...prev,
                status: resolvedStatus,
                display_status: resolvedStatus,
              }
            : prev,
        );
        setNotification({
          visible: true,
          message: data.message || `Vehicle status changed to ${statusLabel}`,
          type: "success",
        });
        fetchVehicleDetails();
      } else {
        setNotification({
          visible: true,
          message: data.error || "Failed to update vehicle status",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      setNotification({
        visible: true,
        message: "Error updating vehicle status",
        type: "error",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSetMaintenance = async () => {
    Alert.alert(
      "Set to Maintenance",
      "Mark this vehicle as under maintenance? It will not be available for assignments.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Set Maintenance",
          onPress: async () => {
            if (!normalizedVehicleId || !user?.token) return;

            setSettingMaintenance(true);
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/owner/vehicles/${normalizedVehicleId}/status`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                  },
                  body: JSON.stringify({ status: "maintenance" }),
                },
              );

              const data = await response.json().catch(() => ({}));

              if (response.ok) {
                const nextStatus =
                  data?.vehicle?.display_status || "maintenance";
                setVehicle((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: nextStatus,
                        display_status: nextStatus,
                      }
                    : prev,
                );
                setNotification({
                  visible: true,
                  message:
                    data.message || "Vehicle marked as under maintenance",
                  type: "success",
                });
                fetchVehicleDetails();
              } else {
                setNotification({
                  visible: true,
                  message: data.error || "Failed to update vehicle status",
                  type: "error",
                });
              }
            } catch (error) {
              console.error("Error updating vehicle status:", error);
              setNotification({
                visible: true,
                message: "Error updating vehicle status",
                type: "error",
              });
            } finally {
              setSettingMaintenance(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteVehicle = async () => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to permanently delete this vehicle? This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            setDeleting(true);
            try {
              const baseUrl = await resolveWorkingBaseUrl();
              const response = await fetch(
                `${baseUrl}/owner/vehicles/${normalizedVehicleId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.token}`,
                  },
                },
              );

              if (response.ok) {
                setNotification({
                  visible: true,
                  message: "Vehicle deleted successfully",
                  type: "success",
                });
                setTimeout(() => router.back(), 1500);
              } else {
                setNotification({
                  visible: true,
                  message: "Failed to delete vehicle",
                  type: "error",
                });
              }
            } catch (error) {
              setNotification({
                visible: true,
                message: "Error deleting vehicle",
                type: "error",
              });
            } finally {
              setDeleting(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1769D2" />
          <Text style={styles.loadingText}>Loading vehicle details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Vehicle not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentDriver = vehicle.drivers?.users?.name || "Unassigned";
  const resolvedVehicleStatus = vehicle.display_status || vehicle.status;
  const isUnderMaintenance = resolvedVehicleStatus === "maintenance";
  const activeRouteAssignment = Array.isArray(vehicle.route_assignments)
    ? vehicle.route_assignments.find((assignment) => assignment.is_active)
    : null;
  const routeName =
    vehicle.routes?.name ||
    activeRouteAssignment?.routes?.route_name ||
    vehicle.route_assignments?.[0]?.routes?.route_name ||
    "No Route";
  const statusColor = getStatusColor(resolvedVehicleStatus);
  const statusLabel = getStatusLabel(resolvedVehicleStatus);

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />

      <View style={styles.pageContent}>
        {/* Header with Vehicle Image */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
            <View style={styles.headerSpacer} />
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setShowOptionsDrawer(true)}
            >
              <MaterialIcons name="more-vert" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Image */}
          <View
            style={styles.imageContainer}
            onLayout={(e) => setImageCarouselWidth(e.nativeEvent.layout.width)}
          >
            {vehicleImageUrls.length > 0 ? (
              <>
                <ScrollView
                  ref={imageScrollRef}
                  horizontal
                  pagingEnabled
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={handleCarouselMomentumScrollEnd}
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageCarousel}
                >
                  {vehicleImageUrls.map((imageUrl, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUrl }}
                      style={[
                        styles.vehicleImage,
                        { width: imageCarouselWidth },
                      ]}
                    />
                  ))}
                </ScrollView>
                {vehicleImageUrls.length > 1 && (
                  <View style={styles.carouselIndicators}>
                    {vehicleImageUrls.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicatorDot,
                          currentImageIndex === index &&
                            styles.indicatorDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons
                  name="directions-bus"
                  size={64}
                  color="#1769D2"
                  opacity={0.8}
                />
              </View>
            )}
          </View>

          {/* Vehicle Name and Status Badge */}
          <View style={styles.vehicleNameBadgeContainer}>
            <View>
              <Text style={styles.vehicleNameInHeader}>{vehicle.name}</Text>
              <Text style={styles.vehicleModel}>
                {vehicle.license_plate}  ·  {vehicle.model}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    resolvedVehicleStatus === "maintenance"
                      ? "#FFF4DC"
                      : resolvedVehicleStatus === "inactive" ||
                          resolvedVehicleStatus === "offline"
                        ? "#EEF2F7"
                        : "#E5F8ED",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      resolvedVehicleStatus === "maintenance"
                        ? "#B7791F"
                        : resolvedVehicleStatus === "inactive" ||
                            resolvedVehicleStatus === "offline"
                          ? "#65758B"
                          : "#20864B",
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Quick Action Buttons */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.primaryQuickAction}
              onPress={openEditVehicle}
            >
              <MaterialIcons name="edit" size={17} color="#FFF" />
              <Text style={styles.primaryQuickActionLabel}>Edit Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryQuickAction}
              onPress={() => setShowLocationMap(true)}
            >
              <MaterialIcons name="fullscreen" size={17} color="#1769D2" />
              <Text style={styles.secondaryQuickActionLabel}>View on Map</Text>
            </TouchableOpacity>
          </View>

          {/* Content Sections */}
          <View style={styles.content}>
            {/* Vehicle Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="info" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Vehicle Information</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow
                  label="License Plate"
                  value={vehicle.license_plate}
                  icon="confirmation-number"
                />
                <InfoRow
                  label="Model"
                  value={vehicle.model}
                  icon="directions"
                />
                <InfoRow
                  label="Capacity"
                  value={`${vehicle.capacity || "N/A"} seats`}
                  icon="people"
                />
                <InfoRow
                  label="Color"
                  value={vehicle.color || "Not specified"}
                  icon="palette"
                />
              </View>
            </View>

            {/* Assigned Driver Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="person" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Assigned Driver</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.driverSection}>
                  <View style={styles.driverIconContainer}>
                    <MaterialIcons
                      name={
                        currentDriver === "Unassigned"
                          ? "person-outline"
                          : "person"
                      }
                      size={28}
                      color="#1769D2"
                    />
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{currentDriver}</Text>
                    {currentDriver !== "Unassigned" && (
                      <Text style={styles.driverStatus}>Active</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.assignDriverButton}
                  onPress={() => setShowSwitchDriverModal(true)}
                >
                  <MaterialIcons name="swap-horiz" size={16} color="#FFF" />
                  <Text style={styles.assignDriverButtonText}>
                    {currentDriver === "Unassigned" ? "Assign" : "Change"}{" "}
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Assigned Route Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="route" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Assigned Route</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow
                  label="Current Route"
                  value={routeName}
                  icon="map"
                  highlighted={routeName === "No Route"}
                />
              </View>
            </View>

            {/* Vehicle Photos */}
            {vehicleImageUrls.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="photo-library" size={19} color="#1769D2" />
                  <Text style={styles.cardTitle}>Vehicle Photos</Text>
                  <Text style={styles.photoCount}>
                    {vehicleImageUrls.length}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoStrip}
                >
                  {vehicleImageUrls.map((imageUrl, index) => (
                    <Image
                      key={`${imageUrl}-${index}`}
                      source={{ uri: imageUrl }}
                      style={styles.photoThumbnail}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Maintenance Card */}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="build" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Maintenance</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow
                  label="Due Date"
                  value={
                    vehicle.maintenance_due
                      ? new Date(vehicle.maintenance_due).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "Not scheduled"
                  }
                  icon="event"
                />
                <View style={styles.maintenanceStatus}>
                  <MaterialIcons
                    name={isUnderMaintenance ? "build" : "check-circle"}
                    size={16}
                    color={isUnderMaintenance ? "#F59E0B" : "#10B981"}
                  />
                  <Text style={styles.maintenanceStatusText}>
                    {isUnderMaintenance
                      ? "Currently under maintenance"
                      : vehicle.maintenance_due &&
                          new Date(vehicle.maintenance_due) <=
                            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        ? "Maintenance due soon"
                        : "On schedule"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Insurance & License Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="verified" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Insurance & License</Text>
              </View>
              <View style={styles.cardContent}>
                <InfoRow
                  label="Insurance Expiry"
                  value={
                    vehicle.insurance_expiry
                      ? new Date(vehicle.insurance_expiry).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )
                      : "Not set"
                  }
                  icon="card-giftcard"
                />
                <View style={styles.insuranceStatus}>
                  <MaterialIcons
                    name={
                      vehicle.insurance_expiry &&
                      new Date(vehicle.insurance_expiry) > new Date()
                        ? "check-circle"
                        : "error"
                    }
                    size={16}
                    color={
                      vehicle.insurance_expiry &&
                      new Date(vehicle.insurance_expiry) > new Date()
                        ? "#10B981"
                        : "#EF4444"
                    }
                  />
                  <Text style={styles.insuranceStatusText}>
                    {vehicle.insurance_expiry &&
                    new Date(vehicle.insurance_expiry) > new Date()
                      ? "Valid"
                      : "Expired or not set"}
                  </Text>
                </View>
              </View>
            </View>

            {/* GPS Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="location-on" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Vehicle Location</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.gpsStatusRow}>
                  <View
                    style={[
                      styles.onlineBadge,
                      driverGpsStatus.isOnline
                        ? styles.onlineBadgeActive
                        : styles.offlineBadge,
                    ]}
                  />
                  <Text style={styles.onlineText}>
                    {loadingGpsStatus
                      ? "Checking GPS..."
                      : driverGpsStatus.isOnline
                        ? "Online"
                        : "Offline"}
                  </Text>
                </View>
                <Text style={styles.lastUpdateText}>
                  {driverGpsStatus.isOnline
                    ? "Device connected"
                    : `Last update: ${formatLastSeenText(driverGpsStatus.lastUpdatedAt)}`}
                </Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowLocationMap(true)}
                >
                  <MaterialIcons
                    name="map"
                    size={16}
                    color="#1769D2"
                  />
                  <Text style={styles.locationButtonText}>View Full Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Statistics Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="show-chart" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Statistics</Text>
              </View>
              <View style={styles.statsGrid}>
                <StatItem
                  icon="trip-origin"
                  label="Trips"
                  value={loadingVehicleStats ? "..." : `${vehicleStats.trips}`}
                />
                <StatItem
                  icon="speed"
                  label="Avg Speed"
                  value={
                    loadingVehicleStats
                      ? "..."
                      : `${vehicleStats.avgSpeedKmh.toFixed(1)}km/h`
                  }
                />
                <StatItem
                  icon="route"
                  label="Active Routes"
                  value={
                    loadingVehicleStats ? "..." : `${vehicleStats.activeRoutes}`
                  }
                />
                <StatItem
                  icon="trending-up"
                  label="Distance"
                  value={
                    loadingVehicleStats
                      ? "..."
                      : `${vehicleStats.totalDistanceKm.toFixed(1)}km`
                  }
                />
              </View>
            </View>

            {/* QR Code Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="qr-code" size={20} color="#1769D2" />
                <Text style={styles.cardTitle}>Vehicle QR Code</Text>
              </View>
              <View style={styles.cardContent}>
                {vehicle.vehicle_qr_code ? (
                  <View style={styles.qrCodeContainer}>
                    <Image
                      source={{
                        uri: getVehicleQrUri(vehicle.vehicle_qr_code),
                      }}
                      style={styles.qrCodeImage}
                    />
                    <Text style={styles.qrCodeText}>
                      Scan to view vehicle details
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noQrContainer}>
                    <MaterialIcons name="qr-code-2" size={48} color="#D1D5DB" />
                    <Text style={styles.noQrText}>No QR Code Available</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={showLocationMap}
        animationType="slide"
        onRequestClose={() => setShowLocationMap(false)}
      >
        <SafeAreaView style={styles.locationMapScreen} edges={["top", "bottom"]}>
          <View style={styles.locationMapHeader}>
            <TouchableOpacity
              style={styles.locationMapBack}
              onPress={() => setShowLocationMap(false)}
            >
              <MaterialIcons name="arrow-back" size={21} color="#17385F" />
            </TouchableOpacity>
            <View style={styles.locationMapHeaderText}>
              <Text style={styles.locationMapTitle}>Vehicle Location</Text>
              <Text style={styles.locationMapSubtitle}>
                {vehicle.name}  ·  {vehicle.license_plate}
              </Text>
            </View>
            <View
              style={[
                styles.locationMapOnlineBadge,
                {
                  backgroundColor: driverGpsStatus.isOnline
                    ? "#E5F8ED"
                    : "#EEF2F7",
                },
              ]}
            >
              <Text
                style={[
                  styles.locationMapOnlineText,
                  { color: driverGpsStatus.isOnline ? "#20864B" : "#65758B" },
                ]}
              >
                {driverGpsStatus.isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
          {driverLocation ? (
            <CustomMap
              markers={[
                {
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                  title: vehicle.name,
                  type: "driver",
                },
              ]}
              focus={driverLocation}
              style={styles.locationMap}
            />
          ) : (
            <View style={styles.noLocationState}>
              <MaterialIcons
                name="location-disabled"
                size={42}
                color="#8CA0B6"
              />
              <Text style={styles.noLocationTitle}>Location unavailable</Text>
              <Text style={styles.noLocationDescription}>
                No GPS coordinates have been received from this vehicle yet.
              </Text>
            </View>
          )}
          <View style={styles.locationMapFooter}>
            <View style={styles.vehicleMiniIcon}>
              <MaterialIcons name="directions-bus" size={21} color="#1769D2" />
            </View>
            <View style={styles.locationMapFooterText}>
              <Text style={styles.locationMapVehicleName}>{vehicle.name}</Text>
              <Text style={styles.lastUpdateText}>
                {driverGpsStatus.lastUpdatedAt
                  ? `Last update: ${formatLastSeenText(driverGpsStatus.lastUpdatedAt)}`
                  : "No location update"}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Driver Selection Modal */}
      {showSwitchDriverModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Driver</Text>
                <Text style={styles.assignmentVehicleLabel}>
                  Vehicle: {vehicle.name} ({vehicle.license_plate})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSwitchDriverModal(false)}>
                <MaterialIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.driversList}>
              {driversWithOwner.map((driver) => {
                const isSelected =
                  driver.id === vehicle.drivers?.id ||
                  driver.is_owner_driver === true
                    ? vehicle.drivers?.users?.name === driver.name
                    : false;
                const isOwnerDriver = driver.is_owner_driver === true;

                return (
                  <TouchableOpacity
                    key={driver.id}
                    style={[
                      styles.driverItem,
                      isSelected && styles.driverItemSelected,
                      isOwnerDriver && styles.driverItemOwner,
                    ]}
                    onPress={() => handleSwitchDriver(driver)}
                    disabled={assigningDriver}
                  >
                    <View style={styles.driverItemContent}>
                      <View style={styles.driverItemIcon}>
                        <MaterialIcons
                          name="person"
                          size={24}
                          color="#1769D2"
                        />
                      </View>
                      <View style={styles.driverItemInfo}>
                        <View style={styles.driverItemNameRow}>
                          <Text style={styles.driverItemName} numberOfLines={1}>
                            {driver.name}
                          </Text>
                          {isOwnerDriver && (
                            <View style={styles.ownerBadge}>
                              <Text style={styles.ownerBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.driverItemEmail}>
                          {driver.email || "No email"}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color="#10B981"
                      />
                    )}
                    {assigningDriver &&
                      selectedSwitchingDriverId === driver.id && (
                        <ActivityIndicator size="small" color="#1769D2" />
                      )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSwitchDriverModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Options Drawer */}
      {showOptionsDrawer && (
        <View style={styles.modalOverlay}>
          <View style={styles.optionsDrawerContent}>
            <View style={styles.optionsDrawerHeader}>
              <Text style={styles.optionsDrawerTitle}>Vehicle Actions</Text>
              <TouchableOpacity onPress={() => setShowOptionsDrawer(false)}>
                <MaterialIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.optionsDrawerItem}
              onPress={() => {
                setShowOptionsDrawer(false);
                openEditVehicle();
              }}
            >
              <MaterialIcons name="edit" size={24} color="#4F46E5" />
              <Text style={styles.optionsDrawerItemText}>Edit Vehicle</Text>
            </TouchableOpacity>

            <View style={styles.optionsDrawerSectionHeader}>
              <Text style={styles.optionsDrawerSectionTitle}>Danger Zone</Text>
            </View>
            <TouchableOpacity
              style={[styles.optionsDrawerItem, styles.dangerZoneItem]}
              onPress={() => {
                setShowOptionsDrawer(false);
                handleSetMaintenance();
              }}
            >
              <MaterialIcons name="build" size={24} color="#F59E0B" />
              <Text style={styles.optionsDrawerItemText}>
                Set to Maintenance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionsDrawerItem, styles.dangerZoneItem]}
              onPress={() => {
                setShowOptionsDrawer(false);
                handleDeactivateVehicle();
              }}
            >
              <MaterialIcons name="pause-circle" size={24} color="#F59E0B" />
              <Text style={styles.optionsDrawerItemText}>
                Deactivate Vehicle
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionsDrawerItem, styles.dangerZoneItem]}
              onPress={() => {
                setShowOptionsDrawer(false);
                handleDeleteVehicle();
              }}
            >
              <MaterialIcons name="delete" size={24} color="#EF4444" />
              <Text style={styles.optionsDrawerItemText}>Delete Vehicle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Edit Vehicle Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <View style={styles.editModalTitleGroup}>
                <View style={styles.editModalIcon}>
                  <MaterialIcons
                    name="directions-bus"
                    size={18}
                    color="#1769D2"
                  />
                </View>
                <View>
                  <Text style={styles.editModalTitle}>Edit Vehicle</Text>
                  <Text style={styles.editModalSubtitle}>
                    Update vehicle details
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editModalClose}
                onPress={() => setShowEditModal(false)}
                accessibilityLabel="Close edit vehicle form"
              >
                <MaterialIcons name="close" size={21} color="#50677F" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.editModalBody}
              contentContainerStyle={styles.editModalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.editFieldGroup}>
                <Text style={styles.inputLabel}>Vehicle Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter vehicle name"
                  placeholderTextColor="#91A1B5"
                />
              </View>
              <View style={styles.editFieldGroup}>
                <Text style={styles.inputLabel}>License Plate</Text>
                <TextInput
                  style={styles.textInput}
                  value={editLicensePlate}
                  onChangeText={setEditLicensePlate}
                  placeholder="Enter license plate"
                  placeholderTextColor="#91A1B5"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.editFieldGroup}>
                <Text style={styles.inputLabel}>Vehicle Model</Text>
                <TextInput
                  style={styles.textInput}
                  value={editModel}
                  onChangeText={setEditModel}
                  placeholder="Enter vehicle model"
                  placeholderTextColor="#91A1B5"
                />
              </View>
              <View style={styles.editFieldGroup}>
                <Text style={styles.inputLabel}>Vehicle Color</Text>
                <TextInput
                  style={styles.textInput}
                  value={editColor}
                  onChangeText={setEditColor}
                  placeholder="Enter vehicle color"
                  placeholderTextColor="#91A1B5"
                />
              </View>
              <View style={styles.editFieldGroup}>
                <Text style={styles.inputLabel}>Capacity</Text>
                <TextInput
                  style={styles.textInput}
                  value={editCapacity}
                  onChangeText={setEditCapacity}
                  placeholder="Enter seating capacity"
                  placeholderTextColor="#91A1B5"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>
            <View style={styles.editModalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveVehicle}
                disabled={savingVehicle}
              >
                {savingVehicle ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper Components
const InfoRow = ({
  label,
  value,
  icon,
  highlighted,
}: {
  label: string;
  value: string;
  icon: string;
  highlighted?: boolean;
}) => (
  <View style={[styles.infoRow, highlighted && styles.infoRowHighlighted]}>
    <View style={styles.infoRowLeft}>
      <MaterialIcons
        name={icon as any}
        size={18}
        color={highlighted ? "#F59E0B" : "#9CA3AF"}
      />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text
      style={[styles.infoValue, highlighted && styles.infoValueHighlighted]}
    >
      {value}
    </Text>
  </View>
);

const StatItem = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.statItem}>
    <MaterialIcons name={icon as any} size={24} color="#1769D2" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  pageContent: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
  },
  errorButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1769D2",
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  header: {
    paddingTop: 0,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1EDF9",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 48,
    backgroundColor: "#17385F",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  headerSpacer: {
    flex: 1,
  },
  moreButton: {
    width: 34,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 164,
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#EAF3FB",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EAF3FB",
  },
  vehicleNameBadgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  vehicleNameInHeader: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17385F",
  },
  vehicleModel: {
    fontSize: 11,
    color: "#647C95",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quickActionsContainer: {
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: "#F4F8FC",
  },
  primaryQuickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: "#1769D2",
  },
  primaryQuickActionLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryQuickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#1769D2",
  },
  secondaryQuickActionLabel: {
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 40,
    backgroundColor: "#F4F8FC",
  },
  card: {
    backgroundColor: "#FFF",
    borderColor: "#DDEBFA",
    borderWidth: 1,
    borderRadius: 13,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#4D7EA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  dangerCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#F5F9FE",
    borderBottomWidth: 1,
    borderBottomColor: "#E7F0F9",
    gap: 8,
  },
  photoCount: {
    marginLeft: "auto",
    color: "#71869C",
    fontSize: 10,
  },
  photoStrip: {
    padding: 10,
    gap: 8,
  },
  photoThumbnail: {
    width: 86,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EAF3FB",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#17385F",
  },
  dangerTitle: {
    color: "#EF4444",
  },
  cardContent: {
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoRowHighlighted: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  infoValueHighlighted: {
    color: "#F59E0B",
  },
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  driverIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF3FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  driverStatus: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 2,
  },
  assignDriverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1769D2",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  assignDriverButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  maintenanceStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  maintenanceStatusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  insuranceStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  insuranceStatusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  gpsStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  onlineBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  onlineBadgeActive: {
    backgroundColor: "#10B981",
  },
  offlineBadge: {
    backgroundColor: "#EF4444",
  },
  onlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  lastUpdateText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 20,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderColor: "#1769D2",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 9,
    marginTop: 12,
  },
  locationButtonText: {
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statItem: {
    width: "48%",
    backgroundColor: "#F3F8FE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F59E0B",
  },
  buttonDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  imageCarousel: {
    width: "100%",
    height: "100%",
  },
  carouselIndicators: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  indicatorDotActive: {
    backgroundColor: "#FFF",
  },
  qrCodeContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  qrCodeText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  noQrContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  noQrText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "#DDEBFA",
  },
  optionsDrawerContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 14,
  },
  optionsDrawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  optionsDrawerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  optionsDrawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  optionsDrawerItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  optionsDrawerSectionHeader: {
    paddingTop: 18,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  optionsDrawerSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
  dangerZoneItem: {
    backgroundColor: "#FEF2F2",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17385F",
  },
  assignmentVehicleLabel: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 3,
  },
  driversList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  driverItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDEBFA",
  },
  driverItemSelected: {
    backgroundColor: "#EDF6FF",
    borderColor: "#1769D2",
  },
  driverItemOwner: {
    backgroundColor: "#F0F9FF",
    borderColor: "#0EA5E9",
    borderWidth: 1.5,
  },
  driverItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  driverItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF3FE",
    justifyContent: "center",
    alignItems: "center",
  },
  driverItemInfo: {
    flex: 1,
  },
  driverItemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  driverItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  driverItemEmail: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  ownerBadge: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ownerBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  modalCloseButton: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: "#1769D2",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  locationMapScreen: {
    flex: 1,
    backgroundColor: "#F4F8FC",
  },
  locationMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DDEBFA",
  },
  locationMapBack: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5FC",
  },
  locationMapHeaderText: {
    flex: 1,
  },
  locationMapTitle: {
    color: "#17385F",
    fontSize: 14,
    fontWeight: "700",
  },
  locationMapSubtitle: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 2,
  },
  locationMapOnlineBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  locationMapOnlineText: {
    fontSize: 10,
    fontWeight: "700",
  },
  locationMap: {
    flex: 1,
    width: "100%",
    backgroundColor: "#E6EEF6",
  },
  noLocationState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  noLocationTitle: {
    marginTop: 12,
    color: "#17385F",
    fontSize: 15,
    fontWeight: "700",
  },
  noLocationDescription: {
    marginTop: 6,
    color: "#71869C",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  locationMapFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DDEBFA",
  },
  vehicleMiniIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FE",
  },
  locationMapFooterText: {
    flex: 1,
  },
  locationMapVehicleName: {
    color: "#17385F",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: "rgba(15, 37, 62, 0.45)",
    justifyContent: "flex-end",
  },
  editModalContent: {
    height: "92%",
    backgroundColor: "#F4F8FC",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDEBFA",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DDEBFA",
  },
  editModalTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editModalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF3FE",
    alignItems: "center",
    justifyContent: "center",
  },
  editModalTitle: {
    color: "#17385F",
    fontSize: 14,
    fontWeight: "700",
  },
  editModalSubtitle: {
    color: "#71869C",
    fontSize: 10,
    marginTop: 2,
  },
  editModalClose: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F6FB",
  },
  editModalBody: {
    flex: 1,
  },
  editModalForm: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  editFieldGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 11,
    color: "#526981",
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E7F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1F3552",
  },
  editModalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#DDEBFA",
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#1769D2",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
