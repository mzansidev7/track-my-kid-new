import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { clearOwnerCache } from "../../asyncStorage/ownerCache";
import { AuthContext } from "../../authContext/auth-context";
import Notification from "../../components/Notification";
import { subscribeToDriverProfileUpdates } from "../../store/subscriptions/driversRealtime";
import { resolveWorkingBaseUrl } from "../../url";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
// import Header from "./components/header";

interface Driver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_plate_number: string;
  status: string;
  is_verified?: boolean;
  created_at: string;
  avatar?: string | null;
  vehicle?: {
    id: string;
    name: string;
    model: string;
    license_plate: string;
    capacity: number;
  };
  routes_count?: number;
  students_count?: number;
}

const DriverDetails = ({
  driverId: propDriverId,
  onBack: propOnBack,
}: {
  driverId?: string;
  onBack?: () => void;
} = {}) => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    driverId?: string;
    vehicleId?: string;
    returnTo?: string;
  }>();
  const urlDriverId = Array.isArray(params?.driverId)
    ? params.driverId[0]
    : params?.driverId;
  const actualDriverId = propDriverId || urlDriverId;
  const { user } = useContext(AuthContext);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
      return;
    }

    if (params?.returnTo === "vehicle" && params?.vehicleId) {
      router.push({
        pathname: "/(owner)/manage-vehicle/[id]",
        params: { id: params.vehicleId },
      });
      return;
    }

    router.back();
  };

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vehicle assignment state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  // Edit driver state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLicense, setEditLicense] = useState("");
  const [updatingDriver, setUpdatingDriver] = useState(false);

  // Assignment/unassignment state
  const [assigningVehicle, setAssigningVehicle] = useState(false);
  const [unassigningVehicle, setUnassigningVehicle] = useState(false);
  const [removingDriver, setRemovingDriver] = useState(false);

  const getBaseUrl = useCallback(async () => resolveWorkingBaseUrl(), []);

  const { renderHeader } = useOwnerPageHeader({
    title: "Driver Details",
    subtitle: driver ? `${driver.name}'s profile` : "Loading...",
    actionLabel: "Add New Vehicle",
    onBackPress: handleBack,
  });

  // Notification state
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const fetchDriverDetails = useCallback(async () => {
    if (!actualDriverId) {
      setDriver(null);
      setLoading(false);
      setError("Driver details could not be loaded.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/owner/drivers/${actualDriverId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        setDriver(data.driver || data);
      } else {
        setError(data.error || "Failed to fetch driver details");
      }
    } catch (error) {
      console.error("Error fetching driver details:", error);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [actualDriverId, user?.token]);

  useEffect(() => {
    fetchDriverDetails();
  }, [fetchDriverDetails]);

  useEffect(() => {
    if (!user?.token || !driver?.user_id) {
      return;
    }

    const profileChannel = subscribeToDriverProfileUpdates(
      driver.user_id,
      fetchDriverDetails,
    );

    return () => {
      if (profileChannel?.unsubscribe) {
        profileChannel.unsubscribe();
      }
    };
  }, [user?.token, driver?.user_id, fetchDriverDetails]);

  const handleEditDriver = () => {
    if (!driver) return;
    setEditName(driver.name || "");
    setEditPhone(driver.phone || "");
    setEditLicense(driver.vehicle_plate_number || "");
    setShowEditModal(true);
  };

  const handleRemoveDriver = () => {
    Alert.alert(
      "Remove Driver",
      "Are you sure you want to remove this driver? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingDriver(true);
            try {
              await removeDriver();
            } finally {
              setRemovingDriver(false);
            }
          },
        },
      ],
    );
  };

  const removeDriver = async () => {
    if (!driver) {
      setNotification({
        visible: true,
        message: "Driver information not loaded",
        type: "error",
      });
      return;
    }

    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/owner/drivers/${driver.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        // Haptic feedback
        Vibration.vibrate(100);

        // Clear driver-related caches
        await clearOwnerCache("drivers");
        await clearOwnerCache("driverDetails");
        await clearOwnerCache("vehicles");

        setNotification({
          visible: true,
          message: "Driver removed successfully",
          type: "success",
        });
        setTimeout(() => handleBack(), 1500);
      } else {
        const data = await response.json();
        setNotification({
          visible: true,
          message: data.error || "Failed to remove driver",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error removing driver:", error);
      setNotification({
        visible: true,
        message: "Network error occurred",
        type: "error",
      });
    }
  };

  const handleUpdateDriver = async () => {
    if (!driver) return;

    if (driver.is_verified === true) {
      setNotification({
        visible: true,
        message: "This driver is already verified and cannot be edited.",
        type: "error",
      });
      return;
    }

    if (!editName.trim() || !editPhone.trim() || !editLicense.trim()) {
      setNotification({
        visible: true,
        message: "All fields are required",
        type: "error",
      });
      return;
    }

    setUpdatingDriver(true);
    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/owner/drivers/${driver.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          licenseNumber: editLicense.trim(),
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        fetchDriverDetails(); // Refresh data
        setNotification({
          visible: true,
          message: "Driver updated successfully",
          type: "success",
        });
      } else {
        const data = await response.json();
        setNotification({
          visible: true,
          message: data.error || "Failed to update driver",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating driver:", error);
      setNotification({
        visible: true,
        message: "Network error occurred",
        type: "error",
      });
    } finally {
      setUpdatingDriver(false);
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Show all vehicles; assigned ones will be disabled in the UI
        setAvailableVehicles(data || []);
      } else {
        setNotification({
          visible: true,
          message: "Failed to fetch available vehicles",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setNotification({
        visible: true,
        message: "Network error occurred",
        type: "error",
      });
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleAssignVehicle = async (vehicleId: string) => {
    if (!driver) {
      setNotification({
        visible: true,
        message: "Driver information not loaded",
        type: "error",
      });
      return;
    }

    setAssigningVehicle(true);
    try {
      const baseUrl = await getBaseUrl();
      // Force-clear this driver from any previously assigned vehicles first.
      const vehiclesRes = await fetch(`${baseUrl}/owner/vehicles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!vehiclesRes.ok) {
        const vehiclesErr = await vehiclesRes.json();
        setNotification({
          visible: true,
          message:
            vehiclesErr.error || "Failed to load vehicles for reassignment",
          type: "error",
        });
        return;
      }

      const allVehicles = await vehiclesRes.json();
      const previouslyAssignedVehicles = (allVehicles || []).filter(
        (v: any) => v.driver_id === driver.id && v.id !== vehicleId,
      );

      for (const oldVehicle of previouslyAssignedVehicles) {
        const clearCurrentRes = await fetch(
          `${baseUrl}/owner/vehicles/${oldVehicle.id}/assign-driver`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ driverId: null }),
          },
        );

        if (!clearCurrentRes.ok) {
          const clearError = await clearCurrentRes.json();
          setNotification({
            visible: true,
            message: clearError.error || "Failed to unassign previous vehicle",
            type: "error",
          });
          return;
        }
      }

      const response = await fetch(
        `${baseUrl}/owner/vehicles/${vehicleId}/assign-driver`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            driverId: driver.id,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setNotification({
          visible: true,
          message: "Vehicle assigned successfully",
          type: "success",
        });
        setShowVehicleModal(false);
        fetchDriverDetails(); // Refresh driver details
      } else {
        setNotification({
          visible: true,
          message: data.error || "Failed to assign vehicle",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      setNotification({
        visible: true,
        message: "Network error occurred",
        type: "error",
      });
    } finally {
      setAssigningVehicle(false);
    }
  };

  const handleUnassignVehicle = async () => {
    if (!driver?.vehicle) return;

    setUnassigningVehicle(true);
    try {
      const baseUrl = await getBaseUrl();
      const deleteResponse = await fetch(
        `${baseUrl}/owner/vehicles/${driver.vehicle.id}/assign-driver`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ driverId: null }),
        },
      );

      if (deleteResponse.ok) {
        setNotification({
          visible: true,
          message: "Vehicle unassigned successfully",
          type: "success",
        });
        fetchDriverDetails();
      } else {
        const data = await deleteResponse.json();
        setNotification({
          visible: true,
          message: data.error || "Failed to unassign vehicle",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error unassigning vehicle:", error);
      setNotification({
        visible: true,
        message: "Network error occurred",
        type: "error",
      });
    } finally {
      setUnassigningVehicle(false);
    }
  };

  const openVehicleAssignment = () => {
    setShowVehicleModal(true);
    fetchAvailableVehicles();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7ED321" />
          <Text style={styles.loadingText}>Loading driver details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        renderHeader();
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDriverDetails}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Driver information not available</Text>
        </View>
      </View>
    );
  }

  const driverAvatar =
    (driver as any)?.avatar ||
    (driver as any)?.avatar_url ||
    (driver as any)?.profile_photo_url ||
    (driver as any)?.users?.avatar ||
    (driver as any)?.users?.avatar_url ||
    null;

  return (
    <View style={styles.container}>
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Driver Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {driverAvatar ? (
              <Image
                source={{ uri: driverAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(driver.name?.charAt(0) || "?").toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.driverName}>{driver.name || "Driver"}</Text>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                driver.status === "active"
                  ? styles.activeStatus
                  : styles.inactiveStatus,
              ]}
            >
              {driver.status === "active" ? "🟢 Active" : "🔴 Inactive"}
            </Text>
          </View>
        </View>

        {/* Driver Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{driver.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{driver.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{driver.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Joined:</Text>
            <Text style={styles.value}>
              {new Date(driver.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Assigned Vehicle</Text>
            <TouchableOpacity
              style={[
                styles.assignButton,
                assigningVehicle && styles.buttonDisabled,
              ]}
              onPress={openVehicleAssignment}
              disabled={assigningVehicle}
            >
              {assigningVehicle ? (
                <ActivityIndicator color="#7ED321" size="small" />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <MaterialIcons
                    name="directions-car"
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.assignButtonText}>
                    {driver.vehicle ? "Change Vehicle" : "Assign Vehicle"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {driver.vehicle ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Vehicle:</Text>
                <Text style={styles.value}>
                  {driver.vehicle.name} {driver.vehicle.model}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>License Plate:</Text>
                <Text style={styles.value}>{driver.vehicle.license_plate}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Capacity:</Text>
                <Text style={styles.value}>
                  {driver.vehicle.capacity} students
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.unassignButton,
                  unassigningVehicle && styles.buttonDisabled,
                ]}
                onPress={handleUnassignVehicle}
                disabled={unassigningVehicle}
              >
                {unassigningVehicle ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <MaterialIcons
                      name="remove-circle-outline"
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.unassignButtonText}>
                      Unassign Vehicle
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noVehicleText}>No vehicle assigned</Text>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Activity Summary</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{driver.routes_count || 0}</Text>
              <Text style={styles.statLabel}>Active Routes</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {driver.students_count || 0}
              </Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {driver?.is_verified === false && (
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={handleEditDriver}
            >
              <MaterialIcons
                name="edit"
                size={20}
                color="#FFF"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.editButtonText}>Edit Driver</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.removeButton,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
            onPress={handleRemoveDriver}
          >
            <MaterialCommunityIcons
              name="delete"
              size={20}
              color="#FFF"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.removeButtonText}>Remove Driver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Vehicle Assignment Modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Vehicle</Text>
              <TouchableOpacity
                onPress={() => setShowVehicleModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingVehicles || assigningVehicle ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7ED321" />
                <Text style={styles.loadingText}>
                  {assigningVehicle
                    ? "Assigning vehicle..."
                    : "Loading vehicles..."}
                </Text>
              </View>
            ) : availableVehicles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No available vehicles</Text>
                <Text style={styles.emptySubtext}>
                  All vehicles are already assigned or you need to add more
                  vehicles.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableVehicles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isAssignedToCurrentDriver =
                    item.driver_id === driver.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.vehicleItem,
                        isAssignedToCurrentDriver && styles.vehicleItemDisabled,
                      ]}
                      onPress={() => handleAssignVehicle(item.id)}
                      disabled={isAssignedToCurrentDriver || assigningVehicle}
                    >
                      <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>
                          {item.name} {item.model}
                        </Text>
                        <Text style={styles.vehicleDetails}>
                          {item.license_plate} • Capacity: {item.capacity}
                        </Text>
                        {isAssignedToCurrentDriver ? (
                          <Text style={styles.assignedText}>
                            Already assigned to this driver
                          </Text>
                        ) : item.drivers?.users?.name ? (
                          <Text style={styles.assignedText}>
                            Currently assigned to: {item.drivers.users.name}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.selectText,
                          isAssignedToCurrentDriver &&
                            styles.selectTextDisabled,
                        ]}
                      >
                        {isAssignedToCurrentDriver ? "Assigned" : "Select"}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Driver Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Driver</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter driver name"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>License Number</Text>
              <TextInput
                style={styles.textInput}
                value={editLicense}
                onChangeText={setEditLicense}
                placeholder="Enter license number"
              />

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  updatingDriver && styles.buttonDisabled,
                ]}
                onPress={handleUpdateDriver}
                disabled={updatingDriver}
              >
                {updatingDriver ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.updateButtonText}>Update Driver</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 20 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#7ED321",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  profileHeader: {
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarText: {
    fontSize: 32,
    color: "#FFF",
    fontWeight: "bold",
  },
  driverName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeStatus: {
    color: "#28A745",
  },
  inactiveStatus: {
    color: "#DC3545",
  },

  infoCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  assignButton: {
    backgroundColor: "#7ED321",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  unassignButton: {
    backgroundColor: "#DC3545",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 15,
    alignSelf: "flex-start",
  },
  unassignButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // cardTitle: {
  //   fontSize: 18,
  //   fontWeight: "bold",
  //   color: "#333",
  //   marginBottom: 16,
  // },
  // cardHeader: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   marginBottom: 15,
  // },
  // assignButton: {
  //   backgroundColor: "#7ED321",
  //   paddingHorizontal: 12,
  //   paddingVertical: 6,
  //   borderRadius: 6,
  // },
  // assignButtonText: {
  //   color: "#FFF",
  //   fontSize: 12,
  //   fontWeight: "600",
  // },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  noVehicleText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7ED321",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  editButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  removeButton: {
    backgroundColor: "#DC3545",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    minHeight: "40%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "bold",
  },
  vehicleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  vehicleItemDisabled: {
    opacity: 0.6,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  assignedText: {
    fontSize: 12,
    color: "#F5A623",
    fontStyle: "italic",
  },
  selectText: {
    fontSize: 14,
    color: "#7ED321",
    fontWeight: "600",
  },
  selectTextDisabled: {
    color: "#999",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#FFF",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  updateButton: {
    backgroundColor: "#7ED321",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  updateButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#A0AEC0",
  },
});

export default DriverDetails;
