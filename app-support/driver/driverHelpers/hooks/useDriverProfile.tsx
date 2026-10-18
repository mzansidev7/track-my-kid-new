import { AuthContext } from "@/context/authContext/auth-context";
import { subscribeToDriverProfileUpdates } from "@/store/subscriptions/driversRealtime";
import { clearAuthToken, setAuthToken } from "@/supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "@/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const useDriverProfile = () => {
  const { user } = useContext(AuthContext);
  const userId = user?.userData?.id || user?.userData?.user_id || user?.id;
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const fetchDriverProfile = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!user?.token || !userId) {
      setDriver(null);
      setError("Missing authentication token");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    const cacheKey = `driver_profile:${userId}`;

    try {
      const storedDriver = await AsyncStorage.getItem(cacheKey);
      if (storedDriver && sequence === requestSequence.current) {
        setDriver(JSON.parse(storedDriver));
      }
    } catch (cacheError) {
      console.error("Failed to load driver from AsyncStorage:", cacheError);
    }

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to fetch driver profile.",
        );
      }

      const profile = data.driver;
      if (!profile || typeof profile !== "object") {
        throw new Error("The server returned an invalid driver profile.");
      }
      const cleanText = (value: unknown) => {
        if (typeof value !== "string") return value;
        const normalized = value.trim();
        return ['""', "null"].includes(normalized.toLowerCase())
          ? null
          : value;
      };

      const avatar = profile.avatar;
      const avatarUrl =
        typeof avatar === "string"
          ? avatar
          : avatar && typeof avatar === "object"
            ? avatar.url ||
              avatar.avatar_url ||
              avatar.dataUrl ||
              avatar.uri ||
              avatar.avatar_data ||
              null
            : null;
      const freshDriver = {
        ...profile,
        date_of_birth: cleanText(profile.date_of_birth),
        id_number: cleanText(profile.id_number),
        licence_expiry: cleanText(profile.licence_expiry),
        experience: cleanText(profile.experience),
        vehicle_plate_number: cleanText(profile.vehicle_plate_number),
        avatar: avatarUrl || null,
      };
      if (sequence !== requestSequence.current) return;

      setDriver(freshDriver);
      setError(null);
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(freshDriver));
      } catch (cacheError) {
        console.error("Failed to save driver to AsyncStorage:", cacheError);
      }
    } catch (fetchError) {
      if (sequence !== requestSequence.current) return;
      setDriver(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to reach the server. Please try again.",
      );
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [user?.token, userId]);

  useEffect(() => {
    void fetchDriverProfile();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchDriverProfile]);

  useEffect(() => {
    if (!user?.token || !userId) return;

    setAuthToken(user.token);
    const profileChannel = subscribeToDriverProfileUpdates(
      userId,
      fetchDriverProfile,
    );

    return () => {
      if (profileChannel?.unsubscribe) profileChannel.unsubscribe();
      clearAuthToken();
    };
  }, [user?.token, userId, fetchDriverProfile]);

  return { driver, loading, error, refreshDriver: fetchDriverProfile };
};
