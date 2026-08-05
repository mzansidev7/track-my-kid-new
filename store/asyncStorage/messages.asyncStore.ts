import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

const CONVERSATIONS_CACHE_KEY =
  "owner_conversations_cache";

const MESSAGES_CACHE_PREFIX =
  "owner_messages_cache_";

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

const getMessageCacheKey = (
  conversationId: string,
) => {
  return `${MESSAGES_CACHE_PREFIX}${conversationId}`;
};

/* -------------------------------------------------------------------------- */
/*                          CACHE CONVERSATIONS                               */
/* -------------------------------------------------------------------------- */

export const cacheConversations = async (
  conversations: any[],
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      CONVERSATIONS_CACHE_KEY,
      JSON.stringify(conversations),
    );
  } catch (err) {
    console.error(
      "❌ Error caching conversations:",
      err,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                       GET CACHED CONVERSATIONS                             */
/* -------------------------------------------------------------------------- */

export const getCachedConversations =
  async (): Promise<any[]> => {
    try {
      const cached =
        await AsyncStorage.getItem(
          CONVERSATIONS_CACHE_KEY,
        );

      if (!cached) {
        return [];
      }

      return JSON.parse(cached);
    } catch (err) {
      console.error(
        "❌ Error getting cached conversations:",
        err,
      );

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
    const cacheKey =
      getMessageCacheKey(conversationId);

    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify(messages),
    );
  } catch (err) {
    console.error(
      `❌ Error caching messages for ${conversationId}:`,
      err,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                          GET CACHED MESSAGES                               */
/* -------------------------------------------------------------------------- */

export const getCachedMessages =
  async (
    conversationId: string,
  ): Promise<any[]> => {
    try {
      const cacheKey =
        getMessageCacheKey(conversationId);

      const cached =
        await AsyncStorage.getItem(cacheKey);

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

export const clearConversationsCache =
  async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(
        CONVERSATIONS_CACHE_KEY,
      );

      console.log(
        "🗑️ Conversations cache cleared",
      );
    } catch (err) {
      console.error(
        "❌ Error clearing conversations cache:",
        err,
      );
    }
  };

/* -------------------------------------------------------------------------- */
/*                         CLEAR SINGLE MESSAGE CACHE                         */
/* -------------------------------------------------------------------------- */

export const clearMessageCache = async (
  conversationId: string,
): Promise<void> => {
  try {
    const cacheKey =
      getMessageCacheKey(conversationId);

    await AsyncStorage.removeItem(cacheKey);

    console.log(
      `🗑️ Message cache cleared for ${conversationId}`,
    );
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

export const clearAllMessageCaches =
  async (): Promise<void> => {
    try {
      const keys =
        await AsyncStorage.getAllKeys();

      const messageCacheKeys = keys.filter(
        (key) =>
          key.startsWith(
            MESSAGES_CACHE_PREFIX,
          ),
      );

      if (messageCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(
          messageCacheKeys,
        );
      }

      console.log(
        "🗑️ All message caches cleared",
      );
    } catch (err) {
      console.error(
        "❌ Error clearing all message caches:",
        err,
      );
    }
  };

/* -------------------------------------------------------------------------- */
/*                             CLEAR EVERYTHING                               */
/* -------------------------------------------------------------------------- */

export const clearAllChatCaches =
  async (): Promise<void> => {
    try {
      await clearConversationsCache();

      await clearAllMessageCaches();

      console.log(
        "🗑️ All chat caches cleared",
      );
    } catch (err) {
      console.error(
        "❌ Error clearing all chat caches:",
        err,
      );
    }
  };