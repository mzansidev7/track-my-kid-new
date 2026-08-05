import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllClientCaches } from "./clientCache";

export const normalizeRole = (role) => {
  if (!role) return null;

  const normalized = String(role).trim().toLowerCase();

  if (
    normalized === "fleet_owner" ||
    normalized === "fleetowner" ||
    normalized === "fleet-owner"
  ) {
    return "owner";
  }

  if (normalized === "parent") {
    return "client";
  }

  return normalized;
};

// ✅ Save token + user (including normalized role inside user)
export const saveAuthToken = async (token, user) => {
  try {
    const normalizedRole = normalizeRole(user?.role);

    if (!normalizedRole) {
      console.warn("User object has no role, defaulting to null");
    }

    const userToStore = {
      ...user,
      role: normalizedRole,
      is_verified: user.is_verified ?? false, // optional
    };

    await AsyncStorage.setItem("authToken", token);
    await AsyncStorage.setItem("user", JSON.stringify(userToStore));
  } catch (error) {
    console.error("Error saving auth token:", error);
  }
};

// ✅ Get token + user
export const getUserFromAsyncStorage = async () => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    const userStr = await AsyncStorage.getItem("user");

    if (!userStr) return { token: null, user: null };

    const user = JSON.parse(userStr);

    return { token, user };
  } catch (error) {
    console.error("Error retrieving auth token:", error);
    return { token: null, user: null };
  }
};

// ✅ Merge updates into user without overwriting role
// ✅ Merge updates into user without overwriting role
export const updateUser = async (updateData) => {
  try {
    const current = await getUserFromAsyncStorage();
    if (!current.user) return;

    const newUser = {
      ...current.user, // keep existing fields (role, isVerified, etc.)
      ...updateData, // merge updates
    };

    if (newUser.role) {
      newUser.role = normalizeRole(newUser.role);
    }

    // Ensure id is a string
    if (newUser.id && Array.isArray(newUser.id)) {
      newUser.id = newUser.id.join(""); // convert ["b","2","4",...] back to string
    }

    // Ensure other string fields stay strings
    ["email", "name", "phone", "role"].forEach((key) => {
      if (newUser[key] && Array.isArray(newUser[key])) {
        newUser[key] = newUser[key].join("");
      }
    });

    await AsyncStorage.setItem("user", JSON.stringify(newUser));
  } catch (error) {
    console.error("Error updating user:", error);
  }
};

export const clearUserFromAsyncStorage = async () => {
  const user = await getUserFromAsyncStorage();
  if (!user) return;

  // Clear client caches when logging out
  await clearAllClientCaches();

  await AsyncStorage.removeItem("user");
  await AsyncStorage.removeItem("authToken");
  return { status: "Success" };
};
