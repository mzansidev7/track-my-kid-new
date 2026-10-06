import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { GOOGLE_API_KEY } from "../url";

type Props = {
  markers?: {
    latitude: number;
    longitude: number;
    title?: string;
    type?: "pickup" | "dropoff" | "driver" | "start" | "end" | "waypoint";
    endpoint?: "start" | "end";
  }[];
  origin?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number } | null;
  waypoints?: { latitude: number; longitude: number }[];
  returnWaypoints?: { latitude: number; longitude: number }[];
  showReturnDirection?: boolean;
  style?: any;
  centerOnUser?: boolean;
  focus?: { latitude: number; longitude: number } | null;
  showMarkerLabels?: boolean;
  requestLocationPermission?: boolean;
  onRouteReady?: (route: { distanceKm: number; durationMinutes: number }) => void;
  onRouteError?: (message: string) => void;
};

const Map: React.FC<Props> = ({
  markers = [],
  origin = null,
  destination = null,
  waypoints = [],
  returnWaypoints = [],
  showReturnDirection = false,
  style,
  centerOnUser = false,
  focus = null,
  showMarkerLabels = false,
  requestLocationPermission = true,
  onRouteReady,
  onRouteError,
}) => {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [userRegion, setUserRegion] = useState<any | null>(null);
  const mapRef = React.useRef<any>(null);
  const hasMarkers = markers.length > 0;
  const initialRegion = {
    latitude: markers?.[0]?.latitude ?? origin?.latitude ?? -1.2921,
    longitude: markers?.[0]?.longitude ?? origin?.longitude ?? 36.8219,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!requestLocationPermission) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          if (!mounted) return;
          setUserRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          });
        }
      } catch (err) {
        // ignore
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [requestLocationPermission]);
  const mapInitialRegion = hasMarkers
    ? initialRegion
    : centerOnUser && userRegion
      ? userRegion
      : initialRegion;

  useEffect(() => {
    if (
      focus &&
      mapRef.current &&
      typeof mapRef.current.animateToRegion === "function"
    ) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: focus.latitude,
            longitude: focus.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          400,
        );
      } catch (e) {
        // ignore
      }
    }
  }, [focus]);

  useEffect(() => {
    if (!hasMarkers || !mapRef.current) return;

    try {
      if (markers.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: markers[0].latitude,
            longitude: markers[0].longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          },
          400,
        );
        return;
      }

      if (typeof mapRef.current.fitToCoordinates === "function") {
        mapRef.current.fitToCoordinates(
          markers.map((m) => ({
            latitude: m.latitude,
            longitude: m.longitude,
          })),
          {
            edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
            animated: true,
          },
        );
      }
    } catch (e) {
      // ignore
    }
  }, [hasMarkers, markers]);

  // Fit to origin/destination bounds when both are available
  useEffect(() => {
    if (
      origin &&
      destination &&
      mapRef.current &&
      typeof mapRef.current.fitToCoordinates === "function"
    ) {
      try {
        mapRef.current.fitToCoordinates([origin, ...waypoints, destination], {
          edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
          animated: true,
        });
      } catch (e) {
        // ignore
      }
    }
  }, [origin, destination, waypoints]);

  return (
    <View collapsable={false} style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType="standard"
        initialRegion={mapInitialRegion}
        ref={mapRef}
        loadingEnabled
        loadingBackgroundColor="#F4F8FC"
        loadingIndicatorColor="#1769D2"
        showsMyLocationButton={requestLocationPermission}
        showsUserLocation={requestLocationPermission}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        {markers.map((m, i) => {
          const isStart = m.endpoint === "start";
          const isEnd = m.endpoint === "end";
          const isPickup = m.type === "pickup";
          const iconColor = isStart
            ? "#16A34A"
            : isEnd
              ? "#DC2626"
              : m.type === "waypoint"
                ? "#1769D2"
              : isPickup
                ? "#22C55E"
                : "#EF4444";

          return (
            <Marker
              key={`m-${i}`}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.title}
              tracksViewChanges={showMarkerLabels}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.markerPin,
                  {
                    backgroundColor: iconColor + "55",
                    borderColor: iconColor + "33",
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    isStart
                      ? "play-arrow"
                      : isEnd
                        ? "flag"
                        : isPickup
                          ? "home"
                          : m.type === "waypoint"
                            ? "place"
                          : m.type === "driver"
                            ? "directions-car"
                            : "school"
                  }
                  size={20}
                  color={iconColor}
                />
              </View>
              {showMarkerLabels && m.title ? (
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {m.title}
                  </Text>
                </View>
              ) : null}
            </Marker>
          );
        })}

        {origin && destination && GOOGLE_API_KEY ? (
          <>
            <MapViewDirections
              origin={origin}
              destination={destination}
              waypoints={waypoints.length > 0 ? waypoints : undefined}
              apikey={GOOGLE_API_KEY}
              strokeWidth={4}
              strokeColor="#1E90FF"
              onReady={(result) => {
                if (result && typeof result.distance === "number") {
                  const distanceKm = Number(result.distance.toFixed(2));
                  setDistanceKm(distanceKm);
                  if (
                    typeof result.duration === "number" &&
                    Number.isFinite(result.duration)
                  ) {
                    onRouteReady?.({
                      distanceKm,
                      durationMinutes: result.duration,
                    });
                  }
                }
              }}
              onError={(message) => onRouteError?.(message)}
            />
            {showReturnDirection ? (
              <MapViewDirections
                origin={destination}
                destination={origin}
                waypoints={returnWaypoints}
                apikey={GOOGLE_API_KEY}
                strokeWidth={4}
                strokeColor="#F59E0B"
              />
            ) : null}
          </>
        ) : null}
      </MapView>

      {distanceKm !== null ? (
        <View style={styles.distanceBadge} pointerEvents="none">
          <Text style={styles.distanceText}>{distanceKm} km</Text>
        </View>
      ) : null}

      {!GOOGLE_API_KEY ? (
        <View style={styles.keyWarning}>
          <Text style={styles.keyWarningText}>Google API key not set</Text>
        </View>
      ) : null}
    </View>
  );
};

export default Map;

const styles = StyleSheet.create({
  container: {
    height: 220,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E8EEF5",
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    // borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 8,
  },
  markerGlyph: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  markerLabel: {
    maxWidth: 150,
    marginTop: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  markerLabelText: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  keyWarning: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keyWarningText: {
    color: "#fff",
    fontSize: 12,
  },
  distanceBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 20,
  },
  distanceText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
