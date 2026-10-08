import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { useAdminProfile } from "../../../../adminHelpers/hooks/useAdminProfile";
import {
  cacheAdminDrivers,
  getCachedAdminDrivers,
} from "../../../../store/asyncStorage/adminDriversCache";
import {
  cacheAdminTrips,
  getCachedAdminTrips,
} from "../../../../store/asyncStorage/adminTripsCache";
import {
  cacheAdminVehicles,
  getCachedAdminVehicles,
} from "../../../../store/asyncStorage/adminVehiclesCache";
import { client as supabase } from "../../../../supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "../../../../url";
import { useTheme } from "../../../../styles/theme";

type Row = Record<string, unknown>;
type ToolKey =
  | "users"
  | "drivers"
  | "trips"
  | "vehicles"
  | "payments"
  | "live-map"
  | "messages"
  | "requests"
  | "support-users"
  | "settings"
  | "profile";

type SupportUserForm = {
  id?: string;
  name: string;
  email: string;
  admin_role: string;
  is_active: boolean;
  temporary_password: string;
};

const toolTitles: Record<ToolKey, string> = {
  users: "Platform users",
  drivers: "Drivers",
  trips: "Trips",
  vehicles: "Vehicles",
  payments: "Payments & commissions",
  "live-map": "Live vehicle map",
  messages: "Messages",
  requests: "Requests",
  "support-users": "Support users",
  settings: "Support settings",
  profile: "Admin profile",
};

const emptySupportUser: SupportUserForm = {
  name: "",
  email: "",
  admin_role: "support",
  is_active: true,
  temporary_password: "",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  support: "Support",
  operations: "Operations",
  analyst: "Analyst",
};

const asRow = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};

const getPath = (row: Row, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => asRow(value)[key], row);

const getText = (row: Row, ...paths: string[]): string => {
  for (const path of paths) {
    const value = getPath(row, path);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
  }
  return "";
};

const pretty = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const formatMoney = (cents: unknown, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);

const apiRequest = async (
  path: string,
  token: string,
  options: RequestInit = {},
) => {
  const baseUrl = await resolveWorkingBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result?.message || result?.error || "The request could not be completed.",
    );
  }
  return result;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

const rowsFor = (tool: ToolKey, value: unknown): Row[] => {
  if (Array.isArray(value)) return value.map(asRow);
  const result = asRow(value);
  if (tool === "payments") {
    return [
      ...(Array.isArray(result.owners_owing) ? result.owners_owing : []).map(
        (item) => ({ ...asRow(item), _kind: "owner" }),
      ),
      ...(Array.isArray(result.invoices) ? result.invoices : []).map((item) => ({
        ...asRow(item),
        _kind: "invoice",
      })),
    ];
  }
  if (tool === "requests") {
    return [
      ...(Array.isArray(result.tickets) ? result.tickets : []).map((item) => ({
        ...asRow(item),
        _kind: "ticket",
      })),
      ...(Array.isArray(result.incidents) ? result.incidents : []).map(
        (item) => ({ ...asRow(item), _kind: "incident" }),
      ),
      ...(Array.isArray(result.schools) ? result.schools : []).map((item) => ({
        ...asRow(item),
        _kind: "school",
      })),
    ];
  }
  const candidates: unknown[] = Array.isArray(result.users)
    ? result.users
    : Array.isArray(result.drivers)
      ? result.drivers
      : Array.isArray(result.conversations)
        ? result.conversations
        : Array.isArray(result.owners_owing)
          ? result.owners_owing
          : Array.isArray(result.vehicles)
            ? result.vehicles
            : [];
  return candidates.map(asRow);
};

const getVehicleScope = (row: Row): "fleet" | "school" => {
  const raw = String(
    row._vehicle_scope || row.vehicle_type || row.scope || "",
  ).toLowerCase();
  if (raw.includes("school")) return "school";
  if (raw.includes("fleet") || raw.includes("owner")) return "fleet";
  return row.school ? "school" : "fleet";
};

const getVehicleImageUrls = (row: Row): string[] => {
  const images = Array.isArray(row.vehicle_images)
    ? row.vehicle_images
    : Array.isArray(row.photos)
      ? row.photos
      : [];
  return images
    .map((image) => {
      if (typeof image === "string") return image;
      const imageRow = asRow(image);
      const uri = imageRow.url || imageRow.uri || imageRow.public_url;
      return typeof uri === "string" ? uri : "";
    })
    .filter((uri): uri is string => uri.trim().length > 0);
};

const VehiclePhoto = ({ uri }: { uri: string }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.vehiclePhotoFallback}>
        <MaterialIcons name="broken-image" size={28} color="#94A3B8" />
        <Text style={styles.vehiclePhotoFallbackText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.vehiclePhoto}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel="Vehicle photo"
    />
  );
};

const getRequestPath = (tool: ToolKey) => {
  const paths: Partial<Record<ToolKey, string>> = {
    users: "/admin/users",
    drivers: "/admin/drivers",
    trips: "/admin/trips",
    vehicles: "/admin/vehicles",
    payments: "/admin/commissions",
    "live-map": "/admin/live-trips",
    messages: "/admin/conversations",
    "support-users": "/admin/support-users",
    settings: "/admin/support-settings",
    profile: "/admin/profile",
  };
  return paths[tool];
};

const updateNestedBoolean = (value: Row, path: string, enabled: boolean) => {
  const [root, key] = path.split(".");
  const section = { ...asRow(value[root]) };
  section[key] = enabled;
  return { ...value, [root]: section };
};

const updateSlaTarget = (
  value: Row,
  sectionName: "ticketSlaHours" | "incidentSlaHours",
  level: string,
  target: "response" | "resolution",
  hours: number,
) => {
  const section = { ...asRow(value[sectionName]) };
  const levelSettings = { ...asRow(section[level]), [target]: hours };
  section[level] = levelSettings;
  return { ...value, [sectionName]: section };
};

export default function AdminToolScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tool?: string | string[];
    chatId?: string | string[];
    conversationType?: string | string[];
  }>();
  const toolParam = Array.isArray(params.tool) ? params.tool[0] : params.tool;
  const tool = (toolParam || "users") as ToolKey;
  const chatId = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;
  const conversationType = Array.isArray(params.conversationType)
    ? params.conversationType[0]
    : params.conversationType;
  const { user } = useContext(AuthContext);
  const { admin } = useAdminProfile();
  const { colors } = useTheme();
  const token = user?.token as string | undefined;
  const isSuperAdmin = admin?.admin_role === "super_admin";
  const [items, setItems] = useState<Row[]>([]);
  const [toolData, setToolData] = useState<Row>({});
  const [settings, setSettings] = useState<Row>({});
  const [profile, setProfile] = useState<Row>({});
  const [messages, setMessages] = useState<Row[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [requestKind, setRequestKind] = useState("ticket");
  const [messageKind, setMessageKind] = useState<
    "all" | "admin_user" | "admin_driver"
  >("all");
  const [unreadMessagesOnly, setUnreadMessagesOnly] = useState(false);
  const [vehicleScopeFilter, setVehicleScopeFilter] = useState<
    "all" | "fleet" | "school"
  >("all");
  const [vehicleOwnerFilter, setVehicleOwnerFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Row | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Row | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Row | null>(null);
  const [ticketReplies, setTicketReplies] = useState<Row[]>([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [supportUserForm, setSupportUserForm] =
    useState<SupportUserForm>(emptySupportUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const driversRequestInFlight = useRef(false);
  const tripsRequestInFlight = useRef(false);
  const vehiclesRequestInFlight = useRef(false);
  const [driversCachedAt, setDriversCachedAt] = useState("");
  const [tripsCachedAt, setTripsCachedAt] = useState("");
  const [vehiclesCachedAt, setVehiclesCachedAt] = useState("");
  const [driversRealtimeStatus, setDriversRealtimeStatus] = useState<
    "connecting" | "live" | "unavailable"
  >("connecting");
  const [tripsRealtimeStatus, setTripsRealtimeStatus] = useState<
    "connecting" | "live" | "unavailable"
  >("connecting");
  const [vehiclesRealtimeStatus, setVehiclesRealtimeStatus] = useState<
    "connecting" | "live" | "unavailable"
  >("connecting");
  const adminUserId = String(user?.userData?.id || "");

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (
        (tool === "drivers" && driversRequestInFlight.current) ||
        (tool === "trips" && tripsRequestInFlight.current) ||
        (tool === "vehicles" && vehiclesRequestInFlight.current)
      ) {
        return;
      }
      if (!token) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        return;
      }
      if (tool === "drivers") driversRequestInFlight.current = true;
      if (tool === "trips") tripsRequestInFlight.current = true;
      if (tool === "vehicles") vehiclesRequestInFlight.current = true;
      if (isRefresh) setRefreshing(true);
      setError("");
      try {
        if (tool === "requests") {
          const [tickets, incidents, schools] = await Promise.all([
            apiRequest("/admin/support-tickets?limit=100", token),
            apiRequest("/admin/incident-reports?limit=200", token),
            apiRequest("/admin/pending-schools", token),
          ]);
          const result = {
            tickets: Array.isArray(tickets) ? tickets : [],
            incidents: Array.isArray(incidents) ? incidents : [],
            schools: Array.isArray(schools) ? schools : [],
          };
          setToolData(result);
          setItems(rowsFor(tool, result));
        } else if (tool === "messages" && chatId) {
          const driverConversation = conversationType === "admin_driver";
          const path = driverConversation
            ? `/admin/driver-conversations/${encodeURIComponent(chatId)}/messages`
            : `/admin/user-conversations/${encodeURIComponent(chatId)}/messages`;
          const result = await apiRequest(path, token);
          setMessages(Array.isArray(result) ? result.map(asRow) : []);
        } else if (tool === "profile") {
          const result = asRow(await apiRequest("/admin/profile", token));
          const details = asRow(result.admin);
          setProfile(details);
          setProfileName(getText(details, "name", "display_name"));
          setProfilePhone(getText(details, "phone"));
        } else {
          const path = getRequestPath(tool);
          if (!path) throw new Error("This Admin tool is not available.");
          const result = await apiRequest(path, token);
          const resultRow = asRow(result);
          setToolData(resultRow);
          if (tool === "settings") setSettings(asRow(resultRow.settings));
          const nextItems = rowsFor(tool, result);
          setItems(nextItems);
          if (tool === "drivers" && adminUserId) {
            const cachedAt = await cacheAdminDrivers(adminUserId, nextItems);
            if (cachedAt) setDriversCachedAt(cachedAt);
          }
          if (tool === "trips" && adminUserId) {
            const cachedAt = await cacheAdminTrips(adminUserId, nextItems);
            if (cachedAt) setTripsCachedAt(cachedAt);
          }
          if (tool === "vehicles" && adminUserId) {
            const cachedAt = await cacheAdminVehicles(adminUserId, nextItems);
            if (cachedAt) setVehiclesCachedAt(cachedAt);
          }
        }
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        if (tool === "drivers") driversRequestInFlight.current = false;
        if (tool === "trips") tripsRequestInFlight.current = false;
        if (tool === "vehicles") vehiclesRequestInFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminUserId, chatId, conversationType, token, tool],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const initialize = async () => {
        if (
          (tool === "drivers" || tool === "trips" || tool === "vehicles") &&
          adminUserId
        ) {
          if (tool === "drivers") {
            const cached = await getCachedAdminDrivers(adminUserId);
            if (active && cached) {
              setItems(cached.drivers);
              setDriversCachedAt(cached.cachedAt);
              setLoading(false);
            }
          } else if (tool === "trips") {
            const cached = await getCachedAdminTrips(adminUserId);
            if (active && cached) {
              setItems(cached.trips);
              setTripsCachedAt(cached.cachedAt);
              setLoading(false);
            }
          } else {
            const cached = await getCachedAdminVehicles(adminUserId);
            if (active && cached) {
              setItems(cached.vehicles);
              setVehiclesCachedAt(cached.cachedAt);
              setLoading(false);
            }
          }
        }
        if (active) void loadData();
      };
      void initialize();
      return () => {
        active = false;
      };
    }, [adminUserId, loadData, tool]),
  );

  useFocusEffect(
    useCallback(() => {
      if (tool !== "drivers" && tool !== "trips" && tool !== "vehicles") return;

      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      let interval: ReturnType<typeof setInterval> | undefined;
      let active = true;
      const relevantResources = new Set([
        "drivers",
        "vehicles",
        "routes",
        "route_assignments",
        "users",
        "owners",
        "tracking_sessions",
        "route_children",
      ]);
      const updateRealtimeStatus = (
        status: "connecting" | "live" | "unavailable",
      ) => {
        if (!active) return;
        if (tool === "drivers") setDriversRealtimeStatus(status);
        else if (tool === "trips") setTripsRealtimeStatus(status);
        else setVehiclesRealtimeStatus(status);
      };
      const channel = supabase
        .channel(`admin-${tool}-live-${adminUserId || "session"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "support_dashboard_events",
          },
          (payload) => {
            const resourceType = asRow(payload.new).resource_type;
            if (
              typeof resourceType !== "string" ||
              !relevantResources.has(resourceType)
            ) {
              return;
            }
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
              if (active) void loadData(true);
            }, 350);
          },
        )
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            updateRealtimeStatus("live");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            updateRealtimeStatus("unavailable");
            console.warn(
              `Admin ${tool} realtime unavailable; periodic refresh remains active.`,
              status,
            );
          } else if (status === "CLOSED") {
            updateRealtimeStatus("unavailable");
          } else {
            updateRealtimeStatus("connecting");
          }
        });

      interval = setInterval(() => {
        if (active) void loadData(true);
      }, 30_000);

      return () => {
        active = false;
        if (refreshTimer) clearTimeout(refreshTimer);
        if (interval) clearInterval(interval);
        void supabase.removeChannel(channel);
      };
    }, [adminUserId, loadData, tool]),
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tool === "requests" && item._kind !== requestKind) return false;
      if (tool === "messages" && !chatId) {
        if (
          messageKind !== "all" &&
          getText(item, "conversation_type") !== messageKind
        ) {
          return false;
        }
        if (unreadMessagesOnly && Number(item.unread_count || 0) < 1) {
          return false;
        }
      }
      if (tool === "vehicles") {
        const scope = getVehicleScope(item);
        if (vehicleScopeFilter !== "all" && scope !== vehicleScopeFilter) {
          return false;
        }
        const ownerId = getText(item, "owner.id", "owner_id");
        if (
          vehicleOwnerFilter !== "all" &&
          (scope !== "fleet" || ownerId !== vehicleOwnerFilter)
        ) {
          return false;
        }
      }
      if (!normalized) return true;
      return JSON.stringify(item).toLowerCase().includes(normalized);
    });
  }, [
    chatId,
    items,
    messageKind,
    query,
    requestKind,
    tool,
    unreadMessagesOnly,
    vehicleOwnerFilter,
    vehicleScopeFilter,
  ]);

  const vehicleOwners = useMemo(() => {
    const owners = new Map<string, string>();
    items.forEach((item) => {
      if (getVehicleScope(item) !== "fleet") return;
      const id = getText(item, "owner.id", "owner_id");
      if (!id) return;
      const name =
        getText(item, "owner.company_name", "owner.users.name") ||
        "Unknown fleet owner";
      owners.set(id, name);
    });
    return [...owners.entries()].sort((left, right) =>
      left[1].localeCompare(right[1]),
    );
  }, [items]);

  const openConversation = async (userId: string, driver = false) => {
    if (!token) return;
    try {
      const endpoint = driver
        ? `/admin/drivers/${encodeURIComponent(userId)}/conversation`
        : `/admin/users/${encodeURIComponent(userId)}/conversation`;
      const result = asRow(await apiRequest(endpoint, token, { method: "POST" }));
      const targetType = driver ? "admin_driver" : "admin_user";
      router.push({
        pathname: "/(admin)/(tabs)/tools/messages",
        params: { chatId: String(result.conversationId || ""), conversationType: targetType },
      } as never);
    } catch (requestError) {
      Alert.alert("Could not open conversation", errorMessage(requestError));
    }
  };

  const sendMessage = async () => {
    if (!token || !chatId || !draft.trim() || saving) return;
    setSaving(true);
    try {
      const driverConversation = conversationType === "admin_driver";
      const endpoint = driverConversation
        ? `/admin/driver-conversations/${encodeURIComponent(chatId)}/messages`
        : `/admin/user-conversations/${encodeURIComponent(chatId)}/messages`;
      await apiRequest(endpoint, token, {
        method: "POST",
        body: JSON.stringify({ content: draft.trim() }),
      });
      setDraft("");
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Message was not sent", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const updateTicket = async (row: Row) => {
    if (!token) return;
    const status = getText(row, "status");
    const nextStatus =
      status === "open"
        ? "in_progress"
        : status === "in_progress"
          ? "resolved"
          : "open";
    try {
      await apiRequest(`/admin/support-tickets/${String(row.id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Ticket update failed", errorMessage(requestError));
    }
  };

  const updateIncident = async (row: Row) => {
    if (!token) return;
    const status = getText(row, "status");
    const nextStatus = status === "open" ? "in_progress" : status === "in_progress" ? "resolved" : "open";
    try {
      await apiRequest(`/admin/incident-reports/${String(row.id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Incident update failed", errorMessage(requestError));
    }
  };

  const reviewSchool = async (
    row: Row,
    decision: "approved" | "rejected" | "needs_info",
  ) => {
    if (!token) return;
    const note = decision === "approved"
      ? ""
      : decision === "rejected"
        ? "Unable to verify this school registration."
        : "Please provide the missing registration information.";
    try {
      await apiRequest(`/admin/schools/${String(row.id)}/review`, token, {
        method: "PATCH",
        body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
      });
      await loadData(true);
    } catch (requestError) {
      Alert.alert("School review failed", errorMessage(requestError));
    }
  };

  const openTicketReplies = async (row: Row) => {
    if (!token) return;
    try {
      const result = await apiRequest(
        `/admin/support-tickets/${encodeURIComponent(getText(row, "id"))}/replies`,
        token,
      );
      setTicketReplies(Array.isArray(result) ? result.map(asRow) : []);
      setSelectedTicket(row);
      setReplyDraft("");
    } catch (requestError) {
      Alert.alert("Could not load ticket replies", errorMessage(requestError));
    }
  };

  const sendTicketReply = async () => {
    if (!token || !selectedTicket || !replyDraft.trim() || saving) return;
    setSaving(true);
    try {
      await apiRequest(
        `/admin/support-tickets/${encodeURIComponent(getText(selectedTicket, "id"))}/replies`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ body: replyDraft.trim() }),
        },
      );
      const result = await apiRequest(
        `/admin/support-tickets/${encodeURIComponent(getText(selectedTicket, "id"))}/replies`,
        token,
      );
      setTicketReplies(Array.isArray(result) ? result.map(asRow) : []);
      setReplyDraft("");
    } catch (requestError) {
      Alert.alert("Could not send reply", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const escalateIncident = async (row: Row) => {
    if (!token) return;
    try {
      await apiRequest(
        `/admin/incident-reports/${encodeURIComponent(getText(row, "id"))}/escalate`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ note: "Escalated from the Admin mobile app." }),
        },
      );
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Incident escalation failed", errorMessage(requestError));
    }
  };

  const saveProfile = async () => {
    if (!token || !profileName.trim()) return;
    setSaving(true);
    try {
      await apiRequest("/admin/profile", token, {
        method: "PUT",
        body: JSON.stringify({ name: profileName.trim(), phone: profilePhone.trim() }),
      });
      Alert.alert("Profile updated", "Your Admin profile has been saved.");
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Profile update failed", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!token || !currentPassword || newPassword.length < 8) {
      Alert.alert("Check password", "Enter your current password and a new password of at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/admin/password", token, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (requestError) {
      Alert.alert("Password update failed", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!token || !isSuperAdmin) return;
    setSaving(true);
    try {
      await apiRequest("/admin/support-settings", token, {
        method: "PUT",
        body: JSON.stringify({ settings }),
      });
      Alert.alert("Settings saved", "Support control settings have been updated.");
    } catch (requestError) {
      Alert.alert("Settings update failed", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const saveSupportUser = async () => {
    if (!token || !isSuperAdmin) return;
    setSaving(true);
    try {
      const creating = !supportUserForm.id;
      const path = creating
        ? "/admin/support-users"
        : `/admin/support-users/${encodeURIComponent(supportUserForm.id || "")}`;
      const body = {
        name: supportUserForm.name.trim(),
        email: supportUserForm.email.trim(),
        admin_role: supportUserForm.admin_role,
        is_active: supportUserForm.is_active,
        ...(supportUserForm.temporary_password
          ? { temporary_password: supportUserForm.temporary_password }
          : {}),
      };
      await apiRequest(path, token, {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      setSupportUserForm(emptySupportUser);
      await loadData(true);
    } catch (requestError) {
      Alert.alert("Support user could not be saved", errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const updateSupportUser = (row: Row) => {
    setSupportUserForm({
      id: getText(row, "id"),
      name: getText(row, "name"),
      email: getText(row, "email"),
      admin_role: getText(row, "admin_role") || "support",
      is_active: Boolean(row.is_active),
      temporary_password: "",
    });
    setModalOpen(true);
  };

  const formatDetails = (row: Row) => {
    const details: string[] = [];
    if (tool === "users") {
      details.push(pretty(getText(row, "role") || "user"));
      details.push(getText(row, "email"));
      details.push(getText(row, "status"));
      if (getText(row, "organization")) details.push(getText(row, "organization"));
    } else if (tool === "drivers") {
      details.push(getText(row, "users.name") || getText(row, "name"));
      details.push(getText(row, "users.email"));
      details.push(pretty(getText(row, "status") || "unknown"));
      details.push(getText(row, "vehicle.license_plate", "vehicle_plate_number"));
      details.push(getText(row, "route.route_name"));
    } else if (tool === "trips") {
      details.push(getText(row, "route.route_name") || "Route unavailable");
      details.push(`Driver: ${getText(row, "driver.users.name") || "Unassigned"}`);
      details.push(`Vehicle: ${getText(row, "vehicle.license_plate") || "Unassigned"}`);
      details.push(`${getText(row, "studentCount") || "0"} students`);
      details.push(pretty(getText(row, "status") || "unknown"));
    } else if (tool === "vehicles") {
      const scope = getVehicleScope(row);
      details.push(
        getText(row, "license_plate", "registration_number") ||
          "No plate recorded",
      );
      details.push(
        scope === "school"
          ? `School: ${getText(row, "school.name") || "Unknown"}`
          : `Owner: ${getText(row, "owner.company_name", "owner.users.name") || "Unknown"}`,
      );
      details.push(
        `Driver: ${getText(row, "driver.users.name", "driver.name") || "Unassigned"}`,
      );
      details.push(
        `${scope === "school" ? "Trip" : "Route"}: ${
          scope === "school"
            ? getText(row, "trip.name") || "Not assigned"
            : getText(row, "route.route_name") || "Not assigned"
        }`,
      );
      details.push(`${getText(row, "studentCount") || "0"} students`);
      details.push(pretty(getText(row, "status") || "unknown"));
    } else if (tool === "payments") {
      if (row._kind === "owner") {
        details.push(getText(row, "email") || "No billing email");
        details.push(`Owing: ${formatMoney(row.owing_cents)}`);
        details.push(`Not invoiced: ${formatMoney(row.not_invoiced_cents)}`);
        details.push(`${getText(row, "payment_count") || "0"} cash payments`);
      } else {
        details.push(getText(row, "owner_email") || "No billing email");
        details.push(`${formatMoney(row.amount_cents, getText(row, "currency") || "ZAR")} · ${pretty(getText(row, "status"))}`);
        details.push(`Period: ${getText(row, "period_start")} – ${getText(row, "period_end")}`);
        details.push(`Due: ${getText(row, "due_at") || "Not set"}`);
      }
    } else if (tool === "messages") {
      details.push(getText(row, "participant.role") ? pretty(getText(row, "participant.role")) : "Conversation");
      details.push(getText(row, "last_message.content") || "No messages yet");
      details.push(`${getText(row, "unread_count") || "0"} unread`);
      details.push(getText(row, "last_message_at") ? formatDate(getText(row, "last_message_at")) : "");
    } else if (tool === "requests") {
      if (row._kind === "ticket") {
        details.push(getText(row, "users.name", "users.email") || "Requester unavailable");
        details.push(pretty(getText(row, "category") || "support request"));
        details.push(`${pretty(getText(row, "priority") || "medium")} priority · ${pretty(getText(row, "status") || "open")}`);
        details.push(getText(row, "message"));
      } else if (row._kind === "incident") {
        details.push(`${pretty(getText(row, "severity") || "unknown")} · ${pretty(getText(row, "status") || "open")}`);
        details.push(getText(row, "incident_type"));
        details.push(getText(row, "description"));
      } else {
        details.push(getText(row, "school_email"));
        details.push(`${getText(row, "province")} · ${getText(row, "district")}`);
        details.push(`Status: ${pretty(getText(row, "status") || "pending")}`);
      }
    } else if (tool === "support-users") {
      details.push(getText(row, "email"));
      details.push(roleLabels[getText(row, "admin_role")] || pretty(getText(row, "admin_role")));
      details.push(row.is_active ? "Active" : "Inactive");
    } else if (tool === "live-map") {
      details.push(getText(row, "route.route_name") || "Route unavailable");
      details.push(`Driver: ${getText(row, "driver.users.name") || "Unknown"}`);
      details.push(`Vehicle: ${getText(row, "vehicle.license_plate") || "Unknown"}`);
      const latitude = getText(row, "location.latitude");
      const longitude = getText(row, "location.longitude");
      details.push(latitude && longitude ? `GPS: ${latitude}, ${longitude}` : "GPS location unavailable");
      details.push(getText(row, "location.recorded_at") ? `Updated ${formatDate(getText(row, "location.recorded_at"))}` : "");
    }
    return details.filter(Boolean).join(" · ");
  };

  const getTitle = (row: Row) => {
    if (tool === "users") return getText(row, "name", "email") || "Unnamed user";
    if (tool === "drivers") return getText(row, "users.name", "users.email") || "Driver";
    if (tool === "trips") return getText(row, "route.route_name") || "Trip";
    if (tool === "vehicles") return getText(row, "name", "license_plate") || "Vehicle";
    if (tool === "payments") return row._kind === "owner"
      ? getText(row, "owner_name") || "Fleet owner"
      : `Invoice · ${getText(row, "owner_name") || "Fleet owner"}`;
    if (tool === "messages") return getText(row, "participant.name") || "Conversation";
    if (tool === "requests") {
      if (row._kind === "ticket") return getText(row, "subject") || "Support ticket";
      if (row._kind === "incident") return getText(row, "incident_type") || "Incident report";
      return getText(row, "name") || "School registration";
    }
    if (tool === "support-users") return getText(row, "name") || "Support user";
    if (tool === "live-map") return getText(row, "route.route_name") || "Active trip";
    return "Admin record";
  };

  const keyField = (row: Row) =>
    getText(row, "id", "user_id", "owner_id", "conversation_id") ||
    `${tool}-${getTitle(row)}`;

  const renderActions = (row: Row) => {
    if (tool === "users" || tool === "drivers") {
      const userId =
        tool === "drivers"
          ? getText(row, "user_id", "users.id")
          : getText(row, "id");
      if (!userId) return null;
      if (tool === "drivers") {
        return (
          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setSelectedDriver(row)}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${getTitle(row)}`}
            >
              <MaterialIcons name="person-outline" size={16} color="#2563EB" />
              <Text style={styles.actionText}>View details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => void openConversation(userId, true)}
            >
              <MaterialIcons name="chat" size={16} color="#2563EB" />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => void openConversation(userId)}
        >
          <MaterialIcons name="chat" size={16} color="#2563EB" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      );
    }
    if (tool === "messages") {
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: "/(admin)/(tabs)/tools/messages",
              params: {
                chatId: getText(row, "id"),
                conversationType: getText(row, "conversation_type"),
              },
            } as never)
          }
        >
          <MaterialIcons name="open-in-new" size={16} color="#2563EB" />
          <Text style={styles.actionText}>Open</Text>
        </TouchableOpacity>
      );
    }
    if (tool === "requests" && row._kind === "ticket") {
      return (
        <View style={styles.inlineActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => void openTicketReplies(row)}>
            <MaterialIcons name="forum" size={16} color="#2563EB" />
            <Text style={styles.actionText}>View / reply</Text>
          </TouchableOpacity>
          {["super_admin", "support", "operations"].includes(admin?.admin_role || "") ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => void updateTicket(row)}>
              <MaterialIcons name="sync" size={16} color="#2563EB" />
              <Text style={styles.actionText}>Advance</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (tool === "requests" && row._kind === "incident") {
      return (
        <View style={styles.inlineActions}>
          {["super_admin", "support", "operations"].includes(admin?.admin_role || "") ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => void updateIncident(row)}>
                <MaterialIcons name="sync" size={16} color="#2563EB" />
                <Text style={styles.actionText}>Advance</Text>
              </TouchableOpacity>
              {!row.is_escalated ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => void escalateIncident(row)}>
                  <MaterialIcons name="priority-high" size={16} color="#B91C1C" />
                  <Text style={[styles.actionText, { color: "#B91C1C" }]}>Escalate</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </View>
      );
    }
    if (tool === "requests" && row._kind === "school" && ["super_admin", "support"].includes(admin?.admin_role || "")) {
      return (
        <View style={styles.inlineActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => void reviewSchool(row, "approved")}>
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => void reviewSchool(row, "rejected")}>
            <Text style={[styles.actionText, { color: "#B91C1C" }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => void reviewSchool(row, "needs_info")}>
            <Text style={styles.actionText}>Request info</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (tool === "support-users" && isSuperAdmin) {
      return (
        <TouchableOpacity style={styles.actionButton} onPress={() => updateSupportUser(row)}>
          <MaterialIcons name="edit" size={16} color="#2563EB" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      );
    }
    if (tool === "live-map") {
      const latitude = getText(row, "location.latitude");
      const longitude = getText(row, "location.longitude");
      if (!latitude || !longitude) return null;
      return (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            void Linking.openURL(
              `https://maps.google.com/?q=${encodeURIComponent(`${latitude},${longitude}`)}`,
            ).catch((openError: unknown) =>
              Alert.alert("Could not open map", errorMessage(openError)),
            );
          }}
        >
          <MaterialIcons name="map" size={16} color="#2563EB" />
          <Text style={styles.actionText}>Open map</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderMessages = () => (
    <>
      {chatId ? (
        <>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Conversation</Text>
          </View>
          {messages.map((message) => {
            const ownMessage = getText(message, "sender_id") === String(user?.userData?.id || "");
            return (
              <View
                key={getText(message, "id")}
                style={[styles.messageBubble, ownMessage ? styles.ownMessage : styles.otherMessage]}
              >
                <Text style={styles.messageSender}>
                  {ownMessage ? "You" : getText(message, "users.name") || "User"}
                </Text>
                <Text style={styles.messageText}>{getText(message, "content")}</Text>
                <Text style={styles.messageTime}>
                  {getText(message, "sent_at") ? formatDate(getText(message, "sent_at")) : ""}
                </Text>
              </View>
            );
          })}
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a reply..."
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={() => void sendMessage()} disabled={saving || !draft.trim()}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="send" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        renderRows()
      )}
    </>
  );

  const renderRows = () => (
    <>
      {tool === "messages" && !chatId ? (
        <>
          <View style={styles.filterRow}>
            {[
              ["all", "All conversations"],
              ["admin_user", "Users"],
              ["admin_driver", "Drivers"],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                onPress={() =>
                  setMessageKind(
                    value as "all" | "admin_user" | "admin_driver",
                  )
                }
                style={[
                  styles.filterChip,
                  messageKind === value && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    messageKind === value && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setUnreadMessagesOnly((current) => !current)}
            style={[
              styles.unreadFilter,
              unreadMessagesOnly && styles.unreadFilterActive,
            ]}
          >
            <MaterialIcons
              name={unreadMessagesOnly ? "mark-chat-read" : "mark-chat-unread"}
              size={15}
              color={unreadMessagesOnly ? "#1D4ED8" : "#64748B"}
            />
            <Text
              style={[
                styles.filterText,
                unreadMessagesOnly && styles.filterTextActive,
              ]}
            >
              Unread only
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
      {tool === "requests" ? (
        <View style={styles.filterRow}>
          {[
            ["ticket", "Tickets"],
            ["incident", "Incidents"],
            ["school", "Schools"],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setRequestKind(value)}
              style={[styles.filterChip, requestKind === value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, requestKind === value && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {tool === "vehicles" ? (
        <>
          <View style={styles.filterRow}>
            {[
              ["all", "All vehicles"],
              ["fleet", "Fleet owners"],
              ["school", "School vehicles"],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                onPress={() => {
                  setVehicleScopeFilter(value as "all" | "fleet" | "school");
                  if (value === "school") setVehicleOwnerFilter("all");
                }}
                style={[
                  styles.filterChip,
                  vehicleScopeFilter === value && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    vehicleScopeFilter === value && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {vehicleScopeFilter !== "school" ? (
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={vehicleOwnerFilter}
                onValueChange={(value) => setVehicleOwnerFilter(String(value))}
              >
                <Picker.Item label="All fleet owners" value="all" />
                {vehicleOwners.map(([ownerId, ownerName]) => (
                  <Picker.Item
                    key={ownerId}
                    label={ownerName}
                    value={ownerId}
                  />
                ))}
              </Picker>
            </View>
          ) : null}
          <View style={styles.vehicleCounts}>
            {[
              ["Fleet vehicles", items.filter((item) => getVehicleScope(item) === "fleet").length],
              ["School vehicles", items.filter((item) => getVehicleScope(item) === "school").length],
            ].map(([label, count]) => (
              <View key={String(label)} style={styles.vehicleCountCard}>
                <Text style={styles.vehicleCountValue}>{String(count)}</Text>
                <Text style={styles.vehicleCountLabel}>{String(label)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {tool === "support-users" && isSuperAdmin ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setSupportUserForm(emptySupportUser);
            setModalOpen(true);
          }}
        >
          <MaterialIcons name="person-add" size={18} color="white" />
          <Text style={styles.primaryButtonText}>Add support user</Text>
        </TouchableOpacity>
      ) : null}
      {filteredItems.map((row) => {
        const cardContent = (
          <View style={styles.dataCard}>
            <View style={styles.cardHeading}>
              <View style={styles.recordIcon}>
                <MaterialIcons
                  name={tool === "vehicles" ? "directions-bus" : tool === "requests" ? "assignment" : tool === "payments" ? "payments" : tool === "live-map" ? "location-on" : "person-outline"}
                  size={18}
                  color="#2563EB"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordTitle}>{getTitle(row)}</Text>
                <Text style={styles.recordSub} numberOfLines={4}>{formatDetails(row)}</Text>
              </View>
              {tool === "vehicles" ? (
                <View
                  style={[
                    styles.vehicleTypeBadge,
                    getVehicleScope(row) === "school"
                      ? styles.schoolVehicleBadge
                      : styles.fleetVehicleBadge,
                  ]}
                >
                  <Text style={styles.vehicleTypeBadgeText}>
                    {getVehicleScope(row) === "school" ? "SCHOOL" : "FLEET"}
                  </Text>
                </View>
              ) : null}
              {tool === "payments" && row._kind === "owner" ? (
                <Text style={styles.moneyValue}>{formatMoney(row.owing_cents)}</Text>
              ) : null}
            </View>
            {tool === "requests" && row._kind === "school" ? null : null}
            {tool === "vehicles" ? (
              <Text style={styles.vehicleOpenHint}>Tap to view full vehicle details</Text>
            ) : null}
            {renderActions(row)}
          </View>
        );

        if (tool === "vehicles") {
          return (
            <TouchableOpacity
              key={`${getVehicleScope(row)}-${keyField(row)}`}
              activeOpacity={0.9}
              onPress={() => setSelectedVehicle(row)}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${getTitle(row)}`}
            >
              {cardContent}
            </TouchableOpacity>
          );
        }

        return <View key={keyField(row)}>{cardContent}</View>;
      })}
      {!loading && filteredItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="inbox" size={32} color="#94A3B8" />
          <Text style={styles.emptyText}>{query ? "No matching records." : "There is nothing to show here yet."}</Text>
        </View>
      ) : null}
    </>
  );

  const renderProfile = () => (
    <View style={styles.formCard}>
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholder="Your name" />
      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput style={[styles.input, styles.disabledInput]} value={getText(profile, "email")} editable={false} />
      <Text style={styles.fieldLabel}>Phone</Text>
      <TextInput style={styles.input} value={profilePhone} onChangeText={setProfilePhone} placeholder="Phone number" keyboardType="phone-pad" />
      <TouchableOpacity style={styles.primaryButton} onPress={() => void saveProfile()} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save profile"}</Text>
      </TouchableOpacity>
      <View style={styles.formDivider} />
      <Text style={styles.sectionHeading}>Change password</Text>
      <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry autoComplete="current-password" />
      <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password (8+ characters)" secureTextEntry autoComplete="new-password" />
      <TouchableOpacity style={styles.secondaryButton} onPress={() => void changePassword()} disabled={saving}>
        <Text style={styles.secondaryButtonText}>{saving ? "Updating..." : "Update password"}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => {
    const permissionRows = Array.isArray(asRow(toolData.permissions)[admin?.admin_role || ""]) 
      ? (asRow(toolData.permissions)[admin?.admin_role || ""] as unknown[]).filter((item): item is string => typeof item === "string")
      : [];
    const alertKeys = [
      ["alerts.urgentTickets", "Urgent support tickets"],
      ["alerts.unassignedTickets", "Unassigned tickets"],
      ["alerts.urgentIncidents", "Urgent incidents"],
      ["alerts.unassignedIncidents", "Unassigned incidents"],
      ["alerts.responseDeadlines", "Response deadlines"],
      ["alerts.resolutionDeadlines", "Resolution deadlines"],
      ["escalation.enabled", "Automatic escalation"],
      ["escalation.escalateOnResponseBreach", "Escalate response SLA breaches"],
      ["escalation.escalateOnResolutionBreach", "Escalate resolution SLA breaches"],
    ];
    return (
      <>
        <View style={styles.statusCard}>
          <Text style={styles.sectionHeading}>Platform health</Text>
          {Object.entries(asRow(toolData.health)).map(([key, value]) => (
            <Text key={key} style={styles.recordSub}>{pretty(key)}: {String(value)}</Text>
          ))}
          <Text style={styles.recordSub}>Last updated: {getText(toolData, "updatedAt") || "Not recorded"}</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>Service-level targets (hours)</Text>
          {[
            ["ticketSlaHours", "Ticket priority", ["low", "medium", "high", "urgent"]],
            ["incidentSlaHours", "Incident severity", ["low", "medium", "high", "critical"]],
          ].map(([sectionValue, label, levels]) => {
            const section = sectionValue as "ticketSlaHours" | "incidentSlaHours";
            const levelList = levels as string[];
            return (
              <View key={section} style={styles.slaSection}>
                <Text style={styles.fieldLabel}>{label}</Text>
                {levelList.map((level) => (
                  <View key={`${section}.${level}`} style={styles.slaRow}>
                    <Text style={styles.slaLevel}>{pretty(level)}</Text>
                    {(["response", "resolution"] as const).map((target) => (
                      <View key={target} style={styles.slaInputGroup}>
                        <Text style={styles.helperText}>{pretty(target)}</Text>
                        <TextInput
                          style={styles.slaInput}
                          value={String(getPath(settings, `${section}.${level}.${target}`) ?? "")}
                          onChangeText={(raw) => {
                            if (!isSuperAdmin || !raw.trim()) return;
                            const hours = Number(raw);
                            if (Number.isFinite(hours)) {
                              setSettings((current) =>
                                updateSlaTarget(current, section, level, target, hours),
                              );
                            }
                          }}
                          keyboardType="decimal-pad"
                          editable={isSuperAdmin}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
          <Text style={styles.fieldLabel}>Incident escalation threshold</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={getText(settings, "escalation.incidentSeverityThreshold") || "high"}
              onValueChange={(threshold) => {
                const escalation = { ...asRow(settings.escalation), incidentSeverityThreshold: threshold };
                setSettings((current) => ({ ...current, escalation }));
              }}
              enabled={isSuperAdmin}
            >
              {["low", "medium", "high", "critical"].map((level) => (
                <Picker.Item key={level} label={pretty(level)} value={level} />
              ))}
            </Picker>
          </View>
          <Text style={styles.fieldLabel}>Alert window (hours)</Text>
          <TextInput
            style={styles.input}
            value={String(getText(settings, "escalation.alertWindowHours") || "2")}
            onChangeText={(raw) => {
              const hours = Number(raw);
              if (!isSuperAdmin || !Number.isInteger(hours)) return;
              const escalation = { ...asRow(settings.escalation), alertWindowHours: hours };
              setSettings((current) => ({ ...current, escalation }));
            }}
            keyboardType="number-pad"
            editable={isSuperAdmin}
          />
          <Text style={styles.sectionHeading}>Alert and escalation rules</Text>
          {alertKeys.map(([path, label]) => (
            <View style={styles.switchRow} key={path}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={Boolean(getPath(settings, path))}
                onValueChange={(enabled) => setSettings((current) => updateNestedBoolean(current, path, enabled))}
                disabled={!isSuperAdmin}
                trackColor={{ true: "#2563EB" }}
              />
            </View>
          ))}
          {isSuperAdmin ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => void saveSettings()} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save support settings"}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.recordSub}>Only super admins can change support settings.</Text>
          )}
        </View>
        {permissionRows.length ? (
          <View style={styles.statusCard}>
            <Text style={styles.sectionHeading}>Your permissions</Text>
            {permissionRows.map((permission) => <Text key={permission} style={styles.recordSub}>• {permission}</Text>)}
          </View>
        ) : null}
      </>
    );
  };

  const renderPaymentsSummary = () => {
    const summary = asRow(toolData.summary);
    return (
      <View style={styles.metricsGrid}>
        {[
          ["Outstanding", summary.owing_cents, "#B91C1C"],
          ["Not invoiced", summary.not_invoiced_cents, "#B45309"],
          ["Settled", summary.settled_cents, "#047857"],
          ["Total accrued", summary.accrued_cents, "#1D4ED8"],
        ].map(([label, value, color]) => (
          <View key={String(label)} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{String(label)}</Text>
            <Text style={[styles.metricValue, { color: String(color) }]}>{formatMoney(value)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderVehicleDetails = (row: Row) => {
    const scope = getVehicleScope(row);
    const value = (...paths: string[]) =>
      getText(row, ...paths) || "Not recorded";
    const detailSection = (heading: string, rows: [string, string][]) => (
      <View key={heading} style={styles.vehicleDetailSection}>
        <Text style={styles.vehicleDetailHeading}>{heading}</Text>
        {rows.map(([label, detail]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{detail}</Text>
          </View>
        ))}
      </View>
    );
    const routeStart = getText(row, "route.start_location");
    const routeEnd = getText(row, "route.end_location");
    const routeDescription =
      [routeStart, routeEnd].filter(Boolean).join(" → ") || "Not assigned";
    const capacity = getText(row, "capacity", "passenger_capacity");
    const studentCount = getText(row, "studentCount") || "0";
    const driverName =
      getText(row, "driver.users.name", "driver.name") || "Not assigned";
    const details = [
      detailSection("Vehicle information", [
        ["Vehicle type", scope === "school" ? "School vehicle" : "Fleet owner vehicle"],
        ["Registration / plate", value("license_plate", "registration_number")],
        ["Make", value("make")],
        ["Model", value("model", "name")],
        ["Year", value("year")],
        ["Colour", value("colour", "color")],
        ["VIN", value("vin")],
        ["Passenger capacity", capacity || "Not recorded"],
        ["Status", pretty(getText(row, "status") || "unknown")],
      ]),
      detailSection("Ownership & assignment", [
        [
          scope === "school" ? "School" : "Fleet owner",
          scope === "school"
            ? getText(row, "school.name") || "School not linked"
            : getText(row, "owner.company_name", "owner.users.name") ||
              "Owner not linked",
        ],
        ["Assigned driver", driverName],
        [
          "Driver status",
          pretty(getText(row, "driver.status", "driver.role") || "Not recorded"),
        ],
        ["Driver phone", value("driver.phone")],
        [scope === "school" ? "Assigned trip" : "Assigned route",
          scope === "school"
            ? getText(row, "trip.name") || "No assigned trip"
            : getText(row, "route.route_name") || "No assigned route"],
        ...(scope === "fleet"
          ? [["Route coverage", routeDescription] as [string, string]]
          : []),
        ...(getText(row, "trip.destination")
          ? [["Trip destination", getText(row, "trip.destination")] as [string, string]]
          : []),
        ["Assigned students", capacity ? `${studentCount} / ${capacity}` : studentCount],
      ]),
      detailSection("Compliance & record dates", [
        ["License expiry", value("license_expiry")],
        ["Roadworthy expiry", value("roadworthy_expiry")],
        ["Insurance expiry", value("insurance_expiry")],
        [
          "Added",
          getText(row, "created_at")
            ? formatDate(getText(row, "created_at"))
            : "Not recorded",
        ],
        [
          "Last updated",
          getText(row, "updated_at")
            ? formatDate(getText(row, "updated_at"))
            : "Not recorded",
        ],
      ]),
      detailSection("Live information", [
        [
          "Tracking status",
          getText(row, "trackingSession.status", "trip.status")
            ? pretty(getText(row, "trackingSession.status", "trip.status"))
            : "No active tracking",
        ],
        [
          "Tracking started",
          getText(row, "trackingSession.started_at")
            ? formatDate(getText(row, "trackingSession.started_at"))
            : "Not available",
        ],
        [
          "Last location",
          getText(row, "location.latitude") && getText(row, "location.longitude")
            ? `${getText(row, "location.latitude")}, ${getText(row, "location.longitude")}`
            : "Not available",
        ],
        [
          "Location updated",
          getText(row, "location.recorded_at")
            ? formatDate(getText(row, "location.recorded_at"))
            : "Not available",
        ],
        [
          "Documents / photos",
          `${Array.isArray(row.documents) ? row.documents.length : 0} documents · ${
            Array.isArray(row.photos) ? row.photos.length : 0
          } photos`,
        ],
      ]),
    ];

    const tripAssignments = Array.isArray(row.tripAssignments)
      ? row.tripAssignments.map(asRow)
      : [];
    const vehicleImages = getVehicleImageUrls(row);

    return (
      <View style={styles.vehicleDetailsContent}>
        <View style={styles.vehicleDetailSection}>
          <Text style={styles.vehicleDetailHeading}>Vehicle photos</Text>
          {vehicleImages.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehiclePhotoGallery}
            >
              {vehicleImages.map((uri, index) => (
                <VehiclePhoto key={`${uri}-${index}`} uri={uri} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.vehiclePhotoEmpty}>
              <MaterialIcons name="directions-bus" size={30} color="#94A3B8" />
              <Text style={styles.vehiclePhotoFallbackText}>
                No vehicle photos available
              </Text>
            </View>
          )}
        </View>
        {details}
        {tripAssignments.length ? (
          <View style={styles.vehicleDetailSection}>
            <Text style={styles.vehicleDetailHeading}>School trip assignments</Text>
            {tripAssignments.map((assignment) => {
              const assignmentTrip = asRow(assignment.trip);
              const assignmentDriver = asRow(assignment.driver);
              const coordinator = asRow(assignment.coordinator);
              return (
                <View
                  key={getText(assignment, "id") || getText(assignmentTrip, "id")}
                  style={styles.vehicleTripCard}
                >
                  <Text style={styles.vehicleTripTitle}>
                    {getText(assignmentTrip, "name") || "School trip"}
                  </Text>
                  <Text style={styles.vehicleTripSub}>
                    {getText(assignmentTrip, "destination") || "Destination not set"}
                    {getText(assignmentTrip, "status")
                      ? ` · ${pretty(getText(assignmentTrip, "status"))}`
                      : ""}
                  </Text>
                  <Text style={styles.vehicleTripSub}>
                    Driver: {getText(assignmentDriver, "name") || "Not assigned"}
                  </Text>
                  <Text style={styles.vehicleTripSub}>
                    Coordinator: {getText(coordinator, "name") || "Not assigned"}
                  </Text>
                  <Text style={styles.vehicleTripSub}>
                    {getText(assignment, "studentCount") || "0"} students
                    {getText(assignmentTrip, "departure_at")
                      ? ` · Departs ${formatDate(getText(assignmentTrip, "departure_at"))}`
                      : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  const renderDriverDetails = (driver: Row) => {
    const userDetails = asRow(driver.users);
    const vehicle = asRow(driver.vehicle);
    const route = asRow(driver.route);
    const owner = asRow(driver.owner);
    const detailSection = (heading: string, rows: [string, string][]) => (
      <View key={heading} style={styles.vehicleDetailSection}>
        <Text style={styles.vehicleDetailHeading}>{heading}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value || "Not recorded"}</Text>
          </View>
        ))}
      </View>
    );
    const driverName =
      getText(userDetails, "name") || getText(driver, "name") || "Driver";
    const avatar = getText(driver, "avatar", "photo_url", "profile_image");
    const routeName = getText(route, "route_name");
    const routeDescription = [
      getText(route, "start_location"),
      getText(route, "end_location"),
    ]
      .filter(Boolean)
      .join(" → ");

    return (
      <View style={styles.vehicleDetailsContent}>
        <View style={styles.driverProfileHeader}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.driverAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.driverAvatarFallback}>
              <MaterialIcons name="person" size={30} color="#2563EB" />
            </View>
          )}
          <View style={styles.vehicleModalTitleWrap}>
            <Text style={styles.vehicleModalTitle}>{driverName}</Text>
            <Text style={styles.vehicleModalSubtitle}>
              {getText(userDetails, "email") || "No email recorded"}
            </Text>
          </View>
        </View>
        {detailSection("Driver profile", [
          ["Driver ID", getText(driver, "id") || "Not recorded"],
          ["Phone", getText(userDetails, "phone") || "Not recorded"],
          ["Email", getText(userDetails, "email") || "Not recorded"],
          ["Status", pretty(getText(driver, "status") || "unknown")],
          ["Verified", driver.is_verified ? "Verified" : "Not verified"],
          [
            "Registered",
            getText(driver, "created_at")
              ? formatDate(getText(driver, "created_at"))
              : "Not recorded",
          ],
        ])}
        {detailSection("Fleet & assignment", [
          [
            "Fleet owner",
            getText(owner, "company_name", "users.name") || "Not linked",
          ],
          [
            "Assigned vehicle",
            getText(vehicle, "name", "model") || "Not assigned",
          ],
          [
            "Vehicle registration",
            getText(vehicle, "license_plate") ||
              getText(driver, "vehicle_plate_number") ||
              "Not assigned",
          ],
          ["Vehicle status", pretty(getText(vehicle, "status") || "unknown")],
          ["Assigned route", routeName || "Not assigned"],
          ["Route coverage", routeDescription || "Not recorded"],
        ])}
      </View>
    );
  };

  const title = toolTitles[tool] || "Admin tools";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PLATFORM OPERATIONS</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
            <Text style={styles.subtitle}>Connected to the live Admin services.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => void loadData(true)}>
            <MaterialIcons name="refresh" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadData(true)}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.subtitle}>Loading {title.toLowerCase()}…</Text></View>
        ) : tool === "profile" ? (
          renderProfile()
        ) : tool === "settings" ? (
          renderSettings()
        ) : tool === "messages" ? (
          renderMessages()
        ) : (
          <>
            {tool === "payments" ? renderPaymentsSummary() : null}
            {tool === "drivers" ? (
              <View style={styles.driversSyncStatus}>
                <View
                  style={[
                    styles.driversSyncDot,
                    {
                      backgroundColor:
                        driversRealtimeStatus === "live"
                          ? "#10B981"
                          : driversRealtimeStatus === "connecting"
                            ? "#F59E0B"
                            : "#DC2626",
                    },
                  ]}
                />
                <Text style={styles.driversSyncText}>
                  {driversRealtimeStatus === "live"
                    ? "Live updates connected"
                    : driversRealtimeStatus === "connecting"
                      ? "Connecting to live updates…"
                      : "Live updates unavailable · syncing every 30 seconds"}
                  {driversCachedAt
                    ? ` · Cached ${formatDate(driversCachedAt)}`
                    : ""}
                </Text>
              </View>
            ) : null}
            {tool === "trips" ? (
              <View style={styles.driversSyncStatus}>
                <View
                  style={[
                    styles.driversSyncDot,
                    {
                      backgroundColor:
                        tripsRealtimeStatus === "live"
                          ? "#10B981"
                          : tripsRealtimeStatus === "connecting"
                            ? "#F59E0B"
                            : "#DC2626",
                    },
                  ]}
                />
                <Text style={styles.driversSyncText}>
                  {tripsRealtimeStatus === "live"
                    ? "Live updates connected"
                    : tripsRealtimeStatus === "connecting"
                      ? "Connecting to live updates…"
                      : "Live updates unavailable · syncing every 30 seconds"}
                  {tripsCachedAt ? ` · Cached ${formatDate(tripsCachedAt)}` : ""}
                </Text>
              </View>
            ) : null}
            {tool === "vehicles" ? (
              <View style={styles.driversSyncStatus}>
                <View
                  style={[
                    styles.driversSyncDot,
                    {
                      backgroundColor:
                        vehiclesRealtimeStatus === "live"
                          ? "#10B981"
                          : vehiclesRealtimeStatus === "connecting"
                            ? "#F59E0B"
                            : "#DC2626",
                    },
                  ]}
                />
                <Text style={styles.driversSyncText}>
                  {vehiclesRealtimeStatus === "live"
                    ? "Live updates connected"
                    : vehiclesRealtimeStatus === "connecting"
                      ? "Connecting to live updates…"
                      : "Live updates unavailable · syncing every 30 seconds"}
                  {vehiclesCachedAt
                    ? ` · Cached ${formatDate(vehiclesCachedAt)}`
                    : ""}
                </Text>
              </View>
            ) : null}
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}...`}
              returnKeyType="search"
            />
            <Text style={styles.resultCount}>{filteredItems.length} records</Text>
            {renderRows()}
          </>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{supportUserForm.id ? "Edit support user" : "Add support user"}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={supportUserForm.name} onChangeText={(name) => setSupportUserForm((form) => ({ ...form, name }))} />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={supportUserForm.email} onChangeText={(email) => setSupportUserForm((form) => ({ ...form, email }))} keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={supportUserForm.admin_role} onValueChange={(admin_role) => setSupportUserForm((form) => ({ ...form, admin_role }))}>
                  {Object.entries(roleLabels).map(([value, label]) => <Picker.Item key={value} label={label} value={value} />)}
                </Picker>
              </View>
              {supportUserForm.id ? (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Account active</Text>
                  <Switch value={supportUserForm.is_active} onValueChange={(is_active) => setSupportUserForm((form) => ({ ...form, is_active }))} />
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>{supportUserForm.id ? "Reset password (optional)" : "Temporary password"}</Text>
              <TextInput style={styles.input} value={supportUserForm.temporary_password} onChangeText={(temporary_password) => setSupportUserForm((form) => ({ ...form, temporary_password }))} secureTextEntry autoComplete="new-password" />
              <Text style={styles.helperText}>Temporary password must contain at least 12 characters.</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void saveSupportUser()} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? "Saving..." : supportUserForm.id ? "Save changes" : "Create user"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedVehicle)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.vehicleModalHeader}>
              <View style={styles.vehicleModalIcon}>
                <MaterialIcons name="directions-bus" size={23} color="#FFFFFF" />
              </View>
              <View style={styles.vehicleModalTitleWrap}>
                <Text style={styles.vehicleModalTitle}>
                  {getTitle(selectedVehicle || {})}
                </Text>
                <Text style={styles.vehicleModalSubtitle}>
                  {getText(
                    selectedVehicle || {},
                    "license_plate",
                    "registration_number",
                  ) || "Registration not recorded"}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close vehicle details"
                style={styles.vehicleModalClose}
                onPress={() => setSelectedVehicle(null)}
              >
                <MaterialIcons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={styles.vehicleModalBadges}>
              <View
                style={[
                  styles.vehicleScopeBadge,
                  getVehicleScope(selectedVehicle || {}) === "school"
                    ? styles.schoolVehicleBadge
                    : styles.fleetVehicleBadge,
                ]}
              >
                <Text style={styles.vehicleScopeBadgeText}>
                  {getVehicleScope(selectedVehicle || {}) === "school"
                    ? "SCHOOL VEHICLE"
                    : "FLEET OWNER VEHICLE"}
                </Text>
              </View>
              <Text style={styles.vehicleModalStatus}>
                {pretty(getText(selectedVehicle || {}, "status") || "unknown")}
              </Text>
            </View>
            <ScrollView
              style={styles.vehicleDetailsScroll}
              contentContainerStyle={styles.vehicleDetailsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderVehicleDetails(selectedVehicle || {})}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.vehicleModalCloseButton}
                onPress={() => setSelectedVehicle(null)}
              >
                <Text style={styles.vehicleModalCloseText}>Close details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedDriver)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDriver(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.vehicleModalHeader}>
              <View style={styles.vehicleModalIcon}>
                <MaterialIcons name="person" size={23} color="#FFFFFF" />
              </View>
              <View style={styles.vehicleModalTitleWrap}>
                <Text style={styles.vehicleModalTitle}>
                  {getText(selectedDriver || {}, "users.name", "name") || "Driver"}
                </Text>
                <Text style={styles.vehicleModalSubtitle}>
                  {getText(selectedDriver || {}, "users.email") ||
                    "Driver profile"}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close driver details"
                style={styles.vehicleModalClose}
                onPress={() => setSelectedDriver(null)}
              >
                <MaterialIcons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={styles.vehicleModalBadges}>
              <View style={styles.fleetVehicleBadge}>
                <Text style={styles.vehicleScopeBadgeText}>DRIVER PROFILE</Text>
              </View>
              <Text style={styles.vehicleModalStatus}>
                {pretty(getText(selectedDriver || {}, "status") || "unknown")}
              </Text>
              <Text style={styles.vehicleModalStatus}>
                {selectedDriver?.is_verified ? "Verified" : "Not verified"}
              </Text>
            </View>
            <ScrollView
              style={styles.vehicleDetailsScroll}
              contentContainerStyle={styles.vehicleDetailsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderDriverDetails(selectedDriver || {})}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.vehicleModalCloseButton}
                onPress={() => setSelectedDriver(null)}
              >
                <Text style={styles.vehicleModalCloseText}>Close details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedTicket)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{getText(selectedTicket || {}, "subject") || "Ticket replies"}</Text>
            <ScrollView style={styles.repliesList} keyboardShouldPersistTaps="handled">
              {ticketReplies.map((reply) => (
                <View key={getText(reply, "id")} style={styles.replyCard}>
                  <Text style={styles.messageSender}>{getText(reply, "users.name") || "Support"}</Text>
                  <Text style={styles.messageText}>{getText(reply, "body")}</Text>
                  <Text style={styles.messageTime}>{getText(reply, "created_at") ? formatDate(getText(reply, "created_at")) : ""}</Text>
                </View>
              ))}
              {!ticketReplies.length ? <Text style={styles.recordSub}>No replies yet.</Text> : null}
            </ScrollView>
            {["super_admin", "support"].includes(admin?.admin_role || "") ? (
              <>
                <TextInput
                  style={[styles.input, styles.replyInput]}
                  value={replyDraft}
                  onChangeText={setReplyDraft}
                  placeholder="Write a reply to the requester..."
                  multiline
                />
                <TouchableOpacity style={styles.primaryButton} onPress={() => void sendTicketReply()} disabled={saving || !replyDraft.trim()}>
                  <Text style={styles.primaryButtonText}>{saving ? "Sending..." : "Send reply"}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedTicket(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  kicker: { color: "#2563EB", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: "900", marginTop: 3 },
  subtitle: { color: "#64748B", fontSize: 11, marginTop: 4 },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  loading: { alignItems: "center", paddingVertical: 42, gap: 10 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12 },
  errorText: { color: "#991B1B", fontSize: 11, flex: 1 },
  retry: { color: "#2563EB", fontSize: 11, fontWeight: "800" },
  search: { backgroundColor: "white", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12, color: "#0F172A" },
  resultCount: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  dataCard: { backgroundColor: "white", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 14, padding: 13, gap: 9 },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  recordIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  recordTitle: { color: "#1E293B", fontSize: 12, fontWeight: "800" },
  recordSub: { color: "#64748B", fontSize: 10, lineHeight: 15, marginTop: 3 },
  actionButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: "#EFF6FF" },
  actionText: { color: "#1D4ED8", fontSize: 10, fontWeight: "800" },
  inlineActions: { flexDirection: "row", gap: 8 },
  emptyCard: { alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 28 },
  emptyText: { color: "#64748B", fontSize: 11, textAlign: "center" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: { flexBasis: "47%", flexGrow: 1, minHeight: 74, backgroundColor: "white", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 13, padding: 11, justifyContent: "center" },
  metricLabel: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 14, fontWeight: "900", marginTop: 4 },
  driversSyncStatus: { flexDirection: "row", alignItems: "center", gap: 7 },
  driversSyncDot: { width: 7, height: 7, borderRadius: 4 },
  driversSyncText: { color: "#64748B", fontSize: 9, flex: 1 },
  moneyValue: { color: "#B91C1C", fontSize: 11, fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9" },
  filterChipActive: { backgroundColor: "#DBEAFE" },
  filterText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  filterTextActive: { color: "#1D4ED8" },
  unreadFilter: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F1F5F9" },
  unreadFilterActive: { backgroundColor: "#DBEAFE" },
  vehicleCounts: { flexDirection: "row", gap: 9 },
  vehicleCountCard: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  vehicleCountValue: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  vehicleCountLabel: { color: "#64748B", fontSize: 9, fontWeight: "700", marginTop: 2 },
  vehicleTypeBadge: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
  fleetVehicleBadge: { backgroundColor: "#DBEAFE" },
  schoolVehicleBadge: { backgroundColor: "#F3E8FF" },
  vehicleTypeBadgeText: { color: "#1D4ED8", fontSize: 8, fontWeight: "900" },
  vehicleOpenHint: { color: "#2563EB", fontSize: 9, fontWeight: "800" },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#2563EB", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, marginTop: 6 },
  primaryButtonText: { color: "white", fontSize: 11, fontWeight: "800" },
  secondaryButton: { alignItems: "center", borderColor: "#CBD5E1", borderWidth: 1, borderRadius: 11, padding: 11, marginTop: 3 },
  secondaryButtonText: { color: "#334155", fontSize: 11, fontWeight: "800" },
  formCard: { backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 14, gap: 9 },
  fieldLabel: { color: "#334155", fontSize: 10, fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "white", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, color: "#0F172A", fontSize: 12 },
  disabledInput: { backgroundColor: "#F8FAFC", color: "#64748B" },
  formDivider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 6 },
  sectionHeading: { color: "#1E293B", fontSize: 13, fontWeight: "800" },
  statusCard: { backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 14, gap: 7 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingVertical: 8 },
  switchLabel: { color: "#334155", fontSize: 11, flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 12, padding: 10 },
  backButton: { padding: 4 },
  chatTitle: { color: "#1E293B", fontSize: 13, fontWeight: "800" },
  messageBubble: { maxWidth: "88%", padding: 11, borderRadius: 13, gap: 4 },
  ownMessage: { alignSelf: "flex-end", backgroundColor: "#DBEAFE" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  messageSender: { color: "#475569", fontSize: 9, fontWeight: "800" },
  messageText: { color: "#0F172A", fontSize: 12, lineHeight: 17 },
  messageTime: { color: "#64748B", fontSize: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: "white", borderRadius: 13, padding: 7, borderWidth: 1, borderColor: "#E2E8F0" },
  composerInput: { flex: 1, color: "#0F172A", fontSize: 12, maxHeight: 100, paddingHorizontal: 6, paddingVertical: 7 },
  sendButton: { width: 36, height: 36, backgroundColor: "#2563EB", borderRadius: 11, alignItems: "center", justifyContent: "center" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailLabel: { color: "#64748B", fontSize: 10, fontWeight: "600", flex: 0.9 },
  detailValue: { color: "#0F172A", fontSize: 10, fontWeight: "700", flex: 1.1, textAlign: "right" },
  vehicleDetailsContent: { gap: 10 },
  driverProfileHeader: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 13, borderWidth: 1, borderColor: "#DBEAFE", backgroundColor: "#EFF6FF", padding: 12 },
  driverAvatar: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#DBEAFE" },
  driverAvatarFallback: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  vehicleDetailSection: { borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 10 },
  vehicleDetailHeading: { color: "#1E293B", fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginBottom: 4 },
  vehicleTripCard: { backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", padding: 10, marginTop: 8, gap: 4 },
  vehicleTripTitle: { color: "#1E293B", fontSize: 11, fontWeight: "800" },
  vehicleTripSub: { color: "#64748B", fontSize: 9, lineHeight: 14 },
  vehiclePhotoGallery: { gap: 9, paddingTop: 5, paddingBottom: 2 },
  vehiclePhoto: { width: 220, height: 140, borderRadius: 11, backgroundColor: "#E2E8F0" },
  vehiclePhotoFallback: { width: 220, height: 140, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F1F5F9" },
  vehiclePhotoEmpty: { minHeight: 110, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F1F5F9" },
  vehiclePhotoFallbackText: { color: "#64748B", fontSize: 9, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "center", padding: 18 },
  modalCard: { backgroundColor: "#F8FAFC", borderRadius: 20, padding: 14, maxHeight: "92%", width: "100%", alignSelf: "center" },
  modalTitle: { color: "#1E293B", fontSize: 16, fontWeight: "900", marginBottom: 10 },
  vehicleModalHeader: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 15, padding: 12, backgroundColor: "#EFF6FF" },
  vehicleModalIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB" },
  vehicleModalTitleWrap: { flex: 1 },
  vehicleModalTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  vehicleModalSubtitle: { color: "#64748B", fontSize: 10, fontWeight: "600", marginTop: 3 },
  vehicleModalClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  vehicleModalBadges: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  vehicleScopeBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  vehicleScopeBadgeText: { color: "#1D4ED8", fontSize: 8, fontWeight: "900" },
  vehicleModalStatus: { color: "#475569", fontSize: 9, fontWeight: "800" },
  vehicleDetailsScroll: { flexShrink: 1 },
  vehicleDetailsScrollContent: { gap: 10, paddingBottom: 4 },
  vehicleModalCloseButton: { backgroundColor: "#2563EB", borderRadius: 11, paddingHorizontal: 15, paddingVertical: 10 },
  vehicleModalCloseText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  pickerWrap: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, overflow: "hidden" },
  slaSection: { gap: 5, marginTop: 6 },
  slaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  slaLevel: { color: "#334155", fontSize: 10, fontWeight: "700", width: 66 },
  slaInputGroup: { flex: 1, gap: 3 },
  slaInput: { borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "white", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, color: "#0F172A", fontSize: 11 },
  helperText: { color: "#64748B", fontSize: 9 },
  repliesList: { maxHeight: 340, marginBottom: 8 },
  replyCard: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, marginBottom: 8 },
  replyInput: { minHeight: 72, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 9, marginTop: 10 },
  cancelButton: { borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "#F1F5F9" },
  cancelText: { color: "#475569", fontSize: 11, fontWeight: "800" },
});
