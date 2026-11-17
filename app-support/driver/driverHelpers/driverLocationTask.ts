import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { getUserFromAsyncStorage } from "@/store/asyncStorage/authStore";
import { resolveWorkingBaseUrl } from "@/url";

export const DRIVER_LOCATION_TASK = "track-my-kid-driver-location";

if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask(
    DRIVER_LOCATION_TASK,
    async ({ data, error }: TaskManager.TaskManagerTaskBody<{
      locations: Location.LocationObject[];
    }>) => {
      if (error) {
        console.error("[driver-location-task] task error", error);
        return;
      }

      const location = data?.locations?.[data.locations.length - 1];
      if (!location) return;

      const auth = await getUserFromAsyncStorage();
      const token = auth?.token;
      if (!token) {
        await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        return;
      }

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (body.route_ended === true) {
        await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        return;
      }
      if (!response.ok) {
        throw new Error(body.error || "Background location update failed.");
      }
    },
  );
}

export const startDriverLocationTask = async () => {
  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 20,
    timeInterval: 10000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Track My Kid trip tracking",
      notificationBody: "Your location is shared while your route is active.",
      notificationColor: "#0F9D58",
      killServiceOnDestroy: false,
    },
  });
};

export const stopDriverLocationTask = async () => {
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }
};
