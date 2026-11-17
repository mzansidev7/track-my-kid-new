export type ClientRouteStop = {
  id?: string;
  route_id?: string;
  child_id?: string;
  stop_type?: "pickup" | "dropoff";
  stop_order?: number;
  status?: "pending" | "in_progress" | "completed" | "skipped";
  schedule_date?: string | null;
  status_updated_at?: string | null;
  handoff_verified_at?: string | null;
  boarded_at?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
};

export const getLocalDateKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

export const getSouthAfricaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getStopActivityDate = (stop: ClientRouteStop) => {
  const activityAt = stop.status_updated_at || stop.handoff_verified_at;
  if (activityAt) return getLocalDateKey(new Date(activityAt));
  return stop.schedule_date?.slice(0, 10) || null;
};

export const getTodayRouteStops = <T extends ClientRouteStop>(
  stops: T[] = [],
  date = new Date(),
): T[] => {
  const today = getLocalDateKey(date);
  return stops.filter((stop) => {
    if (stop.status === "pending") return true;
    return getStopActivityDate(stop) === today;
  });
};

export const isStopCompletedToday = (
  stop: ClientRouteStop | undefined,
  date = new Date(),
) =>
  Boolean(
    stop &&
      stop.status === "completed" &&
      getStopActivityDate(stop) === getLocalDateKey(date),
  );

export const isStopFinishedToday = (
  stop: ClientRouteStop | undefined,
  date = new Date(),
) =>
  Boolean(
    stop &&
      ["completed", "skipped"].includes(stop.status || "") &&
      getStopActivityDate(stop) === getLocalDateKey(date),
  );

export const isStopBoardedToday = (
  stop: ClientRouteStop | undefined,
  date = new Date(),
) =>
  Boolean(
    stop?.boarded_at &&
      getSouthAfricaDateKey(new Date(stop.boarded_at)) ===
        getSouthAfricaDateKey(date),
  );

export const getActiveRouteWindow = (
  route: {
    pickup_start_time?: string;
    departure_time?: string;
    pickup_end_time?: string;
    dropoff_start_time?: string;
    dropoff_end_time?: string;
    operating_days?: number[];
  } | null | undefined,
  date = new Date(),
  stops: ClientRouteStop[] = [],
) => {
  if (!route) return null;
  if (
    Array.isArray(route.operating_days) &&
    route.operating_days.length > 0 &&
    !route.operating_days.includes(date.getDay())
  ) {
    return null;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const windows = [
    {
      direction: "pickup" as const,
      start: route.pickup_start_time || route.departure_time,
      end: route.pickup_end_time,
      stop: stops.find((stop) => stop.stop_type === "pickup"),
    },
    {
      direction: "dropoff" as const,
      start: route.dropoff_start_time,
      end: route.dropoff_end_time,
      stop: stops.find((stop) => stop.stop_type === "dropoff"),
    },
  ];

  return (
    windows.find(({ direction, start, end, stop }) => {
      if (!start) return false;
      if (
        stop?.status === "skipped" &&
        getStopActivityDate(stop) === getLocalDateKey(date)
      ) {
        return false;
      }
      if (
        direction === "dropoff" &&
        isStopCompletedToday(stop, date)
      ) {
        return false;
      }
      const [startHour, startMinute] = start.slice(0, 5).split(":").map(Number);
      if (!Number.isFinite(startHour) || !Number.isFinite(startMinute)) {
        return false;
      }
      const startMinutes = startHour * 60 + startMinute;
      if (currentMinutes < startMinutes) return false;
      if (!end) return currentMinutes <= startMinutes + 30;
      const [endHour, endMinute] = end.slice(0, 5).split(":").map(Number);
      if (!Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
        return false;
      }
      return currentMinutes <= endHour * 60 + endMinute;
    }) || null
  );
};
