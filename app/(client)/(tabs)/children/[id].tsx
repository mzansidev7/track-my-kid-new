import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import ClientHeader from "../../components/ClientHeader";
import { useChildren } from "../../clientHelpers/hooks/useChildren";
import type { Child } from "../../clientHelpers/hooks/useChildren";
import { GOOGLE_API_KEY } from "../../../../url";

const ChildDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const {
    children: existingChildren,
    childrenLoading,
    childrenError,
  } = useChildren();
  const [isRouteMapVisible, setIsRouteMapVisible] = useState(false);
  const [routeMapMarkers, setRouteMapMarkers] = useState<any[]>([]);
  const [routeMapRegion, setRouteMapRegion] = useState<any>(null);

  // Ensure id is a string for comparison
  const childId = Array.isArray(id) ? id[0] : id;
  const child = existingChildren?.find(
    (c: Child) => String(c.id) === String(childId),
  );

  const openRouteMap = () => {
    if (!child) return;

    const pickupLat = child.pickup_latitude;
    const pickupLng = child.pickup_longitude;
    const dropoffLat = child.dropoff_latitude;
    const dropoffLng = child.dropoff_longitude;

    const hasPickup =
      typeof pickupLat === "number" &&
      Number.isFinite(pickupLat) &&
      typeof pickupLng === "number" &&
      Number.isFinite(pickupLng);
    const hasDropoff =
      typeof dropoffLat === "number" &&
      Number.isFinite(dropoffLat) &&
      typeof dropoffLng === "number" &&
      Number.isFinite(dropoffLng);

    if (!hasPickup && !hasDropoff) {
      return;
    }

    const markers: any[] = [];

    if (hasPickup) {
      markers.push({
        id: "pickup",
        title: "Pickup Location",
        coordinate: { latitude: pickupLat, longitude: pickupLng },
        description: child.pickup_address || "Pickup point",
      });
    }

    if (hasDropoff) {
      markers.push({
        id: "dropoff",
        title: "Drop-off Location",
        coordinate: { latitude: dropoffLat, longitude: dropoffLng },
        description: child.school_address || child.school_name || "School",
      });
    }

    const latitudes = markers.map((marker) => marker.coordinate.latitude);
    const longitudes = markers.map((marker) => marker.coordinate.longitude);

    setRouteMapMarkers(markers);
    setRouteMapRegion({
      latitude:
        latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length,
      longitude:
        longitudes.reduce((sum, value) => sum + value, 0) / longitudes.length,
      latitudeDelta: Math.max(...latitudes) - Math.min(...latitudes) || 0.05,
      longitudeDelta: Math.max(...longitudes) - Math.min(...longitudes) || 0.05,
    });
    setIsRouteMapVisible(true);
  };

  const routeMapOrigin = routeMapMarkers.find(
    (marker) => marker.id === "pickup",
  )?.coordinate;
  const routeMapDestination = routeMapMarkers.find(
    (marker) => marker.id === "dropoff",
  )?.coordinate;

  console.log({ child, childId, existingChildren });

  if (childrenLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading child information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (childrenError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error loading data</Text>
          <Text style={styles.errorSubtext}>{childrenError}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Child not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader
        title={`${child.name}'s Profile`}
        subtitle={`Track and manage ${child.name}`}
        showBackButton={true}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            {child.avatar ? (
              <Image
                source={{ uri: child.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(child.name?.charAt(0) || "").toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.childName}>
            {child.name} {child.lastname}
          </Text>
          <Text style={styles.childSchool}>{child.school_name}</Text>
          <Text style={styles.childGrade}>Grade {child.grade}</Text>
        </View>

        {/* Information Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>School Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="school" size={20} color="#2563EB" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>School Name</Text>
                <Text style={styles.infoValue}>
                  {child.school_name || "N/A"}
                </Text>
              </View>
            </View>
            {child.school_address && (
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#2563EB" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>School Address</Text>
                  <Text style={styles.infoValue}>{child.school_address}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Pickup & Dropoff */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>
          <View style={styles.infoCard}>
            {child.pickup_latitude && child.pickup_longitude && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#10B981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Pickup Location</Text>
                  <Text style={styles.infoValue}>
                    {child.pickup_latitude.toFixed(4)},{" "}
                    {child.pickup_longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
            {child.dropoff_latitude && child.dropoff_longitude && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#3B82F6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dropoff Location</Text>
                  <Text style={styles.infoValue}>
                    {child.dropoff_latitude.toFixed(4)},{" "}
                    {child.dropoff_longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Information */}
        {child.vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="directions-car"
                  size={20}
                  color="#8B5CF6"
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vehicle Name</Text>
                  <Text style={styles.infoValue}>
                    {child.vehicle.name || "N/A"}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="badge" size={20} color="#8B5CF6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>License Plate</Text>
                  <Text style={styles.infoValue}>
                    {child.vehicle.license_plate || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={openRouteMap}>
            <Ionicons name="location-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>View Route on Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <MaterialIcons name="edit" size={20} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>Edit Information</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isRouteMapVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.routeMapCard}>
            <Text style={styles.routeMapTitle}>Pickup & Drop-off Route</Text>
            {routeMapRegion ? (
              <MapView style={styles.routeMap} initialRegion={routeMapRegion}>
                {routeMapMarkers.map((marker) => (
                  <Marker
                    key={marker.id}
                    coordinate={marker.coordinate}
                    title={marker.title}
                    description={marker.description}
                  />
                ))}
                {routeMapOrigin && routeMapDestination && GOOGLE_API_KEY ? (
                  <MapViewDirections
                    origin={routeMapOrigin}
                    destination={routeMapDestination}
                    apikey={GOOGLE_API_KEY}
                    strokeWidth={5}
                    strokeColor="#2563EB"
                    optimizeWaypoints={true}
                  />
                ) : routeMapMarkers.length > 1 ? (
                  <MapViewDirections
                    origin={routeMapMarkers[0].coordinate}
                    destination={
                      routeMapMarkers[routeMapMarkers.length - 1].coordinate
                    }
                    apikey={GOOGLE_API_KEY || ""}
                    strokeWidth={5}
                    strokeColor="#2563EB"
                  />
                ) : null}
              </MapView>
            ) : (
              <View style={styles.routeMapFallback}>
                <Text style={styles.routeMapFallbackText}>
                  Map data unavailable.
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.routeMapClose}
              onPress={() => setIsRouteMapVisible(false)}
            >
              <Text style={styles.routeMapCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChildDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },

  container: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    paddingHorizontal: 14,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 8,
  },

  errorSubtext: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    marginBottom: 16,
    textAlign: "center",
  },

  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
    fontWeight: "500",
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  headerBackButton: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F5F7",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarContainer: {
    marginBottom: 12,
  },

  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D9EAFD",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  childName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  childSchool: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
    marginBottom: 4,
  },

  childGrade: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  /* Sections */
  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F5F7",
  },

  infoContent: {
    marginLeft: 12,
    flex: 1,
  },

  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },

  /* Action Section */
  actionSection: {
    marginTop: 20,
    gap: 12,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    gap: 8,
  },

  secondaryButtonText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 16,
  },

  routeMapCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  routeMapTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  routeMap: {
    width: "100%",
    height: 320,
  },

  routeMapFallback: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F5F7",
  },

  routeMapFallbackText: {
    color: "#475569",
    fontWeight: "600",
  },

  routeMapClose: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  routeMapCloseText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 14,
  },
});
