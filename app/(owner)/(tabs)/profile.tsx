import ThemeToggle from "../../../components/ThemeToggle";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerPageHeader } from "../ownerHelpers/hooks/useOwnerPageHeader";
import { resolveWorkingBaseUrl } from "../../../url";
import { useOwnerProfile } from "../ownerHelpers/hooks/useOwnerProfile";
import { AuthContext } from "../../../context/authContext/auth-context";
import Loading from "../ownerHelpers/components/Loading";
import { ownersProfileStyles } from "../ownerHelpers/styles/ownerStyles";
import { LogoutModal } from "../ownerHelpers/components/Modals";

const OwnerProfile = () => {
  const router = useRouter();
  const { user, logout, driverMode, toggleDriverMode } =
    useContext(AuthContext);
  const { owner, loading, error, refreshOwner } = useOwnerProfile();
  const profileUser = owner || user?.userData;
  const [pickupNotifications, setPickupNotifications] = useState(true);
  const [dropOffNotifications, setDropOffNotifications] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);

  const { renderHeader } = useOwnerPageHeader({
    title: "Profile & Settings",
    subtitle: "Manage your account and preferences",
    onBackPress: () => router.push("/"),
  });

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
        contentContainerStyle={[
          ownersProfileStyles.content,
          ownersProfileStyles.scrollContent,
        ]}
      >
        <View style={ownersProfileStyles.accountCard}>
          {owner?.name ? (
            <>
              {owner?.avatar ? (
                <View style={ownersProfileStyles.accountAvatar}>
                  <Image
                    source={{ uri: owner.avatar }}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                  />
                </View>
              ) : (
                <View style={ownersProfileStyles.accountAvatar}>
                  <Text style={ownersProfileStyles.accountAvatarText}>
                    {profileUser?.name?.charAt(0)?.toUpperCase() || "O"}
                  </Text>
                </View>
              )}
              <View style={ownersProfileStyles.accountInfo}>
                <Text style={ownersProfileStyles.accountName}>
                  {profileUser?.name || "Owner"}
                </Text>
                <Text style={ownersProfileStyles.accountRole}>
                  Owner&apos;s Account
                </Text>
                <Text style={ownersProfileStyles.accountSince}>
                  Member since{" "}
                  {new Date(profileUser?.created_at).toLocaleDateString(
                    "en-ZA",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFF" />
            </>
          ) : null}
        </View>

        <View style={ownersProfileStyles.sectionCard}>
          <Text style={ownersProfileStyles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={ownersProfileStyles.settingRow}
            onPress={() => router.push("/(owner)/personal-info")}
          >
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Edit Profile
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                Update your account details
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>
                Phone Number
              </Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                {profileUser?.phone || "+1 (555) 123-4567"}
              </Text>
            </View>
          </View>

          <View style={ownersProfileStyles.settingRow}>
            <View>
              <Text style={ownersProfileStyles.settingRowTitle}>Email</Text>
              <Text style={ownersProfileStyles.settingRowSubtitle}>
                {profileUser?.email || "owner@example.com"}
              </Text>
            </View>
          </View>

          <View style={ownersProfileStyles.settingRow}>
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
              thumbColor={driverMode ? "#357ABD" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
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
              thumbColor={pickupNotifications ? "#357ABD" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
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
              thumbColor={dropOffNotifications ? "#357ABD" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
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
              thumbColor={delayAlerts ? "#357ABD" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
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
              thumbColor={emergencyAlerts ? "#357ABD" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
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
