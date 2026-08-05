import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useOwnerPageHeader } from "../../ownerHelpers/hooks/useOwnerPageHeader";

const StudentsView = () => {
  const router = useRouter();
  const { studentData, routeId } = useLocalSearchParams();
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    title: "Child Details",
    onBackPress: handleBackToRoute,
  });

  React.useEffect(() => {
    try {
      setError(null);

      if (typeof studentData === "string" && studentData.trim()) {
        const parsed = JSON.parse(studentData);
        setStudent(parsed);
        return;
      }

      if (typeof studentData === "object") {
        setStudent(studentData);
        return;
      }

      setError("Child details are not available right now.");
    } catch {
      setError("Child details are not available right now.");
    }
  }, [studentData]);

  const routeRegion = useMemo(() => {
    if (!student) {
      return {
        latitude: -25.7479,
        longitude: 28.2293,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const pickupLat = Number(student.pickup_latitude);
    const pickupLng = Number(student.pickup_longitude);
    const dropoffLat = Number(student.dropoff_latitude);
    const dropoffLng = Number(student.dropoff_longitude);

    const validPoints = [
      pickupLat && pickupLng
        ? { latitude: pickupLat, longitude: pickupLng }
        : null,
      dropoffLat && dropoffLng
        ? { latitude: dropoffLat, longitude: dropoffLng }
        : null,
    ].filter(Boolean) as Array<{ latitude: number; longitude: number }>;

    if (validPoints.length === 0) {
      return {
        latitude: -25.7479,
        longitude: 28.2293,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const lat =
      validPoints.reduce((sum, point) => sum + point.latitude, 0) /
      validPoints.length;
    const lng =
      validPoints.reduce((sum, point) => sum + point.longitude, 0) /
      validPoints.length;

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [student]);

  const summaryItems = useMemo(() => {
    if (!student) return [];

    return [
      { label: "Name", value: student.name || "Unknown" },
      { label: "School", value: student.school_name || "Not provided" },
      { label: "Grade", value: student.grade || "Not provided" },
      { label: "Phone", value: student.phone || "Not provided" },
    ];
  }, [student]);

  const routeMarkers = useMemo(() => {
    if (!student) return [];

    const markers: Array<{
      id: string;
      latitude: number;
      longitude: number;
      label: string;
      icon: "home" | "school";
    }> = [];

    const pickupLat = Number(student.pickup_latitude);
    const pickupLng = Number(student.pickup_longitude);
    const dropoffLat = Number(student.dropoff_latitude);
    const dropoffLng = Number(student.dropoff_longitude);

    if (pickupLat && pickupLng) {
      markers.push({
        id: "pickup",
        latitude: pickupLat,
        longitude: pickupLng,
        label: "Pickup",
        icon: "home",
      });
    }

    if (dropoffLat && dropoffLng) {
      markers.push({
        id: "dropoff",
        latitude: dropoffLat,
        longitude: dropoffLng,
        label: "Dropoff",
        icon: "school",
      });
    }

    return markers;
  }, [student]);

  return (
    <View style={styles.container}>
      {renderHeader()}

      {error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : student ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              {student.avatar ? (
                <Image
                  source={{ uri: student.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <MaterialIcons name="school" size={24} color="#F5A623" />
              )}
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroTitle}>{student.name || "Child"}</Text>
              <Text style={styles.heroSubtitle}>
                {student.school_name || "School not provided"}
              </Text>
            </View>
          </View>

          <View style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapTitle}>Route overview</Text>
              <Text style={styles.mapSubtitle}>Pickup and dropoff</Text>
            </View>
            <MapView style={styles.map} initialRegion={routeRegion}>
              {routeMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                  }}
                  title={marker.label}
                >
                  <View style={styles.markerBubble}>
                    <MaterialIcons
                      name={marker.icon}
                      size={20}
                      color={marker.icon === "home" ? "#2563EB" : "#F59E0B"}
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>

          <View style={styles.sectionCard}>
            {summaryItems.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBackToRoute}
          >
            <Text style={styles.actionButtonText}>Back to route</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
};

export default StudentsView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
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
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapHeaderRow: {
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  mapSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  map: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
  },
  actionButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
