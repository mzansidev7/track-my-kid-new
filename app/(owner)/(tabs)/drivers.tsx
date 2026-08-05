import React, { useEffect, useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useDrivers } from "../../../ownerHelpers/hooks/useDrivers";
import { useOwnerPageHeader } from "../../../ownerHelpers/hooks/useOwnerPageHeader";

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

  const getInitials = (name: string) =>
    String(name || "Driver")
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const formatLicense = (license: string | null | undefined) => {
    if (!license) return "";
    if (typeof license !== "string") return String(license);
    return license.startsWith("PENDING-") ? "" : license;
  };

  /* ---------------- DRIVER CARD ---------------- */
  const renderItem = ({ item }: any) => {
    // Handle divider
    if (item.isDivider) {
      return (
        <View style={styles.driverDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Inactive Drivers</Text>
          <View style={styles.dividerLine} />
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
        style={[styles.card, isInactive && styles.cardInactive]}
        activeOpacity={0.82}
        onPress={() => openDriver(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[
                  styles.avatarText,
                  isInactive && styles.avatarTextInactive,
                ]}
              >
                {getInitials(name)}
              </Text>
            )}
          </View>

          <View style={styles.cardMeta}>
            <Text style={[styles.name, isInactive && styles.nameInactive]}>
              {name}
            </Text>
            <Text
              style={[styles.subText, isInactive && styles.subTextInactive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {email || phone || "No contact information"}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              status === "active" ? styles.activePill : styles.inactivePill,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status === "active" ? styles.activeText : styles.inactiveText,
              ]}
            >
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        {status === "active" && (
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{vehicles}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{routes}</Text>
              <Text style={styles.statLabel}>Routes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{students}</Text>
              <Text style={styles.statLabel}>Students</Text>
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
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {renderHeader()}

        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {renderHeader()}

        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onPress={() => refreshDrivers(true)}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {renderHeader()}
      <View style={styles.statusCardsRow}>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardNumber}>{activeDriversCount}</Text>
          <Text style={styles.statusCardLabel}>On Duty</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardNumber}>{availableDriversCount}</Text>
          <Text style={styles.statusCardLabel}>Available</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardNumber}>{offDutyDriversCount}</Text>
          <Text style={styles.statusCardLabel}>Off Duty</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardNumber}>{inactiveDriversCount}</Text>
          <Text style={styles.statusCardLabel}>Inactive</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No drivers found" : "No drivers available"}
              </Text>
              <Text style={styles.emptyBody}>
                {searchQuery
                  ? `No drivers match "${searchQuery}". Try a different search term.`
                  : "Add your first driver or refresh to load the latest list."}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.refreshButtonText}>Clear Search</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => refreshDrivers(true)}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.list,
          filteredDrivers.length === 0 && styles.listEmptyContainer,
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
                        <View style={styles.modalHeader}>
                          <View style={styles.avatar}>
                            {selectedDriver.avatar ? (
                              <Image
                                source={{ uri: selectedDriver.avatar }}
                                style={styles.avatarImg}
                              />
                            ) : (
                              <Text style={styles.avatarText}>
                                {getInitials(name)}
                              </Text>
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>{name}</Text>

                            {email ? (
                              <View style={styles.profileRow}>
                                <Ionicons
                                  name="mail"
                                  size={14}
                                  color="#9CA3AF"
                                />
                                <Text style={styles.profileText}>{email}</Text>
                              </View>
                            ) : null}

                            {phone ? (
                              <View style={styles.profileRow}>
                                <Ionicons
                                  name="call"
                                  size={14}
                                  color="#9CA3AF"
                                />
                                <Text style={styles.profileText}>{phone}</Text>
                              </View>
                            ) : null}

                            <View style={styles.profileRow}>
                              <Ionicons name="card" size={14} color="#9CA3AF" />
                              <Text style={styles.profileText}>
                                License: {license || "Not provided"}
                              </Text>
                            </View>

                            <View style={styles.profileRow}>
                              <Ionicons
                                name="calendar"
                                size={14}
                                color="#9CA3AF"
                              />
                              <Text style={styles.profileText}>
                                Joined: {joined?.slice(0, 10) || "Unknown"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* INFO */}
                        <View style={styles.infoCard}>
                          <View style={styles.modalRow}>
                            <Ionicons name="pulse" size={16} color="#7ED321" />
                            <Text style={styles.label}>Status</Text>
                            <Text style={styles.value}>
                              {selectedDriver.status?.toUpperCase() || "N/A"}
                            </Text>
                          </View>

                          <View style={styles.modalRow}>
                            <Ionicons name="car" size={16} color="#7ED321" />
                            <Text style={styles.label}>Vehicles</Text>
                            <Text style={styles.value}>{vehiclesCount}</Text>
                          </View>

                          <View style={styles.modalRow}>
                            <Ionicons name="bus" size={16} color="#7ED321" />
                            <Text style={styles.label}>Routes</Text>
                            <Text style={styles.value}>{routes}</Text>
                          </View>

                          <View style={styles.modalRow}>
                            <Ionicons name="people" size={16} color="#7ED321" />
                            <Text style={styles.label}>Students</Text>
                            <Text style={styles.value}>{students}</Text>
                          </View>
                        </View>

                        {/* VEHICLES */}
                        <Text style={styles.sectionTitle}>
                          Assigned Vehicles
                        </Text>

                        <View style={styles.infoCard}>
                          {assignedVehicles?.length > 0 ? (
                            assignedVehicles.map((v: any, i: number) => (
                              <View key={i} style={styles.modalRow}>
                                <Ionicons
                                  name="car-sport"
                                  size={16}
                                  color="#7ED321"
                                />
                                <Text style={styles.value}>
                                  {v.name ||
                                    v.plate ||
                                    v.license_plate ||
                                    "Vehicle"}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.modalText}>
                              No vehicles assigned
                            </Text>
                          )}
                        </View>

                        {/* CLOSE */}
                        <TouchableOpacity
                          style={styles.closeBtn}
                          onPress={closeModal}
                        >
                          <Text style={styles.closeText}>Close</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  statusCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 18,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
  },
  statusCardNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  statusCardLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 4,
  },

  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  list: {
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: "#6B7280",
  },

  errorText: {
    fontSize: 15,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 14,
  },

  /* CARD */
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F8E5",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#166534",
    fontWeight: "800",
    fontSize: 15,
  },

  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  cardMeta: {
    flex: 1,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },

  activePill: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },

  inactivePill: {
    backgroundColor: "#F3F4F6",
  },

  activeText: {
    color: "#16A34A",
  },

  inactiveText: {
    color: "#6B7280",
  },

  cardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  statItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
  },

  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  summarySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  summaryMetrics: {
    flexDirection: "row",
    gap: 12,
  },

  metricBlock: {
    alignItems: "center",
  },

  metricNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
  },

  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyState: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },

  emptyBody: {
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },

  refreshButton: {
    backgroundColor: "#7ED321",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },

  refreshButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  subText: {
    fontSize: 13,
    color: "#6B7280",
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  /* STATUS */
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  active: {
    backgroundColor: "rgba(126,211,33,0.12)",
  },

  inactive: {
    backgroundColor: "#F3F4F6",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7ED321",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7ED321",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  profileText: {
    fontSize: 12,
    color: "#6B7280",
  },

  infoCard: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  label: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#6B7280",
  },

  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
  },

  modalText: {
    fontSize: 13,
    color: "#6B7280",
  },

  closeBtn: {
    marginTop: 18,
    backgroundColor: "#7ED321",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  closeText: {
    color: "#fff",
    fontWeight: "700",
  },
  cardInactive: {
    backgroundColor: "#F5F5F5",
    opacity: 0.7,
  },
  nameInactive: {
    color: "#999",
  },
  subTextInactive: {
    color: "#B0B0B0",
  },
  avatarTextInactive: {
    color: "#999",
  },
  driverDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    marginHorizontal: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  pageHeader: {
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  pageHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonText: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "700",
  },
});
