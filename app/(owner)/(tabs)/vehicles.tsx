import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerPageHeader } from "../../../ownerHelpers/hooks/useOwnerPageHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import AppNotification from "../../../components/Notification";
import { resolveWorkingBaseUrl } from "../../../url";

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  model: string;
  color?: string;
  driver_id?: string;
  driverId?: string;
  images?: string[];
  vehicle_images?: { url: string; fileName: string; uploadedAt: string }[];
  drivers?: {
    id: string;
    vehicle_plate_number: string;
    users?: { name: string };
  };
  status?: string;
  capacity?: number;
  route_id?: string;
  routes?: { name: string };
  route_assignments?: {
    id: string;
    route_id: string;
    is_active: boolean;
    routes?: { id: string; route_name: string };
  }[];
  insurance_expiry?: string;
  maintenance_due?: string;
}

export default function Vehicles({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicles on component mount and focus
  const fetchVehicles = useCallback(async () => {
    if (!user?.userData?.id) return;

    setLoadingVehicles(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }

      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setNotification({
        visible: true,
        message: "Failed to load vehicles",
        type: "error",
      });
    } finally {
      setLoadingVehicles(false);
    }
  }, [user?.userData?.id, user?.token]);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [fetchVehicles]),
  );

  // Calculate statistics
  const stats = {
    active: vehicles.filter((v) => v.status === "active").length,
    available: vehicles.filter((v) => !v.driver_id && !v.driverId).length,
    maintenance: vehicles.filter(
      (v) =>
        v.maintenance_due &&
        new Date(v.maintenance_due) <=
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ).length,
  };

  const openAddVehiclePage = () => router.push("/(owner)/addVehicle");

  const { renderHeader } = useOwnerPageHeader({
    title: "Vehicle Management",
    subtitle: `${vehicles.length} total vehicle${vehicles.length !== 1 ? "s" : ""}`,
    actionLabel: "Add New Vehicle",
    onActionPress: openAddVehiclePage,
    onBackPress: () => router.push("/(owner)/(tabs)"),
  });

  const renderStatCard = (
    label: string,
    value: number,
    icon: string,
    color: string,
  ) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return { name: "check-circle", color: "#22C55E" };
      case "available":
        return { name: "car", color: "#3B82F6" };
      case "inactive":
        return { name: "pause-circle", color: "#6B7280" };
      case "maintenance":
        return { name: "build", color: "#F59E0B" };
      case "offline":
        return { name: "wifi-off", color: "#EF4444" };
      default:
        return { name: "help-circle", color: "#9CA3AF" };
    }
  };

  const renderVehicleCard = ({ item }: { item: Vehicle }) => {
    const driverName = item.drivers?.users?.name || "Unassigned";
    const activeRoute = Array.isArray(item.route_assignments)
      ? item.route_assignments.find((assignment) => assignment.is_active)
      : null;
    const routeName =
      item.routes?.name ||
      activeRoute?.routes?.route_name ||
      item.route_assignments?.[0]?.routes?.route_name ||
      "No Route";
    const normalizedStatus = item.status || "inactive";
    const statusIcon = getStatusIcon(normalizedStatus);
    const statusColor = statusIcon.color;
    const statusLabel =
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

    return (
      <View style={styles.vehicleCard}>
        {/* Vehicle Header */}
        <View style={styles.vehicleCardHeader}>
          <View style={styles.vehicleIcon}>
            {item.vehicle_images?.[0]?.url || item.images?.[0] ? (
              <Image
                source={{
                  uri: item.vehicle_images?.[0]?.url || item.images?.[0],
                }}
                style={styles.vehicleImage}
              />
            ) : (
              <LinearGradient
                colors={["#A855F7", "#EC4899"]}
                style={styles.vehicleIconGradient}
              >
                <MaterialIcons name="directions-bus" size={32} color="#FFF" />
              </LinearGradient>
            )}
          </View>

          <View style={styles.vehicleNameSection}>
            <Text style={styles.vehicleName}>{item.name}</Text>
            <Text style={styles.vehicleModel}>{item.model}</Text>
            <Text style={styles.vehicleLicensePlate}>{item.license_plate}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              },
            ]}
          >
            <MaterialIcons
              name={statusIcon.name as any}
              size={14}
              color="#FFF"
            />
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Vehicle Details Grid */}
        <View style={styles.vehicleDetailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Capacity</Text>
            <Text style={styles.detailValue}>{item.capacity || "N/A"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Driver</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {driverName}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {routeName}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Maintenance</Text>
            <Text style={styles.detailValue}>
              <MaterialIcons
                name={getStatusIcon(item.status || "inactive").name as any}
                size={20}
                color={getStatusIcon(item.status || "inactive").color}
              />
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.vehicleActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(`/(owner)/manage-vehicle/${item.id}?edit=true`)
            }
          >
            <MaterialIcons name="edit" size={18} color="#4F46E5" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push({
                pathname: "/(owner)/manage-vehicle/[id]",
                params: { id: item.id },
              });
            }}
          >
            <MaterialIcons name="settings" size={18} color="#4F46E5" />
            <Text style={styles.actionButtonText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />

      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard("Active", stats.active, "check-circle", "#10B981")}
          {renderStatCard(
            "Available",
            stats.available,
            "directions-car",
            "#3B82F6",
          )}
          {renderStatCard(
            "Maintenance",
            stats.maintenance,
            "warning",
            "#F59E0B",
          )}
        </View>

        {/* Vehicles List */}
        {loadingVehicles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="directions-bus" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No vehicles added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first vehicle to get started
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesListContainer}>
            <FlatList
              data={vehicles}
              renderItem={renderVehicleCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  addVehicleButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  addVehicleGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 10,
  },
  addVehicleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  vehiclesListContainer: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  vehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  vehicleIconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleNameSection: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  vehicleModel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  vehicleLicensePlate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
  vehicleDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 12,
  },
  detailItem: {
    width: "48%",
  },
  detailLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "600",
  },
  vehicleActions: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
