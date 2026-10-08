import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedAdminVehicle = Record<string, unknown>;

const CACHE_PREFIX = "admin_vehicles_cache_v1_";

export const getCachedAdminVehicles = async (
  adminUserId: string,
): Promise<{ vehicles: CachedAdminVehicle[]; cachedAt: string } | null> => {
  if (!adminUserId) return null;
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${adminUserId}`);
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { vehicles?: unknown }).vehicles) ||
      typeof (parsed as { cachedAt?: unknown }).cachedAt !== "string"
    ) {
      return null;
    }
    return {
      vehicles: (parsed as { vehicles: CachedAdminVehicle[] }).vehicles,
      cachedAt: (parsed as { cachedAt: string }).cachedAt,
    };
  } catch (error) {
    console.error("Could not read cached Admin vehicles:", error);
    return null;
  }
};

export const cacheAdminVehicles = async (
  adminUserId: string,
  vehicles: CachedAdminVehicle[],
): Promise<string | null> => {
  if (!adminUserId) return null;
  const cachedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${adminUserId}`,
      JSON.stringify({ vehicles, cachedAt }),
    );
    return cachedAt;
  } catch (error) {
    console.error("Could not cache Admin vehicles:", error);
    return null;
  }
};
