import { AuthContext } from "@/context/authContext/auth-context";
import { subscribeToDriverProfileUpdates } from "@/store/subscriptions/driversRealtime";
import { clearAuthToken, setAuthToken } from "@/supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "@/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useState } from "react";



export const useDriverProfile = () => {
  const { user } = useContext(AuthContext);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverProfile = useCallback(async () => {
    if (!user?.token) {
      setError("Missing authentication token");
      setLoading(false);
      return;
    }
    setError(null);

    // Load from AsyncStorage first
    let hasCache = false;
    try {
      const storedDriver = await AsyncStorage.getItem("driver_profile");
      if (storedDriver) {
        const parsedDriver = JSON.parse(storedDriver);
        setDriver(parsedDriver);
        hasCache = true;
      }
    } catch (err) {
      console.error("Failed to load driver from AsyncStorage:", err);
    }

    if (!hasCache) {
      setLoading(true); // Show loading only if no cached data
    }

    // Then fetch from server
    const baseUrl = await resolveWorkingBaseUrl();
    const endpoints = [
      "/driver/profile",
      "/drivers/profile",
      "/driver",
      "/drivers/me",
      "/me",
    ];

    let lastError = "Unable to fetch driver profile.";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          const freshDriver = data.driver || data || null;
          setDriver(freshDriver);
          // Save to AsyncStorage
          try {
            await AsyncStorage.setItem(
              "driver_profile",
              JSON.stringify(freshDriver),
            );
          } catch (saveErr) {
            console.error("Failed to save driver to AsyncStorage:", saveErr);
          }
          setLoading(false);
          return;
        }

        if (response.status === 404) {
          lastError = `Endpoint not found: ${endpoint}`;
          continue;
        }

        lastError =
          data.error ||
          data.message ||
          `Failed to load profile from ${endpoint}`;
        break;
      } catch (err) {
        console.error(`Driver profile fetch failed at ${endpoint}:`, err);
        lastError = "Unable to reach the server. Please try again.";
      }
    }

    setError(lastError);
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    fetchDriverProfile();
  }, [fetchDriverProfile]);

  useEffect(() => {
    if (!user?.token || !user?.userData?.id) {
      return;
    }

    setAuthToken(user.token);
    const profileChannel = subscribeToDriverProfileUpdates(
      user.userData.id,
      fetchDriverProfile,
    );

    return () => {
      if (profileChannel?.unsubscribe) {
        profileChannel.unsubscribe();
      }
      clearAuthToken();
    };
  }, [user?.token, user?.userData?.id, fetchDriverProfile]);

  return { driver, loading, error, refreshDriver: fetchDriverProfile };
};
