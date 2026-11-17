import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedSOSAlert = {
  id: string;
  message: string | null;
  status: string | null;
  attending_at: string | null;
  created_at: string;
};

export type CachedSOSMessage = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  users?: { name?: string; role?: string } | null;
};

export type SOSCacheData = {
  alerts: CachedSOSAlert[];
  conversations: Record<string, CachedSOSMessage[]>;
};

const cache = new Map<string, SOSCacheData>();
const key = (userId: string, role: string) => `sos-inbox:${role}:${userId}`;

export const getMemorySOSCache = (
  userId: string,
  role: string,
): SOSCacheData | null => cache.get(key(userId, role)) || null;

export const loadSOSCache = async (
  userId: string,
  role: string,
): Promise<SOSCacheData | null> => {
  const cacheKey = key(userId, role);
  const inMemory = cache.get(cacheKey);
  if (inMemory) return inMemory;
  try {
    const serialized = await AsyncStorage.getItem(cacheKey);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed?.alerts) || typeof parsed?.conversations !== "object") {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    const result: SOSCacheData = {
      alerts: parsed.alerts,
      conversations: parsed.conversations || {},
    };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Unable to load cached SOS messages:", error);
    return null;
  }
};

export const saveSOSCache = async (
  userId: string,
  role: string,
  data: SOSCacheData,
) => {
  const cacheKey = key(userId, role);
  cache.set(cacheKey, data);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error("Unable to save SOS message cache:", error);
  }
};
