import { clearUserFromAsyncStorage } from "../../../asyncStorage/authStore";
import ThemeToggle from "../../../components/ThemeToggle";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerPageHeader } from "../../../ownerHelpers/hooks/useOwnerPageHeader";
import { resolveWorkingBaseUrl } from "../../../url";
import { useOwnerProfile } from "../../../ownerHelpers/hooks/useOwnerProfile";
import { AuthContext } from "../../../authContext/auth-context";

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
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);

  const { renderHeader } = useOwnerPageHeader({
    title: "Profile & Settings",
    subtitle: "Manage your account and preferences",
    onBackPress: () => router.push("/"),
  });

  const handleLogout = async () => {
    console.log("Logout initiated");
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    // const result = await logout();
    const results = await clearUserFromAsyncStorage();

    console;
    if (results) {
      console.log("Logout successful, navigating to auth screen");
      // router.push("/screens/auth");
    }
  };

  const setingProfileHeader = () => (
    <View style={styles.header}>
      {profileUser?.name && (
        <TouchableOpacity
          style={styles.accountCard}
          activeOpacity={0.85}
          onPress={() => router.push("/(owner)/personal-info")}
        >
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {profileUser?.name?.charAt(0)?.toUpperCase() || "O"}
            </Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>
              {profileUser?.name || "Owner"}
            </Text>
            {/* <Text style={styles.accountRole}>Parent Account</Text>
            <Text style={styles.accountSince}>Member since 2024</Text> */}
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );

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
      } catch (e) {
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
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Fetching profile data...</Text>
        </View>
        <Modal
          visible={showLogoutModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm logout</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to sign out of your owner account?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.modalConfirmText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}

        <View style={styles.loadingCenter}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refreshOwner}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { margin: 16 }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Modal
          visible={showLogoutModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm logout</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to sign out of your owner account?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.modalConfirmText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        {profileUser?.name && (
          <TouchableOpacity
            style={styles.accountCard}
            activeOpacity={0.85}
            // onPress={() => router.push("/(owner)/personal-info")}
          >
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {profileUser?.name?.charAt(0)?.toUpperCase() || "O"}
              </Text>
            </View>

            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>
                {profileUser?.name || "Owner"}
              </Text>
              <Text style={styles.accountRole}>Owner&apos;s Account</Text>
              <Text style={styles.accountSince}>
                Member since{" "}
                {new Date(profileUser.created_at).toLocaleDateString("en-ZA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
          {JSON.stringify(profileUser.created_at, null, 2)}
        </Text> */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(owner)/personal-info")}
          >
            <View>
              <Text style={styles.settingRowTitle}>Edit Profile</Text>
              <Text style={styles.settingRowSubtitle}>
                Update your account details
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Phone Number</Text>
              <Text style={styles.settingRowSubtitle}>
                {profileUser?.phone || "+1 (555) 123-4567"}
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Email</Text>
              <Text style={styles.settingRowSubtitle}>
                {profileUser?.email || "owner@example.com"}
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Driver Mode</Text>
              <Text style={styles.settingRowSubtitle}>
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

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Subscription & Billing</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(owner)/subscriptions")}
          >
            <View>
              <Text style={styles.settingRowTitle}>Manage Subscription</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  maxWidth: 230,
                  marginTop: 4,
                }}
              >
                <Text
                  style={[styles.settingRowSubtitle, { fontWeight: "700" }]}
                >
                  • Current Plan:{" "}
                </Text>
                <Text
                  style={[styles.settingRowSubtitle, { fontWeight: "400" }]}
                >
                  {" "}
                  {currentPlanName || "Free / Starter"}
                </Text>
                <Text
                  style={[
                    styles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Upgrade Plan
                </Text>
                <Text
                  style={[
                    styles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Payment Method
                </Text>
                <Text
                  style={[
                    styles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Billing History
                </Text>
                <Text
                  style={[
                    styles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Invoices
                </Text>
                <Text
                  style={[
                    styles.settingRowSubtitle,
                    { fontWeight: "400", marginLeft: 8 },
                  ]}
                >
                  • Cancel Subscription
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Pickup Notifications</Text>
              <Text style={styles.settingRowSubtitle}>
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

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Drop-off Notifications</Text>
              <Text style={styles.settingRowSubtitle}>
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

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Delay Alerts</Text>
              <Text style={styles.settingRowSubtitle}>
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

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Emergency Alerts</Text>
              <Text style={styles.settingRowSubtitle}>
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

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingRowTitle}>Dark Mode</Text>
              <Text style={styles.settingRowSubtitle}>
                Use a darker theme for night viewing
              </Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of your owner account?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OwnerProfile;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#2563EB",
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
  // Profile Header
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#4A90E2",
    borderRadius: 10,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "600",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  accountAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  accountAvatarText: {
    fontSize: 24,
    color: "white",
    fontWeight: "800",
  },
  accountInfo: {
    flex: 1,
    marginLeft: 16,
  },
  accountName: {
    fontSize: 20,
    fontWeight: "800",
    color: "black",
    marginBottom: 4,
  },
  accountRole: {
    fontSize: 14,
    color: "rgba(0,0,0,0.85)",
    marginBottom: 4,
  },
  accountSince: {
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingRowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  settingRowSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    maxWidth: 230,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 40,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalConfirmButton: {
    backgroundColor: "#EF4444",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "700",
  },
  modalConfirmText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
