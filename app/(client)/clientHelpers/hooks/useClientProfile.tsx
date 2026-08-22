import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  subscribeToClientProfileUpdates,
  unsubscribeFromRealtime,
} from "../../../../store/subscriptions/clientRealtime";

export const useClientProfile = () => {
  const { user } = useContext(AuthContext);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientProfile = useCallback(async () => {
    if (!user?.token) {
      setError("Missing authentication token");
      setLoading(false);
      return;
    }

    setError(null);
    let hasCache = false;

    const baseUrl = await resolveWorkingBaseUrl();

    try {
      const storedClient = await AsyncStorage.getItem("client_profile");
      if (storedClient) {
        const parsedClient = JSON.parse(storedClient);
        setClient(parsedClient);
        hasCache = true;
      }
    } catch (err) {
      console.error("Failed to load client profile from AsyncStorage:", err);
    }

    if (!hasCache) {
      setLoading(true);
    }

    const endpoints = [
      "/client/profile",
      "/clients/profile",
      "/client",
      "/clients/me",
      "/me",
    ];

    let lastError = "Unable to fetch client profile.";

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
          const freshClient = data.client || data || null;
          setClient(freshClient);
          try {
            await AsyncStorage.setItem(
              "client_profile",
              JSON.stringify(freshClient),
            );
          } catch (saveErr) {
            console.error(
              "Failed to save client profile to AsyncStorage:",
              saveErr,
            );
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
        console.error(`Client profile fetch failed at ${endpoint}:`, err);
        lastError = "Unable to reach the server. Please try again.";
      }
    }

    setError(lastError);
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    fetchClientProfile();

    const channel = subscribeToClientProfileUpdates(
      user?.userData?.id || user?.id,
      () => {
        fetchClientProfile();
      },
    );

    return () => {
      unsubscribeFromRealtime(channel);
    };
  }, [fetchClientProfile, user?.userData?.id, user?.id]);

  return { client, loading, error, refreshClient: fetchClientProfile };
};
