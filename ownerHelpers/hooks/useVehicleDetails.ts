import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from "react-native";
import { AuthContext } from "../../authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import { useDrivers } from "./useDrivers";
import { useOwnerProfile } from "./useOwnerProfile";

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  model: string;
  color?: string;
  status?: string;
  capacity?: number;
  route_id?: string;
  routes?: { name: string };
  insurance_expiry?: string;
  maintenance_due?: string;
  images?: string[];
  vehicle_images?: { url: string; fileName: string; uploadedAt: string }[];
  drivers?: {
    id: string;
    vehicle_plate_number: string;
    users?: { name: string };
  };
  vehicle_qr_code?: string | { dataUrl?: string; uri?: string };
}

export const useVehicleDetails = (vehicleId?: string | string[]) => {
  const { user, driverMode } = useContext(AuthContext);
  const { owner } = useOwnerProfile();
  const { drivers, loadingDrivers, refreshDrivers } = useDrivers();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [showSwitchDriverModal, setShowSwitchDriverModal] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [selectedSwitchingDriverId, setSelectedSwitchingDriverId] = useState<
    string | null
  >(null);
  const [imageCarouselWidth, setImageCarouselWidth] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<ScrollView | null>(null);

  const vehicleImageUrls = useMemo<string[]>(
    () =>
      vehicle?.vehicle_images?.length
        ? vehicle.vehicle_images.map((image) => image.url)
        : vehicle?.images || [],
    [vehicle],
  );

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

  const normalizedVehicleId = Array.isArray(vehicleId)
    ? vehicleId[0]
    : vehicleId;

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
      setVehicle(data);
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

  const handleSwitchDriver = useCallback(
    async (driverId: string) => {
      if (!vehicle?.id || !user?.token) return;
      if (driverId === vehicle.drivers?.id) {
        setShowSwitchDriverModal(false);
        return;
      }

      setAssigningDriver(true);
      setSelectedSwitchingDriverId(driverId);

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
            body: JSON.stringify({ driverId }),
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
    ],
  );

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  useEffect(() => {
    if (driverMode) {
      refreshDrivers(true);
    }
  }, [driverMode, refreshDrivers]);

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

  return {
    vehicle,
    loading,
    notification,
    setNotification,
    showSwitchDriverModal,
    setShowSwitchDriverModal,
    assigningDriver,
    selectedSwitchingDriverId,
    imageCarouselWidth,
    setImageCarouselWidth,
    currentImageIndex,
    setCurrentImageIndex,
    imageScrollRef,
    vehicleImageUrls,
    getVehicleQrUri,
    handleCarouselMomentumScrollEnd,
    drivers: driversWithOwner,
    loadingDrivers,
    refreshDrivers,
    handleSwitchDriver,
  };
};
