import { DashboardAction } from "@/types/school/client.interfaces";

export const schoolStats = (students: any, routes: any, drivers: any) => {
  const stats: (DashboardAction & { value: string })[] = [
    {
      title: "Students",
      value: String(students.length),
      icon: "people-outline",
      color: "#4285F4",
      screen: "Students",
    },
    {
      title: "Vehicles",
      value: String(
        routes.reduce(
          (count: number, route: any) =>
            count +
            (Array.isArray(route.assignments) ? route.assignments.length : 0),
          0,
        ),
      ),
      icon: "bus-outline",
      color: "#34A853",
      screen: "Vehicles",
    },
    {
      title: "Drivers",
      value: String(drivers.length),
      icon: "person-outline",
      color: "#FB8C00",
      screen: "Drivers",
    },
    {
      title: "Routes",
      value: String(routes.length),
      icon: "map-outline",
      color: "#8E44AD",
      screen: "Routes",
    },
  ];
  return stats;
};

export const schoolQuickActions = () => {
  const quickActions: DashboardAction[] = [
    {
      title: "Students",
      icon: "people-outline",
      color: "#4285F4",
      screen: "Students",
    },
    {
      title: "Routes",
      icon: "map-outline",
      color: "#8E44AD",
      screen: "Routes",
    },
    {
      title: "Attendance",
      icon: "checkmark-circle-outline",
      color: "#34A853",
      screen: "Attendance",
    },
    {
      title: "Drivers",
      icon: "person-outline",
      color: "#FB8C00",
      screen: "Drivers",
    },
  ];

  return quickActions;
};

export const getUserName = (user: any) => {
  const userName =
    user?.userData?.admin_profile?.first_name ||
    user?.userData?.name ||
    "there";
  return userName;
};

export const colors = {
  background: "#F7F8FA",
  ink: "#172B4D",
  muted: "#718096",
  border: "#E4EAF2",
  blue: "#4285F4",
  purple: "#8E44AD",
};

export const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

export const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const getRoleLabel = (role?: string) =>
  role === "client"
    ? "Parent"
    : role === "driver"
      ? "Driver"
      : role === "owner"
        ? "Fleet owner"
        : "School contact";

export const managementItems = [
  {
    key: "students",
    label: "Students",
    sub: "Manage enrolled students",
    icon: "people",
    color: "#4285F4",
    target: "students",
  },
  {
    key: "drivers",
    label: "Drivers",
    sub: "Manage school drivers",
    icon: "person-outline",
    color: "#FB8C00",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    sub: "Manage transport vehicles",
    icon: "directions-bus",
    color: "#34A853",
  },
  {
    key: "routes",
    label: "Routes",
    sub: "Review school routes",
    icon: "alt-route",
    color: "#8E44AD",
    target: "routes",
  },
  {
    key: "trips",
    label: "Trips",
    sub: "View scheduled trips",
    icon: "commute",
    color: "#4285F4",
  },
];

export const operationsItems = [
  {
    key: "attendance",
    label: "Attendance",
    sub: "View student attendance",
    icon: "check-circle",
    color: "#34A853",
  },
  {
    key: "live-tracking",
    label: "Live Tracking",
    sub: "Monitor active vehicles",
    icon: "location-on",
    color: "#4285F4",
  },
  {
    key: "parents",
    label: "Parents",
    sub: "View connected families",
    icon: "family-restroom",
    color: "#8E44AD",
  },
  {
    key: "staff-members",
    label: "Staff Members",
    sub: "Manage school staff",
    icon: "badge",
    color: "#FB8C00",
  },
];

export const communicationItems = [
  {
    key: "announcements",
    label: "Announcements",
    sub: "Share school updates",
    icon: "campaign",
    color: "#FB8C00",
  },
  {
    key: "notifications",
    label: "Notifications",
    sub: "Review school alerts",
    icon: "notifications",
    color: "#EA4335",
  },
];

export const administrationItems = [
  {
    key: "reports",
    label: "Reports",
    sub: "Review school reports",
    icon: "bar-chart",
    color: "#4285F4",
  },
  {
    key: "incidents",
    label: "Incidents",
    sub: "Manage reported incidents",
    icon: "report-problem",
    color: "#EA4335",
  },
  {
    key: "settings",
    label: "Settings",
    sub: "Configure school settings",
    icon: "settings",
    color: "#6B7280",
  },
];

export const quickActions = [
  {
    key: "students",
    label: "View Students",
    icon: "people",
    color: "#4285F4",
    target: "students",
  },
  {
    key: "routes",
    label: "View Routes",
    icon: "alt-route",
    color: "#8E44AD",
    target: "routes",
  },
  {
    key: "announcements",
    label: "Send Notice",
    icon: "send",
    color: "#34A853",
  },
];
