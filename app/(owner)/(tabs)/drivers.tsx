import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { useOwnerPageHeader } from "../ownerHelpers/hooks/useOwnerPageHeader";
import { driversPageStyles } from "../ownerHelpers/styles/ownerStyles";
import {
  formatLicense,
  getInitials,
} from "../ownerHelpers/actionHelpers/actions";
import Loading from "../ownerHelpers/components/Loading";
import Error from "../ownerHelpers/components/Error";

const DriversScreen = () => {
  const router = useRouter();
  const { drivers, loadingDrivers, error, refreshDrivers } = useDrivers();

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const openDriver = (driver: any) => {
    router.push(`/(owner)/driver-details?driverId=${driver.id}`);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDriver(null);
  };

  useFocusEffect(
    useCallback(() => {
      refreshDrivers(true);
    }, [refreshDrivers]),
  );

  useEffect(() => {
    refreshDrivers(true);
  }, [refreshDrivers]);

  const { renderHeader } = useOwnerPageHeader({
    title: "Driver Management",
    subtitle: `${drivers.length} total drivers`,
    actionLabel: "+ Add New Driver",
    onActionPress: () => router.push("/add-driver"),
    onBackPress: () => router.push("/(owner)/(tabs)"),
  });

  const filteredDrivers = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    if (!searchQuery.trim()) {
      return list;
    }
    const query = searchQuery.toLowerCase();
    return list.filter((driver: any) => {
      const name = driver.name || driver.raw?.users?.name || "";
      return name.toLowerCase().includes(query);
    });
  }, [drivers, searchQuery]);

  const activeDriversCount = filteredDrivers.filter(
    (driver: any) => driver.status === "active",
  ).length;
  const availableDriversCount = filteredDrivers.filter(
    (driver: any) => !driver.hasAssignedVehicle && driver.status === "active",
  ).length;
  const offDutyDriversCount = filteredDrivers.filter(
    (driver: any) => driver.status === "inactive" && driver.hasAssignedVehicle,
  ).length;
  const inactiveDriversCount = filteredDrivers.length - activeDriversCount;

  /* ---------------- DRIVER CARD ---------------- */
  const renderItem = ({ item }: any) => {
    // Handle divider
    if (item.isDivider) {
      return (
        <View style={driversPageStyles.driverDivider}>
          <View style={driversPageStyles.dividerLine} />
          <Text style={driversPageStyles.dividerText}>Inactive Drivers</Text>
          <View style={driversPageStyles.dividerLine} />
        </View>
      );
    }

    const name = item.name || item.raw?.users?.name || "Driver";
    const email = item.email || item.raw?.users?.email || "";
    const phone = item.phone || item.raw?.users?.phone || "";
    const vehicles = item.vehicles?.length ?? item.raw?.vehicles?.length ?? 0;
    const routes = item.routes ?? item.raw?.routes ?? 0;
    const students = item.students ?? item.raw?.students ?? 0;
    const status = item.status || (vehicles > 0 ? "active" : "inactive");
    const avatar = item.avatar || item.raw?.avatar || null;
    const isInactive = status === "inactive";

    return (
      <TouchableOpacity
        style={[
          driversPageStyles.card,
          isInactive && driversPageStyles.cardInactive,
        ]}
        activeOpacity={0.82}
        onPress={() => openDriver(item)}
      >
        <View style={driversPageStyles.cardHeader}>
          <View style={driversPageStyles.avatarCircle}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={driversPageStyles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[
                  driversPageStyles.avatarText,
                  isInactive && driversPageStyles.avatarTextInactive,
                ]}
              >
                {getInitials(name)}
              </Text>
            )}
          </View>

          <View style={driversPageStyles.cardMeta}>
            <Text
              style={[
                driversPageStyles.name,
                isInactive && driversPageStyles.nameInactive,
              ]}
            >
              {name}
            </Text>
            <Text
              style={[
                driversPageStyles.subText,
                isInactive && driversPageStyles.subTextInactive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {email || phone || "No contact information"}
            </Text>
          </View>

          <View
            style={[
              driversPageStyles.statusPill,
              status === "active"
                ? driversPageStyles.activePill
                : driversPageStyles.inactivePill,
            ]}
          >
            <Text
              style={[
                driversPageStyles.statusText,
                status === "active"
                  ? driversPageStyles.activeText
                  : driversPageStyles.inactiveText,
              ]}
            >
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        {status === "active" && (
          <View style={driversPageStyles.cardStats}>
            <View style={driversPageStyles.statItem}>
              <Text style={driversPageStyles.statNumber}>{vehicles}</Text>
              <Text style={driversPageStyles.statLabel}>Vehicles</Text>
            </View>
            <View style={driversPageStyles.statItem}>
              <Text style={driversPageStyles.statNumber}>{routes}</Text>
              <Text style={driversPageStyles.statLabel}>Routes</Text>
            </View>
            <View style={driversPageStyles.statItem}>
              <Text style={driversPageStyles.statNumber}>{students}</Text>
              <Text style={driversPageStyles.statLabel}>Students</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Prepare data for FlatList: last 3 active + divider + all inactive
  const activeDrivers = filteredDrivers.filter((driver: any) => {
    const status =
      driver.status ||
      ((driver.vehicles?.length ?? driver.raw?.vehicles?.length ?? 0) > 0
        ? "active"
        : "inactive");
    return status === "active";
  });
  const last3Active = activeDrivers.slice(-3);
  const inactiveDrivers = filteredDrivers.filter((driver: any) => {
    const status =
      driver.status ||
      ((driver.vehicles?.length ?? driver.raw?.vehicles?.length ?? 0) > 0
        ? "active"
        : "inactive");
    return status !== "active";
  });
  const combinedDriverList = [
    ...last3Active,
    ...(inactiveDrivers.length > 0 ? [{ isDivider: true }] : []),
    ...inactiveDrivers,
  ];

  /* ---------------- LOADING ---------------- */
  if (loadingDrivers && drivers.length === 0) {
    return <Loading renderHeader={renderHeader} title="Loading drivers..." />;
  }

  /* ---------------- ERROR ---------------- */
  if (error) {
    return (
      <Error
        renderHeader={renderHeader}
        refresh={refreshDrivers}
        errorText={error}
      />
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <SafeAreaView
      style={[driversPageStyles.container, { marginBottom: 80 }]}
      edges={["bottom"]}
    >
      {renderHeader()}
      <View style={driversPageStyles.statusCardsRow}>
        <View style={driversPageStyles.statusCard}>
          <Text style={driversPageStyles.statusCardNumber}>
            {activeDriversCount}
          </Text>
          <Text style={driversPageStyles.statusCardLabel}>On Duty</Text>
        </View>
        <View style={driversPageStyles.statusCard}>
          <Text style={driversPageStyles.statusCardNumber}>
            {availableDriversCount}
          </Text>
          <Text style={driversPageStyles.statusCardLabel}>Available</Text>
        </View>
        <View style={driversPageStyles.statusCard}>
          <Text style={driversPageStyles.statusCardNumber}>
            {offDutyDriversCount}
          </Text>
          <Text style={driversPageStyles.statusCardLabel}>Off Duty</Text>
        </View>
        <View style={driversPageStyles.statusCard}>
          <Text style={driversPageStyles.statusCardNumber}>
            {inactiveDriversCount}
          </Text>
          <Text style={driversPageStyles.statusCardLabel}>Inactive</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={driversPageStyles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={driversPageStyles.searchIcon}
        />
        <TextInput
          style={driversPageStyles.searchInput}
          placeholder="Search drivers by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={driversPageStyles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={combinedDriverList}
        keyExtractor={(item, index) =>
          item.isDivider ? "divider" : item.id || `driver-${index}`
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !loadingDrivers ? (
            <View style={driversPageStyles.emptyState}>
              <Text style={driversPageStyles.emptyTitle}>
                {searchQuery ? "No drivers found" : "No drivers available"}
              </Text>
              <Text style={driversPageStyles.emptyBody}>
                {searchQuery
                  ? `No drivers match "${searchQuery}". Try a different search term.`
                  : "Add your first driver or refresh to load the latest list."}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={driversPageStyles.refreshButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={driversPageStyles.refreshButtonText}>
                    Clear Search
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={driversPageStyles.refreshButton}
                  onPress={() => refreshDrivers(true)}
                >
                  <Text style={driversPageStyles.refreshButtonText}>
                    Refresh
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={[
          driversPageStyles.list,
          filteredDrivers.length === 0 && driversPageStyles.listEmptyContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loadingDrivers}
            onRefresh={() => refreshDrivers(true)}
          />
        }
      />

      {/* ---------------- MODAL ---------------- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={driversPageStyles.modalOverlay}>
          <View style={driversPageStyles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDriver && (
                <>
                  {(() => {
                    const user = selectedDriver.raw?.users;
                    const name = selectedDriver.name || user?.name || "Driver";
                    const email = selectedDriver.email || user?.email || "";
                    const phone = selectedDriver.phone || user?.phone || "";
                    const license =
                      formatLicense(selectedDriver.vehicle_plate_number) ||
                      formatLicense(selectedDriver.raw?.vehicle_plate_number) ||
                      formatLicense(selectedDriver.raw?.licenseNumber) ||
                      "";
                    const joined =
                      selectedDriver.created_at ||
                      selectedDriver.raw?.created_at ||
                      selectedDriver.raw?.createdAt ||
                      "";
                    const vehiclesCount =
                      selectedDriver.vehicles?.length ??
                      selectedDriver.raw?.vehicles?.length ??
                      0;
                    const routes =
                      selectedDriver.routes ?? selectedDriver.raw?.routes ?? 0;
                    const students =
                      selectedDriver.students ??
                      selectedDriver.raw?.students ??
                      0;
                    const assignedVehicles =
                      selectedDriver.vehicles ||
                      selectedDriver.raw?.vehicles ||
                      [];

                    return (
                      <>
                        {/* HEADER PROFILE */}
                        <View style={driversPageStyles.modalHeader}>
                          <View style={driversPageStyles.avatar}>
                            {selectedDriver.avatar ? (
                              <Image
                                source={{ uri: selectedDriver.avatar }}
                                style={driversPageStyles.avatarImg}
                              />
                            ) : (
                              <Text style={driversPageStyles.avatarText}>
                                {getInitials(name)}
                              </Text>
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={driversPageStyles.modalTitle}>
                              {name}
                            </Text>

                            {email ? (
                              <View style={driversPageStyles.profileRow}>
                                <Ionicons
                                  name="mail"
                                  size={14}
                                  color="#9CA3AF"
                                />
                                <Text style={driversPageStyles.profileText}>
                                  {email}
                                </Text>
                              </View>
                            ) : null}

                            {phone ? (
                              <View style={driversPageStyles.profileRow}>
                                <Ionicons
                                  name="call"
                                  size={14}
                                  color="#9CA3AF"
                                />
                                <Text style={driversPageStyles.profileText}>
                                  {phone}
                                </Text>
                              </View>
                            ) : null}

                            <View style={driversPageStyles.profileRow}>
                              <Ionicons name="card" size={14} color="#9CA3AF" />
                              <Text style={driversPageStyles.profileText}>
                                License: {license || "Not provided"}
                              </Text>
                            </View>

                            <View style={driversPageStyles.profileRow}>
                              <Ionicons
                                name="calendar"
                                size={14}
                                color="#9CA3AF"
                              />
                              <Text style={driversPageStyles.profileText}>
                                Joined: {joined?.slice(0, 10) || "Unknown"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* INFO */}
                        <View style={driversPageStyles.infoCard}>
                          <View style={driversPageStyles.modalRow}>
                            <Ionicons name="pulse" size={16} color="#7ED321" />
                            <Text style={driversPageStyles.label}>Status</Text>
                            <Text style={driversPageStyles.value}>
                              {selectedDriver.status?.toUpperCase() || "N/A"}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons name="car" size={16} color="#7ED321" />
                            <Text style={driversPageStyles.label}>
                              Vehicles
                            </Text>
                            <Text style={driversPageStyles.value}>
                              {vehiclesCount}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons name="bus" size={16} color="#7ED321" />
                            <Text style={driversPageStyles.label}>Routes</Text>
                            <Text style={driversPageStyles.value}>
                              {routes}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons name="people" size={16} color="#7ED321" />
                            <Text style={driversPageStyles.label}>
                              Students
                            </Text>
                            <Text style={driversPageStyles.value}>
                              {students}
                            </Text>
                          </View>
                        </View>

                        {/* VEHICLES */}
                        <Text style={driversPageStyles.sectionTitle}>
                          Assigned Vehicles
                        </Text>

                        <View style={driversPageStyles.infoCard}>
                          {assignedVehicles?.length > 0 ? (
                            assignedVehicles.map((v: any, i: number) => (
                              <View key={i} style={driversPageStyles.modalRow}>
                                <Ionicons
                                  name="car-sport"
                                  size={16}
                                  color="#7ED321"
                                />
                                <Text style={driversPageStyles.value}>
                                  {v.name ||
                                    v.plate ||
                                    v.license_plate ||
                                    "Vehicle"}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={driversPageStyles.modalText}>
                              No vehicles assigned
                            </Text>
                          )}
                        </View>

                        {/* CLOSE */}
                        <TouchableOpacity
                          style={driversPageStyles.closeBtn}
                          onPress={closeModal}
                        >
                          <Text style={driversPageStyles.closeText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DriversScreen;
