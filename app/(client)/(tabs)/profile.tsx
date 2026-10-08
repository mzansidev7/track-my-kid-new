import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";
import { useChildren } from "../clientHelpers/hooks/useChildren";
import { useClientProfile } from "../clientHelpers/hooks/useClientProfile";
import ClientHeader from "../components/ClientHeader";

const ClientProfile = () => {
  const router = useRouter();
  const { client, refreshClient } = useClientProfile();
  const { children } = useChildren();
  const { user, logout } = useContext(AuthContext);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshClient();
    }, [refreshClient]),
  );

  const clientName =
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.name ||
    user?.userData?.name ||
    "Nomsa Mokoena";

  const phone = client?.phone || user?.userData?.phone || "082 345 6789";

  const email =
    client?.email || user?.userData?.email || "nomsa.mokoena@gmail.com";

  const handleLogout = async (logoutFn: () => void) => {
    logoutFn();
    await logout();
    router.replace("/(auth)/home" as never);
  };

  const handlePickAvatar = async () => {
    if (!user?.token) {
      Alert.alert("Unable to upload", "Your session has expired.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Allow photo access to choose an avatar.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const fileName =
        uri.split("/").pop() || `client-avatar-${Date.now()}.jpg`;
      const formData = new FormData();

      if (Platform.OS === "web") {
        const imageResponse = await fetch(uri);
        formData.append("avatar", await imageResponse.blob(), fileName);
      } else {
        formData.append("avatar", new ExpoFile(uri), fileName);
      }

      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            data.error ||
            "Failed to upload avatar.",
        );
      }

      await refreshClient();
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const avatarSource =
    typeof client?.avatar === "string" && client.avatar
      ? { uri: client.avatar }
      : require("@/assets/images/client.png");
  const hasClientAvatar =
    typeof client?.avatar === "string" && client.avatar.trim().length > 0;
  const profilePhone = (client?.phone || user?.userData?.phone || "").replace(
    /[\s()-]/g,
    "",
  );
  const profileComplete = Boolean(
    client?.first_name?.trim() &&
    client?.last_name?.trim() &&
    /^\+?[0-9]{7,15}$/.test(profilePhone) &&
    client?.relationship &&
    (client.relationship !== "other" || client?.relationship_other?.trim()) &&
    client?.home_address?.trim() &&
    client?.home_latitude !== null &&
    client?.home_latitude !== undefined &&
    client?.home_longitude !== null &&
    client?.home_longitude !== undefined,
  );

  const accountItems = [
    {
      label: "Personal Information",
      desc: "Update your personal details",
      icon: "person-outline",
    },
    {
      label: "Change Password",
      desc: "Update your password",
      icon: "lock-outline",
    },
    {
      label: "Notification Preferences",
      desc: "Manage your notification settings",
      icon: "notifications-none",
    },
    {
      label: "Family & Safety",
      desc: "Manage guardians, pickup contacts and emergency help",
      icon: "family-restroom",
    },
    {
      label: "Payments & Invoices",
      desc: "View payments, invoices and transport billing",
      icon: "payments",
    },
    {
      label: "Privacy & Security",
      desc: "Control your privacy and security",
      icon: "security",
    },
  ];

  const supportItems = [
    {
      label: "Help Center",
      desc: "Get help and support",
      icon: "help-outline",
    },
    {
      label: "Contact Us",
      desc: "Reach out to our support team",
      icon: "phone-in-talk",
    },
    {
      label: "About Track My Kid",
      desc: "App version 1.0.0",
      icon: "info-outline",
    },
  ];

  const handleSupportAction = async (label: string) => {
    if (label === "Help Center") {
      Alert.alert(
        "Help Center",
        "Find help with children, trips, payments, and safety. Our support team is available 24/7 for emergencies.",
        [
          { text: "Close", style: "cancel" },
          {
            text: "Email support",
            onPress: () => Linking.openURL("mailto:support@trackmykid.com"),
          },
        ],
      );
      return;
    }

    if (label === "Contact Us") {
      const opened = await Linking.openURL(
        "mailto:support@trackmykid.com?subject=Track%20My%20Kid%20support",
      ).catch(() => false);
      if (!opened) {
        Alert.alert(
          "Contact Us",
          "Email support@trackmykid.com for assistance.",
        );
      }
      return;
    }

    Alert.alert(
      "Track My Kid",
      "Version 1.0.0\nSafe, reliable school transport for every family.",
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader
        title="My Profile"
        subtitle=" Manage your account and preferences"
        showBackButton={true}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!hasClientAvatar && (
            <View style={styles.avatarBanner}>
              <View style={styles.avatarBannerIcon}>
                <MaterialIcons name="add-a-photo" size={22} color="#B45309" />
              </View>
              <View style={styles.avatarBannerContent}>
                <Text style={styles.avatarBannerTitle}>
                  Add a profile photo
                </Text>
                <Text style={styles.avatarBannerText}>
                  Add your photo before adding a child.
                </Text>
              </View>
            </View>
          )}

          {!profileComplete && (
            <View style={styles.profileCompletionBanner}>
              <View style={styles.profileCompletionIcon}>
                <MaterialIcons
                  name="assignment-late"
                  size={22}
                  color="#B45309"
                />
              </View>
              <View style={styles.profileCompletionContent}>
                <Text style={styles.profileCompletionTitle}>
                  Complete your personal information
                </Text>
                <Text style={styles.profileCompletionText}>
                  Finish your profile to unlock all account features.
                </Text>
              </View>
            </View>
          )}

          {/* Profile Hero Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.profileCard}
            onPress={() =>
              router.push("/(client)/pages/personal-information" as never)
            }
          >
            <View style={styles.profileTop}>
              <View style={styles.avatarContainer}>
                <Image source={avatarSource} style={styles.avatarImage} />

                <TouchableOpacity
                  style={styles.cameraButton}
                  activeOpacity={0.8}
                  disabled={uploadingAvatar}
                  onPress={handlePickAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#159B3A" />
                  ) : (
                    <Ionicons name="camera-outline" size={16} color="#159B3A" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {clientName}
                </Text>

                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={17} color="#159B3A" />

                  <Text style={styles.contactText}>{phone}</Text>
                </View>

                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={17} color="#159B3A" />

                  <Text style={styles.contactText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={28} color="#607A98" />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.quickAction}
                onPress={() =>
                  router.push("/(client)/(tabs)/children" as never)
                }
              >
                <View
                  style={[styles.quickIcon, { backgroundColor: "#EDF7FF" }]}
                >
                  <Ionicons name="people-outline" size={25} color="#159B3A" />
                </View>

                <Text style={styles.quickTitle}>My Children</Text>

                <Text style={styles.quickValue}>{children.length}</Text>

                <Text style={styles.quickLink}>Manage</Text>
              </TouchableOpacity>

              <View style={styles.quickDivider} />

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.quickAction}
                onPress={() =>
                  router.push("/(client)/pages/safety-pin" as never)
                }
              >
                <View
                  style={[styles.quickIcon, { backgroundColor: "#E9F8EE" }]}
                >
                  <MaterialIcons
                    name="verified-user"
                    size={25}
                    color="#159B3A"
                  />
                </View>

                <Text style={styles.quickTitle}>Safety PIN</Text>

                <Text style={styles.pinValue}>••••</Text>

                <Text style={styles.quickLink}>Change</Text>
              </TouchableOpacity>

              <View style={styles.quickDivider} />

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.quickAction}
                onPress={() => router.push("/(client)/pages/payments" as never)}
              >
                <View
                  style={[styles.quickIcon, { backgroundColor: "#E9F8EE" }]}
                >
                  <Ionicons name="card-outline" size={25} color="#159B3A" />
                </View>

                <Text style={styles.quickTitle}>Payment</Text>

                <Text style={styles.paymentValue}>Active</Text>

                <Text style={styles.quickLink}>Manage</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.menuCard}>
              {accountItems
                .filter(
                  (item) =>
                    profileComplete || item.label === "Personal Information",
                )
                .map((item, index, visibleItems) => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.7}
                    style={[
                      styles.menuRow,
                      index === visibleItems.length - 1 && styles.menuRowLast,
                      item.label === "Personal Information" &&
                        !profileComplete &&
                        styles.incompleteProfileRow,
                    ]}
                    onPress={() => {
                      if (item.label === "Personal Information") {
                        router.push(
                          "/(client)/pages/personal-information" as never,
                        );
                      } else if (item.label === "Family & Safety") {
                        router.push("/(client)/pages/family-safety" as never);
                      } else if (item.label === "Payments & Invoices") {
                        router.push("/(client)/pages/payments" as never);
                      }
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <MaterialIcons
                        name={item.icon as any}
                        size={23}
                        color="#159B3A"
                      />
                    </View>

                    <View style={styles.menuContent}>
                      <Text style={styles.menuTitle}>{item.label}</Text>

                      <Text style={styles.menuDescription}>{item.desc}</Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={26}
                      color="#607A98"
                    />
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Support */}
          {profileComplete && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>

              <View style={styles.menuCard}>
                {supportItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.7}
                    style={[
                      styles.menuRow,
                      index === supportItems.length - 1 && styles.menuRowLast,
                    ]}
                    onPress={() => handleSupportAction(item.label)}
                  >
                    <View style={styles.menuIcon}>
                      <MaterialIcons
                        name={item.icon as any}
                        size={23}
                        color="#159B3A"
                      />
                    </View>

                    <View style={styles.menuContent}>
                      <Text style={styles.menuTitle}>{item.label}</Text>

                      <Text style={styles.menuDescription}>{item.desc}</Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={26}
                      color="#607A98"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.logoutButton}
            onPress={() => handleLogout(logout)}
          >
            <MaterialIcons name="logout" size={23} color="#DC2626" />

            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ClientProfile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F9FF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F4F9FF",
    paddingHorizontal: 20,
  },

  /* Header */

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 18,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#17365E",
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#607A98",
    fontWeight: "500",
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCEAF8",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 3,
  },

  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#159B3A",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* Scroll */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  avatarBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },

  avatarBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarBannerContent: {
    flex: 1,
    marginRight: 8,
  },

  avatarBannerTitle: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },

  avatarBannerText: {
    color: "#78350F",
    fontSize: 11,
    marginTop: 2,
  },

  avatarBannerButton: {
    backgroundColor: "#D97706",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  avatarBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  profileCompletionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },

  profileCompletionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  profileCompletionContent: {
    flex: 1,
  },

  profileCompletionTitle: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "800",
  },

  profileCompletionText: {
    color: "#7C2D12",
    fontSize: 11,
    marginTop: 2,
  },

  /* Profile */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCEAF8",

    overflow: "hidden",

    shadowColor: "#17365E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,

    elevation: 3,

    marginBottom: 24,
  },

  profileTop: {
    backgroundColor: "#EDF7FF",
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#DCEAF8",
    overflow: "visible",
    marginRight: 18,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },

  cameraButton: {
    position: "absolute",
    right: -2,
    bottom: 2,

    width: 34,
    height: 34,
    borderRadius: 17,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "#DCEAF8",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 3,
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 23,
    fontWeight: "800",
    color: "#17365E",
    marginBottom: 10,
    letterSpacing: -0.4,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  contactText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: "#607A98",
    fontWeight: "500",
  },

  /* Quick actions */

  quickActions: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 18,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
  },

  quickAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  quickDivider: {
    width: 1,
    backgroundColor: "#DCEAF8",
    marginVertical: 4,
  },

  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  quickTitle: {
    fontSize: 13,
    color: "#607A98",
    fontWeight: "600",
    marginBottom: 3,
  },

  quickValue: {
    fontSize: 20,
    color: "#17365E",
    fontWeight: "800",
  },

  pinValue: {
    fontSize: 16,
    color: "#17365E",
    fontWeight: "800",
    letterSpacing: 3,
    marginVertical: 2,
  },

  paymentValue: {
    fontSize: 17,
    color: "#159B3A",
    fontWeight: "800",
  },

  quickLink: {
    marginTop: 3,
    fontSize: 13,
    color: "#159B3A",
    fontWeight: "700",
  },

  /* Sections */

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17365E",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  /* Menu */

  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCEAF8",

    overflow: "hidden",

    shadowColor: "#17365E",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 2,
  },

  menuRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderBottomWidth: 1,
    borderBottomColor: "#DCEAF8",
  },

  menuRowLast: {
    borderBottomWidth: 0,
  },

  incompleteProfileRow: {
    borderLeftWidth: 4,
    borderLeftColor: "#FCD34D",
  },

  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,

    backgroundColor: "#EDF7FF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17365E",
    marginBottom: 3,
  },

  menuDescription: {
    fontSize: 12.5,
    color: "#607A98",
    fontWeight: "500",
  },

  /* Logout */

  logoutButton: {
    height: 58,
    borderRadius: 16,

    borderWidth: 1.5,
    borderColor: "#FECACA",

    backgroundColor: "#FFF8F8",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 2,
    marginBottom: 60,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },

  bottomSpacer: {
    height: 30,
  },
});
