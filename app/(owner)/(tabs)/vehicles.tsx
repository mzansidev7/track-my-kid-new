import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../../../styles/theme";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import AppNotification from "../../../components/Notification";
import { resolveWorkingBaseUrl } from "../../../url";
import { Vehicle } from "../ownerHelpers/interface/owner.interfece";

export default function Vehicles({ setActiveButton }: any) {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const { colors, getBrandColors } = useTheme();
  const ownerColors = getBrandColors("owner");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

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

  const getVehicleStatus = (vehicle: Vehicle) =>
    String(vehicle.status || "inactive").toLowerCase();

  const matchesFilter = (vehicle: Vehicle, filter: string) => {
    const status = getVehicleStatus(vehicle);
    if (filter === "All") return true;
    if (filter === "Active") return status === "active" || status === "available";
    if (filter === "Maintenance") return status === "maintenance";
    return status === "inactive" || status === "offline";
  };

  const filters = ["All", "Active", "Maintenance", "Inactive"];
  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [vehicle.name, vehicle.model, vehicle.license_plate].some((value) =>
        String(value || "").toLowerCase().includes(query),
      );
    return matchesSearch && matchesFilter(vehicle, statusFilter);
  });

  const openAddVehiclePage = () => router.push("/(owner)/addVehicle");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return { name: "check-circle", color: colors.success };
      case "available":
        return { name: "car", color: ownerColors.primary };
      case "inactive":
        return { name: "pause-circle", color: colors.text.secondary };
      case "maintenance":
        return { name: "build", color: colors.warning };
      case "offline":
        return { name: "wifi-off", color: colors.error };
      default:
        return { name: "help-circle", color: colors.text.tertiary };
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
    const normalizedStatus = getVehicleStatus(item);
    const statusIcon = getStatusIcon(normalizedStatus);
    const statusColor =
      normalizedStatus === "maintenance"
        ? "#FFF4DC"
        : normalizedStatus === "inactive" || normalizedStatus === "offline"
          ? "#EEF2F7"
          : "#E5F8ED";
    const statusTextColor =
      normalizedStatus === "maintenance"
        ? "#B7791F"
        : normalizedStatus === "inactive" || normalizedStatus === "offline"
          ? "#65758B"
          : "#20864B";
    const statusLabel =
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/(owner)/manage-vehicle/[id]",
            params: { id: item.id },
          })
        }
        style={[
          styles.vehicleCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Vehicle Header */}
        <View style={styles.vehicleCardHeader}>
          <View
            style={[styles.vehicleIcon, { backgroundColor: colors.surfaceHover }]}
          >
            {item.vehicle_images?.[0]?.url || item.images?.[0] ? (
              <Image
                source={{
                  uri: item.vehicle_images?.[0]?.url || item.images?.[0],
                }}
                style={styles.vehicleImage}
              />
            ) : (
              <LinearGradient
                colors={[ownerColors.gradientStart, ownerColors.gradientEnd]}
                style={styles.vehicleIconGradient}
              >
                <MaterialIcons name="directions-bus" size={32} color="#FFF" />
              </LinearGradient>
            )}
          </View>

          <View style={styles.vehicleNameSection}>
            <Text style={[styles.vehicleName, { color: colors.text.primary }]}>
              {item.name}
            </Text>
            <Text
              style={[
                styles.vehicleLicensePlate,
                { color: colors.text.secondary },
              ]}
            >
              {item.license_plate}
            </Text>
            <Text
              style={[styles.vehicleModel, { color: colors.text.secondary }]}
              numberOfLines={1}
            >
              Driver: {driverName}
            </Text>
            <Text
              style={[styles.vehicleModel, { color: colors.text.secondary }]}
              numberOfLines={1}
            >
              Route: {routeName}
            </Text>
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
              color={statusTextColor}
            />
            <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
              {statusLabel}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.text.tertiary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />

      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.pageHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/(owner)/(tabs)")}
            accessibilityLabel="Back to owner dashboard"
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageHeaderTitle}>Vehicles</Text>
            <Text style={styles.pageHeaderSubtitle}>
              Manage your fleet and monitor vehicle status
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openAddVehiclePage}
            accessibilityLabel="Add vehicle"
          >
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={19} color="#72839A" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by plate number or model..."
            placeholderTextColor="#91A1B5"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={18} color="#72839A" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {filters.map((filter) => {
            const count =
              filter === "All"
                ? vehicles.length
                : vehicles.filter((vehicle) => matchesFilter(vehicle, filter))
                    .length;
            const selected = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                ]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {filter} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={[styles.listHeadingText, { color: colors.text.primary }]}>
            {statusFilter === "All" ? "All Vehicles" : `${statusFilter} Vehicles`}
          </Text>
          <Text style={[styles.resultCount, { color: colors.text.secondary }]}>
            {filteredVehicles.length} shown
          </Text>
        </View>

        {/* Vehicles List */}
        {loadingVehicles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ownerColors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.text.secondary }]}
            >
              Loading vehicles...
            </Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="directions-bus"
              size={48}
              color={colors.text.tertiary}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.text.primary }]}
            >
              No vehicles added yet
            </Text>
            <Text
              style={[
                styles.emptyStateSubtext,
                { color: colors.text.secondary },
              ]}
            >
              Add your first vehicle to get started
            </Text>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="search-off"
              size={40}
              color={colors.text.tertiary}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.text.primary }]}
            >
              No matching vehicles
            </Text>
            <Text
              style={[
                styles.emptyStateSubtext,
                { color: colors.text.secondary },
              ]}
            >
              Try another search or status filter
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesListContainer}>
            <FlatList
              data={filteredVehicles}
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
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 9,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderText: {
    flex: 1,
  },
  pageHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pageHeaderSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D8E9F9",
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 11,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#1F3552",
    fontSize: 12,
  },
  filterList: {
    gap: 7,
    paddingBottom: 10,
  },
  filterChip: {
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#EEF4FA",
    borderWidth: 1,
    borderColor: "#E0EAF5",
  },
  filterChipSelected: {
    backgroundColor: "#1769D2",
    borderColor: "#1769D2",
  },
  filterChipText: {
    color: "#526981",
    fontSize: 11,
    fontWeight: "600",
  },
  filterChipTextSelected: {
    color: "#FFF",
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 3,
  },
  listHeadingText: {
    fontSize: 14,
    fontWeight: "700",
  },
  resultCount: {
    fontSize: 11,
  },
  vehiclesListContainer: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DDEBFA",
    shadowColor: "#4D7EA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  vehicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  vehicleIcon: {
    width: 52,
    height: 50,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
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
    fontSize: 12,
    fontWeight: "bold",
    color: "#1F2937",
  },
  vehicleModel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  vehicleLicensePlate: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "600",
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
