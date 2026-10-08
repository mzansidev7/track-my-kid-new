import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedAdminTrip = Record<string, unknown>;

const CACHE_PREFIX = "admin_trips_cache_v1_";

export const getCachedAdminTrips = async (
  adminUserId: string,
): Promise<{ trips: CachedAdminTrip[]; cachedAt: string } | null> => {
  if (!adminUserId) return null;
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${adminUserId}`);
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { trips?: unknown }).trips) ||
      typeof (parsed as { cachedAt?: unknown }).cachedAt !== "string"
    ) {
      return null;
    }
    return {
      trips: (parsed as { trips: CachedAdminTrip[] }).trips,
      cachedAt: (parsed as { cachedAt: string }).cachedAt,
    };
  } catch (error) {
    console.error("Could not read cached Admin trips:", error);
    return null;
  }
};

export const cacheAdminTrips = async (
  adminUserId: string,
  trips: CachedAdminTrip[],
): Promise<string | null> => {
  if (!adminUserId) return null;
  const cachedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${adminUserId}`,
      JSON.stringify({ trips, cachedAt }),
    );
    return cachedAt;
  } catch (error) {
    console.error("Could not cache Admin trips:", error);
    return null;
  }
};
