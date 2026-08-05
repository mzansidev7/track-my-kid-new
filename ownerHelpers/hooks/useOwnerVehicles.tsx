import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import {
  loadOwnerVehicles,
  saveOwnerVehicles,
} from "../../asyncStorage/ownerCache";
import { useOwnerProfile } from "./useOwnerProfile";
import { subscribeToOwnerVehiclesUpdates } from "../../store/subscriptions/vehiclesRealtime";
import { unsubscribeFromRealtime } from "../../store/subscriptions/realtimeUtils";

export interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  model: string;
  color?: string;
  driver_id?: string;
  driverId?: string;
  images?: string[];
  vehicle_images?: {
    url: string;
    fileName: string;
    uploadedAt: string;
  }[];
  drivers?: {
    id: string;
    vehicle_plate_number: string;
    users?: {
      name: string;
    };
  };
  status?: string;
  capacity?: number;
  route_id?: string;
  routes?: {
    name: string;
  };
  insurance_expiry?: string;
  maintenance_due?: string;
}

interface Notification {
  visible: boolean;
  message: string;
  type: "success" | "error" | "warning";
}

export const useOwnerVehicles = () => {
  const { user, logout } = useContext(AuthContext);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [notification, setNotification] = useState<Notification>({
    visible: false,
    message: "",
    type: "success",
  });
  const channelRef = useRef<any>(null);

  const { owner } = useOwnerProfile();

  const loadCachedVehicles = useCallback(async () => {
    const cached = await loadOwnerVehicles();
    if (cached && Array.isArray(cached)) {
      setVehicles(cached);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    if (!user?.token || !user?.userData?.id) {
      console.warn(
        "useOwnerVehicles: missing auth token or user id, skipping fetch",
      );
      return;
    }

    setLoadingVehicles(true);

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      const payloadText = await response.text();
      let data: any = null;
      try {
        data = payloadText ? JSON.parse(payloadText) : null;
      } catch (jsonError) {
        console.warn(
          "useOwnerVehicles: failed to parse response JSON",
          jsonError,
        );
      }

      if (!response.ok) {
        const errorMessage =
          data?.error ||
          data?.message ||
          response.statusText ||
          "Unknown error";
        if (response.status === 401) {
          console.warn(
            "useOwnerVehicles: auth failed while fetching vehicles, logging out",
          );
          await logout();
        }
        throw new Error(`Failed to fetch vehicles: ${errorMessage}`);
      }

      const vehicleList = Array.isArray(data) ? data : [];
      setVehicles(vehicleList);
      await saveOwnerVehicles(vehicleList);
    } catch (error) {
      console.error("useOwnerVehicles fetchVehicles error:", error);

      setNotification({
        visible: true,
        message: "Failed to load vehicles.",
        type: "error",
      });
    } finally {
      setLoadingVehicles(false);
    }
  }, [logout, user?.token, user?.userData?.id]);

  useEffect(() => {
    loadCachedVehicles();
  }, [loadCachedVehicles]);

  useEffect(() => {
    if (!owner?.id) return;

    if (channelRef.current) {
      unsubscribeFromRealtime(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = subscribeToOwnerVehiclesUpdates(owner.id, () => {
      fetchVehicles();
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromRealtime(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchVehicles, owner?.id]);

  return {
    vehicles,
    loadingVehicles,
    notification,
    setNotification,
    fetchVehicles,
    setVehicles,
  };
};
