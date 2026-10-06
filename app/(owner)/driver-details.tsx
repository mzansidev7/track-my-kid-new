import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { clearOwnerCache } from "../../store/asyncStorage/ownerCache";
import { AuthContext } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import { subscribeToDriverProfileUpdates } from "../../store/subscriptions/driversRealtime";
import { resolveWorkingBaseUrl } from "../../url";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoutes } from "./ownerHelpers/hooks/useRoutes";
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

const formatDriverValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatDriverValue).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    const fields = value as Record<string, unknown>;
    const preferredFields = [
      "formatted_address",
      "display_name",
      "address",
      "street",
      "city",
      "province",
      "state",
      "country",
      "name",
      "label",
      "description",
    ];
    const parts = preferredFields
      .map((field) => formatDriverValue(fields[field]))
      .filter(Boolean);
    return [...new Set(parts)].join(", ");
  }
  return "";
};

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
  const { allRoutes } = useRoutes();

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
  const [showDriverActions, setShowDriverActions] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
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

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>View Driver</Text>
          <Text style={styles.headerSubtitle}>
            {driver ? `${driver.name}'s profile` : "Driver profile"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowDriverActions(true)}
          accessibilityLabel="Driver actions"
        >
          <MaterialIcons name="more-vert" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

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

  const isOwnerDriverProfile = Boolean(
    (driver as any)?.is_owner_driver ||
    (driver as any)?.user_id === (user as any)?.userData?.id ||
    (driver as any)?.userId === (user as any)?.userData?.id ||
    ((driver as any)?.email || "").toLowerCase() ===
      ((user as any)?.userData?.email || "").toLowerCase(),
  );

  const handleRemoveDriver = () => {
    if (isOwnerDriverProfile) {
      setNotification({
        visible: true,
        message: "The owner driver profile cannot be removed.",
        type: "warning",
      });
      return;
    }

    setShowRemoveModal(true);
  };

  const confirmRemoveDriver = async () => {
    if (!driver || isOwnerDriverProfile) return;

    setShowRemoveModal(false);
    setRemovingDriver(true);
    try {
      await removeDriver();
    } finally {
      setRemovingDriver(false);
    }
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
        await clearOwnerCache("routes");

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
        await clearOwnerCache("routes");
        await clearOwnerCache("vehicles");
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
          <ActivityIndicator size="large" color="#1769D2" />
          <Text style={styles.loadingText}>Loading driver details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
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
  const driverData = driver as Driver & Record<string, any>;
  const displayDate = (value: unknown) => {
    const text = formatDriverValue(value);
    if (!text) return "Not provided";
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString();
  };
  const licenseNumber = formatDriverValue(
    driverData.license_number ||
      driverData.licenseNumber ||
      driverData.license ||
      driver.vehicle_plate_number,
  );
  const licenseExpiry =
    driverData.license_expiry ||
    driverData.license_expiry_date ||
    driverData.licenseExpiry;
  const dateOfBirth =
    driverData.date_of_birth || driverData.dateOfBirth || driverData.dob;
  const experience =
    driverData.experience_years ??
    driverData.experienceYears ??
    driverData.years_of_experience ??
    driverData.experience;
  const driverLocation = formatDriverValue(
    driverData.location ||
      driverData.address ||
      driverData.users?.location ||
      driverData.users?.address ||
      [driverData.city, driverData.province].filter(Boolean).join(", "),
  );
  const experienceText = formatDriverValue(experience);
  const vehicleData = (driver as any)?.vehicle;
  const vehicleImage =
    vehicleData?.image ||
    vehicleData?.image_url ||
    vehicleData?.vehicle_images?.[0]?.url ||
    vehicleData?.images?.[0]?.url ||
    vehicleData?.images?.[0] ||
    null;
  const isDriverActive = driver.status?.toLowerCase() === "active";
  const driverIds = new Set(
    [
      driverData.id,
      driverData.driver_id,
      driverData.driverId,
      driverData.user_id,
      driverData.userId,
    ]
      .filter((id) => id != null && String(id).length > 0)
      .map(String),
  );
  const routeEntries = allRoutes.filter((route: any) => {
    const routeAssignments = Array.isArray(route.route_assignments)
      ? route.route_assignments
      : [];
    const assignedDriverIds = [
      route.driver_id,
      route.driverId,
      route.drivers?.id,
      route.drivers?.driver_id,
      route.drivers?.user_id,
      ...routeAssignments.flatMap((assignment: any) => [
        assignment.driver_id,
        assignment.driverId,
        assignment.drivers?.id,
        assignment.drivers?.driver_id,
        assignment.drivers?.user_id,
      ]),
    ]
      .filter((id) => id != null && String(id).length > 0)
      .map(String);
    return assignedDriverIds.some((id) => driverIds.has(id));
  });
  const driverDocuments = [
    {
      title: "Driver License",
      provided: Boolean(
        driverData.driver_license_document ||
        driverData.license_document ||
        driverData.license_document_url,
      ),
      verified: Boolean(driverData.driver_license_verified),
      icon: "description" as const,
    },
    {
      title: "Police Clearance",
      provided: Boolean(
        driverData.police_clearance_document || driverData.police_clearance_url,
      ),
      verified: Boolean(driverData.police_clearance_verified),
      icon: "policy" as const,
    },
    {
      title: "Professional Driver Permit",
      provided: Boolean(
        driverData.professional_driver_permit ||
        driverData.professional_driver_permit_url,
      ),
      verified: Boolean(driverData.professional_driver_permit_verified),
      icon: "badge" as const,
    },
  ];
  const onTimeRate =
    driverData.on_time_rate ??
    driverData.onTimeRate ??
    driverData.on_time_percentage ??
    driverData.performance?.on_time_rate;
  const tripsCompleted =
    driverData.trips_completed ??
    driverData.tripsCompleted ??
    driverData.performance?.trips_completed;
  const incidents =
    driverData.incidents_count ??
    driverData.incidents ??
    driverData.performance?.incidents;

  return (
    <View style={styles.container}>
      <AppNotification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSummary}>
          <View style={styles.profileIdentity}>
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
            <View style={styles.profileIdentityText}>
              <View style={styles.nameAndStatus}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {driver.name || "Driver"}
                </Text>
                <Text
                  style={[
                    styles.statusBadge,
                    isDriverActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  {isDriverActive ? "Active" : "Inactive"}
                </Text>
              </View>
              <View style={styles.contactLine}>
                <MaterialIcons name="call" size={13} color="#1769D2" />
                <Text style={styles.contactText}>
                  {driver.phone || "Phone not provided"}
                </Text>
              </View>
              <View style={styles.contactLine}>
                <MaterialIcons name="mail-outline" size={13} color="#1769D2" />
                <Text style={styles.contactText} numberOfLines={1}>
                  {driver.email || "Email not provided"}
                </Text>
              </View>
              {driverLocation ? (
                <View style={styles.contactLine}>
                  <MaterialIcons name="location-on" size={13} color="#1769D2" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {driverLocation}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailTile}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="badge" size={16} color="#1769D2" />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>License Number</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {licenseNumber || "Not provided"}
              </Text>
            </View>
          </View>
          <View style={styles.detailTile}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="event" size={16} color="#1769D2" />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>License Expiry</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {displayDate(licenseExpiry)}
              </Text>
            </View>
          </View>
          <View style={styles.detailTile}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="calendar-today" size={16} color="#1769D2" />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>Date of Birth</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {displayDate(dateOfBirth)}
              </Text>
            </View>
          </View>
          <View style={styles.detailTile}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="star" size={16} color="#1769D2" />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {experienceText
                  ? typeof experience === "number"
                    ? `${experienceText} years`
                    : experienceText
                  : "Not provided"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryEditButton}
          onPress={handleEditDriver}
          activeOpacity={0.85}
        >
          <MaterialIcons name="edit" size={16} color="#FFFFFF" />
          <Text style={styles.primaryEditText}>Edit Driver</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialIcons name="directions-car" size={15} color="#1769D2" />
            <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
            <View style={styles.sectionHeadingSpacer} />
            {driver?.is_verified && (
              <TouchableOpacity
                style={styles.sectionAction}
                onPress={openVehicleAssignment}
                disabled={assigningVehicle}
              >
                {assigningVehicle ? (
                  <ActivityIndicator color="#1769D2" size="small" />
                ) : (
                  <Text style={styles.sectionActionText}>
                    {driver.vehicle ? "Change" : "Assign"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {driver.vehicle ? (
            <View style={styles.compactCard}>
              {vehicleImage ? (
                <Image
                  source={{ uri: vehicleImage }}
                  style={styles.vehicleThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.vehicleThumbnailPlaceholder}>
                  <MaterialIcons
                    name="directions-car"
                    size={23}
                    color="#71869C"
                  />
                </View>
              )}
              <View style={styles.compactCardInfo}>
                <Text style={styles.compactCardTitle} numberOfLines={1}>
                  {driver.vehicle.name} {driver.vehicle.model}
                </Text>
                <Text style={styles.compactCardSubtitle} numberOfLines={1}>
                  {driver.vehicle.license_plate || "License plate not provided"}
                </Text>
              </View>
              <Text style={styles.statusBadgeSmall}>Active</Text>
              <MaterialIcons name="chevron-right" size={19} color="#71869C" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptySectionCard}
              onPress={openVehicleAssignment}
              disabled={assigningVehicle}
            >
              <MaterialIcons name="directions-car" size={20} color="#71869C" />
              <Text style={styles.emptySectionText}>No vehicle assigned</Text>
              <MaterialIcons name="chevron-right" size={19} color="#71869C" />
            </TouchableOpacity>
          )}
          {driver.vehicle && (
            <TouchableOpacity
              style={styles.textAction}
              onPress={handleUnassignVehicle}
              disabled={unassigningVehicle}
            >
              {unassigningVehicle ? (
                <ActivityIndicator color="#D94A57" size="small" />
              ) : (
                <Text style={styles.dangerText}>Unassign vehicle</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialIcons name="alt-route" size={15} color="#1769D2" />
            <Text style={styles.sectionTitle}>Assigned Route(s)</Text>
          </View>
          {routeEntries.length > 0 ? (
            routeEntries.map((route: any, index: number) => {
              const routeId =
                route.id ||
                route.route_id ||
                route.routeId ||
                route.routes?.id ||
                route.route?.id;

              return (
              <TouchableOpacity
                onPress={() => {
                  if (!routeId) return;
                  router.push({
                    pathname: "/(owner)/route-details",
                    params: { routeId: String(routeId) },
                  });
                }}
                style={styles.compactCard}
                key={routeId || index}
                disabled={!routeId}
                activeOpacity={0.8}
              >
                <View style={styles.routeIcon}>
                  <MaterialIcons name="groups" size={17} color="#FFFFFF" />
                </View>
                <View style={styles.compactCardInfo}>
                  <Text style={styles.compactCardTitle} numberOfLines={1}>
                    {route.route_name ||
                      route.name ||
                      route.routes?.route_name ||
                      route.route?.route_name ||
                      route.route_children?.[0]?.children?.school_name ||
                      route.start_location ||
                      "Assigned route"}
                  </Text>
                  <Text style={styles.compactCardSubtitle}>
                    {(route.students_count ?? route.route_children?.length) !=
                    null
                      ? `${route.students_count ?? route.route_children.length} students assigned`
                      : "Route assigned"}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={19} color="#71869C" />
              </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.compactCard}>
              <View style={styles.routeIcon}>
                <MaterialIcons name="groups" size={17} color="#FFFFFF" />
              </View>
              <View style={styles.compactCardInfo}>
                <Text style={styles.compactCardTitle}>
                  {driver.routes_count
                    ? `${driver.routes_count} assigned route(s)`
                    : "No routes assigned"}
                </Text>
                <Text style={styles.compactCardSubtitle}>
                  {driver.routes_count
                    ? "Route details are not available"
                    : "Route assignments will appear here"}
                </Text>
              </View>
              {driver.routes_count ? (
                <MaterialIcons name="chevron-right" size={19} color="#71869C" />
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialIcons name="description" size={15} color="#1769D2" />
            <Text style={styles.sectionTitle}>Documents</Text>
          </View>
          <View style={styles.documentList}>
            {driverDocuments.map((document, index) => (
              <View
                style={[
                  styles.documentRow,
                  index === driverDocuments.length - 1 &&
                    styles.documentRowLast,
                ]}
                key={document.title}
              >
                <MaterialIcons name={document.icon} size={16} color="#1769D2" />
                <Text style={styles.documentTitle}>{document.title}</Text>
                <Text
                  style={[
                    styles.documentStatus,
                    document.provided && document.verified
                      ? styles.documentVerified
                      : styles.documentMissing,
                  ]}
                >
                  {document.provided
                    ? document.verified
                      ? "Verified"
                      : "Pending"
                    : "Not provided"}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#71869C" />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialIcons name="star" size={15} color="#1769D2" />
            <Text style={styles.sectionTitle}>Performance</Text>
          </View>
          <View style={styles.performanceRow}>
            <View style={styles.performanceTile}>
              <Text style={styles.performanceLabel}>On-time Rate</Text>
              <Text style={styles.performanceValue}>
                {onTimeRate != null
                  ? `${onTimeRate}${String(onTimeRate).includes("%") ? "" : "%"}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.performanceTile}>
              <Text style={styles.performanceLabel}>Trips Completed</Text>
              <Text style={styles.performanceValue}>
                {tripsCompleted ?? "—"}
              </Text>
            </View>
            <View style={styles.performanceTile}>
              <Text style={styles.performanceLabel}>Incidents</Text>
              <Text style={styles.performanceValue}>{incidents ?? "—"}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.removeButton,
            isOwnerDriverProfile && styles.disabledActionButton,
          ]}
          onPress={handleRemoveDriver}
          disabled={isOwnerDriverProfile}
        >
          <MaterialCommunityIcons
            name={isOwnerDriverProfile ? "account-check" : "delete"}
            size={17}
            color={isOwnerDriverProfile ? "#FFFFFF" : "#D94A57"}
          />
          <Text
            style={[
              styles.removeButtonText,
              !isOwnerDriverProfile && styles.removeButtonTextDanger,
            ]}
          >
            {isOwnerDriverProfile ? "Owner Driver" : "Remove Driver"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showDriverActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriverActions(false)}
      >
        <TouchableOpacity
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowDriverActions(false)}
        >
          <View style={styles.actionsMenu}>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowDriverActions(false);
                handleEditDriver();
              }}
            >
              <MaterialIcons name="edit" size={18} color="#1769D2" />
              <Text style={styles.actionsMenuText}>Edit driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowDriverActions(false);
                handleRemoveDriver();
              }}
              disabled={isOwnerDriverProfile}
            >
              <MaterialCommunityIcons
                name="delete"
                size={18}
                color={isOwnerDriverProfile ? "#AAB6C2" : "#D94A57"}
              />
              <Text
                style={[
                  styles.actionsMenuText,
                  isOwnerDriverProfile && styles.disabledMenuText,
                ]}
              >
                Remove driver
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Remove Driver Modal */}
      <Modal
        visible={showRemoveModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={32}
                color="#DC3545"
              />
            </View>

            <Text style={styles.confirmTitle}>Remove Driver</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to remove {driver?.name || "this driver"}?
              This action cannot be undone.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelConfirmButton}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmRemoveButton,
                  removingDriver && styles.buttonDisabled,
                ]}
                onPress={confirmRemoveDriver}
                disabled={removingDriver}
              >
                {removingDriver ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmRemoveText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vehicle Assignment Modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.assignModalOverlay}>
          <View style={styles.assignModalSheet}>
            <View style={styles.assignModalHeader}>
              <View style={styles.assignModalHeading}>
                <View style={styles.assignModalIcon}>
                  <MaterialIcons
                    name="directions-car"
                    size={19}
                    color="#1769D2"
                  />
                </View>
                <View style={styles.assignModalTitleWrap}>
                  <Text style={styles.modalTitle}>Assign Vehicle</Text>
                  <Text style={styles.assignModalSubtitle}>
                    Choose a vehicle for {driver.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowVehicleModal(false)}
                style={styles.assignCloseButton}
                accessibilityLabel="Close vehicle selector"
              >
                <MaterialIcons name="close" size={19} color="#526981" />
              </TouchableOpacity>
            </View>

            {loadingVehicles || assigningVehicle ? (
              <View style={styles.assignLoadingContainer}>
                <ActivityIndicator size="large" color="#1769D2" />
                <Text style={styles.assignLoadingText}>
                  {assigningVehicle
                    ? "Assigning vehicle..."
                    : "Loading vehicles..."}
                </Text>
              </View>
            ) : availableVehicles.length === 0 ? (
              <View style={styles.assignEmptyContainer}>
                <View style={styles.assignEmptyIcon}>
                  <MaterialIcons
                    name="directions-car"
                    size={26}
                    color="#1769D2"
                  />
                </View>
                <Text style={styles.assignEmptyTitle}>
                  No vehicles available
                </Text>
                <Text style={styles.assignEmptyText}>
                  All vehicles are already assigned or you need to add more
                  vehicles.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableVehicles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.vehicleList}
                renderItem={({ item }) => {
                  const isAssignedToCurrentDriver =
                    item.driver_id === driver.id;
                  const vehiclePhoto =
                    item.vehicle_images?.[0]?.url ||
                    item.images?.[0]?.url ||
                    item.images?.[0] ||
                    item.image_url ||
                    item.image;
                  const assignedToName = item.drivers?.users?.name;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.assignVehicleItem,
                        (isAssignedToCurrentDriver || item.driver_id) &&
                          styles.vehicleItemDisabled,
                      ]}
                      onPress={() => handleAssignVehicle(item.id)}
                      disabled={
                        isAssignedToCurrentDriver ||
                        Boolean(item.driver_id) ||
                        assigningVehicle
                      }
                    >
                      {vehiclePhoto ? (
                        <Image
                          source={{ uri: vehiclePhoto }}
                          style={styles.assignVehicleImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.assignVehicleImagePlaceholder}>
                          <MaterialIcons
                            name="directions-car"
                            size={24}
                            color="#6F89A4"
                          />
                        </View>
                      )}
                      <View style={styles.assignVehicleInfo}>
                        <Text
                          style={styles.assignVehicleName}
                          numberOfLines={1}
                        >
                          {item.name} {item.model}
                        </Text>
                        <Text
                          style={styles.assignVehicleDetails}
                          numberOfLines={1}
                        >
                          {item.license_plate || "Plate not provided"}
                          {item.capacity != null
                            ? `  ·  ${item.capacity} seats`
                            : ""}
                        </Text>
                        {isAssignedToCurrentDriver ? (
                          <Text style={styles.assignVehicleUnavailable}>
                            Assigned to this driver
                          </Text>
                        ) : item.driver_id ? (
                          <Text style={styles.assignVehicleUnavailable}>
                            Assigned to {assignedToName || "another driver"}
                          </Text>
                        ) : null}
                      </View>
                      {item.driver_id ? (
                        <MaterialIcons
                          name="lock-outline"
                          size={17}
                          color="#91A0AF"
                        />
                      ) : (
                        <View style={styles.vehicleSelectIcon}>
                          <MaterialIcons
                            name="arrow-forward"
                            size={15}
                            color="#1769D2"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
            {!loadingVehicles && availableVehicles.length > 0 && (
              <View style={styles.assignModalFooter}>
                <MaterialIcons name="info-outline" size={15} color="#71869C" />
                <Text style={styles.assignModalFooterText}>
                  Vehicles assigned to another driver are unavailable.
                </Text>
              </View>
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
  container: { flex: 1, backgroundColor: "#F4F8FC" },
  headerSafeArea: {
    backgroundColor: "#17385F",
  },
  pageHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 11,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
  },
  content: { padding: 11, paddingBottom: 26 },
  profileSummary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F3",
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  profileIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileIdentityText: {
    flex: 1,
    gap: 3,
  },
  nameAndStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 1,
  },
  contactLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contactText: {
    flexShrink: 1,
    color: "#536D87",
    fontSize: 10,
  },
  statusBadge: {
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 9,
    fontWeight: "600",
  },
  activeBadge: {
    backgroundColor: "#E4F5EC",
    color: "#258052",
  },
  inactiveBadge: {
    backgroundColor: "#EEF2F6",
    color: "#71869C",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  detailTile: {
    width: "48%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F3",
    borderRadius: 9,
  },
  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5FC",
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: "#71869C",
    fontSize: 8,
    marginBottom: 2,
  },
  detailValue: {
    color: "#17385F",
    fontSize: 9,
    fontWeight: "700",
  },
  primaryEditButton: {
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: "#287BE8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 10,
  },
  primaryEditText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    marginBottom: 9,
  },
  sectionHeading: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  sectionHeadingSpacer: {
    flex: 1,
  },
  sectionTitle: {
    color: "#17385F",
    fontSize: 10,
    fontWeight: "700",
  },
  sectionAction: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EAF3FD",
  },
  sectionActionText: {
    color: "#1769D2",
    fontSize: 9,
    fontWeight: "700",
  },
  compactCard: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F3",
    borderRadius: 9,
  },
  vehicleThumbnail: {
    width: 48,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#EEF4FA",
  },
  vehicleThumbnailPlaceholder: {
    width: 48,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#EEF4FA",
    alignItems: "center",
    justifyContent: "center",
  },
  compactCardInfo: {
    flex: 1,
  },
  compactCardTitle: {
    color: "#17385F",
    fontSize: 9,
    fontWeight: "700",
  },
  compactCardSubtitle: {
    color: "#71869C",
    fontSize: 8,
    marginTop: 2,
  },
  statusBadgeSmall: {
    overflow: "hidden",
    color: "#258052",
    backgroundColor: "#E4F5EC",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    fontSize: 8,
    fontWeight: "600",
  },
  emptySectionCard: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F3",
    borderRadius: 9,
  },
  emptySectionText: {
    flex: 1,
    color: "#71869C",
    fontSize: 10,
  },
  routeIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#3182EF",
    alignItems: "center",
    justifyContent: "center",
  },
  documentList: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F3",
    borderRadius: 9,
    paddingHorizontal: 9,
  },
  documentRow: {
    minHeight: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  documentRowLast: {
    borderBottomWidth: 0,
  },
  documentTitle: {
    flex: 1,
    color: "#405A74",
    fontSize: 9,
    fontWeight: "600",
  },
  documentStatus: {
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 8,
    fontWeight: "600",
  },
  documentVerified: {
    color: "#258052",
    backgroundColor: "#E4F5EC",
  },
  documentMissing: {
    color: "#71869C",
    backgroundColor: "#EEF2F6",
  },
  performanceRow: {
    flexDirection: "row",
    gap: 5,
  },
  performanceTile: {
    flex: 1,
    minHeight: 45,
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCE8F3",
    backgroundColor: "#FFFFFF",
  },
  performanceLabel: {
    color: "#71869C",
    fontSize: 8,
  },
  performanceValue: {
    color: "#17385F",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  textAction: {
    alignSelf: "flex-end",
    paddingTop: 7,
  },
  dangerText: {
    color: "#D94A57",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsOverlay: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 58,
    paddingRight: 10,
    backgroundColor: "rgba(10,30,50,0.18)",
  },
  actionsMenu: {
    width: 170,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCE8F3",
    backgroundColor: "#FFFFFF",
    elevation: 5,
  },
  actionsMenuItem: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  actionsMenuText: {
    color: "#405A74",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledMenuText: {
    color: "#AAB6C2",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#526981",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#526981",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#1769D2",
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
    padding: 16,
    borderRadius: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCE8F3",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1769D2",
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
    fontSize: 24,
    color: "#FFF",
    fontWeight: "bold",
  },
  driverName: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#17385F",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  activeStatus: {
    color: "white",
  },
  inactiveStatus: {
    color: "white",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#258052",
  },

  infoCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCE8F3",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#17385F",
  },
  assignButton: {
    backgroundColor: "#1769D2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  assignButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  unassignButton: {
    backgroundColor: "#D94A57",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
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
    borderBottomColor: "#EAF0F6",
  },
  label: {
    fontSize: 14,
    color: "#64788E",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#263B50",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  noVehicleText: {
    fontSize: 13,
    color: "#71869C",
    textAlign: "center",
    paddingVertical: 14,
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
    fontSize: 21,
    fontWeight: "bold",
    color: "#1769D2",
  },
  statLabel: {
    fontSize: 12,
    color: "#71869C",
    marginTop: 4,
  },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 18,
  },
  editButton: {
    backgroundColor: "#1769D2",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9,
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
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#F0C9CD",
    backgroundColor: "#FFFFFF",
    marginTop: 2,
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  removeButtonTextDanger: {
    color: "#D94A57",
  },
  disabledActionButton: {
    backgroundColor: "#7B8EA3",
    opacity: 0.9,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  assignModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 38, 62, 0.42)",
  },
  assignModalSheet: {
    width: "100%",
    maxHeight: "78%",
    minHeight: "38%",
    paddingBottom: 18,
    backgroundColor: "#F6F9FC",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#DCE8F3",
    overflow: "hidden",
  },
  assignModalHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4EDF5",
  },
  assignModalHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  assignModalIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FD",
  },
  assignModalTitleWrap: {
    flex: 1,
  },
  assignModalSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#71869C",
  },
  assignCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  assignLoadingContainer: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  assignLoadingText: {
    color: "#526981",
    fontSize: 12,
  },
  assignEmptyContainer: {
    flex: 1,
    minHeight: 210,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  assignEmptyIcon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#EAF3FD",
    alignItems: "center",
    justifyContent: "center",
  },
  assignEmptyTitle: {
    color: "#17385F",
    fontSize: 15,
    fontWeight: "700",
  },
  assignEmptyText: {
    marginTop: 6,
    color: "#71869C",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  vehicleList: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  assignVehicleItem: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE8F3",
    backgroundColor: "#FFFFFF",
  },
  assignVehicleImage: {
    width: 62,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#EEF4FA",
  },
  assignVehicleImagePlaceholder: {
    width: 62,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FA",
  },
  assignVehicleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  assignVehicleName: {
    color: "#17385F",
    fontSize: 12,
    fontWeight: "700",
  },
  assignVehicleDetails: {
    marginTop: 3,
    color: "#647B92",
    fontSize: 10,
  },
  assignVehicleUnavailable: {
    marginTop: 3,
    color: "#8998A8",
    fontSize: 9,
  },
  vehicleSelectIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FD",
  },
  assignModalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 9,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#E4EDF5",
    backgroundColor: "#FFFFFF",
  },
  assignModalFooterText: {
    flex: 1,
    color: "#71869C",
    fontSize: 10,
  },
  confirmModalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDECEC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelConfirmButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelConfirmText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  confirmRemoveButton: {
    flex: 1,
    backgroundColor: "#DC3545",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmRemoveText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
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
    borderBottomColor: "#EAF0F6",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#17385F",
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
    borderBottomColor: "#EAF0F6",
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
    color: "#17385F",
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: "#71869C",
    marginBottom: 2,
  },
  assignedText: {
    fontSize: 12,
    color: "#F5A623",
    fontStyle: "italic",
  },
  selectText: {
    fontSize: 14,
    color: "#1769D2",
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
    borderColor: "#D8E4EF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "#FBFDFF",
    color: "#263B50",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#465F78",
    marginBottom: 8,
  },
  updateButton: {
    backgroundColor: "#1769D2",
    padding: 14,
    borderRadius: 10,
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
