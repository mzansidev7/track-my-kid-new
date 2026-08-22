import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
    router.replace("/(auth)/" as never);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      const extension = fileName.split(".").pop()?.toLowerCase();
      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "gif"
              ? "image/gif"
              : "image/jpeg";
      const formData = new FormData();

      if (Platform.OS === "web") {
        const imageResponse = await fetch(uri);
        formData.append("avatar", await imageResponse.blob(), fileName);
      } else {
        formData.append("avatar", {
          uri,
          name: fileName,
          type: contentType,
        } as any);
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
          data.error || data.message || "Failed to upload avatar.",
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>
              Manage your account and preferences
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={25} color="#111827" />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="camera-outline" size={16} color="#2563EB" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {clientName}
                </Text>

                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={17} color="#2563EB" />

                  <Text style={styles.contactText}>{phone}</Text>
                </View>

                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={17} color="#2563EB" />

                  <Text style={styles.contactText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={28} color="#64748B" />
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
                  style={[styles.quickIcon, { backgroundColor: "#E8F0FF" }]}
                >
                  <Ionicons name="people-outline" size={25} color="#2563EB" />
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
                  style={[styles.quickIcon, { backgroundColor: "#E8F8EF" }]}
                >
                  <MaterialIcons
                    name="verified-user"
                    size={25}
                    color="#16A34A"
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
                  style={[styles.quickIcon, { backgroundColor: "#F2E9FF" }]}
                >
                  <Ionicons name="card-outline" size={25} color="#8B5CF6" />
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
              {accountItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.7}
                  style={[
                    styles.menuRow,
                    index === accountItems.length - 1 && styles.menuRowLast,
                  ]}
                  onPress={() => {
                    if (item.label === "Personal Information") {
                      router.push(
                        "/(client)/pages/personal-information" as never,
                      );
                    }
                  }}
                >
                  <View style={styles.menuIcon}>
                    <MaterialIcons
                      name={item.icon as any}
                      size={23}
                      color="#2563EB"
                    />
                  </View>

                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.label}</Text>

                    <Text style={styles.menuDescription}>{item.desc}</Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color="#64748B"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Support */}
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
                  onPress={() => {}}
                >
                  <View style={styles.menuIcon}>
                    <MaterialIcons
                      name={item.icon as any}
                      size={23}
                      color="#2563EB"
                    />
                  </View>

                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.label}</Text>

                    <Text style={styles.menuDescription}>{item.desc}</Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color="#64748B"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#0F172A",
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDF5",
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
    backgroundColor: "#2563EB",
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

  /* Profile */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EAF2",

    overflow: "hidden",

    shadowColor: "#0F172A",
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
    backgroundColor: "#F4F8FF",
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E2E8F0",
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
    borderColor: "#DCE5F2",

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
    color: "#0F172A",
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
    color: "#475569",
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
    backgroundColor: "#E5E7EB",
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
    color: "#475569",
    fontWeight: "600",
    marginBottom: 3,
  },

  quickValue: {
    fontSize: 20,
    color: "#0F172A",
    fontWeight: "800",
  },

  pinValue: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: 3,
    marginVertical: 2,
  },

  paymentValue: {
    fontSize: 17,
    color: "#16A34A",
    fontWeight: "800",
  },

  quickLink: {
    marginTop: 3,
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "700",
  },

  /* Sections */

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  /* Menu */

  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EAF2",

    overflow: "hidden",

    shadowColor: "#0F172A",
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
    borderBottomColor: "#EDF0F4",
  },

  menuRowLast: {
    borderBottomWidth: 0,
  },

  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,

    backgroundColor: "#EEF4FF",

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
    color: "#0F172A",
    marginBottom: 3,
  },

  menuDescription: {
    fontSize: 12.5,
    color: "#64748B",
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
