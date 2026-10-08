import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedAdminDriver = Record<string, unknown>;

const CACHE_PREFIX = "admin_drivers_cache_v1_";

const cacheKey = (adminUserId: string) => `${CACHE_PREFIX}${adminUserId}`;

export const getCachedAdminDrivers = async (
  adminUserId: string,
): Promise<{ drivers: CachedAdminDriver[]; cachedAt: string } | null> => {
  if (!adminUserId) return null;
  try {
    const cached = await AsyncStorage.getItem(cacheKey(adminUserId));
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { drivers?: unknown }).drivers) ||
      typeof (parsed as { cachedAt?: unknown }).cachedAt !== "string"
    ) {
      return null;
    }
    return {
      drivers: (parsed as { drivers: CachedAdminDriver[] }).drivers,
      cachedAt: (parsed as { cachedAt: string }).cachedAt,
    };
  } catch (error) {
    console.error("Could not read cached Admin drivers:", error);
    return null;
  }
};

export const cacheAdminDrivers = async (
  adminUserId: string,
  drivers: CachedAdminDriver[],
): Promise<string | null> => {
  if (!adminUserId) return null;
  const cachedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(
      cacheKey(adminUserId),
      JSON.stringify({ drivers, cachedAt }),
    );
    return cachedAt;
  } catch (error) {
    console.error("Could not cache Admin drivers:", error);
    return null;
  }
};
