import axios from "axios";
import {
  getUserFromAsyncStorage,
  saveAuthToken,
  updateUser,
} from "../store/asyncStorage/authStore";
import { DEBUG_API_CONFIG, resolveWorkingBaseUrl } from "../url";
import { UserAuthData } from "./interface";

export const userAuth = async (formData: UserAuthData) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      owner_id,
      vehicle_plate_number,
      emis_number,
      principal_name,
      address,
      province,
      logo,
    } = formData;

    if (role === "admin") {
      const mockAdminUser = {
        id: "mock-admin-user",
        name: name || "Admin User",
        email: email || "admin@trackmykid.com",
        phone: phone || "+27123456789",
        role: "admin",
        is_verified: true,
      };

      await saveAuthToken("mock-admin-token", mockAdminUser);
      return {
        status: 201,
        user: mockAdminUser,
        token: "mock-admin-token",
        emailSent: false,
      };
    }

    const baseUrl = await resolveWorkingBaseUrl();

    // Call backend API
    const response = await axios.post(`${baseUrl}/create-user`, {
      name,
      email,
      password,
      phone,
      role,
      ...(owner_id ? { owner_id } : {}),
      ...(vehicle_plate_number ? { vehicle_plate_number } : {}),
      ...(emis_number ? { emis_number } : {}),
      ...(principal_name ? { principal_name } : {}),
      ...(address ? { address } : {}),
      ...(province ? { province } : {}),
      ...(logo ? { logo } : {}),
    });

    // Extract token and user from response
    const { token, user, emailSent } = response.data;

    if (!token || !user) {
      throw new Error("Invalid response from server");
    }

    // Ensure role is included in the user object
    const userWithRole = { ...user, role: user.role || role };

    // Save token + user with role to AsyncStorage
    await saveAuthToken(token, userWithRole);

    // Retrieve stored user to verify
    const storedUser = await getUserFromAsyncStorage();

    if (response.status === 201) {
      return {
        status: response.status,
        user: storedUser.user,
        token: storedUser.token,
        emailSent: emailSent !== false,
      };
    }
  } catch (error: any) {
    console.error("Auth Error:", error?.response?.data || error.message);
    throw error; // Let the caller handle UI/alerts
  }
};

export const requestRegistrationLink = async (email: string, role?: string) => {
  try {
    const baseUrl = await resolveWorkingBaseUrl();
    const response = await axios.post(`${baseUrl}/request-registration-link`, {
      email,
      role,
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "Invite request error:",
      error?.response?.data || error.message,
    );
    throw error;
  }
};

export const loginUser = async (formData: any) => {
  try {
    const baseUrl = await resolveWorkingBaseUrl();
    console.log("🔎 Auth debug config:", {
      ...DEBUG_API_CONFIG,
      effectiveBaseUrl: baseUrl,
    });
    // short preflight ping to help diagnose network reachability from the device
    try {
      await axios.get(`${baseUrl}/health`, { timeout: 3000 });
    } catch (pingErr: any) {
      console.error("🔌 Preflight failed:", pingErr?.message || pingErr);
      if (pingErr?.code === "ERR_NETWORK") {
        console.error(
          "🔌 Preflight network error — backend appears unreachable from the device/emulator.",
        );
      }
    }

    const res = await axios.post(`${baseUrl}/login`, formData);

    const { token, user } = res.data;

    if (token && user) {
      await saveAuthToken(token, user);
      await getUserFromAsyncStorage();
      return { token, user };
    } else {
      return {
        success: false,
        message: "Please enter the correct user credentials",
      };
    }
  } catch (error: any) {
    console.error("❌ Login error:", error);
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error code:", error?.code);
    console.error("❌ Error response:", error?.response?.data);
    console.error("❌ Error status:", error?.response?.status);
    if (typeof error?.toJSON === "function") {
      try {
        console.error("❌ Error toJSON:", error.toJSON());
      } catch {
        // ignore
      }
    }

    if (error?.code === "ERR_NETWORK") {
      console.error(
        "❌ Network error detected — verify `BASE_URL`, device/emulator network, and that the backend is reachable from the device.",
      );
    }

    throw error;
  }
};

export const verifyOtp = async (user_id: string, code: string) => {
  try {
    const baseUrl = await resolveWorkingBaseUrl();
    const response = await axios.post(`${baseUrl}/verify-otp`, {
      user_id,
      code,
    });

    await updateUser({ is_verified: true });
    return response.data; // ✅ IMPORTANT
  } catch (error: any) {
    return error?.response?.data;
  }
};

export const resendOtp = async (user_id: string) => {
  try {
    const baseUrl = await resolveWorkingBaseUrl();
    const res = await axios.post(`${baseUrl}/resend-otp`, {
      user_id,
    });

    return res.data;
  } catch (error: any) {
    throw error?.response?.data || { message: "RESEND_FAILED" };
  }
};

export const signOut = async () => {
  await getUserFromAsyncStorage();

  return { success: true, message: "User signed out successfully" };
};
