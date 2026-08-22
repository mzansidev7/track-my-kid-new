import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache configuration for owner screens
const OWNER_CACHE_CONFIG = {
  drivers: { key: "owner_drivers", ttl: 3 * 60 * 1000 }, // 3 minutes
  driverDetails: { key: "owner_driver_details", ttl: 5 * 60 * 1000 }, // 5 minutes
  vehicles: { key: "owner_vehicles", ttl: 3 * 60 * 1000 }, // 3 minutes
  routes: { key: "owner_routes", ttl: 5 * 60 * 1000 }, // 5 minutes
  subscriptionPlans: { key: "owner_subscription_plans", ttl: 5 * 60 * 1000 }, // 5 minutes
  ownerSubscription: { key: "owner_subscription", ttl: 5 * 60 * 1000 }, // 5 minutes
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Generic cache functions
export const saveToOwnerCache = async <T>(
  cacheType: keyof typeof OWNER_CACHE_CONFIG,
  data: T,
): Promise<void> => {
  try {
    const config = OWNER_CACHE_CONFIG[cacheType];
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + config.ttl,
    };

    await AsyncStorage.setItem(config.key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error(`Error saving ${cacheType} to cache:`, error);
  }
};

export const loadFromOwnerCache = async <T>(
  cacheType: keyof typeof OWNER_CACHE_CONFIG,
): Promise<T | null> => {
  try {
    const config = OWNER_CACHE_CONFIG[cacheType];
    const cached = await AsyncStorage.getItem(config.key);

    if (!cached) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();

    if (now > cacheItem.expiresAt) {
      await AsyncStorage.removeItem(config.key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error(`Error loading ${cacheType} from cache:`, error);
    return null;
  }
};

export const clearOwnerCache = async (
  cacheType?: keyof typeof OWNER_CACHE_CONFIG,
): Promise<void> => {
  try {
    if (cacheType) {
      const config = OWNER_CACHE_CONFIG[cacheType];
      await AsyncStorage.removeItem(config.key);
    } else {
      // Clear all owner caches
      const keys = Object.values(OWNER_CACHE_CONFIG).map(
        (config) => config.key,
      );
      await AsyncStorage.multiRemove(keys);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

// Specific cache functions
export const saveOwnerDrivers = (drivers: any[]) =>
  saveToOwnerCache("drivers", drivers);
export const loadOwnerDrivers = () => loadFromOwnerCache<any[]>("drivers");

export const saveOwnerDriverDetails = (driverId: string, driver: any) =>
  saveToOwnerCache("driverDetails", { driverId, ...driver });
export const loadOwnerDriverDetails = (driverId: string) =>
  loadFromOwnerCache<any>("driverDetails").then((data) =>
    data && data.driverId === driverId ? data : null,
  );

export const saveOwnerVehicles = (vehicles: any[]) =>
  saveToOwnerCache("vehicles", vehicles);
export const loadOwnerVehicles = () => loadFromOwnerCache<any[]>("vehicles");

export const saveOwnerRoutes = (routes: any[]) =>
  saveToOwnerCache("routes", routes);
export const loadOwnerRoutes = () => loadFromOwnerCache<any[]>("routes");

export const saveOwnerSubscriptionPlans = (plans: any[]) =>
  saveToOwnerCache("subscriptionPlans", plans);
export const loadOwnerSubscriptionPlans = () =>
  loadFromOwnerCache<any[]>("subscriptionPlans");

export const saveOwnerSubscription = (subscription: any) =>
  saveToOwnerCache("ownerSubscription", subscription);
export const loadOwnerSubscription = () =>
  loadFromOwnerCache<any>("ownerSubscription");
