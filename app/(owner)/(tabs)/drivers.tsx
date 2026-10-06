import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../../../styles/theme";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { driversPageStyles as baseDriversPageStyles } from "../ownerHelpers/styles/ownerStyles";
import {
  formatLicense,
  getInitials,
} from "../ownerHelpers/actionHelpers/actions";
import Loading from "../ownerHelpers/components/Loading";
import Error from "../ownerHelpers/components/Error";

const getDriverStatus = (driver: any) => {
  const vehicleCount =
    driver.vehicles?.length ?? driver.raw?.vehicles?.length ?? 0;
  return String(
    driver.status || (vehicleCount > 0 ? "active" : "inactive"),
  ).toLowerCase();
};

const DriversScreen = () => {
  const router = useRouter();
  const { colors, getBrandColors, shadows } = useTheme();
  const ownerColors = getBrandColors("owner");
  const driversPageStyles: Record<string, any> = {
    ...baseDriversPageStyles,
    container: [
      baseDriversPageStyles.container,
      { backgroundColor: colors.background },
    ],
    statusCard: [
      baseDriversPageStyles.statusCard,
      { backgroundColor: colors.surface },
      shadows.sm,
    ],
    statusCardNumber: [
      baseDriversPageStyles.statusCardNumber,
      { color: colors.text.primary },
    ],
    statusCardLabel: [
      baseDriversPageStyles.statusCardLabel,
      { color: colors.text.secondary },
    ],
    searchContainer: [
      baseDriversPageStyles.searchContainer,
      { backgroundColor: colors.surface, borderColor: "#D8E7F6" },
      baseDriversPageStyles.searchContainerCompact,
    ],
    searchInput: [
      baseDriversPageStyles.searchInput,
      { color: colors.text.primary },
    ],
    card: [
      baseDriversPageStyles.card,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ],
    name: [baseDriversPageStyles.name, { color: colors.text.primary }],
    subText: [baseDriversPageStyles.subText, { color: colors.text.secondary }],
    avatarCircle: [
      baseDriversPageStyles.avatarCircle,
      { backgroundColor: "#E9F2FC" },
    ],
    avatarText: [
      baseDriversPageStyles.avatarText,
      { color: ownerColors.primaryDark },
    ],
    activePill: [
      baseDriversPageStyles.activePill,
      { backgroundColor: colors.secondary },
    ],
    activeText: [
      baseDriversPageStyles.activeText,
      { color: ownerColors.primaryDark },
    ],
    inactivePill: [
      baseDriversPageStyles.inactivePill,
      { backgroundColor: colors.surfaceHover },
    ],
    inactiveText: [
      baseDriversPageStyles.inactiveText,
      { color: colors.text.secondary },
    ],
    statItem: [
      baseDriversPageStyles.statItem,
      { backgroundColor: colors.surfaceHover },
    ],
    statNumber: [
      baseDriversPageStyles.statNumber,
      { color: colors.text.primary },
    ],
    statLabel: [
      baseDriversPageStyles.statLabel,
      { color: colors.text.secondary },
    ],
    emptyState: [
      baseDriversPageStyles.emptyState,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ],
    emptyTitle: [
      baseDriversPageStyles.emptyTitle,
      { color: colors.text.primary },
    ],
    emptyBody: [
      baseDriversPageStyles.emptyBody,
      { color: colors.text.secondary },
    ],
    refreshButton: [
      baseDriversPageStyles.refreshButton,
      { backgroundColor: ownerColors.primary },
    ],
    dividerLine: [
      baseDriversPageStyles.dividerLine,
      { backgroundColor: colors.divider },
    ],
    dividerText: [
      baseDriversPageStyles.dividerText,
      { color: colors.text.secondary },
    ],
    modalContainer: [
      baseDriversPageStyles.modalContainer,
      { backgroundColor: colors.surface },
    ],
    avatar: [
      baseDriversPageStyles.avatar,
      { backgroundColor: ownerColors.primary },
    ],
    modalTitle: [
      baseDriversPageStyles.modalTitle,
      { color: colors.text.primary },
    ],
    profileText: [
      baseDriversPageStyles.profileText,
      { color: colors.text.secondary },
    ],
    infoCard: [
      baseDriversPageStyles.infoCard,
      { backgroundColor: colors.surfaceHover },
    ],
    label: [baseDriversPageStyles.label, { color: colors.text.secondary }],
    value: [baseDriversPageStyles.value, { color: colors.text.primary }],
    modalText: [
      baseDriversPageStyles.modalText,
      { color: colors.text.secondary },
    ],
    closeBtn: [baseDriversPageStyles.closeBtn, { backgroundColor: "#1769D2" }],
  };
  const { drivers, loadingDrivers, error, refreshDrivers } = useDrivers();

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");

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

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={driversPageStyles.headerSafeArea}>
      <View style={driversPageStyles.managementHeaderRow}>
        <TouchableOpacity
          style={driversPageStyles.headerButton}
          onPress={() => router.push("/(owner)/(tabs)")}
          accessibilityLabel="Back to dashboard"
        >
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={driversPageStyles.managementHeaderTitle}>Drivers</Text>
        <View style={driversPageStyles.headerSpacer} />
        <TouchableOpacity
          style={driversPageStyles.headerButton}
          onPress={() => router.push("/add-driver")}
          accessibilityLabel="Add driver"
        >
          <MaterialIcons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const filteredDrivers = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    if (!searchQuery.trim()) {
      return list;
    }
    const query = searchQuery.toLowerCase();
    return list.filter((driver: any) => {
      const name = driver.name || driver.raw?.users?.name || "";
      const email = driver.email || driver.raw?.users?.email || "";
      const phone = driver.phone || driver.raw?.users?.phone || "";
      const license = driver.vehicle_plate_number || "";
      return [name, email, phone, license].some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [drivers, searchQuery]);

  const statusFilteredDrivers = useMemo(
    () =>
      filteredDrivers.filter((driver: any) => {
        const status = getDriverStatus(driver);
        return statusFilter === "All" || status === statusFilter.toLowerCase();
      }),
    [filteredDrivers, statusFilter],
  );
  const activeDriversCount = drivers.filter((driver: any) => {
    return getDriverStatus(driver) === "active";
  }).length;
  const inactiveDriversCount = drivers.length - activeDriversCount;

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
    const phone = item.phone || item.raw?.users?.phone || "";
    const vehicles = item.vehicles?.length ?? item.raw?.vehicles?.length ?? 0;
    const routes = item.routes ?? item.raw?.routes ?? 0;
    const students = item.students ?? item.raw?.students ?? 0;
    const status = getDriverStatus(item);
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
              {phone || "No phone number"}
            </Text>
            <View style={driversPageStyles.iconRow}>
              <MaterialIcons name="directions-car" size={13} color="#71869C" />
              <Text style={driversPageStyles.subText} numberOfLines={1}>
                {item.vehicle?.license_plate ||
                  item.vehicles?.[0]?.license_plate ||
                  item.raw?.vehicles?.[0]?.license_plate ||
                  "No vehicle assigned"}
              </Text>
            </View>
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

        <View style={driversPageStyles.cardStats}>
          {vehicles > 0 && (
            <View style={driversPageStyles.statItem}>
              <Text style={driversPageStyles.statNumber}>{vehicles}</Text>
              <Text style={driversPageStyles.statLabel}>Vehicles</Text>
            </View>
          )}
          <View style={driversPageStyles.statItem}>
            <Text style={driversPageStyles.statNumber}>{routes}</Text>
            <Text style={driversPageStyles.statLabel}>Routes</Text>
          </View>
          <View style={driversPageStyles.statItem}>
            <Text style={driversPageStyles.statNumber}>{students}</Text>
            <Text style={driversPageStyles.statLabel}>Students</Text>
          </View>
          <MaterialIcons name="chevron-right" size={21} color="#71869C" />
        </View>
      </TouchableOpacity>
    );
  };

  // Keep active and inactive drivers visually grouped while honoring the filter.
  const activeDrivers = statusFilteredDrivers.filter(
    (driver: any) => getDriverStatus(driver) === "active",
  );
  const inactiveDrivers = statusFilteredDrivers.filter(
    (driver: any) => getDriverStatus(driver) !== "active",
  );
  const combinedDriverList = [
    ...activeDrivers,
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
    <SafeAreaView style={driversPageStyles.container} edges={["bottom"]}>
      {renderHeader()}
      <View style={driversPageStyles.searchRow}>
        <View style={driversPageStyles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.text.secondary}
            style={driversPageStyles.searchIcon}
          />
          <TextInput
            style={driversPageStyles.searchInput}
            placeholder="Search by name, phone or license..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={driversPageStyles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={driversPageStyles.filterButton}
          onPress={() =>
            setStatusFilter((current) =>
              current === "All"
                ? "Active"
                : current === "Active"
                  ? "Inactive"
                  : "All",
            )
          }
          accessibilityLabel={`Filter drivers, currently showing ${statusFilter.toLowerCase()}`}
        >
          <MaterialIcons name="filter-list" size={20} color="#1769D2" />
        </TouchableOpacity>
      </View>
      <View style={driversPageStyles.filterRow}>
        {(["All", "Active", "Inactive"] as const).map((filter) => {
          const count =
            filter === "All"
              ? drivers.length
              : filter === "Active"
                ? activeDriversCount
                : inactiveDriversCount;
          const selected = statusFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                driversPageStyles.filterChip,
                selected && driversPageStyles.filterChipSelected,
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  driversPageStyles.filterChipText,
                  selected && driversPageStyles.filterChipTextSelected,
                ]}
              >
                {filter} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
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
                {searchQuery
                  ? "No drivers found"
                  : statusFilter !== "All"
                    ? `No ${statusFilter.toLowerCase()} drivers`
                    : "No drivers available"}
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
          statusFilteredDrivers.length === 0 &&
            driversPageStyles.listEmptyContainer,
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
                                  color={colors.text.tertiary}
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
                                  color={colors.text.tertiary}
                                />
                                <Text style={driversPageStyles.profileText}>
                                  {phone}
                                </Text>
                              </View>
                            ) : null}

                            <View style={driversPageStyles.profileRow}>
                              <Ionicons
                                name="card"
                                size={14}
                                color={colors.text.tertiary}
                              />
                              <Text style={driversPageStyles.profileText}>
                                License: {license || "Not provided"}
                              </Text>
                            </View>

                            <View style={driversPageStyles.profileRow}>
                              <Ionicons
                                name="calendar"
                                size={14}
                                color={colors.text.tertiary}
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
                            <Ionicons
                              name="pulse"
                              size={16}
                              color={ownerColors.primary}
                            />
                            <Text style={driversPageStyles.label}>Status</Text>
                            <Text style={driversPageStyles.value}>
                              {selectedDriver.status?.toUpperCase() || "N/A"}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons
                              name="car"
                              size={16}
                              color={ownerColors.primary}
                            />
                            <Text style={driversPageStyles.label}>
                              Vehicles
                            </Text>
                            <Text style={driversPageStyles.value}>
                              {vehiclesCount}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons
                              name="bus"
                              size={16}
                              color={ownerColors.primary}
                            />
                            <Text style={driversPageStyles.label}>Routes</Text>
                            <Text style={driversPageStyles.value}>
                              {routes}
                            </Text>
                          </View>

                          <View style={driversPageStyles.modalRow}>
                            <Ionicons
                              name="people"
                              size={16}
                              color={ownerColors.primary}
                            />
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
                                  color={ownerColors.primary}
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
