import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

export const useAdminProfile = () => {
  const { user } = useContext(AuthContext);
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminProfile = useCallback(async () => {
    if (!user?.token) {
      setAdmin(null);
      setError("Missing authentication token");
      setLoading(false);
      return;
    }

    setError(null);

    let hasCache = false;
    try {
      const storedAdmin = await AsyncStorage.getItem("admin_profile");
      if (storedAdmin) {
        const parsedAdmin = JSON.parse(storedAdmin);
        setAdmin(parsedAdmin);
        hasCache = true;
      }
    } catch (err) {
      console.error("Failed to load admin profile from AsyncStorage:", err);
    }

    const fallbackAdmin = user?.userData || user || null;
    if (fallbackAdmin && user?.role === "admin") {
      setAdmin(fallbackAdmin);
    }

    if (!hasCache) {
      setLoading(true);
    }

    const baseUrl = await resolveWorkingBaseUrl();
    const endpoints = [
      "/admin/profile",
      "/admins/profile",
      "/admin",
      "/admins/me",
      "/me",
    ];

    let lastError = "Unable to fetch admin profile.";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();
        let data: any = null;

        if (rawText) {
          try {
            data = contentType.includes("application/json")
              ? JSON.parse(rawText)
              : JSON.parse(rawText);
          } catch {
            data = null;
          }
        }

        if (response.ok && data) {
          const freshAdmin = data.admin || data || null;
          const finalAdmin = freshAdmin || fallbackAdmin;
          setAdmin(finalAdmin);

          try {
            await AsyncStorage.setItem(
              "admin_profile",
              JSON.stringify(finalAdmin),
            );
          } catch (saveErr) {
            console.error(
              "Failed to save admin profile to AsyncStorage:",
              saveErr,
            );
          }

          setLoading(false);
          return;
        }

        if (response.ok && !data && fallbackAdmin) {
          setAdmin(fallbackAdmin);
          setError(null);
          setLoading(false);
          return;
        }

        if (response.status === 404) {
          lastError = `Endpoint not found: ${endpoint}`;
          continue;
        }

        if (response.status >= 400 && fallbackAdmin) {
          setAdmin(fallbackAdmin);
          setError(null);
          setLoading(false);
          return;
        }

        lastError =
          data?.error ||
          data?.message ||
          `Failed to load profile from ${endpoint}`;
        break;
      } catch (err) {
        console.error(`Admin profile fetch failed at ${endpoint}:`, err);
        if (fallbackAdmin) {
          setAdmin(fallbackAdmin);
          setError(null);
          setLoading(false);
          return;
        }
        lastError = "Unable to reach the server. Please try again.";
      }
    }

    if (fallbackAdmin && user?.role === "admin") {
      setAdmin(fallbackAdmin);
      setError(null);
      setLoading(false);
      return;
    }

    setError(lastError);
    setLoading(false);
  }, [user?.token, user?.role, user?.userData]);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  return { admin, loading, error, refreshAdmin: fetchAdminProfile };
};
