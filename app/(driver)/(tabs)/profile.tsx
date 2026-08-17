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
import { useDriverProfile } from "@/driverHelpers/hooks/useDriverProfile";
import { useTheme } from "@/styles/theme";
import { signOut } from "@/functions/auth";
import DriverHeader from "@/components/driver/DriverHeader";

const DriverProfile = () => {
  const router = useRouter();
  const { logout } = useContext(AuthContext);
  const { driver, loading, error } = useDriverProfile();
  const { colors } = useTheme();

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

  const formatAddress = (address: unknown) => {
    if (!address) return "Not provided";

    if (typeof address === "string") {
      return address.trim() || "Not provided";
    }

    if (typeof address === "object") {
      const addressObject = address as Record<string, unknown>;
      const values = [
        addressObject.street,
        addressObject.suburb,
        addressObject.city,
        addressObject.province,
        addressObject.postalCode,
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
        style={[localStyles.container, { backgroundColor: colors.background }]}
        edges={["bottom", "top"]}
      >
        <DriverHeader
          title="Profile"
          subtitle="Manage your profile and account settings"
          showBackButton={true}
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
        style={[localStyles.container, { backgroundColor: colors.background }]}
        edges={["bottom", "top"]}
      >
        <DriverHeader
          title="Profile"
          subtitle="Manage your profile and account settings"
          showBackButton={true}
        />
        <View style={[localStyles.container, localStyles.loadingContainer]}>
          <Text style={[localStyles.errorText, { color: colors.text.primary }]}>
            Unable to load profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[localStyles.container, { backgroundColor: colors.background }]}
      edges={["bottom", "top"]}
    >
      <DriverHeader
        title="Profile"
        subtitle="Manage your profile and account settings"
        showBackButton={true}
      />

      {/* Devider */}
      <View style={localStyles.divider} />
      <ScrollView contentContainerStyle={localStyles.profileContent}>
        <LinearGradient
          colors={["#061A3A", "#061A3A", "#061A3A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={localStyles.profileHeroCard}
        >
          <TouchableOpacity
            style={localStyles.heroEditButton}
            onPress={handleEditProfile}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={18} color="#0F9D58" />
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
              <View style={localStyles.avatarOnlineSmall} />
            </View>
            <View style={localStyles.heroInfo}>
              <Text style={localStyles.profileName}>{driver?.user?.name}</Text>
              <View style={localStyles.statusRow}>
                <View
                  style={[
                    localStyles.activeBadge,
                    {
                      borderColor:
                        driver?.status === "active" ? "#22C55E" : "#EF4444",
                      backgroundColor: "white",
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.activeBadgeText,
                      {
                        color:
                          driver?.status === "active" ? "#22C55E" : "#EF4444",
                      },
                    ]}
                  >
                    {driver?.status === "active" ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Text style={localStyles.profileId}>
                  Driver ID: {driver?.id?.slice(0, 10)}
                </Text>
              </View>
              <Text style={localStyles.profileMeta}>
                {formatAddress(driver?.address)}
              </Text>
              <View style={localStyles.ratingRow}>
                <MaterialIcons name="star" size={14} color="#FBBF24" />
                <Text style={localStyles.profileRating}>4.8 (128 reviews)</Text>
              </View>
            </View>
          </View>

          <View style={localStyles.heroStatsRow}>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="schedule" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Experience</Text>
              <Text style={localStyles.heroStatValue}>5 years</Text>
            </View>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="phone" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Phone</Text>
              <Text style={localStyles.heroStatValue}>
                {driver?.user?.phone || "Not provided"}
              </Text>
            </View>
            <View style={localStyles.heroStatCard}>
              <MaterialIcons name="email" size={20} color="#fff" />
              <Text style={localStyles.heroStatLabel}>Email</Text>
              <Text style={localStyles.heroStatValue}>
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
              {driver?.date_of_birth || "Not provided"}
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
              {driver?.license_number || "Not provided"}
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
              {driver?.licence_expiry || "Not provided"}
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
            <Text
              style={[localStyles.sectionTitle, { color: colors.text.primary }]}
            >
              Vehicle Information
            </Text>
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
                {driver?.vehicle?.capacity || "No vehicle assigned"} Seats
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
            <Text
              style={[localStyles.sectionTitle, { color: colors.text.primary }]}
            >
              Vehicle Photo
            </Text>

            {driver?.vehicle?.vehicle_images?.[0] && (
              <Image
                source={{ uri: driver?.vehicle.vehicle_images[0].url }}
                style={localStyles.vehicleImage}
              />
            )}
            <View style={localStyles.noQrContainer}>
                <MaterialIcons name="photo" size={80} color="#D1D5DB" />
                <Text style={localStyles.noQrText}>No vehicle photo available</Text>
              </View>
          </View>

          <View
            style={[
              localStyles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[localStyles.sectionTitle, { color: colors.text.primary }]}
            >
              Vehicle QR Code
            </Text>

            {driver?.vehicle?.vehicle_qr_code ? (
              <View style={localStyles.qrCodeContainer}>
                <Image
                  source={{
                    uri: getVehicleQrUri(driver.vehicle.vehicle_qr_code),
                  }}
                  style={localStyles.qrCodeImage}
                />
                <Text style={localStyles.qrCodeText}>
                  Scan to view vehicle details
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
          <Text
            style={[
              localStyles.sectionTitle,
              { color: colors.text.primary, marginBottom: 12 },
            ]}
          >
            Documents
          </Text>
          <View
            style={[
              localStyles.documentGrid,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* {documents.map((doc) => (
              <View
                key={doc.id}
                style={[
                  localStyles.documentCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View
                  style={[
                    localStyles.documentIconBox,
                    { backgroundColor: doc.color + "33" },
                  ]}
                >
                  <MaterialIcons
                    name={doc.icon as any}
                    size={22}
                    color={doc.color}
                  />
                </View>
                <Text
                  style={[
                    localStyles.documentTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  {doc.title}
                </Text>
                <Text
                  style={[
                    localStyles.documentValid,
                    { color: colors.text.secondary },
                  ]}
                >
                  Valid until
                </Text>
                <Text
                  style={[
                    localStyles.documentValidDate,
                    { color: colors.text.primary },
                  ]}
                >
                  {doc.valid}
                </Text>
                <View style={localStyles.documentVerifiedRow}>
                  <View style={localStyles.verifiedDot} />
                  <Text
                    style={[
                      localStyles.documentVerifiedText,
                      { color: colors.text.primary },
                    ]}
                  >
                    Verified
                  </Text>
                </View>
              </View>
            ))} */}
          </View>
        </View>

        <View
          style={[localStyles.sectionCard, { backgroundColor: colors.surface }]}
        >
          {[
            { label: "Change Password", icon: "lock", route: "/(driver)/pages/change-password" },
            { label: "Notification Settings", icon: "notifications", route: "/(driver)/pages/notification-settings" },
            { label: "Help & Support", icon: "help-outline", route: "/(driver)/pages/help" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={localStyles.menuRow}
              onPress={() => item.route && router.push(item.route as never)}
            >
              <View style={localStyles.menuLabelRow}>
                <MaterialIcons
                  name={item.icon as any}
                  size={20}
                  color={colors.primary}
                />
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
    paddingBottom: 30,
    paddingTop: 0,
    width: "100%",
    paddingHorizontal: 0,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
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
    borderColor: "#061A3A",
  },

  profileHeroCard: {
    marginHorizontal: 0,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 0,
    overflow: "hidden",
    shadowColor: "#0F9D58",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    position: "relative",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  profileAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
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
    marginLeft: 16,
  },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
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
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    fontSize: 12,
  },
  profileMeta: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    fontSize: 13,
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
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 20,
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 10,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
  },
  sectionCard: {
    marginHorizontal: 0,
    marginTop: 10,
    borderRadius: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 0,
    borderColor: "rgba(15,157,88,0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,157,88,0.08)",
  },
  sectionRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
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
    borderColor: "rgba(15,157,88,0.24)",
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
    color: "#6B7280",
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
    color: "#6B7280",
  },
  documentsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,157,88,0.08)",
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
    borderColor: "rgba(15,157,88,0.08)",
    padding: 14,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
  },
  documentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
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
    color: "#6B7280",
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
    color: "#16A34A",
    fontWeight: "700",
  },
  menuCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,157,88,0.08)",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,157,88,0.08)",
  },
  logoutRow: {
    borderBottomWidth: 0,
  },
  menuLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
