import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  loadOwnerDrivers,
  saveOwnerDrivers,
} from "../../asyncStorage/ownerCache";
import { AuthContext } from "../../authContext/auth-context";
import {
  subscribeToDriversListUpdates,
  unsubscribeFromRealtime,
} from "../../store/subscriptions/driversRealtime";
import { resolveWorkingBaseUrl } from "../../url";
import { useOwnerProfile } from "./useOwnerProfile";

const normalizeDriver = (driver: any) => {
  const assignedVehicles = Array.isArray(driver.vehicles)
    ? driver.vehicles
    : driver.vehicles
      ? [driver.vehicles]
      : [];
  const hasAssignedVehicle = assignedVehicles.length > 0;
  const userId =
    driver.user_id || driver.users?.id || driver.users?.user_id || "";
  const driverProfileId = driver.id || driver.driver_id || "";

  return {
    id: driverProfileId || userId,
    driverProfileId,
    userId,
    name:
      driver.users?.name ||
      driver.name ||
      driver.full_name ||
      driver.driver_name ||
      "Driver",
    email: driver.users?.email || driver.email || "",
    phone: driver.users?.phone || driver.phone || "",
    vehicle_plate_number: (() => {
      const license =
        driver.vehicle_plate_number ||
        driver.licenseNumber ||
        driver.license ||
        "";
      return typeof license === "string" && license.startsWith("PENDING-")
        ? ""
        : license;
    })(),
    created_at: driver.created_at || driver.createdAt || driver.joined_at || "",
    avatar: driver.avatar || driver.profile_picture || null,
    status: driver.status || (hasAssignedVehicle ? "active" : "inactive"),
    hasAssignedVehicle,
    vehicles: assignedVehicles,
    routes: driver.routes ?? driver.route_count ?? 0,
    students: driver.students ?? driver.student_count ?? 0,
    raw: driver,
  };
};

export const useDrivers = () => {
  const { user } = useContext(AuthContext);
  const { owner } = useOwnerProfile();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchDrivers = useCallback(
    async (forceRefresh = false) => {
      if (!user?.token) {
        setError("Missing authentication token");
        setDrivers([]);
        setLoadingDrivers(false);
        return;
      }

      let cachedData: any[] | null = null;
      setLoadingDrivers(true);
      setError(null);

      try {
        // Try to load from cache first unless force refresh
        if (!forceRefresh) {
          cachedData = await loadOwnerDrivers();
          if (cachedData) {
            console.log("📱 Using cached drivers from storage");
            setDrivers(cachedData);
          }
        }

        // Fetch from server after cache load so UI updates with fresh data
        const baseUrl = await resolveWorkingBaseUrl();
        console.log("🌐 Fetching fresh drivers from server", { baseUrl });
        const response = await fetch(`${baseUrl}/owner/drivers`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          const normalized = (data || []).map(normalizeDriver);
          setDrivers(normalized);
          // Save fresh data to cache
          await saveOwnerDrivers(normalized);
          return normalized;
        } else {
          setError(data.error || "Failed to load drivers");
          if (!cachedData) {
            setDrivers([]);
          }
          return cachedData || [];
        }
      } catch (err) {
        console.error("Error fetching drivers:", err);
        setError("Could not load drivers");
        if (!cachedData) {
          setDrivers([]);
        }
        return cachedData || [];
      } finally {
        setLoadingDrivers(false);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    // Clean up previous subscription before creating new one
    if (channelRef.current) {
      unsubscribeFromRealtime(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.token || !owner?.id) {
      return;
    }

    channelRef.current = subscribeToDriversListUpdates(
      owner.id,
      () => fetchDrivers(true), // Force refresh on real-time updates
    );

    return () => {
      if (channelRef.current) {
        unsubscribeFromRealtime(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.token, owner?.id]); // Removed fetchDrivers from dependencies

  return { drivers, loadingDrivers, error, refreshDrivers: fetchDrivers };
};
