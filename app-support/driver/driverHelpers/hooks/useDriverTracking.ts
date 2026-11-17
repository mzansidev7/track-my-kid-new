import { useCallback, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { BASE_URL, resolveWorkingBaseUrl } from "../../../../url";
import {
  startDriverLocationTask,
  stopDriverLocationTask,
} from "../driverLocationTask";

export type DriverTrackingStop = {
  id: string;
  child_id?: string;
  stop_type: "pickup" | "dropoff";
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: "pending" | "in_progress" | "completed" | "skipped";
  boarded_at?: string | null;
};

export type DriverStopAction =
  | "arrived"
  | "picked_up"
  | "boarded"
  | "dropped_off"
  | "skipped"
  | "child_not_present"
  | "incident";

export type PickupContactOption = {
  id: string;
  name: string;
  relationship: string;
  valid_until: string | null;
};

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
        if (data.online) {
          try {
            const authorizationHeader = "Bearer " + String(user?.token || "");
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            if (active) {
              updateTrackingState({ lastLocation: location });
              const locationResponse = await fetch(
                `${baseUrl}/driver/location`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: authorizationHeader,
                  },
                  body: JSON.stringify({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    speed: location.coords.speed,
                  }),
                },
              );
              if (!locationResponse.ok) {
                const locationData = await locationResponse.json().catch(() => ({}));
                throw new Error(
                  locationData.error || "Unable to publish restored driver location.",
                );
              }
            }
          } catch (locationError) {
            console.error(
              "[driver-tracking] could not restore current location",
              locationError,
            );
          }
          await startDriverLocationTask();
        } else {
          await stopDriverLocationTask();
        }
      } catch (statusError) {
        console.error("[driver-tracking] status hydration failed", statusError);
      }
    };
    hydrateTrackingStatus();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!online || !user?.token) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/driver/tracking-status`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to refresh route status.");
        }
        if (!active) return;
        if (!data.online) {
          await stopDriverLocationTask();
          updateTrackingState({ online: false, historyId: null });
          return;
        }
        updateTrackingState({
          online: true,
          historyId: data.history_id || null,
        });
      } catch (statusError) {
        console.error("[driver-tracking] status refresh failed", statusError);
      }
    };

    const timer = setInterval(() => void refreshStatus(), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [online, user?.token]);

  const requestLocation = useCallback(async () => {
    const foregroundPermission =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== Location.PermissionStatus.GRANTED) {
      throw new Error("Location permission is required to go online.");
    }

    const backgroundPermission =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status !== Location.PermissionStatus.GRANTED) {
      throw new Error(
        "Allow background location so parents can track the trip while the app is not open.",
      );
    }
  }, []);

  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      if (!user?.token) return;
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ["Bearer ", user.token].join(""),
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send your location.");
      }
      updateTrackingState({ lastLocation: location });
    },
    [user],
  );

  useEffect(() => {
    if (!online) return;
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const watchDriverLocation = async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (location) => {
            if (!active) return;
            updateTrackingState({ lastLocation: location });
            void sendLocation(location).catch((locationError) => {
              console.error(
                "[driver-tracking] foreground location upload failed",
                locationError,
              );
            });
          },
        );
        if (!active) subscription.remove();
      } catch (locationError) {
        console.error(
          "[driver-tracking] foreground location watch failed",
          locationError,
        );
      }
    };

    void watchDriverLocation();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [online, sendLocation]);

  const goOnline = useCallback(
    async (startRouteId = routeId) => {
      if (!startRouteId || !user?.token || online) return false;
      updateTrackingState({ busy: true, error: null });
      console.log("[driver-tracking] go online start", {
        routeId: startRouteId,
        routeType,
      });
      let startedHistoryId: string | null = null;
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
            Authorization: "Bearer " + user.token,
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
        startedHistoryId = data.id;

        await sendLocation(location);
        console.log("[driver-tracking] initial location sent");
        await startDriverLocationTask();
        updateTrackingState({ historyId: data.id, online: true });
        return true;
      } catch (trackingError: any) {
        let cleanupFailed = false;
        await stopDriverLocationTask().catch((stopError) =>
          console.error("[driver-tracking] could not stop location task", stopError),
        );
        if (startedHistoryId) {
          try {
            const baseUrl = await resolveWorkingBaseUrl();
            const cancelResponse = await fetch(
              `${baseUrl}/driver/route-history/cancel`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ history_id: startedHistoryId }),
              },
            );
            if (!cancelResponse.ok) {
              const cancelData = await cancelResponse.json().catch(() => ({}));
              throw new Error(
                cancelData.error || "Unable to cancel the partially started route.",
              );
            }
          } catch (cancelError) {
            cleanupFailed = true;
            console.error(
              "[driver-tracking] failed to cancel partially started route",
              cancelError,
            );
            updateTrackingState({
              error: `${trackingError?.message || "Unable to go online."} Route cleanup also failed; contact support before restarting.`,
            });
          }
        }
        console.error("[driver-tracking] go online failed", {
          message: trackingError?.message,
          name: trackingError?.name,
          stack: trackingError?.stack,
        });
        updateTrackingState({
          error: cleanupFailed
            ? `${trackingError?.message || "Unable to go online."} Route cleanup also failed; contact support before restarting.`
            : trackingError?.message || "Unable to go online.",
        });
        return false;
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
      await stopDriverLocationTask();
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
        recipientName?: string;
        safetyPin?: string;
        pickupContactId?: string;
        incidentType?: string;
      } = {},
    ) => {
      if (!user?.token) return;
      const resolvedBaseUrl = await resolveWorkingBaseUrl();
      const baseUrl =
        typeof resolvedBaseUrl === "string" &&
        /^https?:\/\//i.test(resolvedBaseUrl)
          ? resolvedBaseUrl.replace(/\/+$/, "")
          : BASE_URL.replace(/\/+$/, "");
      if (!/^https?:\/\/[^/\s]+(?:\/.*)?$/i.test(baseUrl)) {
        throw new Error(
          "Unable to update stop because the API URL is not configured. Set EXPO_PUBLIC_API_URL and restart the app.",
        );
      }
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
            recipient_name: options.recipientName,
            safety_pin: options.safetyPin,
            pickup_contact_id: options.pickupContactId,
            incident_type: options.incidentType,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update stop.");
      if (data.route_window_completed) {
        await stopDriverLocationTask();
        updateTrackingState({ online: false, historyId: null });
      }
      return data.stop as DriverTrackingStop;
    },
    [user],
  );

  const getPickupContacts = useCallback(
    async (stopId: string): Promise<PickupContactOption[]> => {
      if (!user?.token) {
        throw new Error("You must be signed in to view authorized pickup contacts.");
      }
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/driver/route-stops/${stopId}/pickup-contacts`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load authorized pickup contacts.");
      }
      return Array.isArray(data) ? data : [];
    },
    [user?.token],
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
          route_id: routeId || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send emergency alert.");
      }

      return data;
    },
    [routeId, user],
  );

  return {
    online,
    busy,
    error,
    lastLocation,
    goOnline,
    endRoute,
    updateStop,
    getPickupContacts,
    sendEmergencyAlert,
  };
};
