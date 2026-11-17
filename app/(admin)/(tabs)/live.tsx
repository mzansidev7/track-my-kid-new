import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useTheme } from "../../../styles/theme";
import { client as supabaseClient } from "../../../supabaseConfig/supabaseConfig";

type LiveTrip = {
  id: string;
  route_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  started_at: string;
  route?: {
    route_name?: string;
    start_location?: string;
    end_location?: string;
  } | null;
  driver?: { users?: { name?: string; phone?: string } | null } | null;
  vehicle?: { name?: string; license_plate?: string } | null;
  location?: {
    latitude?: number;
    longitude?: number;
    recorded_at?: string;
  } | null;
};

type EmergencyAlert = {
  id: string;
  message: string | null;
  location: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string | null;
  attending_by?: string | null;
  attending_at?: string | null;
  attending_user?: { name?: string; email?: string } | null;
  created_at: string;
  users?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null;
  children?: { name?: string; lastname?: string } | null;
  route?: { route_name?: string } | null;
};

type EmergencyAssignee = {
  id: string;
  name: string;
  role: string;
};

type EmergencyMessage = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  users?: { name?: string; role?: string } | null;
};

const getSenderRoleLabel = (role?: string) => {
  switch (role) {
    case "client":
      return "Parent / guardian";
    case "driver":
      return "Driver";
    case "school_admin":
      return "School admin";
    case "owner":
      return "Transport provider";
    default:
      return role ? role.replaceAll("_", " ") : "App user";
  }
};

const getCoordinates = (alert: EmergencyAlert) => {
  if (
    alert.latitude == null ||
    alert.latitude === "" ||
    alert.longitude == null ||
    alert.longitude === ""
  ) {
    return null;
  }
  const latitude = Number(alert.latitude);
  const longitude = Number(alert.longitude);
  return Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
    ? { latitude, longitude }
    : null;
};

export default function LiveScreen() {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [emergencyLoading, setEmergencyLoading] = useState(true);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [selectedEmergencyAlert, setSelectedEmergencyAlert] =
    useState<EmergencyAlert | null>(null);
  const [emergencyMessages, setEmergencyMessages] = useState<
    EmergencyMessage[]
  >([]);
  const [emergencyReplyDraft, setEmergencyReplyDraft] = useState("");
  const [sendingEmergencyReply, setSendingEmergencyReply] = useState(false);
  const [updatingEmergencyStatus, setUpdatingEmergencyStatus] = useState(false);
  const [emergencyAssignees, setEmergencyAssignees] = useState<
    EmergencyAssignee[]
  >([]);
  const [emergencyStatusError, setEmergencyStatusError] = useState<string | null>(
    null,
  );
  const isSuperAdmin =
    user?.userData?.admin_profile?.admin_role === "super_admin";
  const currentUserId = user?.userData?.id || user?.id;

  const loadEmergencyAlerts = useCallback(async () => {
    if (!user?.token) {
      setEmergencyError("Your Admin session has expired. Sign in again.");
      setEmergencyLoading(false);
      return;
    }
    setEmergencyError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/admin/emergency-alerts`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "Unable to load emergency SOS alerts.");
      }
      setEmergencyAlerts(data);
      if (isSuperAdmin) {
        try {
          const assigneeResponse = await fetch(
            `${baseUrl}/admin/emergency-alerts/assignees`,
            { headers: { Authorization: `Bearer ${user.token}` } },
          );
          const assignees = await assigneeResponse.json();
          if (!assigneeResponse.ok || !Array.isArray(assignees)) {
            throw new Error(
              assignees?.error || "Unable to load active SOS assignees.",
            );
          }
          setEmergencyAssignees(assignees);
        } catch (assigneeError) {
          setEmergencyStatusError(
            assigneeError instanceof Error
              ? assigneeError.message
              : "Unable to load active SOS assignees.",
          );
        }
      }
    } catch (requestError) {
      setEmergencyError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load emergency SOS alerts.",
      );
    } finally {
      setEmergencyLoading(false);
    }
  }, [isSuperAdmin, user]);

  useEffect(() => {
    if (!user?.token) return undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshSOSData = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void loadEmergencyAlerts();
        const alertId = selectedEmergencyAlert?.id;
        if (!alertId) return;
        void (async () => {
          try {
            const baseUrl = await resolveWorkingBaseUrl();
            const response = await fetch(
              `${baseUrl}/admin/emergency-alerts/${alertId}/messages`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            const result = await response.json();
            if (!response.ok || !result?.alert) {
              throw new Error(
                result?.error || "Unable to refresh the SOS assignment.",
              );
            }
            setSelectedEmergencyAlert((current) =>
              current?.id === alertId
                ? { ...current, ...result.alert }
                : current,
            );
            setEmergencyAlerts((current) =>
              current.map((alert) =>
                alert.id === alertId ? { ...alert, ...result.alert } : alert,
              ),
            );
            setEmergencyMessages(
              Array.isArray(result.messages)
                ? result.messages.filter(
                    (message: EmergencyMessage) =>
                      typeof message?.id === "string" &&
                      typeof message?.author_user_id === "string" &&
                      typeof message?.body === "string" &&
                      typeof message?.created_at === "string",
                  )
                : [],
            );
          } catch (refreshError) {
            console.error(
              "Could not refresh the SOS assignment:",
              refreshError,
            );
            setEmergencyStatusError(
              refreshError instanceof Error
                ? refreshError.message
                : "Unable to refresh the SOS assignment.",
            );
          }
        })();
      }, 200);
    };
    const channel = supabaseClient
      .channel(`admin-sos-live-${currentUserId || "support"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        refreshSOSData,
      )
      .subscribe((status, subscriptionError) => {
        if (subscriptionError) {
          console.warn(
            "Admin SOS realtime subscription issue:",
            subscriptionError,
          );
        }
        if (status === "SUBSCRIBED") refreshSOSData();
      });
    const fallback = setInterval(refreshSOSData, 30_000);
    return () => {
      clearTimeout(refreshTimer);
      clearInterval(fallback);
      void supabaseClient.removeChannel(channel);
    };
  }, [
    currentUserId,
    loadEmergencyAlerts,
    selectedEmergencyAlert?.id,
    user?.token,
  ]);

  const updateEmergencyStatus = async (
    status?: "open" | "in_progress" | "resolved",
    attendingBy?: string | null,
  ) => {
    const alertId = selectedEmergencyAlert?.id;
    if (!alertId || updatingEmergencyStatus || !user?.token) return;
    setUpdatingEmergencyStatus(true);
    setEmergencyStatusError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/admin/emergency-alerts/${alertId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(status ? { status } : {}),
            ...(attendingBy !== undefined
              ? { attending_by: attendingBy }
              : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || result?.id !== alertId) {
        throw new Error(result?.error || "Unable to update the SOS status.");
      }
      setSelectedEmergencyAlert((current) =>
        current?.id === alertId ? { ...current, ...result } : current,
      );
      setEmergencyAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId ? { ...alert, ...result } : alert,
        ),
      );
    } catch (statusError) {
      setEmergencyStatusError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update the SOS status.",
      );
    } finally {
      setUpdatingEmergencyStatus(false);
    }
  };

  const openEmergencyAlert = async (alert: EmergencyAlert) => {
    setSelectedEmergencyAlert(alert);
    setEmergencyMessages([]);
    setEmergencyReplyDraft("");
    setEmergencyStatusError(null);
    if (!user?.token) return;
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/admin/emergency-alerts/${alert.id}/messages`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const result = await response.json();
      if (!response.ok || !result?.alert) {
        throw new Error(
          result?.error || "Unable to open the emergency SOS alert.",
        );
      }
      const messages = Array.isArray(result.messages)
        ? result.messages.filter(
            (message: EmergencyMessage) =>
              typeof message?.id === "string" &&
              typeof message?.author_user_id === "string" &&
              typeof message?.body === "string" &&
              typeof message?.created_at === "string",
          )
        : [];
      setEmergencyMessages(messages);
      setSelectedEmergencyAlert((current) =>
        current?.id === alert.id ? { ...current, ...result.alert } : current,
      );
      setEmergencyAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, ...result.alert } : item,
        ),
      );
    } catch (openError) {
      setEmergencyStatusError(
        openError instanceof Error
          ? openError.message
          : "Unable to open the emergency SOS alert.",
      );
    }
  };

  const sendEmergencyReply = async () => {
    const alertId = selectedEmergencyAlert?.id;
    const body = emergencyReplyDraft.trim();
    if (
      !alertId ||
      !body ||
      !currentUserId ||
      selectedEmergencyAlert?.attending_by !== currentUserId ||
      selectedEmergencyAlert.status === "resolved" ||
      sendingEmergencyReply ||
      !user?.token
    ) {
      return;
    }
    setSendingEmergencyReply(true);
    setEmergencyStatusError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/admin/emergency-alerts/${alertId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );
      const result = await response.json();
      if (
        !response.ok ||
        typeof result?.id !== "string" ||
        typeof result?.author_user_id !== "string" ||
        typeof result?.body !== "string" ||
        typeof result?.created_at !== "string"
      ) {
        throw new Error(result?.error || "Unable to send the SOS response.");
      }
      setEmergencyMessages((current) => [...current, result]);
      setEmergencyReplyDraft("");
    } catch (replyError) {
      setEmergencyStatusError(
        replyError instanceof Error
          ? replyError.message
          : "Unable to send the SOS response.",
      );
    } finally {
      setSendingEmergencyReply(false);
    }
  };
  const loadTrips = useCallback(
    async (pullToRefresh = false) => {
      if (!user?.token) {
        setError("Your Admin session has expired. Sign in again.");
        setLoading(false);
        return;
      }
      if (pullToRefresh) setRefreshing(true);
      setError(null);
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/admin/live-trips`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error || "Unable to load active trips.");
        setTrips(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load active trips.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => void loadTrips(), 0);
      const alertTimer = setTimeout(() => void loadEmergencyAlerts(), 0);
      return () => {
        clearTimeout(timer);
        clearTimeout(alertTimer);
      };
    }, [loadEmergencyAlerts, loadTrips]),
  );

  const mapTrips = trips.filter((trip) => {
    const latitude = Number(trip.location?.latitude);
    const longitude = Number(trip.location?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude);
  });
  const firstLocation = mapTrips[0]?.location;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadTrips(true);
              void loadEmergencyAlerts();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>REAL-TIME OPERATIONS</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Live trips
            </Text>
            <Text style={styles.subtitle}>
              Active tracking sessions only · {trips.length} live
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              void loadTrips(true);
              void loadEmergencyAlerts();
            }}
            accessibilityLabel="Refresh live trips"
          >
            <MaterialIcons name="refresh" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadTrips(true)}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.subtitle}>Loading active sessions…</Text>
          </View>
        ) : null}
        {!loading && !error && trips.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface }]}>
            <MaterialIcons
              name="location-searching"
              size={34}
              color="#94A3B8"
            />
            <Text style={styles.emptyTitle}>No active tracking sessions</Text>
            <Text style={styles.subtitle}>
              Trips appear here while a driver is actively sharing their
              location.
            </Text>
          </View>
        ) : null}

        {mapTrips.length > 0 ? (
          <View style={styles.mapWrap}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: Number(firstLocation?.latitude),
                longitude: Number(firstLocation?.longitude),
                latitudeDelta: 0.35,
                longitudeDelta: 0.35,
              }}
              showsUserLocation={false}
            >
              {mapTrips.map((trip) => (
                <Marker
                  key={trip.id}
                  coordinate={{
                    latitude: Number(trip.location?.latitude),
                    longitude: Number(trip.location?.longitude),
                  }}
                  title={trip.route?.route_name || "Active trip"}
                  description={`${trip.driver?.users?.name || "Driver"} · ${trip.vehicle?.license_plate || trip.vehicle?.name || "Vehicle"}`}
                />
              ))}
            </MapView>
            <View style={styles.mapLabel}>
              <MaterialIcons name="my-location" size={15} color="#059669" />
              <Text style={styles.mapLabelText}>
                {mapTrips.length} live location
                {mapTrips.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        ) : trips.length > 0 ? (
          <View style={styles.noLocations}>
            <MaterialIcons name="location-off" size={20} color="#D97706" />
            <Text style={styles.noLocationText}>
              Active sessions exist, but no current GPS coordinates are
              available.
            </Text>
          </View>
        ) : null}

        {trips.map((trip) => {
          const locationTime = trip.location?.recorded_at
            ? new Date(trip.location.recorded_at)
            : null;
          const locationFresh =
            locationTime && Date.now() - locationTime.getTime() < 2 * 60 * 1000;
          return (
            <View
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.tripHeading}>
                <View style={styles.busIcon}>
                  <MaterialIcons
                    name="directions-bus"
                    size={20}
                    color="#2563EB"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>
                    {trip.route?.route_name || "Route unavailable"}
                  </Text>
                  <Text style={styles.tripSub}>
                    {trip.route?.start_location || ""}
                    {trip.route?.end_location
                      ? ` → ${trip.route.end_location}`
                      : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.liveBadge,
                    locationFresh ? styles.liveNow : styles.liveStale,
                  ]}
                >
                  <Text style={styles.liveBadgeText}>
                    {locationFresh ? "GPS LIVE" : "SESSION ACTIVE"}
                  </Text>
                </View>
              </View>
              <View style={styles.tripDetails}>
                <Text style={styles.detailText}>
                  Driver:{" "}
                  <Text style={styles.detailStrong}>
                    {trip.driver?.users?.name || "Unknown"}
                  </Text>
                </Text>
                <Text style={styles.detailText}>
                  Vehicle:{" "}
                  <Text style={styles.detailStrong}>
                    {trip.vehicle?.license_plate ||
                      trip.vehicle?.name ||
                      "Not linked"}
                  </Text>
                </Text>
                <Text style={styles.detailText}>
                  Started:{" "}
                  <Text style={styles.detailStrong}>
                    {new Date(trip.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </Text>
              </View>
              {trip.location?.recorded_at ? (
                <Text style={styles.locationTime}>
                  Last GPS update{" "}
                  {new Date(trip.location.recorded_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.alertSection, { backgroundColor: colors.surface }]}>
        <View style={styles.alertSectionHeading}>
          <View style={styles.alertTitleWrap}>
            <MaterialIcons name="sos" size={20} color="#B91C1C" />
            <Text style={styles.alertSectionTitle}>Emergency SOS alerts</Text>
          </View>
          <Text style={styles.alertCount}>{emergencyAlerts.length}</Text>
        </View>
        {emergencyError ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{emergencyError}</Text>
            <TouchableOpacity onPress={() => void loadEmergencyAlerts()}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : emergencyLoading ? (
          <View style={styles.alertLoading}>
            <ActivityIndicator size="small" color="#B91C1C" />
            <Text style={styles.subtitle}>Loading emergency alerts…</Text>
          </View>
        ) : emergencyAlerts.length ? (
          emergencyAlerts.map((alert) => {
            const coordinates = getCoordinates(alert);
            const assignedToCurrentUser =
              Boolean(currentUserId) && alert.attending_by === currentUserId;
            const alertAction = alert.status === "resolved"
              ? "View"
              : assignedToCurrentUser
              ? "Respond"
              : alert.attending_by
                ? "View"
                : "Claim";
            return (
              <View
                key={alert.id}
                style={styles.alertCard}
              >
                <View style={styles.alertIcon}>
                  <MaterialIcons name="warning" size={19} color="#B91C1C" />
                </View>
                <TouchableOpacity
                  style={styles.alertCardBody}
                  onPress={() => void openEmergencyAlert(alert)}
                  accessibilityRole="button"
                  accessibilityLabel={`${alertAction} SOS alert from ${alert.users?.name || getSenderRoleLabel(alert.users?.role)}`}
                >
                  <Text style={styles.alertDriver}>
                    {alert.users?.name || "Unknown sender"}
                  </Text>
                  <Text style={styles.alertMeta}>
                    {getSenderRoleLabel(alert.users?.role)}
                  </Text>
                  <Text style={styles.alertMessage} numberOfLines={2}>
                    {alert.message || "Emergency assistance requested"}
                  </Text>
                  <Text style={styles.alertMeta}>
                    {alert.attending_user?.name
                      ? `Assigned to ${alert.attending_user.name}`
                      : alert.attending_by
                        ? "Assigned support member"
                        : "Unassigned"}{" "}
                    · {alert.route?.route_name || "Route unavailable"} ·{" "}
                    {new Date(alert.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.alertActionButton,
                    assignedToCurrentUser && styles.alertActionButtonAssigned,
                    alertAction === "Claim" && styles.alertActionButtonClaim,
                  ]}
                  onPress={() => void openEmergencyAlert(alert)}
                  accessibilityRole="button"
                  accessibilityLabel={`${alertAction} SOS alert`}
                >
                  <Text
                    style={[
                      styles.alertActionText,
                      assignedToCurrentUser && styles.alertActionTextAssigned,
                      alertAction === "Claim" && styles.alertActionTextClaim,
                    ]}
                  >
                    {alertAction}
                  </Text>
                  <MaterialIcons
                    name={coordinates ? "location-on" : "chevron-right"}
                    size={16}
                    color={assignedToCurrentUser ? "#FFFFFF" : "#475569"}
                  />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <Text style={styles.noAlerts}>No emergency SOS alerts.</Text>
        )}
      </View>
      <Modal
        visible={Boolean(selectedEmergencyAlert)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedEmergencyAlert(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.alertModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeading}>
              <View style={styles.alertTitleWrap}>
                <MaterialIcons name="sos" size={21} color="#B91C1C" />
                <Text style={styles.alertModalTitle}>Emergency SOS</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedEmergencyAlert(null)}
                accessibilityLabel="Close SOS details"
              >
                <MaterialIcons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            {selectedEmergencyAlert ? (
              <ScrollView contentContainerStyle={styles.alertModalContent}>
                <Text style={styles.alertDriver}>
                  {selectedEmergencyAlert.users?.name || "Unknown sender"}
                </Text>
                <Text style={styles.alertModalMeta}>
                  Sender: {getSenderRoleLabel(selectedEmergencyAlert.users?.role)}
                </Text>
                <Text style={styles.alertModalMeta}>
                  {selectedEmergencyAlert.users?.phone ||
                    selectedEmergencyAlert.users?.email ||
                    "Driver contact unavailable"}
                </Text>
                <View style={styles.statusPanel}>
                  <Text style={styles.statusHeading}>SOS status</Text>
                  <Text style={styles.alertModalMeta}>
                    {selectedEmergencyAlert.status === "resolved"
                      ? "Resolved"
                      : selectedEmergencyAlert.status === "in_progress" ||
                          selectedEmergencyAlert.attending_at
                        ? "Support is attending"
                        : "Waiting for support"}
                  </Text>
                  <Text style={styles.alertModalMeta}>
                    {selectedEmergencyAlert.attending_user?.name
                      ? `Assigned to ${selectedEmergencyAlert.attending_user.name}`
                      : selectedEmergencyAlert.attending_by
                        ? "A support team member is attending"
                        : "No support member has opened this alert"}
                  </Text>
                  {isSuperAdmin ? (
                  <View style={styles.statusActions}>
                    {(
                      [
                        ["open", "Waiting"],
                        ["in_progress", "Attending"],
                        ["resolved", "Resolved"],
                      ] as const
                    ).map(([status, label]) => {
                      const isSelected =
                        (selectedEmergencyAlert.status || "open") === status;
                      const color =
                        status === "resolved"
                          ? "#15803D"
                          : status === "in_progress"
                            ? "#2563EB"
                            : "#B45309";
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            {
                              backgroundColor: isSelected
                                ? color
                                : status === "open" &&
                                    selectedEmergencyAlert.status !== "open"
                                  ? "#F1F5F9"
                                  : "#FFFFFF",
                              borderColor:
                                status === "open" &&
                                selectedEmergencyAlert.status !== "open"
                                  ? "#CBD5E1"
                                  : color,
                            },
                          ]}
                          onPress={() => void updateEmergencyStatus(status)}
                          disabled={
                            updatingEmergencyStatus ||
                            isSelected ||
                            (status === "open" &&
                              selectedEmergencyAlert.status !== "open")
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            disabled:
                              updatingEmergencyStatus ||
                              isSelected ||
                              (status === "open" &&
                                selectedEmergencyAlert.status !== "open"),
                            selected: isSelected,
                          }}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              { color: isSelected ? "#FFFFFF" : color },
                            ]}
                          >
                            {status === "open" &&
                            selectedEmergencyAlert.status !== "open"
                              ? "Waiting disabled"
                              : updatingEmergencyStatus && isSelected
                            ? "Saving..."
                            : label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  ) : null}
                  {isSuperAdmin ? (
                    <View style={styles.assigneeActions}>
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          {
                            backgroundColor: selectedEmergencyAlert.attending_by
                              ? "#FFFFFF"
                              : "#475569",
                            borderColor: "#475569",
                          },
                        ]}
                        onPress={() =>
                          void updateEmergencyStatus(undefined, null)
                        }
                        disabled={
                          updatingEmergencyStatus ||
                          !selectedEmergencyAlert.attending_by ||
                          selectedEmergencyAlert.status !== "open"
                        }
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            {
                              color:
                                selectedEmergencyAlert.attending_by &&
                                selectedEmergencyAlert.status === "open"
                                ? "#475569"
                                : "#FFFFFF",
                            },
                          ]}
                        >
                          Unassign
                        </Text>
                      </TouchableOpacity>
                      {emergencyAssignees.map((assignee) => {
                        const isAssigned =
                          selectedEmergencyAlert.attending_by === assignee.id;
                        const canReassign =
                          selectedEmergencyAlert.status === "open" ||
                          selectedEmergencyAlert.status === "in_progress";
                        return (
                          <TouchableOpacity
                            key={assignee.id}
                            style={[
                              styles.statusButton,
                              {
                                backgroundColor: isAssigned
                                  ? "#1D4ED8"
                                  : "#FFFFFF",
                                borderColor: "#1D4ED8",
                              },
                            ]}
                            onPress={() =>
                              void updateEmergencyStatus(
                                undefined,
                                assignee.id,
                              )
                            }
                            disabled={
                              updatingEmergencyStatus ||
                              isAssigned ||
                              !canReassign
                            }
                          >
                            <Text
                              style={[
                                styles.statusButtonText,
                                {
                                  color: isAssigned ? "#FFFFFF" : "#1D4ED8",
                                },
                              ]}
                            >
                              {assignee.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                  {emergencyStatusError ? (
                    <Text style={styles.errorText}>
                      {emergencyStatusError}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.alertModalMeta}>
                  {selectedEmergencyAlert.children
                    ? `Child: ${[
                        selectedEmergencyAlert.children.name,
                        selectedEmergencyAlert.children.lastname,
                      ]
                        .filter(Boolean)
                        .join(" ")}`
                    : "Child unavailable"}
                </Text>
                <Text style={styles.alertModalMessage}>
                  {selectedEmergencyAlert.message ||
                    "Emergency assistance requested"}
                </Text>
                <Text style={styles.alertModalMeta}>
                  {selectedEmergencyAlert.route?.route_name ||
                    "Route unavailable"}{" "}
                  ·{" "}
                  {new Date(selectedEmergencyAlert.created_at).toLocaleString(
                    [],
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </Text>
                {getCoordinates(selectedEmergencyAlert) ? (
                  <>
                    {selectedEmergencyAlert.location ? (
                      <Text style={styles.alertModalMeta}>
                        {selectedEmergencyAlert.location}
                      </Text>
                    ) : null}
                    <Text style={styles.coordinateText}>
                      Coordinates:{" "}
                      {getCoordinates(selectedEmergencyAlert)?.latitude},{" "}
                      {getCoordinates(selectedEmergencyAlert)?.longitude}
                    </Text>
                    <View style={styles.alertMap}>
                      <MapView
                        style={StyleSheet.absoluteFill}
                        initialRegion={{
                          ...getCoordinates(selectedEmergencyAlert)!,
                          latitudeDelta: 0.015,
                          longitudeDelta: 0.015,
                        }}
                      >
                        <Marker
                          coordinate={getCoordinates(selectedEmergencyAlert)!}
                          title={selectedEmergencyAlert.users?.name || "Driver"}
                          description={selectedEmergencyAlert.message || "SOS location"}
                        />
                      </MapView>
                    </View>
                  </>
                ) : (
                  <Text style={styles.noLocationText}>
                    No valid GPS coordinates were attached to this alert.
                    {selectedEmergencyAlert.location
                      ? ` Location: ${selectedEmergencyAlert.location}`
                      : ""}
                  </Text>
                )}
                <View style={styles.mobileConversation}>
                  <View style={styles.mobileConversationHeading}>
                    <Text style={styles.statusHeading}>SOS conversation</Text>
                    <Text style={styles.messageCount}>
                      {emergencyMessages.length}
                    </Text>
                  </View>
                  {emergencyMessages.length ? (
                    <View style={styles.mobileMessageList}>
                      {emergencyMessages.map((message) => {
                        const ownMessage =
                          message.author_user_id === currentUserId;
                        return (
                          <View
                            key={message.id}
                            style={[
                              styles.mobileMessageRow,
                              ownMessage && styles.mobileMessageRowOwn,
                            ]}
                          >
                            <View
                              style={[
                                styles.mobileMessageBubble,
                                ownMessage
                                  ? styles.mobileMessageOwn
                                  : styles.mobileMessageSender,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.mobileMessageAuthor,
                                  ownMessage &&
                                    styles.mobileMessageAuthorOwn,
                                ]}
                              >
                                {ownMessage
                                  ? "Support"
                                  : message.users?.name || "Sender"}
                              </Text>
                              <Text
                                style={[
                                  styles.mobileMessageBody,
                                  ownMessage && styles.mobileMessageBodyOwn,
                                ]}
                              >
                                {message.body}
                              </Text>
                              <Text
                                style={[
                                  styles.mobileMessageTime,
                                  ownMessage && styles.mobileMessageTimeOwn,
                                ]}
                              >
                                {new Date(message.created_at).toLocaleString(
                                  [],
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  },
                                )}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.mobileConversationEmpty}>
                      No messages yet. The conversation will appear here.
                    </Text>
                  )}
                  {selectedEmergencyAlert.attending_by === currentUserId &&
                  selectedEmergencyAlert.status !== "resolved" ? (
                    <View style={styles.mobileReplyRow}>
                      <TextInput
                        style={styles.mobileReplyInput}
                        value={emergencyReplyDraft}
                        onChangeText={setEmergencyReplyDraft}
                        placeholder="Message the SOS sender..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        maxLength={3000}
                        editable={!sendingEmergencyReply}
                      />
                      <TouchableOpacity
                        style={[
                          styles.mobileSendButton,
                          (!emergencyReplyDraft.trim() ||
                            sendingEmergencyReply) &&
                            styles.mobileSendButtonDisabled,
                        ]}
                        onPress={() => void sendEmergencyReply()}
                        disabled={
                          !emergencyReplyDraft.trim() || sendingEmergencyReply
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Send SOS response"
                      >
                        {sendingEmergencyReply ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <MaterialIcons
                            name="send"
                            size={18}
                            color="#FFFFFF"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : selectedEmergencyAlert.status !== "resolved" ? (
                    <Text style={styles.readOnlyNote}>
                      {selectedEmergencyAlert.attending_by
                        ? "Read-only: only the assigned support member can respond."
                        : "Claim this alert by opening it before responding."}
                    </Text>
                  ) : (
                    <Text style={styles.readOnlyNote}>
                      This alert is resolved. The conversation is read-only.
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  alertSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 9,
  },
  alertSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  alertTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertSectionTitle: { color: "#7F1D1D", fontSize: 14, fontWeight: "800" },
  alertCount: {
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  alertCardBody: { flex: 1, minWidth: 0 },
  alertActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
  },
  alertActionButtonAssigned: { backgroundColor: "#2563EB" },
  alertActionButtonClaim: { backgroundColor: "#FEF3C7" },
  alertActionText: { color: "#475569", fontSize: 10, fontWeight: "800" },
  alertActionTextAssigned: { color: "#FFFFFF" },
  alertActionTextClaim: { color: "#92400E" },
  alertDriver: { color: "#1E293B", fontSize: 12, fontWeight: "800" },
  alertMessage: { color: "#334155", fontSize: 11, marginTop: 2 },
  alertMeta: { color: "#64748B", fontSize: 9, marginTop: 4 },
  alertLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 15,
  },
  noAlerts: { color: "#64748B", fontSize: 11, paddingVertical: 10 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  alertModal: {
    maxHeight: "88%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 12,
  },
  alertModalTitle: { color: "#7F1D1D", fontSize: 15, fontWeight: "900" },
  alertModalContent: { gap: 8, paddingTop: 14, paddingBottom: 24 },
  statusPanel: {
    gap: 7,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mobileConversation: {
    gap: 9,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    marginTop: 5,
  },
  mobileConversationHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messageCount: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mobileMessageList: { gap: 8 },
  mobileMessageRow: { flexDirection: "row", justifyContent: "flex-start" },
  mobileMessageRowOwn: { justifyContent: "flex-end" },
  mobileMessageBubble: {
    maxWidth: "90%",
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1,
  },
  mobileMessageSender: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
  mobileMessageOwn: { backgroundColor: "#B91C1C", borderColor: "#B91C1C" },
  mobileMessageAuthor: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
  },
  mobileMessageAuthorOwn: { color: "#FEE2E2" },
  mobileMessageBody: { color: "#1E293B", fontSize: 12, lineHeight: 18 },
  mobileMessageBodyOwn: { color: "#FFFFFF" },
  mobileMessageTime: {
    color: "#94A3B8",
    fontSize: 9,
    textAlign: "right",
    marginTop: 5,
  },
  mobileMessageTimeOwn: { color: "#FECACA" },
  mobileConversationEmpty: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 10,
  },
  mobileReplyRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  mobileReplyInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: "#0F172A",
    fontSize: 12,
  },
  mobileSendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#B91C1C",
  },
  mobileSendButtonDisabled: { backgroundColor: "#FDA4AF" },
  readOnlyNote: { color: "#64748B", fontSize: 10, lineHeight: 15 },
  statusHeading: { color: "#1E293B", fontSize: 12, fontWeight: "800" },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  assigneeActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  statusButtonText: { fontSize: 10, fontWeight: "800" },
  alertModalMeta: { color: "#64748B", fontSize: 11 },
  alertModalMessage: { color: "#1E293B", fontSize: 14, lineHeight: 21 },
  coordinateText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  alertMap: {
    height: 250,
    overflow: "hidden",
    borderRadius: 12,
    marginTop: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  kicker: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 24, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#64748B", fontSize: 11, marginTop: 4 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  mapWrap: {
    height: 270,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapLabel: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF",
  },
  mapLabelText: { color: "#334155", fontSize: 10, fontWeight: "700" },
  tripCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 13,
    gap: 10,
  },
  tripHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  busIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  routeName: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  tripSub: { color: "#64748B", fontSize: 10, marginTop: 3 },
  liveBadge: { borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5 },
  liveNow: { backgroundColor: "#DCFCE7" },
  liveStale: { backgroundColor: "#FEF3C7" },
  liveBadgeText: { color: "#166534", fontSize: 8, fontWeight: "900" },
  tripDetails: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailText: { color: "#64748B", fontSize: 10 },
  detailStrong: { color: "#334155", fontWeight: "700" },
  locationTime: { color: "#94A3B8", fontSize: 9 },
  center: { padding: 28, alignItems: "center", gap: 9 },
  empty: { alignItems: "center", padding: 24, borderRadius: 14, gap: 8 },
  emptyTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  noLocations: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    backgroundColor: "#FFFBEB",
    borderRadius: 9,
  },
  noLocationText: { color: "#92400E", fontSize: 10, flex: 1 },
  error: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 9,
  },
  errorText: { color: "#B91C1C", fontSize: 10, flex: 1 },
  retry: { color: "#B91C1C", fontSize: 10, fontWeight: "800" },
});
