import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { AuthContext } from "../../authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";
import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

const ViewAllStops = () => {
  const { routeId, routeStops } = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const [stops, setStops] = useState<any[]>([]);
  const [routeChildren, setRouteChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const resolvedRouteId = Array.isArray(routeId) ? routeId[0] : routeId;

  const handleBackToRoute = () => {
    if (resolvedRouteId) {
      router.push({
        pathname: "/(owner)/route-details",
        params: { routeId: String(resolvedRouteId) },
      });
      return;
    }

    router.push("/(owner)/(tabs)/routes");
  };

  const { renderHeader } = useOwnerPageHeader({
    title: "All Stops",
    onBackPress: handleBackToRoute,
  });

  useEffect(() => {
    let isActive = true;

    const loadStops = async () => {
      try {
        setLoading(true);
        setError(null);

        let parsedRoute: any = null;

        if (typeof routeStops === "string" && routeStops.trim()) {
          try {
            parsedRoute = JSON.parse(routeStops);
          } catch {
            parsedRoute = null;
          }
        }

        if (parsedRoute?.route_stops?.length) {
          if (!isActive) return;
          setStops(parsedRoute.route_stops || []);
          setRouteChildren(parsedRoute.route_children || []);
          setLoading(false);
          return;
        }

        if (!routeId || !user?.token) {
          if (!isActive) return;
          setStops([]);
          setError("Route details are not available right now.");
          setLoading(false);
          return;
        }

        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(`${baseUrl}/owner/routes/${routeId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();

        if (!isActive) return;

        if (response.ok && data?.route?.route_stops?.length) {
          setStops(data.route.route_stops || []);
          setRouteChildren(data.route.route_children || []);
        } else {
          setStops([]);
          setRouteChildren([]);
          setError(data?.error || "Unable to load route stops.");
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Failed to load route stops:", err);
        setStops([]);
        setError("Unable to load route stops right now.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadStops();

    return () => {
      isActive = false;
    };
  }, [routeId, routeStops, user?.token]);

  const childLookup = useMemo(() => {
    const lookup = new Map<string, any>();

    (routeChildren || []).forEach((routeChild: any) => {
      const child = routeChild?.children;
      if (child?.id) {
        lookup.set(String(child.id), child);
      }
      if (routeChild?.child_id) {
        lookup.set(String(routeChild.child_id), child);
      }
    });

    return lookup;
  }, [routeChildren]);

  const groupedStops = useMemo(() => {
    const routeColors = [
      "#2563EB",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EF4444",
      "#14B8A6",
      "#EC4899",
      "#0EA5E9",
    ];

    const vehiclePalette = [
      "#2563EB",
      "#E11D48",
      "#0F766E",
      "#7C3AED",
      "#D97706",
      "#0891B2",
      "#DC2626",
      "#4F46E5",
    ];

    const grouped = new Map<string, any[]>();

    (stops || []).forEach((stop: any) => {
      const childKey = String(
        stop?.child_id || stop?.children?.id || stop?.id || "unknown",
      );
      const existing = grouped.get(childKey);
      if (existing) {
        existing.push(stop);
      } else {
        grouped.set(childKey, [stop]);
      }
    });

    return Array.from(grouped.entries()).map(
      ([childKey, childStops], index) => {
        const child = childLookup.get(childKey) || childStops[0]?.children;
        const normalized = childStops
          .slice()
          .sort(
            (a, b) =>
              (Number(a?.stop_order) || 0) - (Number(b?.stop_order) || 0),
          )
          .map((stop: any) => {
            const fallbackLatitude =
              stop?.stop_type === "pickup"
                ? child?.pickup_latitude
                : child?.dropoff_latitude;
            const fallbackLongitude =
              stop?.stop_type === "pickup"
                ? child?.pickup_longitude
                : child?.dropoff_longitude;

            const latitude = Number(
              stop?.latitude ?? fallbackLatitude ?? stop?.pickup_latitude,
            );
            const longitude = Number(
              stop?.longitude ?? fallbackLongitude ?? stop?.dropoff_longitude,
            );

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              return null;
            }

            const title =
              stop?.stop_name ||
              stop?.address ||
              stop?.children?.name ||
              child?.name ||
              `Stop ${stop?.stop_order || 1}`;

            return {
              id: stop?.id || `${title}-${stop?.stop_order || 0}`,
              title,
              latitude,
              longitude,
              stopOrder: stop?.stop_order ?? 1,
              description: stop?.address || child?.name || "Stop",
              stopType: stop?.stop_type || "pickup",
              childName: child?.name || stop?.children?.name || "Child",
            };
          })
          .filter(Boolean);

        return {
          childKey,
          childName:
            child?.name ||
            childStops[0]?.children?.name ||
            `Child ${index + 1}`,
          color:
            vehiclePalette[index % vehiclePalette.length] ||
            routeColors[index % routeColors.length],
          label:
            child?.name ||
            childStops[0]?.children?.name ||
            `Child ${index + 1}`,
          stops: normalized,
        };
      },
    );
  }, [stops, childLookup]);

  const allStops = useMemo(() => {
    return groupedStops.flatMap((group) => group.stops);
  }, [groupedStops]);

  const initialRegion = useMemo(() => {
    if (!allStops.length) {
      return {
        latitude: -25.7479,
        longitude: 28.2293,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const firstStop = allStops[0];

    return {
      latitude: firstStop?.latitude ?? -25.7479,
      longitude: firstStop?.longitude ?? 28.2293,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [allStops]);

  return (
    <View style={styles.container}>
      {renderHeader()}
      <MapView style={styles.map} initialRegion={initialRegion}>
        {groupedStops.map((group) => (
          <React.Fragment key={group.childKey}>
            {group.stops.length > 1 && (
              <Polyline
                coordinates={group.stops.map((stop: any) => ({
                  latitude: stop?.latitude ?? 0,
                  longitude: stop?.longitude ?? 0,
                }))}
                strokeWidth={4}
                strokeColor={group.color}
              />
            )}

            {group.stops.map((stop: any) => (
              <Marker
                key={stop.id}
                coordinate={{
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }}
                title={stop.title}
                description={`${group.childName} • ${stop.stopType}`}
              >
                <View
                  style={[
                    styles.markerBubble,
                    { backgroundColor: group.color },
                  ]}
                >
                  <MaterialIcons
                    name={stop.stopType === "pickup" ? "home" : "school"}
                    size={16}
                    color="#FFF"
                  />
                </View>
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText}>{group.label}</Text>
                </View>
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.bottomSheet}>
        <Text style={styles.heading}>Route Stops ({allStops.length})</Text>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>Loading stops...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={allStops}
            keyExtractor={(item) =>
              item?.id || `${item?.title || "stop"}-${item?.stopOrder || 0}`
            }
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              if (!item) return null;

              return (
                <View style={styles.stopCard}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons
                      name={item.stopType === "pickup" ? "home" : "school"}
                      size={22}
                      color="#2563EB"
                    />
                  </View>

                  <View style={styles.stopInfo}>
                    <Text style={styles.stopName}>{item.title}</Text>
                    <Text style={styles.stopAddress}>
                      {item.childName} •{" "}
                      {item.stopType === "pickup" ? "Pickup" : "Dropoff"}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

export default ViewAllStops;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  map: {
    height: "55%",
    width: "100%",
  },

  bottomSheet: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 18,
  },

  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  markerBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  markerLabel: {
    marginTop: 4,
    backgroundColor: "#111827",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "center",
  },

  markerLabelText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },

  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  stopInfo: {
    flex: 1,
  },

  stopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },

  stopAddress: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },
});
