export const topStats = [
  {
    label: "PARENTS",
    value: "1,284",
    change: "+8.4%",
    changeLabel: "vs last month",
    icon: "people",
    accent: "#1BB474",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "CHILDREN",
    value: "2,936",
    change: "+12.2%",
    changeLabel: "vs last month",
    icon: "child-care",
    accent: "#F59E0B",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "VEHICLES",
    value: "184",
    change: "6 Offline",
    changeLabel: "vs today",
    icon: "directions-bus",
    accent: "#3B82F6",
    bg: "rgba(255,255,255,0.72)",
  },
  {
    label: "DRIVERS",
    value: "221",
    change: "14 Pending",
    changeLabel: "verification",
    icon: "person",
    accent: "#8B5CF6",
    bg: "rgba(255,255,255,0.72)",
  },
];

export const quickStats = [
  { label: "SCHOOLS", value: "48", icon: "school", accent: "#3B82F6" },
  { label: "ACTIVE ROUTES", value: "73", icon: "map", accent: "#10B981" },
  { label: "LIVE TRIPS", value: "24", icon: "local-taxi", accent: "#F59E0B" },
  {
    label: "OPEN TICKETS",
    value: "18",
    icon: "confirmation-number",
    accent: "#22C55E",
  },
];

export const attentionCards = [
  {
    title: "6 Vehicles Offline",
    subtitle: "Check vehicle connections",
    tone: "danger",
    icon: "directions-bus",
  },
  {
    title: "14 Drivers Pending",
    subtitle: "Verification required",
    tone: "warning",
    icon: "person",
  },
  {
    title: "2 Active Incidents",
    subtitle: "Requires immediate attention",
    tone: "danger",
    icon: "warning",
  },
];

export const routeCards = [
  {
    route: "ABC Primary",
    driver: "Kabelo M.",
    children: "Children: 14",
    status: "ON ROUTE",
  },
  {
    route: "Bloemfontein North",
    driver: "Thabo K.",
    children: "Children: 11",
    status: "ON ROUTE",
  },
];

export const supportOverview = [
  { label: "Open", value: 18, tone: "soft-red" },
  { label: "In Progress", value: 7, tone: "soft-blue" },
  { label: "Urgent", value: 3, tone: "soft-orange" },
  { label: "Resolved", value: 126, tone: "soft-green" },
];

export const recentActivity = [
  {
    title: "New school registered",
    subtitle: "ABC Primary School",
    time: "5 min ago",
    color: "#10B981",
  },
  {
    title: "Driver approved",
    subtitle: "Kabelo Mokoena",
    time: "18 min ago",
    color: "#3B82F6",
  },
  {
    title: "Vehicle added",
    subtitle: "Toyota Quantum (CA 123-456)",
    time: "32 min ago",
    color: "#F59E0B",
  },
  {
    title: "Support ticket created",
    subtitle: "Unable to track my child",
    time: "45 min ago",
    color: "#8B5CF6",
  },
];

export const chartValues = [1.2, 2.2, 2.8, 3.4, 4.1, 4.8, 5.6];
