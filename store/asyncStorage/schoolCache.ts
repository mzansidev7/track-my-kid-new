import AsyncStorage from "@react-native-async-storage/async-storage";

export type SchoolDashboardData = {
  school: any | null;
  students: any[];
  routes: any[];
  drivers: any[];
  parents: any[];
};

const CACHE_TTL = 5 * 60 * 1000;
const cacheKey = (userId: string) => `school_dashboard_${userId}`;

export const saveSchoolDashboard = async (
  userId: string,
  data: SchoolDashboardData,
) => {
  try {
    await AsyncStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL }),
    );
  } catch (error) {
    console.error("Error saving school dashboard cache:", error);
  }
};

export const loadSchoolDashboard = async (
  userId: string,
): Promise<SchoolDashboardData | null> => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.data || Date.now() > cached.expiresAt) {
      await AsyncStorage.removeItem(cacheKey(userId));
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error("Error loading school dashboard cache:", error);
    return null;
  }
};

export const clearSchoolDashboard = async (userId: string) => {
  await AsyncStorage.removeItem(cacheKey(userId));
};
