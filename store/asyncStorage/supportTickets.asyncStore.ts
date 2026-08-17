import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPPORT_TICKETS_CACHE_PREFIX = "driver_support_tickets_cache_";

export const getSupportTicketsCacheKey = (userId: string) => {
  return `${SUPPORT_TICKETS_CACHE_PREFIX}${userId}`;
};

export const cacheUserTickets = async (
  userId: string,
  tickets: any[],
): Promise<void> => {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.setItem(
      getSupportTicketsCacheKey(userId),
      JSON.stringify(tickets),
    );
  } catch (error) {
    console.error("❌ Error caching support tickets:", error);
  }
};

export const getCachedUserTickets = async (userId: string): Promise<any[]> => {
  if (!userId) {
    return [];
  }

  try {
    const cached = await AsyncStorage.getItem(getSupportTicketsCacheKey(userId));

    if (!cached) {
      return [];
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error("❌ Error getting cached support tickets:", error);
    return [];
  }
};

export const clearUserTicketsCache = async (userId: string): Promise<void> => {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.removeItem(getSupportTicketsCacheKey(userId));
  } catch (error) {
    console.error("❌ Error clearing support ticket cache:", error);
  }
};
