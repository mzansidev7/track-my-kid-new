import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

export const useOwnerProfile = () => {
  const { user } = useContext(AuthContext);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerProfile = useCallback(async () => {
    if (!user?.token) {
      setError("Missing authentication token");
      setLoading(false);
      return;
    }
    setError(null);

    // Load from AsyncStorage first
    let hasCache = false;
    try {
      const storedOwner = await AsyncStorage.getItem("owner_profile");

      if (storedOwner) {
        const parsedOwner = JSON.parse(storedOwner);
        setOwner(parsedOwner);
        hasCache = true;
      }
    } catch (err) {
      console.error("Failed to load owner from AsyncStorage:", err);
    }

    if (!hasCache) {
      setLoading(true); // Show loading only if no cached data
    }

    // Then fetch from server
    const baseUrl = await resolveWorkingBaseUrl();
    const endpoints = [
      "/owner/profile",
      "/owners/profile",
      "/owner",
      "/owners/me",
      "/me",
    ];

    let lastError = "Unable to fetch owner profile.";

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
          const freshOwner = data.owner || data || null;
          setOwner(freshOwner);
          // Save to AsyncStorage
          try {
            await AsyncStorage.setItem(
              "owner_profile",
              JSON.stringify(freshOwner),
            );
          } catch (saveErr) {
            console.error("Failed to save owner to AsyncStorage:", saveErr);
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
        console.error(`Owner profile fetch failed at ${endpoint}:`, err);
        lastError = "Unable to reach the server. Please try again.";
      }
    }

    setError(lastError);
    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    fetchOwnerProfile();
  }, [fetchOwnerProfile]);

  return { owner, loading, error, refreshOwner: fetchOwnerProfile };
};
