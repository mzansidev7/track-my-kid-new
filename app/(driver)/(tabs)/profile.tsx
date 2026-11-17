import { useRouter } from "expo-router";
import React, { useContext, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "@/context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useDriverProfile } from "@/app-support/driver/driverHelpers/hooks/useDriverProfile";
import { DRIVER_COLORS, useDriverTheme } from "@/styles/theme";
import { signOut } from "@/functions/auth";
import DriverHeader from "@/app/(driver)/components/DriverHeader";

const DriverProfile = () => {
  const router = useRouter();
  const { logout } = useContext(AuthContext);
  const { driver, loading, error, refreshDriver } = useDriverProfile();
  const { colors } = useDriverTheme();

  const handleLogout = async () => {
    const userSignedOut = await signOut();
    if (userSignedOut.success) {
      logout();
      router.replace("/(auth)/home");
    }
  };

  const handleEditProfile = () => {
    router.push("/(driver)/pages/edit-profile" as never);
  };

  const getVehicleQrUri = useCallback((qr: unknown) => {
    if (!qr) return undefined;

    if (typeof qr === "object") {
      const qrObject = qr as Record<string, unknown>;
      return (
        (qrObject.dataUrl as string | undefined) ||
        (qrObject.uri as string | undefined)
      );
    }

    if (typeof qr === "string") {
      try {
        const parsed = JSON.parse(qr);
        if (typeof parsed === "object" && parsed) {
          return (
            ((parsed as Record<string, unknown>).dataUrl as
              | string
              | undefined) ||
            ((parsed as Record<string, unknown>).uri as string | undefined)
          );
        }
        return qr;
      } catch {
        return qr;
      }
    }

    return undefined;
  }, []);

  const formatExperience = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }

    if (typeof value === "number") {
      return `${value} year${value === 1 ? "" : "s"}`;
    }

    const text = String(value).trim();
    return text || "Not provided";
  };

  const formatDate = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return "Not provided";
    const dateValue = value.trim();
    const date = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? `${dateValue}T00:00:00`
        : dateValue,
    );
    return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString();
  };

  const formatAddress = (address: unknown) => {
    if (!address) return "Not provided";

    if (typeof address === "string") {
      return address.trim() || "Not provided";
    }

    if (typeof address === "object") {
      const addressObject = address as Record<string, unknown>;
      if (
        typeof addressObject.full_address === "string" &&
        addressObject.full_address.trim()
      ) {
        return addressObject.full_address.trim();
      }
      const values = [
        addressObject.street,
        addressObject.suburb,
        addressObject.city,
        addressObject.province,
        addressObject.postalCode || addressObject.postal_code,
        addressObject.country,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim());

      // Join with newline so the address displays on separate lines in React Native Text
      return values.length ? values.join("\n") : "Not provided";
    }

    return "Not provided";
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          localStyles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
        edges={["bottom", "top"]}
      >
        <DriverHeader
          title="Profile"
          subtitle="Manage your profile and account settings"
        />
        <View style={[localStyles.container, localStyles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[
          localStyles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
        edges={["bottom", "top"]}
      >
        <DriverHeader
          title="Profile"
          subtitle="Manage your profile and account settings"
        />
        <View style={[localStyles.container, localStyles.loadingContainer]}>
          <Text style={[localStyles.errorText, { color: colors.text.primary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={localStyles.retryButton}
            onPress={() => void refreshDriver()}
          >
            <Text style={localStyles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        localStyles.container,
        { backgroundColor: DRIVER_COLORS.background },
      ]}
      edges={["bottom", "top"]}
    >
      <DriverHeader
        title="Profile"
        subtitle="Manage your profile and account settings"
      />

      <ScrollView contentContainerStyle={localStyles.profileContent}>
        <LinearGradient
          colors={[
            DRIVER_COLORS.primaryDark,
            DRIVER_COLORS.primary,
            DRIVER_COLORS.primary,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={localStyles.profileHeroCard}
        >
          <View style={localStyles.heroGlowTop} />
          <View style={localStyles.heroGlowBottom} />
          <TouchableOpacity
            style={localStyles.heroEditButton}
            onPress={handleEditProfile}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <MaterialIcons
              name="edit"
              size={18}
              color={DRIVER_COLORS.primary}
            />
          </TouchableOpacity>

          <View style={localStyles.heroTopRow}>
            <View style={localStyles.profileAvatarWrapper}>
              {driver?.avatar ? (
                <Image
                  source={{
                    uri: driver?.avatar,
                  }}
                  style={localStyles.profileAvatar}
                />
              ) : (
                <Image
                  source={require("@/assets/images/driver.png")}
                  style={localStyles.profileAvatar}
                />
              )}
            </View>
            <View style={localStyles.heroInfo}>
              <Text style={localStyles.profileName} numberOfLines={1}>
                {driver?.user?.name || "Driver"}
              </Text>
              <View style={localStyles.statusRow}>
                <View
                  style={[
                    localStyles.activeBadge,
                    {
                      backgroundColor:
                        driver?.status === "active"
                          ? "rgba(34,197,94,0.18)"
                          : "rgba(248,113,113,0.18)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.activeBadgeText,
                      {
                        color:
                          driver?.status === "active" ? "#BBF7D0" : "#FECACA",
                      },
                    ]}
                  >
                    {driver?.status === "active" ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text style={localStyles.profileId}>
                Driver ID · {driver?.id?.slice(0, 10) || "Not available"}
              </Text>
              <Text style={localStyles.profileMeta} numberOfLines={2}>
                {formatAddress(driver?.address)}
              </Text>
            </View>
          </View>

          <View style={localStyles.heroStatsRow}>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="schedule" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Experience</Text>
              <Text style={localStyles.heroStatValue} numberOfLines={1}>
                {formatExperience(driver?.experience)}
              </Text>
            </View>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="phone" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Phone</Text>
              <Text style={localStyles.heroStatValue} numberOfLines={1}>
                {driver?.user?.phone || "Not provided"}
              </Text>
            </View>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="email" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Email</Text>
              <Text style={localStyles.heroStatValue} numberOfLines={2}>
                {driver?.user?.email || "Not provided"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={[localStyles.sectionCard, { backgroundColor: colors.surface }]}
        >
          <View style={localStyles.sectionHeader}>
            <MaterialIcons name="info" size={18} color={colors.primary} />
            <Text
              style={[localStyles.sectionTitle, { color: colors.text.primary }]}
            >
              Driver Information
            </Text>
          </View>
          <View style={localStyles.sectionRow}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons name="person" size={18} color={colors.primary} />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                Full Name
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {driver?.user?.name || "Not provided"}
            </Text>
          </View>
          <View style={localStyles.sectionRow}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons
                name="calendar-today"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                Date of Birth
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {formatDate(driver?.date_of_birth)}
            </Text>
          </View>
          <View style={localStyles.sectionRow}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons name="badge" size={18} color={colors.primary} />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                ID Number
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {driver?.id_number || "Not provided"}
            </Text>
          </View>
          <View style={localStyles.sectionRow}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons
                name="local-shipping"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                License Number
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {driver?.vehicle_plate_number || "Not provided"}
            </Text>
          </View>
          <View style={localStyles.sectionRow}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons name="event" size={18} color={colors.primary} />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                License Expiry
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {formatDate(driver?.licence_expiry)}
            </Text>
          </View>
          <View style={localStyles.sectionRowLast}>
            <View style={localStyles.rowLabelColumn}>
              <MaterialIcons name="place" size={18} color={colors.primary} />
              <Text
                style={[localStyles.rowLabel, { color: colors.text.primary }]}
              >
                Address
              </Text>
            </View>
            <Text
              style={[localStyles.rowValue, { color: colors.text.primary }]}
            >
              {formatAddress(driver?.address)}
            </Text>
          </View>
        </View>

        <View style={localStyles.vehicleSection}>
          <View
            style={[
              localStyles.sectionCard,
              localStyles.vehicleInfoCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={localStyles.sectionHeader}>
              <MaterialIcons
                name="directions-bus"
                size={19}
                color={colors.primary}
              />
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.text.primary },
                ]}
              >
                Vehicle Information
              </Text>
            </View>
            <View style={localStyles.sectionRow}>
              <View style={localStyles.rowLabelColumn}>
                <MaterialIcons
                  name="directions-car"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[localStyles.rowLabel, { color: colors.text.primary }]}
                >
                  Vehicle
                </Text>
              </View>
              <Text
                style={[localStyles.rowValue, { color: colors.text.primary }]}
              >
                {driver?.vehicle?.name || "No vehicle assigned"}
              </Text>
            </View>
            <View style={localStyles.sectionRow}>
              <View style={localStyles.rowLabelColumn}>
                <MaterialIcons
                  name="local-shipping"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[localStyles.rowLabel, { color: colors.text.primary }]}
                >
                  License Plate
                </Text>
              </View>
              <Text
                style={[localStyles.rowValue, { color: colors.text.primary }]}
              >
                {driver?.vehicle?.license_plate || "No vehicle assigned"}
              </Text>
            </View>
            <View style={localStyles.sectionRowLast}>
              <View style={localStyles.rowLabelColumn}>
                <MaterialIcons name="people" size={18} color={colors.primary} />
                <Text
                  style={[localStyles.rowLabel, { color: colors.text.primary }]}
                >
                  Capacity
                </Text>
              </View>
              <Text
                style={[localStyles.rowValue, { color: colors.text.primary }]}
              >
                {driver?.vehicle
                  ? `${driver.vehicle.capacity ?? "Not provided"} Seats`
                  : "No vehicle assigned"}
              </Text>
            </View>
          </View>

          <View
            style={[
              localStyles.sectionCard,
              localStyles.vehiclePhotoCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={localStyles.sectionHeader}>
              <MaterialIcons name="photo" size={19} color={colors.primary} />
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.text.primary },
                ]}
              >
                Vehicle Photo
              </Text>
            </View>

            {driver?.vehicle?.vehicle_images?.[0] ? (
              <Image
                source={{
                  uri:
                    typeof driver.vehicle.vehicle_images[0] === "string"
                      ? driver.vehicle.vehicle_images[0]
                      : driver.vehicle.vehicle_images[0]?.url ||
                        driver.vehicle.vehicle_images[0]?.uri,
                }}
                style={localStyles.vehicleImage}
              />
            ) : (
              <View style={localStyles.noQrContainer}>
                <MaterialIcons name="photo" size={80} color="#D1D5DB" />
                <Text style={localStyles.noQrText}>
                  No vehicle photo available
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              localStyles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={localStyles.sectionHeader}>
              <MaterialIcons
                name="qr-code-2"
                size={19}
                color={colors.primary}
              />
              <Text
                style={[
                  localStyles.sectionTitle,
                  { color: colors.text.primary },
                ]}
              >
                Vehicle QR Code
              </Text>
            </View>

            {driver?.vehicle?.vehicle_qr_code ? (
              <View style={localStyles.qrCodeContainer}>
                <Image
                  source={{
                    uri: getVehicleQrUri(driver.vehicle.vehicle_qr_code),
                  }}
                  style={localStyles.qrCodeImage}
                />
                <Text style={localStyles.qrCodeText}>
                  Scan to link parents or guardians to your vehicle for
                  real-time tracking.
                </Text>
              </View>
            ) : (
              <View style={localStyles.noQrContainer}>
                <MaterialIcons name="qr-code-2" size={80} color="#D1D5DB" />
                <Text style={localStyles.noQrText}>No QR Code Available</Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={[localStyles.sectionCard, { backgroundColor: colors.surface }]}
        >
          {[
            {
              label: "Change Password",
              icon: "lock",
              color: DRIVER_COLORS.muted,
              route: "/(driver)/pages/change-password",
            },
            {
              label: "Notification Settings",
              icon: "notifications",
              color: "#0EA5E9",
              route: "/(driver)/pages/notification-settings",
            },
            {
              label: "SOS Messages",
              icon: "sos",
              color: "#DC2626",
              route: "/(driver)/pages/sos-messages",
            },
            {
              label: "Help & Support",
              icon: "help-outline",
              color: "#8B5CF6",
              route: "/(driver)/pages/help",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={localStyles.menuRow}
              onPress={() => item.route && router.push(item.route as never)}
              activeOpacity={0.75}
            >
              <View style={localStyles.menuLabelRow}>
                <View
                  style={[
                    localStyles.menuIcon,
                    { backgroundColor: `${item.color}16` },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={19}
                    color={item.color}
                  />
                </View>
                <Text
                  style={[
                    localStyles.menuLabel,
                    { color: colors.text.primary },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[localStyles.menuRow, localStyles.logoutRow]}
            onPress={handleLogout}
          >
            <View style={localStyles.menuLabelRow}>
              <MaterialIcons name="logout" size={20} color="#EF4444" />
              <Text style={[localStyles.menuLabel, { color: "#EF4444" }]}>
                Log Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DriverProfile;

const localStyles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  profileContent: {
    paddingBottom: 128,
    paddingTop: 4,
    width: "100%",
    paddingHorizontal: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: DRIVER_COLORS.primary,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  headerAvatar: {
    width: 44,
    height: 44,
  },
  avatarOnlineSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: DRIVER_COLORS.primary,
  },

  profileHeroCard: {
    borderRadius: 26,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 10,
    overflow: "hidden",
    shadowColor: DRIVER_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    position: "relative",
  },
  heroGlowTop: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -118,
    right: -55,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroGlowBottom: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: 54,
    left: -100,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  profileAvatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.24)",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  heroInfo: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 36,
  },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 10,
  },
  activeBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  profileId: {
    color: "rgba(255,255,255,0.74)",
    marginTop: 7,
    fontSize: 11,
    fontWeight: "600",
  },
  profileMeta: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
  },
  profileRating: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  heroEditButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 20,
    gap: 8,
  },
  heroStatCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(4,25,20,0.18)",
    borderRadius: 15,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    marginTop: 8,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  sectionCard: {
    marginHorizontal: 0,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    paddingHorizontal: 18,
    paddingVertical: 19,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: DRIVER_COLORS.cardBorder,
  },
  sectionRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  rowLabelColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  vehicleSection: {},
  vehicleInfoCard: {
    marginBottom: 16,
    width: "100%",
  },
  vehiclePhotoCard: {
    paddingBottom: 20,
  },
  vehicleImage: {
    width: "100%",
    height: 130,
    borderRadius: 18,
    marginTop: 14,
  },
  vehiclePhotoAction: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  vehiclePhotoText: {
    fontSize: 13,
    fontWeight: "700",
  },
  qrCodeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  qrCodeImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginBottom: 10,
  },
  qrCodeText: {
    fontSize: 13,
    color: DRIVER_COLORS.muted,
    textAlign: "center",
  },
  noQrContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noQrText: {
    marginTop: 10,
    fontSize: 14,
    color: DRIVER_COLORS.muted,
  },
  documentsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },
  documentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  documentCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
    padding: 14,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    marginBottom: 12,
  },
  documentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  documentValid: {
    color: DRIVER_COLORS.muted,
    fontSize: 12,
  },
  documentValidDate: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  documentVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  documentVerifiedText: {
    fontSize: 12,
    color: DRIVER_COLORS.success,
    fontWeight: "700",
  },
  menuCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: "rgba(15,157,88,0.08)",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: DRIVER_COLORS.cardBorder,
  },
  logoutRow: {
    borderBottomWidth: 0,
  },
  menuLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
