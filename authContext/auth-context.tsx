import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getUserFromAsyncStorage,
  normalizeRole,
} from "../asyncStorage/authStore";
import { clearAuthToken, setAuthToken } from "../supabaseConfig/supabaseConfig";
import { BASE_URL, resolveWorkingBaseUrl } from "../url";

const OWNER_DRIVER_MODE_KEY = "owner_driver_mode";

type AuthType = {
  user: any;
  setUser: (user: any) => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  driverMode: boolean;
  toggleDriverMode: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthType>({
  user: null,
  setUser: () => {},
  loading: true,
  refreshUser: async () => {},
  logout: async () => {},
  driverMode: false,
  toggleDriverMode: async () => {},
});

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverMode, setDriverMode] = useState<boolean>(false);

  const loadUser = async () => {
    try {
      const storedUser = await getUserFromAsyncStorage();
      console.log("🔍 Loaded user from AsyncStorage:", storedUser);
      if (!storedUser || !storedUser.user) {
        setUser(null);
        return;
      }

      let parsedUser = storedUser.user;
      if (typeof parsedUser === "string") {
        try {
          parsedUser = JSON.parse(parsedUser);
        } catch (e) {
          console.error("JSON parse error:", e);
          setUser(null);
          return;
        }
      }

      const normalizedRole = normalizeRole(parsedUser.role);

      if (normalizedRole && parsedUser.role !== normalizedRole) {
        parsedUser = { ...parsedUser, role: normalizedRole };
        await AsyncStorage.setItem("user", JSON.stringify(parsedUser));
      }

      setUser({
        token: storedUser.token,
        userData: parsedUser,
        role: normalizedRole,
      });

      const storedDriverMode = await AsyncStorage.getItem(
        OWNER_DRIVER_MODE_KEY,
      );
      setDriverMode(storedDriverMode === "true");

      if (storedUser.token) {
        setAuthToken(storedUser.token);
      } else {
        clearAuthToken();
      }
    } catch (err) {
      setUser(null);
      console.error("Error loading user from AsyncStorage:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Load user ONCE
  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    await loadUser();
  };

  const toggleDriverMode = async (enabled: boolean) => {
    const previousMode = driverMode;
    setDriverMode(enabled);

    try {
      await AsyncStorage.setItem(
        OWNER_DRIVER_MODE_KEY,
        JSON.stringify(enabled),
      );

      // Update backend
      if (user?.token) {
        let baseUrl = await resolveWorkingBaseUrl();
        console.log("Driver mode update using baseUrl:", baseUrl);

        const attemptFetch = async (url: string, body: any) => {
          try {
            const response = await fetch(`${url}/owner/profile`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify(body),
            });
            return response;
          } catch (err) {
            console.warn(`Driver mode profile update failed for ${url}:`, err);
            if (url !== BASE_URL) {
              return await fetch(`${BASE_URL}/owner/profile`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ driver_mode: enabled }),
              });
            }
            throw err;
          }
        };

        const response = await attemptFetch(baseUrl, {
          driver_mode: enabled,
        });

        if (!response.ok) {
          throw new Error(`Owner profile update failed: ${response.status}`);
        }

        // If enabling driver mode, automatically add the owner as a driver
        if (enabled && user?.userData) {
          try {
            const driverPayload = {
              name: user.userData.name || "Owner Driver",
              email: user.userData.email || "",
              phone: user.userData.phone || "",
              is_self_assigned: true,
            };

            try {
              await fetch(`${baseUrl}/owner/drivers`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify(driverPayload),
              });
            } catch (driverErr) {
              if (baseUrl !== BASE_URL) {
                await fetch(`${BASE_URL}/owner/drivers`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                  },
                  body: JSON.stringify(driverPayload),
                });
              } else {
                throw driverErr;
              }
            }

            console.log("Owner successfully registered as a driver");
          } catch (driverErr) {
            console.error("Error registering owner as driver:", driverErr);
            // Don't fail the whole operation if driver registration fails
          }
        }
      }
    } catch (err) {
      console.error("Error saving driver mode:", err);
      setDriverMode(previousMode);
      try {
        await AsyncStorage.setItem(
          OWNER_DRIVER_MODE_KEY,
          JSON.stringify(previousMode),
        );
      } catch (storageErr) {
        console.error("Failed to restore driver mode in storage:", storageErr);
      }
    }
  };

  const logout = async () => {
    // Clear local storage first (most reliable)
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem(OWNER_DRIVER_MODE_KEY);
    setUser(null);
    setDriverMode(false);
    clearAuthToken();

    // Then try to notify backend (non-critical - ignore errors)
    // try {
    //   await fetch(`${BASE_URL}/logout`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   });
    // } catch (error) {
    //   // Silently ignore - logout already completed locally
    //   console.debug(
    //     "Backend logout notification failed (non-critical):",
    //     error,
    //   );
    // }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshUser,
        logout,
        driverMode,
        toggleDriverMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
