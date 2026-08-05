import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../url";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

const DEFAULT_WEEKDAY_TIME_KEY = "owner_default_weekday_departure_time";

const TIME_PREFERENCES_KEY = "owner_departure_time_preferences";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type TimeScope = "today" | "week" | "month" | "year";

export interface TimePreference {
  time: string;
  scope: TimeScope;
  setDate: string;
  expiryDate?: string;
}

/* -------------------------------------------------------------------------- */
/*                              DATE UTILITIES                                */
/* -------------------------------------------------------------------------- */

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getExpiryDate = (scope: TimeScope): string | undefined => {
  const now = new Date();

  switch (scope) {
    case "today":
      return getTodayDate();

    case "week": {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (6 - now.getDay()));

      return weekEnd.toISOString().split("T")[0];
    }

    case "month": {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return monthEnd.toISOString().split("T")[0];
    }

    case "year": {
      const yearEnd = new Date(now.getFullYear(), 11, 31);

      return yearEnd.toISOString().split("T")[0];
    }

    default:
      return undefined;
  }
};

/* -------------------------------------------------------------------------- */
/*                              STORAGE HELPERS                               */
/* -------------------------------------------------------------------------- */

const safeParse = <T>(value: string | null, fallback: T): T => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getAuthHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token && {
    Authorization: `Bearer ${token}`,
  }),
});

/* -------------------------------------------------------------------------- */
/*                           LEGACY FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

export const setDefaultWeekdayDepartureTime = async (
  time: string,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(DEFAULT_WEEKDAY_TIME_KEY, time);
  } catch (err) {
    console.error("❌ Error saving default weekday departure time:", err);
  }
};

export const getDefaultWeekdayDepartureTime = async (): Promise<
  string | null
> => {
  try {
    return await AsyncStorage.getItem(DEFAULT_WEEKDAY_TIME_KEY);
  } catch (err) {
    console.error("❌ Error getting default weekday departure time:", err);

    return null;
  }
};

export const clearDefaultWeekdayDepartureTime = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEFAULT_WEEKDAY_TIME_KEY);
  } catch (err) {
    console.error("❌ Error clearing default weekday departure time:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                         SAVE TIME PREFERENCE                               */
/* -------------------------------------------------------------------------- */

export const setDepartureTimePreference = async (
  time: string,
  scope: TimeScope,
  token?: string,
): Promise<void> => {
  try {
    const preference: TimePreference = {
      time,
      scope,
      setDate: getTodayDate(),
      expiryDate: getExpiryDate(scope),
    };

    const existing = await getAllDepartureTimePreferences();

    const updated = [...existing.filter((p) => p.scope !== scope), preference];

    await AsyncStorage.setItem(TIME_PREFERENCES_KEY, JSON.stringify(updated));

    if (token) {
      try {
        const response = await fetch(`${BASE_URL}/owner/time-preferences`, {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            time_value: time,
            scope,
          }),
        });

        if (!response.ok) {
          console.warn("⚠️ Failed to sync time preference");
        }
      } catch (err) {
        console.warn("⚠️ Backend sync failed:", err);
      }
    }

    console.log(`✅ Saved departure time: ${time} (${scope})`);
  } catch (err) {
    console.error("❌ Error saving departure time preference:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                       GET CURRENT PREFERENCE                               */
/* -------------------------------------------------------------------------- */

export const getDepartureTimePreference = async (
  token?: string,
): Promise<string | null> => {
  try {
    await cleanupExpiredPreferences();

    if (token) {
      try {
        const response = await fetch(
          `${BASE_URL}/owner/current-departure-time`,
          {
            method: "GET",
            headers: getAuthHeaders(token),
          },
        );

        if (response.ok) {
          const data = await response.json();

          if (data?.time) {
            console.log(`📅 Using backend time: ${data.time}`);

            return data.time;
          }
        }
      } catch (err) {
        console.warn("⚠️ Backend fetch failed:", err);
      }
    }

    const preferences = await getAllDepartureTimePreferences();

    const today = getTodayDate();

    const priority: TimeScope[] = ["today", "week", "month", "year"];

    for (const scope of priority) {
      const pref = preferences.find((p) => p.scope === scope);

      if (pref && (!pref.expiryDate || pref.expiryDate >= today)) {
        return pref.time;
      }
    }

    return await getDefaultWeekdayDepartureTime();
  } catch (err) {
    console.error("❌ Error getting departure time preference:", err);

    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                         GET ALL PREFERENCES                                */
/* -------------------------------------------------------------------------- */

export const getAllDepartureTimePreferences = async (
  token?: string,
): Promise<TimePreference[]> => {
  try {
    if (token) {
      try {
        const response = await fetch(`${BASE_URL}/owner/time-preferences`, {
          method: "GET",
          headers: getAuthHeaders(token),
        });

        if (response.ok) {
          const backendPrefs = await response.json();

          const prefs: TimePreference[] = backendPrefs.map((pref: any) => ({
            time: pref.time_value,
            scope: pref.scope,
            setDate: pref.set_date,
            expiryDate: pref.expiry_date,
          }));

          await AsyncStorage.setItem(
            TIME_PREFERENCES_KEY,
            JSON.stringify(prefs),
          );

          return prefs;
        }
      } catch (err) {
        console.warn("⚠️ Backend fetch failed:", err);
      }
    }

    const prefsJson = await AsyncStorage.getItem(TIME_PREFERENCES_KEY);

    return safeParse<TimePreference[]>(prefsJson, []);
  } catch (err) {
    console.error("❌ Error getting time preferences:", err);

    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                         CLEANUP EXPIRED PREFS                              */
/* -------------------------------------------------------------------------- */

export const cleanupExpiredPreferences = async (): Promise<void> => {
  try {
    const prefs = await getAllDepartureTimePreferences();

    const today = getTodayDate();

    const validPrefs = prefs.filter(
      (pref) => !pref.expiryDate || pref.expiryDate >= today,
    );

    if (validPrefs.length !== prefs.length) {
      await AsyncStorage.setItem(
        TIME_PREFERENCES_KEY,
        JSON.stringify(validPrefs),
      );

      console.log(
        `🧹 Removed ${prefs.length - validPrefs.length} expired preferences`,
      );
    }
  } catch (err) {
    console.error("❌ Error cleaning expired preferences:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                         CLEAR PREFERENCES                                  */
/* -------------------------------------------------------------------------- */

export const clearDepartureTimePreferences = async (
  scope?: TimeScope,
): Promise<void> => {
  try {
    if (scope) {
      const prefs = await getAllDepartureTimePreferences();

      const filtered = prefs.filter((p) => p.scope !== scope);

      await AsyncStorage.setItem(
        TIME_PREFERENCES_KEY,
        JSON.stringify(filtered),
      );

      console.log(`🗑️ Cleared ${scope} preference`);
    } else {
      await AsyncStorage.removeItem(TIME_PREFERENCES_KEY);

      console.log("🗑️ Cleared all preferences");
    }
  } catch (err) {
    console.error("❌ Error clearing preferences:", err);
  }
};
