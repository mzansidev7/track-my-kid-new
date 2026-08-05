import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache configuration
const CACHE_CONFIG = {
  children: { key: "client_children", ttl: 5 * 60 * 1000 }, // 5 minutes
  childDetails: { key: "client_child_details", ttl: 10 * 60 * 1000 }, // 10 minutes
  linkedVehicles: { key: "client_linked_vehicles", ttl: 5 * 60 * 1000 }, // 5 minutes
  paymentSummary: { key: "client_payment_summary", ttl: 2 * 60 * 1000 }, // 2 minutes
  conversations: { key: "client_conversations", ttl: 2 * 60 * 1000 }, // 2 minutes
  messages: { key: "client_messages", ttl: 1 * 60 * 1000 }, // 1 minute (frequently updated)
};

// Generic cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Generic cache functions
export const saveToCache = async <T>(
  cacheType: keyof typeof CACHE_CONFIG,
  data: T,
): Promise<void> => {
  try {
    const config = CACHE_CONFIG[cacheType];
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

export const loadFromCache = async <T>(
  cacheType: keyof typeof CACHE_CONFIG,
): Promise<T | null> => {
  try {
    const config = CACHE_CONFIG[cacheType];
    const cached = await AsyncStorage.getItem(config.key);

    if (!cached) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
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

export const clearCache = async (
  cacheType?: keyof typeof CACHE_CONFIG,
): Promise<void> => {
  try {
    if (cacheType) {
      const config = CACHE_CONFIG[cacheType];
      await AsyncStorage.removeItem(config.key);
    } else {
      // Clear all client caches
      const keys = Object.values(CACHE_CONFIG).map((config) => config.key);
      await AsyncStorage.multiRemove(keys);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

// Specific cache functions for each data type
export const saveChildren = (children: any[]) =>
  saveToCache("children", children);
export const loadChildren = () => loadFromCache<any[]>("children");

export const updateChildInChildrenCache = async (
  childId: string,
  updatedChild: any,
): Promise<void> => {
  try {
    const cachedChildren = await loadChildren();
    if (!cachedChildren) return;

    const updated = cachedChildren.map((child) =>
      child?.id === childId ? { ...child, ...updatedChild } : child,
    );

    await saveChildren(updated);
  } catch (error) {
    console.error("Error updating child in children cache:", error);
  }
};

export const saveChildDetails = (childId: string, childData: any) =>
  saveToCache("childDetails", { childId, ...childData });
export const loadChildDetails = (childId: string) =>
  loadFromCache<any>("childDetails").then((data) =>
    data && data.childId === childId ? data : null,
  );

export const saveLinkedVehicles = (vehicles: any[]) =>
  saveToCache("linkedVehicles", vehicles);
export const loadLinkedVehicles = () => loadFromCache<any[]>("linkedVehicles");

export const savePaymentSummary = (summary: any) =>
  saveToCache("paymentSummary", summary);
export const loadPaymentSummary = () => loadFromCache<any>("paymentSummary");

export const saveConversations = (conversations: any[]) =>
  saveToCache("conversations", conversations);
export const loadConversations = () => loadFromCache<any[]>("conversations");

export const saveMessages = (conversationId: string, messages: any[]) =>
  saveToCache("messages", { conversationId, messages });
export const loadMessages = (conversationId: string) =>
  loadFromCache<any>("messages").then((data) =>
    data && data.conversationId === conversationId ? data.messages : null,
  );

// Clear all client caches (useful for logout or manual refresh)
export const clearAllClientCaches = async (): Promise<void> => {
  try {
    const keys = Object.values(CACHE_CONFIG).map((config) => config.key);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error("Error clearing all client caches:", error);
  }
};

// Get cache info for debugging
export const getCacheInfo = async () => {
  try {
    const cacheInfo: any = {};
    for (const [type, config] of Object.entries(CACHE_CONFIG)) {
      const cached = await AsyncStorage.getItem(config.key);
      if (cached) {
        const cacheItem = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now > cacheItem.expiresAt;
        cacheInfo[type] = {
          exists: true,
          timestamp: new Date(cacheItem.timestamp).toISOString(),
          expiresAt: new Date(cacheItem.expiresAt).toISOString(),
          isExpired,
          timeRemaining: isExpired
            ? 0
            : Math.round((cacheItem.expiresAt - now) / 1000),
        };
      } else {
        cacheInfo[type] = { exists: false };
      }
    }
    return cacheInfo;
  } catch (error) {
    console.error("Error getting cache info:", error);
    return {};
  }
};

// Optimized fetch with cache-first strategy
export const fetchWithCache = async <T>(
  cacheType: keyof typeof CACHE_CONFIG,
  fetchFunction: () => Promise<T>,
  saveFunction: (data: T) => Promise<void>,
  options: {
    forceRefresh?: boolean;
    onCacheHit?: (data: T) => void;
    onCacheMiss?: () => void;
    loadFunction?: () => Promise<T | null>;
  } = {},
): Promise<T> => {
  const {
    forceRefresh = false,
    onCacheHit,
    onCacheMiss,
    loadFunction,
  } = options;

  // Try to load from cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = loadFunction
      ? await loadFunction()
      : await loadFromCache<T>(cacheType);
    if (cachedData !== null) {
      onCacheHit?.(cachedData);
      return cachedData;
    }
  }

  // Cache miss or force refresh - fetch from server
  onCacheMiss?.();

  try {
    const freshData = await fetchFunction();
    await saveFunction(freshData);
    return freshData;
  } catch (error) {
    console.error(`Error fetching ${cacheType}:`, error);
    throw error;
  }
};
