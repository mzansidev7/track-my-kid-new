import ThemeToggle from "../../../components/ThemeToggle";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useContext, useState, useEffect } from "react";
import {
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useOwnerProfile } from "../ownerHelpers/hooks/useOwnerProfile";
import { AuthContext } from "../../../context/authContext/auth-context";
import Loading from "../ownerHelpers/components/Loading";
import { ownersProfileStyles } from "../ownerHelpers/styles/ownerStyles";
import { LogoutModal } from "../ownerHelpers/components/Modals";
import { useDrivers } from "../ownerHelpers/hooks/useDrivers";
import { useOwnerVehicles } from "../ownerHelpers/hooks/useOwnerVehicles";
import { useRoutes } from "../ownerHelpers/hooks/useRoutes";

const OwnerProfile = () => {
  const router = useRouter();
  const { user, logout, driverMode, toggleDriverMode } =
    useContext(AuthContext);
  const { owner, loading, error, refreshOwner } = useOwnerProfile();
  const { drivers } = useDrivers();
  const { vehicles } = useOwnerVehicles();
  const { allRoutes } = useRoutes();
  const profileUser = owner || user?.userData;
  const [pickupNotifications, setPickupNotifications] = useState(true);
  const [dropOffNotifications, setDropOffNotifications] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={ownersProfileStyles.safeArea}>
      <LinearGradient
        colors={["#17385F", "#17385F"]}
        style={ownersProfileStyles.pageHeader}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.push("/")}
          style={ownersProfileStyles.headerAction}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={ownersProfileStyles.pageHeaderTitle}>Owner Profile</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push("/(owner)/personal-info")}
          style={ownersProfileStyles.headerAction}
        >
          <Ionicons name="create-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );

  const locationParts = [
    profileUser?.address,
    profileUser?.city,
    profileUser?.province || profileUser?.state,
  ].filter((part): part is string => typeof part === "string" && !!part.trim());
  const profileLocation =
    (typeof profileUser?.location === "string" && profileUser.location) ||
    locationParts.join(", ") ||
    "Location not provided";
  const createdAt = profileUser?.created_at
    ? new Date(profileUser.created_at)
    : null;
  const memberSince =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString("en-ZA", {
          month: "short",
          year: "numeric",
        })
      : "Not available";

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);

    try {
      await logout();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    router.replace("/(auth)/home");
  };

  useEffect(() => {
    let mounted = true;
    const loadSub = async () => {
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const res = await fetch(`${baseUrl}/owner/subscriptions`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok && mounted) {
          const name = data.subscription?.subscription_plans?.name;
          setCurrentPlanName(name || null);
        }
      } catch {
        // ignore
      }
    };

    loadSub();
    return () => {
      mounted = false;
    };
  }, [user?.token]);

  if (loading) {
    return (
      <View style={ownersProfileStyles.container}>
        <Loading renderHeader={renderHeader} title="Fetching profile data..." />
        <LogoutModal
          showLogoutModal={showLogoutModal}
          // setShowLogoutModal={setShowLogoutModal},
          // confirmLogout={confirmLogout},
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={ownersProfileStyles.container}>
        {renderHeader()}

        <View style={ownersProfileStyles.loadingCenter}>
          <Text style={ownersProfileStyles.errorText}>{error}</Text>
          <TouchableOpacity
            style={ownersProfileStyles.retryBtn}
            onPress={refreshOwner}
          >
            <Text style={ownersProfileStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[ownersProfileStyles.logoutBtn, { margin: 16 }]}
          onPress={handleLogout}
        >
          <Text style={ownersProfileStyles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Modal
          visible={showLogoutModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={ownersProfileStyles.modalOverlay}>
            <View style={ownersProfileStyles.modalCard}>
              <Text style={ownersProfileStyles.modalTitle}>Confirm logout</Text>
              <Text style={ownersProfileStyles.modalMessage}>
                Are you sure you want to sign out of your owner account?
              </Text>
              <View style={ownersProfileStyles.modalActions}>
                <TouchableOpacity
                  style={[
                    ownersProfileStyles.modalButton,
                    ownersProfileStyles.modalCancelButton,
                  ]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={ownersProfileStyles.modalCancelText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    ownersProfileStyles.modalButton,
                    ownersProfileStyles.modalConfirmButton,
                  ]}
                  onPress={confirmLogout}
                >
                  <Text style={ownersProfileStyles.modalConfirmText}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={ownersProfileStyles.container}>
      {renderHeader()}

      <ScrollView
        style={ownersProfileStyles.profileScroll}
        contentContainerStyle={[
          ownersProfileStyles.content,
          ownersProfileStyles.scrollContent,
        ]}
      >
        <View style={ownersProfileStyles.profileSummary}>
          <View style={ownersProfileStyles.profileAvatarWrap}>
            {profileUser?.avatar ? (
              <Image
                source={{ uri: profileUser.avatar }}
                style={ownersProfileStyles.profileAvatar}
              />
            ) : (
              <View style={ownersProfileStyles.accountAvatar}>
                <Text style={ownersProfileStyles.accountAvatarText}>
                  {profileUser?.name?.charAt(0)?.toUpperCase() || "O"}
                </Text>
              </View>
            )}
          </View>
          <View style={ownersProfileStyles.profileIdentity}>
            <Text style={ownersProfileStyles.accountName}>
              {profileUser?.name || "Owner"}
            </Text>
            <Text style={ownersProfileStyles.accountRole}>Business Owner</Text>
            <View style={ownersProfileStyles.ownerBadge}>
              <Ionicons name="briefcase" size={13} color="#1769D2" />
              <Text style={ownersProfileStyles.ownerBadgeText}>Owner</Text>
            </View>
          </View>
        </View>

        <View style={ownersProfileStyles.contactCard}>
          <TouchableOpacity
            style={ownersProfileStyles.profileDetailRow}
            onPress={() => router.push("/(owner)/personal-info")}
          >
            <Ionicons
              name="mail-outline"
              size={21}
              color="#1769D2"
              style={ownersProfileStyles.detailIcon}
            />
            <View style={ownersProfileStyles.profileDetailText}>
              <Text style={ownersProfileStyles.detailLabel}>Email</Text>
              <Text style={ownersProfileStyles.detailValue}>
                {profileUser?.email || "Email not provided"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7890A8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={ownersProfileStyles.profileDetailRow}
            onPress={() => router.push("/(owner)/personal-info")}
          >
            <Ionicons
              name="call-outline"
              size={21}
              color="#1769D2"
              style={ownersProfileStyles.detailIcon}
            />
            <View style={ownersProfileStyles.profileDetailText}>
              <Text style={ownersProfileStyles.detailLabel}>Phone</Text>
              <Text style={ownersProfileStyles.detailValue}>
                {profileUser?.phone || "Phone not provided"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7890A8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={ownersProfileStyles.profileDetailRow}
            onPress={() => router.push("/(owner)/personal-info")}
          >
            <Ionicons
              name="location-outline"
              size={21}
              color="#1769D2"
              style={ownersProfileStyles.detailIcon}
            />
            <View style={ownersProfileStyles.profileDetailText}>
              <Text style={ownersProfileStyles.detailLabel}>Location</Text>
              <Text style={ownersProfileStyles.detailValue}>
                {profileLocation}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7890A8" />
          </TouchableOpacity>
          <View
            style={[
              ownersProfileStyles.profileDetailRow,
              ownersProfileStyles.lastProfileDetailRow,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={21}
              color="#1769D2"
              style={ownersProfileStyles.detailIcon}
            />
            <View style={ownersProfileStyles.profileDetailText}>
              <Text style={ownersProfileStyles.detailLabel}>Member Since</Text>
              <Text style={ownersProfileStyles.detailValue}>{memberSince}</Text>
            </View>
          </View>
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <View style={ownersProfileStyles.overviewHeading}>
            <Ionicons name="business-outline" size={21} color="#1769D2" />
            <Text style={ownersProfileStyles.sectionTitle}>
              Business Overview
            </Text>
          </View>
          <Text style={ownersProfileStyles.overviewDescription}>
            Manage your transport business, oversee operations, and keep your
            children safe.
          </Text>
          <View style={ownersProfileStyles.statsCard}>
            <View style={ownersProfileStyles.statItem}>
              <Ionicons name="people-outline" size={19} color="#1769D2" />
              <Text style={ownersProfileStyles.statValue}>{drivers.length}</Text>
              <Text style={ownersProfileStyles.statLabel}>Drivers</Text>
            </View>
            <View style={ownersProfileStyles.statDivider} />
            <View style={ownersProfileStyles.statItem}>
              <Ionicons name="car-outline" size={19} color="#1769D2" />
              <Text style={ownersProfileStyles.statValue}>
                {vehicles.length}
              </Text>
              <Text style={ownersProfileStyles.statLabel}>Vehicles</Text>
            </View>
            <View style={ownersProfileStyles.statDivider} />
            <View style={ownersProfileStyles.statItem}>
              <Ionicons name="git-branch-outline" size={19} color="#1769D2" />
              <Text style={ownersProfileStyles.statValue}>
                {allRoutes.length}
              </Text>
              <Text style={ownersProfileStyles.statLabel}>Routes</Text>
            </View>
          </View>
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <Text style={ownersProfileStyles.sectionTitle}>Account</Text>
          <View
            style={[
              ownersProfileStyles.settingRow,
              ownersProfileStyles.lastSettingRow,
            ]}
          >
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Driver Mode
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Enable driver features and self-assign vehicles.
              </Text>
            </View>
            <Switch
              value={driverMode}
              onValueChange={toggleDriverMode}
              thumbColor={driverMode ? "#1769D2" : "#f4f3f4"}
              trackColor={{ false: "#AAB8C5", true: "#8BB8E8" }}
            />
          </View>
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <Text style={ownersProfileStyles.sectionTitle}>
            Subscription & Billing
          </Text>
          <TouchableOpacity
            style={ownersProfileStyles.settingRow}
            onPress={() => router.push("/(owner)/subscriptions")}
          >
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Manage Subscription
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  maxWidth: 230,
                  marginTop: 4,
                }}
              >
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "700" },
                  ]}
                >
                  • Current Plan:{" "}
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400" },
                  ]}
                >
                  {" "}
                  {currentPlanName || "Free / Starter"}
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Upgrade Plan
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Payment Method
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Billing History
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Invoices
                </Text>
                <Text
                  style={[
                    ownersProfileStyles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Cancel Subscription
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={ownersProfileStyles.settingRow}
            onPress={() => router.push("/(owner)/workflows")}
          >
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Operations Center
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Review dispatches, compliance, billing, and client workflows
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={ownersProfileStyles.settingRow}
            onPress={() => router.push("/(owner)/payments")}
          >
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Manage Payouts
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Connect Stripe and receive client payments
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <Text style={ownersProfileStyles.sectionTitle}>Notifications</Text>
          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Pickup Notifications
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Updates when pickup starts
              </Text>
            </View>
            <Switch
              value={pickupNotifications}
              onValueChange={setPickupNotifications}
              thumbColor={pickupNotifications ? "#1769D2" : "#f4f3f4"}
              trackColor={{ false: "#AAB8C5", true: "#8BB8E8" }}
            />
          </View>

          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Drop-off Notifications
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Alerts when drop-off is near
              </Text>
            </View>
            <Switch
              value={dropOffNotifications}
              onValueChange={setDropOffNotifications}
              thumbColor={dropOffNotifications ? "#1769D2" : "#f4f3f4"}
              trackColor={{ false: "#AAB8C5", true: "#8BB8E8" }}
            />
          </View>

          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Delay Alerts
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Be notified about delays
              </Text>
            </View>
            <Switch
              value={delayAlerts}
              onValueChange={setDelayAlerts}
              thumbColor={delayAlerts ? "#1769D2" : "#f4f3f4"}
              trackColor={{ false: "#AAB8C5", true: "#8BB8E8" }}
            />
          </View>

          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Emergency Alerts
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Urgent updates for your account
              </Text>
            </View>
            <Switch
              value={emergencyAlerts}
              onValueChange={setEmergencyAlerts}
              thumbColor={emergencyAlerts ? "#1769D2" : "#f4f3f4"}
              trackColor={{ false: "#AAB8C5", true: "#8BB8E8" }}
            />
          </View>
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <Text style={ownersProfileStyles.sectionTitle}>Appearance</Text>
          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>Dark Mode</Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Use a darker theme for night viewing
              </Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        <TouchableOpacity
          style={ownersProfileStyles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={ownersProfileStyles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={ownersProfileStyles.modalOverlay}>
          <View style={ownersProfileStyles.modalCard}>
            <Text style={ownersProfileStyles.modalTitle}>Confirm logout</Text>
            <Text style={ownersProfileStyles.modalMessage}>
              Are you sure you want to sign out of your owner account?
            </Text>
            <View style={ownersProfileStyles.modalActions}>
              <TouchableOpacity
                style={[
                  ownersProfileStyles.modalButton,
                  ownersProfileStyles.modalCancelButton,
                ]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={ownersProfileStyles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  ownersProfileStyles.modalButton,
                  ownersProfileStyles.modalConfirmButton,
                ]}
                onPress={confirmLogout}
              >
                <Text style={ownersProfileStyles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OwnerProfile;
