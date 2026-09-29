import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useTheme } from "../../../styles/theme";

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

export default function LiveScreen() {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return () => clearTimeout(timer);
    }, [loadTrips]),
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
            onRefresh={() => void loadTrips(true)}
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
            onPress={() => void loadTrips(true)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
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
