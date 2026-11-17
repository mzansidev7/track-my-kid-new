import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";
import {
  subscribeToClientProfileUpdates,
  unsubscribeFromRealtime,
} from "../../../../store/subscriptions/clientRealtime";

export const useClientProfile = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const token = user?.token;
  const userId = user?.userData?.id || user?.id;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientProfile = useCallback(async () => {
    if (!token) {
      setClient(null);
      setError("Missing authentication token");
      setLoading(false);
      return null;
    }
    setError(null);
    const profileCacheKey = userId ? `client_profile:${userId}` : null;
    let hasCache = false;

    try {
      const storedClient = profileCacheKey
        ? await AsyncStorage.getItem(profileCacheKey)
        : null;
      if (storedClient) {
        const parsedClient = JSON.parse(storedClient);
        setClient(parsedClient);
        hasCache = true;
      }
    } catch (err) {
      console.error("Failed to load client profile from AsyncStorage:", err);
    }

    if (!hasCache) {
      setClient(null);
      setLoading(true);
    }

    let baseUrl: string;
    try {
      baseUrl = await resolveWorkingBaseUrl();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the server.";
      setError(message);
      setLoading(false);
      console.error("Failed to refresh client profile:", requestError);
      return null;
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
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          const freshClient = data.client || data || null;
          setClient(freshClient);
          try {
            if (profileCacheKey) {
              await AsyncStorage.setItem(
                profileCacheKey,
                JSON.stringify(freshClient),
              );
            }
          } catch (saveErr) {
            console.error(
              "Failed to save client profile to AsyncStorage:",
              saveErr,
            );
          }
          setLoading(false);
          return freshClient;
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
    return null;
  }, [token, userId]);

  useEffect(() => {
    if (authLoading || !token) return;

    fetchClientProfile();

    const channel = subscribeToClientProfileUpdates(
      userId,
      () => {
        fetchClientProfile();
      },
    );

    return () => {
      unsubscribeFromRealtime(channel);
    };
  }, [
    authLoading,
    fetchClientProfile,
    token,
    userId,
  ]);

  return { client, loading, error, refreshClient: fetchClientProfile };
};
