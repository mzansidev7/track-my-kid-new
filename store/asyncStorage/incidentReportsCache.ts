import AsyncStorage from "@react-native-async-storage/async-storage";

export type IncidentReportsCache = {
  reports: unknown[];
  repliesByIncidentId: Record<string, unknown[]>;
  cachedAt: string;
};

const CACHE_PREFIX = "incident-reports-cache-v1";
const cacheKey = (scope: string, userId: string) =>
  `${CACHE_PREFIX}:${scope}:${userId}`;

export const loadIncidentReportsCache = async (
  scope: string,
  userId: string,
): Promise<IncidentReportsCache | null> => {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(cacheKey(scope, userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as IncidentReportsCache).reports) ||
      !(parsed as IncidentReportsCache).repliesByIncidentId ||
      typeof (parsed as IncidentReportsCache).repliesByIncidentId !== "object"
    ) {
      return null;
    }
    return parsed as IncidentReportsCache;
  } catch (error) {
    console.error("Could not load cached incident reports:", error);
    return null;
  }
};

export const saveIncidentReportsCache = async (
  scope: string,
  userId: string,
  cache: Omit<IncidentReportsCache, "cachedAt">,
): Promise<void> => {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(
      cacheKey(scope, userId),
      JSON.stringify({ ...cache, cachedAt: new Date().toISOString() }),
    );
  } catch (error) {
    console.error("Could not cache incident reports:", error);
  }
};
