import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

const CONVERSATIONS_CACHE_PREFIX = "messages_conversations_cache_";

const MESSAGES_CACHE_PREFIX = "owner_messages_cache_";

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

const getMessageCacheKey = (conversationId: string) => {
  return `${MESSAGES_CACHE_PREFIX}${conversationId}`;
};

const getConversationsCacheKey = (userId = "shared") =>
  `${CONVERSATIONS_CACHE_PREFIX}${userId}`;

/* -------------------------------------------------------------------------- */
/*                          CACHE CONVERSATIONS                               */
/* -------------------------------------------------------------------------- */

export const cacheConversations = async (
  conversations: any[],
  userId?: string,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      getConversationsCacheKey(userId),
      JSON.stringify(conversations),
    );
  } catch (err) {
    console.error("❌ Error caching conversations:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                       GET CACHED CONVERSATIONS                             */
/* -------------------------------------------------------------------------- */

export const getCachedConversations = async (
  userId?: string,
): Promise<any[]> => {
  try {
    const cached = await AsyncStorage.getItem(getConversationsCacheKey(userId));

    if (!cached) {
      return [];
    }

    return JSON.parse(cached);
  } catch (err) {
    console.error("❌ Error getting cached conversations:", err);

    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                             CACHE MESSAGES                                 */
/* -------------------------------------------------------------------------- */

export const cacheMessages = async (
  conversationId: string,
  messages: any[],
): Promise<void> => {
  try {
    const cacheKey = getMessageCacheKey(conversationId);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(messages));
  } catch (err) {
    console.error(`❌ Error caching messages for ${conversationId}:`, err);
  }
};

/* -------------------------------------------------------------------------- */
/*                          GET CACHED MESSAGES                               */
/* -------------------------------------------------------------------------- */

export const getCachedMessages = async (
  conversationId: string,
): Promise<any[]> => {
  try {
    const cacheKey = getMessageCacheKey(conversationId);

    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      return [];
    }

    return JSON.parse(cached);
  } catch (err) {
    console.error(
      `❌ Error getting cached messages for ${conversationId}:`,
      err,
    );

    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                        CLEAR CONVERSATIONS CACHE                           */
/* -------------------------------------------------------------------------- */

export const clearConversationsCache = async (
  userId?: string,
): Promise<void> => {
  try {
    if (userId) {
      await AsyncStorage.removeItem(getConversationsCacheKey(userId));
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const conversationKeys = keys.filter((key) =>
        key.startsWith(CONVERSATIONS_CACHE_PREFIX),
      );
      if (conversationKeys.length > 0) {
        await AsyncStorage.multiRemove(conversationKeys);
      }
    }

    console.log("🗑️ Conversations cache cleared");
  } catch (err) {
    console.error("❌ Error clearing conversations cache:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                         CLEAR SINGLE MESSAGE CACHE                         */
/* -------------------------------------------------------------------------- */

export const clearMessageCache = async (
  conversationId: string,
): Promise<void> => {
  try {
    const cacheKey = getMessageCacheKey(conversationId);

    await AsyncStorage.removeItem(cacheKey);

    console.log(`🗑️ Message cache cleared for ${conversationId}`);
  } catch (err) {
    console.error(
      `❌ Error clearing message cache for ${conversationId}:`,
      err,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                         CLEAR ALL MESSAGE CACHES                           */
/* -------------------------------------------------------------------------- */

export const clearAllMessageCaches = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const messageCacheKeys = keys.filter((key) =>
      key.startsWith(MESSAGES_CACHE_PREFIX),
    );

    if (messageCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(messageCacheKeys);
    }

    console.log("🗑️ All message caches cleared");
  } catch (err) {
    console.error("❌ Error clearing all message caches:", err);
  }
};

/* -------------------------------------------------------------------------- */
/*                             CLEAR EVERYTHING                               */
/* -------------------------------------------------------------------------- */

export const clearAllChatCaches = async (): Promise<void> => {
  try {
    await clearConversationsCache();

    await clearAllMessageCaches();

    console.log("🗑️ All chat caches cleared");
  } catch (err) {
    console.error("❌ Error clearing all chat caches:", err);
  }
};
