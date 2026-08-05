import type { SupportAppSection } from "../types/support";

export type HelpTopicItem = {
  title: string;
  description: string;
  icon: string;
  action: string;
};

export const helpTopicsBySection: Record<SupportAppSection, HelpTopicItem[]> = {
  fleet_owner: [
    {
      title: "Getting Started",
      description: "Basics of running your fleet in Track My Kid",
      icon: "🚀",
      action: "guide",
    },
    {
      title: "Driver Management",
      description: "Invite, assign, and manage drivers",
      icon: "👥",
      action: "drivers",
    },
    {
      title: "Vehicle Management",
      description: "Register vehicles and keep them current",
      icon: "🚗",
      action: "vehicles",
    },
    {
      title: "Route Planning",
      description: "Build routes and assign vehicles or drivers",
      icon: "🗺️",
      action: "routes",
    },
    {
      title: "Client Management",
      description: "Link families and handle communications",
      icon: "👨‍👩‍👧‍👦",
      action: "clients",
    },
    {
      title: "Billing & Payments",
      description: "Payments, invoices, and account billing",
      icon: "💳",
      action: "payment",
    },
  ],
  parent: [
    {
      title: "Getting Started",
      description: "Set up your family profile and first child",
      icon: "🚀",
      action: "guide",
    },
    {
      title: "Linking a Vehicle",
      description: "Scan a QR code from your transport provider",
      icon: "📱",
      action: "link_vehicle",
    },
    {
      title: "Children & Schools",
      description: "Add children, routes, and school details",
      icon: "🏫",
      action: "child",
    },
    {
      title: "Live Tracking",
      description: "See pickup, drop-off, and trip status",
      icon: "📍",
      action: "tracking",
    },
    {
      title: "Messages",
      description: "Chat with your driver or fleet contact",
      icon: "💬",
      action: "messages",
    },
    {
      title: "Account & Login",
      description: "OTP, password, and profile settings",
      icon: "🔐",
      action: "account",
    },
  ],
  driver: [
    {
      title: "Getting Started",
      description: "Daily workflow in the driver app",
      icon: "🚀",
      action: "guide",
    },
    {
      title: "Routes & Stops",
      description: "Open assigned routes and complete stops",
      icon: "🗺️",
      action: "routes",
    },
    {
      title: "Student Check-in",
      description: "Pickup and drop-off procedures",
      icon: "✅",
      action: "checkin",
    },
    {
      title: "Vehicle & Safety",
      description: "Pre-trip checks and reporting issues",
      icon: "🛡️",
      action: "vehicle",
    },
    {
      title: "Parents & School",
      description: "Coordinating with families and school staff",
      icon: "👨‍👩‍👧‍👦",
      action: "coordination",
    },
    {
      title: "Emergencies",
      description: "When and how to raise an emergency alert",
      icon: "🚨",
      action: "emergency",
    },
  ],
  school: [
    {
      title: "Getting Started",
      description: "School staff portal overview",
      icon: "🚀",
      action: "guide",
    },
    {
      title: "Arrivals & Dismissals",
      description: "Buses, car line, and student handoff",
      icon: "🚌",
      action: "arrivals",
    },
    {
      title: "Rosters & Routes",
      description: "View assigned routes and student lists",
      icon: "📋",
      action: "rosters",
    },
    {
      title: "Communications",
      description: "Messages with fleet owners and drivers",
      icon: "💬",
      action: "messages",
    },
    {
      title: "Safety & Incidents",
      description: "Reporting and escalation with your provider",
      icon: "🛡️",
      action: "safety",
    },
    {
      title: "Account Access",
      description: "Login, roles, and who can see what",
      icon: "🔐",
      action: "account",
    },
  ],
};

/** Placeholder dial URLs; replace with production numbers. */
export const supportTelBySection: Record<SupportAppSection, string> = {
  fleet_owner: "tel:1-800-FLEET",
  parent: "tel:1-800-PARENT",
  driver: "tel:1-800-DRIVER",
  school: "tel:1-800-SCHOOL",
};

export const helpSubtitleBySection: Record<SupportAppSection, string> = {
  fleet_owner: "Fleet owner app",
  parent: "Family (parent) app",
  driver: "Driver app",
  school: "School staff app",
};
