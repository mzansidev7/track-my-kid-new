import AsyncStorage from "@react-native-async-storage/async-storage";

const LIVE_CHAT_SESSION_KEY = "driver_live_chat_session_";

export const getChatSessionCacheKey = (userId: string) => {
  return `${LIVE_CHAT_SESSION_KEY}${userId}`;
};

export const cacheLiveChatSession = async (
  userId: string,
  session: any,
): Promise<void> => {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.setItem(
      getChatSessionCacheKey(userId),
      JSON.stringify(session),
    );
  } catch (error) {
    console.error("❌ Error caching live chat session:", error);
  }
};

export const getCachedLiveChatSession = async (userId: string): Promise<any | null> => {
  if (!userId) {
    return null;
  }

  try {
    const cached = await AsyncStorage.getItem(getChatSessionCacheKey(userId));

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error("❌ Error getting cached live chat session:", error);
    return null;
  }
};

export const clearLiveChatSessionCache = async (userId: string): Promise<void> => {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.removeItem(getChatSessionCacheKey(userId));
  } catch (error) {
    console.error("❌ Error clearing live chat session cache:", error);
  }
};
