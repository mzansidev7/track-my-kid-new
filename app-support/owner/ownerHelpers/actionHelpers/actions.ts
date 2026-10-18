import { RouteStatus } from "../interface/owner.interfece";

export const getInitials = (name: string) =>
  String(name || "Driver")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const formatLicense = (license: string | null | undefined) => {
  if (!license) return "";
  if (typeof license !== "string") return String(license);
  return license.startsWith("PENDING-") ? "" : license;
};

export const getRouteStatus = (item: any): RouteStatus => {
  const childrenCount = item.route_children?.length ?? 0;
  const stopsCount = item.route_stops?.length ?? 0;

  // No route setup
  if (childrenCount === 0 && stopsCount === 0) {
    return {
      text: "No stops",
      color: "#6B7280",
      bgColor: "#F3F4F6",
    };
  }

  // Stops exist but no children assigned
  if (stopsCount > 0 && childrenCount === 0) {
    return {
      text: "Waiting for Children",
      color: "#F59E0B",
      bgColor: "#FFFBEB",
    };
  }

  // Children assigned but no stops
  if (childrenCount > 0 && stopsCount === 0) {
    return {
      text: "Stops Not Added",
      color: "#EF4444",
      bgColor: "#FEF2F2",
    };
  }

  // Route is ready
  return {
    text: "Ready",
    color: "#10B981",
    bgColor: "#ECFDF5",
  };
};

export const formatDateTime = () => {
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  return `${dayName}, ${date} ${monthName} ${year} ${hours}:${mins}`;
};

export const getWeeklyTripsAndRevenueData = (dashboardData: any = null) => {
  const weeklyTrips = dashboardData?.weeklyTrips ?? [
    { day: "Mon", morning: 0, afternoon: 0 },
    { day: "Tue", morning: 0, afternoon: 0 },
    { day: "Wed", morning: 0, afternoon: 0 },
    { day: "Thu", morning: 0, afternoon: 0 },
    { day: "Fri", morning: 0, afternoon: 0 },
    { day: "Sat", morning: 0, afternoon: 0 },
    { day: "Sun", morning: 0, afternoon: 0 },
  ];

  const revenueTrend = dashboardData?.revenueTrend ?? [
    { month: "Jan", actual: 0, target: 0 },
    { month: "Feb", actual: 0, target: 0 },
    { month: "Mar", actual: 0, target: 0 },
    { month: "Apr", actual: 0, target: 0 },
    { month: "May", actual: 0, target: 0 },
    { month: "Jun", actual: 0, target: 0 },
  ];

  return { weeklyTrips, revenueTrend };
};
