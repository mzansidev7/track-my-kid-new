import { useCallback, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../../url";

export type DriverTrackingStop = {
  id: string;
  child_id?: string;
  stop_type: "pickup" | "dropoff";
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: "pending" | "in_progress" | "completed" | "skipped";
};

export type DriverStopAction =
  | "arrived"
  | "picked_up"
  | "dropped_off"
  | "skipped"
  | "child_not_present"
  | "guardian_verified"
  | "incident";

type TrackingState = {
  online: boolean;
  historyId: string | null;
  lastLocation: Location.LocationObject | null;
  busy: boolean;
  error: string | null;
};

const trackingState: TrackingState = {
  online: false,
  historyId: null,
  lastLocation: null,
  busy: false,
  error: null,
};
const trackingListeners = new Set<(state: TrackingState) => void>();
let trackingWatch: Location.LocationSubscription | null = null;

const updateTrackingState = (updates: Partial<TrackingState>) => {
  Object.assign(trackingState, updates);
  trackingListeners.forEach((listener) => listener({ ...trackingState }));
};

export const useDriverTracking = (
  routeId?: string,
  routeType: "pickup" | "dropoff" = "pickup",
) => {
  const { user } = useContext(AuthContext);
  const [state, setState] = useState<TrackingState>(() => ({
    ...trackingState,
  }));
  const { online, historyId, lastLocation, busy, error } = state;

  useEffect(() => {
    const listener = (nextState: TrackingState) => setState(nextState);
    trackingListeners.add(listener);
    return () => {
      trackingListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    let active = true;
    const hydrateTrackingStatus = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/driver/tracking-status`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (!active || !response.ok) return;
        updateTrackingState({
          online: Boolean(data.online),
          historyId: data.history_id || null,
        });
      } catch (statusError) {
        console.error("[driver-tracking] status hydration failed", statusError);
      }
    };
    hydrateTrackingStatus();
    return () => {
      active = false;
    };
  }, [user]);

  const requestLocation = useCallback(async () => {
    const foregroundPermission =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== Location.PermissionStatus.GRANTED) {
      throw new Error("Location permission is required to go online.");
    }

    try {
      const backgroundPermission =
        await Location.requestBackgroundPermissionsAsync();
      if (
        backgroundPermission.status === Location.PermissionStatus.GRANTED ||
        backgroundPermission.status === Location.PermissionStatus.UNDETERMINED
      ) {
        return;
      }
    } catch (backgroundPermissionError) {
      console.warn(
        "[driver-tracking] background permission request skipped",
        backgroundPermissionError,
      );
    }
  }, []);

  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      if (!user?.token) return;
      const baseUrl = await resolveWorkingBaseUrl();
      await fetch(`${baseUrl}/driver/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
        }),
      });
      updateTrackingState({ lastLocation: location });
    },
    [user],
  );

  const goOnline = useCallback(
    async (startRouteId = routeId) => {
      if (!startRouteId || !user?.token || online) return;
      updateTrackingState({ busy: true, error: null });
      console.log("[driver-tracking] go online start", {
        routeId: startRouteId,
        routeType,
      });
      try {
        await requestLocation();
        console.log("[driver-tracking] location permission granted");
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const baseUrl = await resolveWorkingBaseUrl();
        const requestUrl = `${baseUrl}/driver/route-history/start`;
        console.log("[driver-tracking] starting route history", {
          requestUrl,
          routeId: startRouteId,
          routeType,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        const response = await fetch(requestUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            route_id: startRouteId,
            route_type: routeType,
          }),
        });
        const responseText = await response.text();
        let data: any = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = { raw: responseText };
        }
        console.log("[driver-tracking] route history response", {
          status: response.status,
          ok: response.ok,
          body: data,
        });
        if (!response.ok)
          throw new Error(data.error || "Unable to start route.");
        if (!data?.id) {
          throw new Error("Route started without a history ID.");
        }

        await sendLocation(location);
        console.log("[driver-tracking] initial location sent");
        trackingWatch?.remove();
        trackingWatch = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 20,
            timeInterval: 10000,
          },
          sendLocation,
        );
        updateTrackingState({ historyId: data.id, online: true });
      } catch (trackingError: any) {
        console.error("[driver-tracking] go online failed", {
          message: trackingError?.message,
          name: trackingError?.name,
          stack: trackingError?.stack,
        });
        updateTrackingState({
          error: trackingError?.message || "Unable to go online.",
        });
      } finally {
        updateTrackingState({ busy: false });
      }
    },
    [online, requestLocation, routeId, routeType, sendLocation, user],
  );

  const endRoute = useCallback(async () => {
    if (!historyId || !user?.token) return;
    updateTrackingState({ busy: true, error: null });
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/route-history/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ history_id: historyId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to end route.");
      trackingWatch?.remove();
      trackingWatch = null;
      updateTrackingState({ historyId: null, online: false });
    } catch (trackingError: any) {
      updateTrackingState({
        error: trackingError?.message || "Unable to end route.",
      });
    } finally {
      updateTrackingState({ busy: false });
    }
  }, [historyId, user]);

  const updateStop = useCallback(
    async (
      stopId: string,
      action: DriverStopAction,
      options: {
        reason?: string;
        details?: string;
        guardianVerified?: boolean;
        incidentType?: string;
      } = {},
    ) => {
      if (!user?.token) return;
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/driver/route-stops/${stopId}/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            action,
            reason: options.reason,
            details: options.details,
            guardian_verified: options.guardianVerified,
            incident_type: options.incidentType,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update stop.");
      return data.stop as DriverTrackingStop;
    },
    [user],
  );

  const sendEmergencyAlert = useCallback(
    async (message = "Emergency assistance requested.") => {
      if (!user?.token) {
        throw new Error("You must be signed in to send an SOS alert.");
      }

      const baseUrl = await resolveWorkingBaseUrl();
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } catch (locationError) {
        console.warn(
          "[driver-tracking] emergency location lookup failed",
          locationError,
        );
      }

      const response = await fetch(`${baseUrl}/driver/emergency-alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          message,
          latitude,
          longitude,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send emergency alert.");
      }

      return data;
    },
    [user],
  );

  return {
    online,
    busy,
    error,
    lastLocation,
    goOnline,
    endRoute,
    updateStop,
    sendEmergencyAlert,
  };
};
