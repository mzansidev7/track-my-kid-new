import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { client } from "../../supabaseConfig/supabaseConfig";
import { BASE_URL, resolveWorkingBaseUrl } from "../../url";

type PresenceLastSeen = {
  user_id: string;
  last_seen_at: string;
};

type PresenceContextValue = {
  ready: boolean;
  onlineUserIds: Set<string>;
  lastSeenByUserId: Record<string, string>;
  refreshLastSeen: (userIds: string[], force?: boolean) => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue>({
  ready: false,
  onlineUserIds: new Set(),
  lastSeenByUserId: {},
  refreshLastSeen: async () => {},
});

const newSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const PresenceProvider = ({
  children,
  userId,
  token,
}: {
  children: React.ReactNode;
  userId?: string | null;
  token?: string | null;
}) => {
  const [ready, setReady] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenByUserId, setLastSeenByUserId] = useState<
    Record<string, string>
  >({});
  const requestedLastSeenAt = useRef(new Map<string, number>());
  const sessionId = useMemo(newSessionId, []);

  const updateHeartbeat = useCallback(
    async (path: "/presence/heartbeat" | "/presence/offline") => {
      if (!token) return;
      try {
        const baseUrl = (await resolveWorkingBaseUrl()).replace(/\/$/, "");
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Presence request failed (${response.status}).`);
        }
      } catch (error) {
        console.error("Could not update user presence:", error);
      }
    },
    [token],
  );

  const refreshLastSeen = useCallback(
    async (userIds: string[], force = false) => {
      const ids = [...new Set(userIds.filter(Boolean))]
        .filter(
          (id) =>
            Date.now() -
              (requestedLastSeenAt.current.get(String(id)) || 0) >=
            (force ? 2_000 : 60_000),
        )
        .slice(0, 100)
        .map(String);
      if (!token || ids.length === 0) return;
      ids.forEach((id) => requestedLastSeenAt.current.set(id, Date.now()));
      try {
        const baseUrl = (await resolveWorkingBaseUrl()).replace(/\/$/, "");
        const response = await fetch(
          `${baseUrl}/presence/last-seen?userIds=${encodeURIComponent(ids.join(","))}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new Error(`Presence lookup failed (${response.status}).`);
        }
        const rows = (await response.json()) as PresenceLastSeen[];
        setLastSeenByUserId((current) => ({
          ...current,
          ...Object.fromEntries(
            rows.map((row) => [String(row.user_id), row.last_seen_at]),
          ),
        }));
      } catch (error) {
        ids.forEach((id) => requestedLastSeenAt.current.delete(id));
        console.error("Could not load user last-seen information:", error);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!userId || !token) {
      setOnlineUserIds(new Set());
      setReady(false);
      return undefined;
    }

    let active = true;
    let appState: AppStateStatus = AppState.currentState;
    const presenceChannel = client.channel("global-presence", {
      config: {
        private: true,
        presence: { key: String(userId) },
      },
    });
    const updateOnlineUsers = () => {
      const state = presenceChannel.presenceState();
      if (active) {
        setOnlineUserIds(new Set(Object.keys(state).map(String)));
        setReady(true);
      }
    };
    const trackThisSession = async () => {
      if (!active || appState !== "active") return;
      const result = await presenceChannel.track({ sessionId });
      if (result !== "ok") {
        console.error("Could not track Realtime presence:", result);
      }
      await updateHeartbeat("/presence/heartbeat");
    };
    const untrackThisSession = async () => {
      const result = await presenceChannel.untrack();
      if (result !== "ok") {
        console.error("Could not untrack Realtime presence:", result);
      }
      await updateHeartbeat("/presence/offline");
    };

    presenceChannel
      .on("presence", { event: "sync" }, updateOnlineUsers)
      .on("presence", { event: "join" }, updateOnlineUsers)
      .on("presence", { event: "leave" }, updateOnlineUsers)
      .subscribe((status, error) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          void trackThisSession();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setReady(false);
          const isNormalSocketClose =
            error instanceof Error && /socket closed: 1000(?:\s|$)/.test(error.message);
          if (status !== "CLOSED" && error && !isNormalSocketClose) {
            console.error("Realtime presence connection failed:", error);
          }
        }
      });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const wasActive = appState === "active";
        appState = nextState;
        if (wasActive && nextState !== "active") {
          void untrackThisSession();
        } else if (!wasActive && nextState === "active") {
          void trackThisSession();
        }
      },
    );
    const heartbeatInterval = setInterval(() => {
      if (appState === "active") {
        void updateHeartbeat("/presence/heartbeat");
      }
    }, 60_000);

    return () => {
      active = false;
      appStateSubscription.remove();
      clearInterval(heartbeatInterval);
      void untrackThisSession();
      void client.removeChannel(presenceChannel);
      setOnlineUserIds(new Set());
      setReady(false);
    };
  }, [sessionId, token, updateHeartbeat, userId]);

  const value = useMemo(
    () => ({ ready, onlineUserIds, lastSeenByUserId, refreshLastSeen }),
    [lastSeenByUserId, onlineUserIds, ready, refreshLastSeen],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => React.useContext(PresenceContext);

export default PresenceProvider;
