import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../../context/authContext/auth-context";
import { useTheme } from "../../../styles/theme";
import { resolveWorkingBaseUrl } from "../../../url";

type SettingsSection =
  | "General"
  | "Account"
  | "Notifications"
  | "Attendance"
  | "Transport"
  | "Security"
  | "Audit Logs"
  | "Subscriptions";

type SchoolProfile = Record<string, any>;

type SchoolNotification = {
  id: string;
  title?: string;
  message?: string;
  created_at?: string;
  is_read?: boolean;
};

type SchoolAuditLog = {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
};

const sections: {
  key: SettingsSection;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  {
    key: "General",
    title: "General settings",
    description: "School contact details",
    icon: "tune",
  },
  {
    key: "Account",
    title: "Account profile",
    description: "Your administrator photo",
    icon: "account-circle",
  },
  {
    key: "Notifications",
    title: "Notifications",
    description: "Review and manage school alerts",
    icon: "notifications-none",
  },
  {
    key: "Attendance",
    title: "Attendance settings",
    description: "School day and absence cutoff",
    icon: "event-available",
  },
  {
    key: "Transport",
    title: "Transport settings",
    description: "Routes and trip operations",
    icon: "directions-bus",
  },
  {
    key: "Security",
    title: "Security",
    description: "Change your account password",
    icon: "security",
  },
  {
    key: "Audit Logs",
    title: "Audit logs",
    description: "Recent school staff activity",
    icon: "history",
  },
  {
    key: "Subscriptions",
    title: "Subscriptions",
    description: "Plans, invoices and payment methods",
    icon: "credit-card",
  },
];

const Settings = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  const token = user?.token;
  const [section, setSection] = useState<SettingsSection>("General");
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [adminProfile, setAdminProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<SchoolAuditLog[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchJson = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...init.headers,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed.");
      }
      return data;
    },
    [token],
  );

  const loadProfile = useCallback(async () => {
    try {
      const [next, nextAdmin] = await Promise.all([
        fetchJson("/school/profile"),
        fetchJson("/school/admin/profile"),
      ]);
      setProfile(next);
      setAdminProfile(nextAdmin);
    } catch (error) {
      Alert.alert(
        "Unable to load settings",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchJson]);

  const pickAdminAvatar = async () => {
    if (uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Allow photo access to choose a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploadingAvatar(true);
    try {
      const fileName =
        asset.fileName ||
        asset.uri.split("/").pop() ||
        `admin-avatar-${Date.now()}.jpg`;
      const formData = new FormData();
      if (Platform.OS === "web") {
        const imageResponse = await fetch(asset.uri);
        if (!imageResponse.ok) {
          throw new Error("Unable to read the selected image.");
        }
        formData.append("avatar", await imageResponse.blob(), fileName);
      } else {
        formData.append("avatar", new ExpoFile(asset.uri), fileName);
      }
      const updated = await fetchJson("/school/admin/profile/avatar", {
        method: "PUT",
        body: formData,
      });
      setAdminProfile((current) => ({ ...current, avatar: updated.avatar }));
      Alert.alert("Profile picture updated", "Your photo has been saved.");
    } catch (error) {
      Alert.alert(
        "Unable to upload profile picture",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const loadSectionData = useCallback(async () => {
    if (section !== "Notifications" && section !== "Audit Logs") return;
    setSectionLoading(true);
    try {
      if (section === "Notifications") {
        const result = await fetchJson("/school/notifications?limit=50");
        setNotifications(Array.isArray(result) ? result : []);
      } else {
        const result = await fetchJson("/school/audit-logs");
        setAuditLogs(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      Alert.alert(
        `Unable to load ${section.toLowerCase()}`,
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSectionLoading(false);
    }
  }, [fetchJson, section]);

  useFocusEffect(
    useCallback(() => {
      void loadSectionData();
      return undefined;
    }, [loadSectionData]),
  );

  const saveProfile = async (updates: SchoolProfile) => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        name: profile.name,
        emis_number: profile.emis_number,
        school_email: profile.school_email,
        phone: profile.phone,
        principal_name: profile.principal_name,
        contact_person: profile.contact_person,
        address: profile.address,
        province: profile.province,
        district: profile.district,
        logo: profile.logo,
        latitude: profile.latitude,
        longitude: profile.longitude,
        start_time: profile.start_time,
        end_time: profile.end_time,
        ...updates,
      };
      const updated = await fetchJson("/school/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setProfile((current) => ({ ...current, ...updated }));
      Alert.alert("Settings saved", "Your school settings were updated.");
    } catch (error) {
      Alert.alert(
        "Unable to save settings",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const markNotificationRead = async (notification: SchoolNotification) => {
    if (notification.is_read) return;
    try {
      await fetchJson(`/school/notifications/${notification.id}/read`, {
        method: "PUT",
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Unable to update notification",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing password", "Complete all three password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "Confirm the new password.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/school/admin/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error) {
      Alert.alert(
        "Unable to change password",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateProfileField = (field: string, value: string) =>
    setProfile((current) => (current ? { ...current, [field]: value } : current));

  const openRoute = (route: string) => router.push(route as never);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadProfile();
            }}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={21} color="#17365E" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              {profile?.name || "School account"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionList}>
          {sections.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.sectionButton,
                section === item.key && styles.sectionButtonActive,
              ]}
              onPress={() => setSection(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: section === item.key }}
            >
              <MaterialIcons
                name={item.icon}
                size={20}
                color={section === item.key ? "#2563EB" : "#64748B"}
              />
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <Text style={styles.sectionDescription}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={21} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {loading || sectionLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.muted}>Loading settings...</Text>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{section}</Text>
            {section === "Account" && (
              <>
                <Text style={styles.panelDescription}>
                  Add or update the profile picture shown for your school administrator account.
                </Text>
                <View style={styles.adminAvatarRow}>
                  {adminProfile?.avatar ? (
                    <Image
                      source={{ uri: adminProfile.avatar }}
                      style={styles.adminAvatar}
                      accessibilityLabel="School administrator profile picture"
                    />
                  ) : (
                    <View style={[styles.adminAvatar, styles.adminAvatarFallback]}>
                      <MaterialIcons name="person" size={34} color="#64748B" />
                    </View>
                  )}
                  <View style={styles.adminAvatarCopy}>
                    <Text style={styles.adminAvatarName}>
                      {[adminProfile?.first_name, adminProfile?.last_name]
                        .filter(Boolean)
                        .join(" ") || "School administrator"}
                    </Text>
                    <Text style={styles.muted}>
                      {adminProfile?.email || ""}
                    </Text>
                  </View>
                </View>
                <PrimaryButton
                  title={
                    uploadingAvatar
                      ? "Uploading..."
                      : adminProfile?.avatar
                        ? "Change profile picture"
                        : "Add profile picture"
                  }
                  disabled={uploadingAvatar}
                  onPress={() => void pickAdminAvatar()}
                />
              </>
            )}
            {section === "General" && profile ? (
              <>
                <Text style={styles.panelDescription}>
                  Keep your main school contact information up to date.
                </Text>
                <Field
                  label="School email"
                  value={profile.school_email || ""}
                  onChangeText={(value) => updateProfileField("school_email", value)}
                  keyboardType="email-address"
                />
                <Field
                  label="School phone"
                  value={profile.phone || ""}
                  onChangeText={(value) => updateProfileField("phone", value)}
                  keyboardType="phone-pad"
                />
                <Field
                  label="Principal name"
                  value={profile.principal_name || ""}
                  onChangeText={(value) => updateProfileField("principal_name", value)}
                />
                <Field
                  label="Contact person"
                  value={profile.contact_person || ""}
                  onChangeText={(value) => updateProfileField("contact_person", value)}
                />
                <Field
                  label="School address"
                  value={profile.address || ""}
                  onChangeText={(value) => updateProfileField("address", value)}
                />
                <PrimaryButton
                  title={saving ? "Saving..." : "Save general settings"}
                  disabled={saving}
                  onPress={() =>
                    void saveProfile({
                      school_email: profile.school_email,
                      phone: profile.phone,
                      principal_name: profile.principal_name,
                      contact_person: profile.contact_person,
                      address: profile.address,
                    })
                  }
                />
              </>
            ) : null}

            {section === "Notifications" && (
              <>
                <Text style={styles.panelDescription}>
                  Review recent school alerts and mark items as read.
                </Text>
                {notifications.length ? (
                  notifications.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.notification}
                      onPress={() => void markNotificationRead(item)}
                    >
                      <View style={styles.notificationCopy}>
                        <Text style={styles.notificationTitle}>
                          {item.title || "School notification"}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {item.message || ""}
                        </Text>
                        <Text style={styles.notificationDate}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.readState,
                          item.is_read && styles.readStateRead,
                        ]}
                      >
                        {item.is_read ? "Read" : "Mark read"}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.muted}>No notifications to show.</Text>
                )}
              </>
            )}

            {section === "Attendance" && profile ? (
              <>
                <Text style={styles.panelDescription}>
                  Set the school day hours used by attendance and parent absence
                  reporting. After the start time, parents can report an
                  absence from tomorrow onward.
                </Text>
                <Field
                  label="School start time"
                  value={profile.start_time || ""}
                  onChangeText={(value) => updateProfileField("start_time", value)}
                  keyboardType="numbers-and-punctuation"
                  placeholder="07:30"
                />
                <Field
                  label="School end time"
                  value={profile.end_time || ""}
                  onChangeText={(value) => updateProfileField("end_time", value)}
                  keyboardType="numbers-and-punctuation"
                  placeholder="14:00"
                />
                <PrimaryButton
                  title={saving ? "Saving..." : "Save attendance settings"}
                  disabled={saving}
                  onPress={() =>
                    void saveProfile({
                      start_time: profile.start_time,
                      end_time: profile.end_time,
                    })
                  }
                />
              </>
            ) : null}

            {section === "Transport" && (
              <>
                <Text style={styles.panelDescription}>
                  Configure school routes, assigned transport, and scheduled
                  school trips.
                </Text>
                <ActionButton
                  title="Manage routes"
                  icon="alt-route"
                  onPress={() => openRoute("/(school)/(tabs)/routes")}
                />
                <ActionButton
                  title="Manage trips"
                  icon="directions-bus"
                  onPress={() => openRoute("/(school)/(tabs)/trips")}
                />
              </>
            )}

            {section === "Security" && (
              <>
                <Text style={styles.panelDescription}>
                  Use a strong password and do not share your sign-in details.
                </Text>
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setVisiblePasswords((visible) => !visible)}
                >
                  <MaterialIcons
                    name={visiblePasswords ? "visibility-off" : "visibility"}
                    size={18}
                    color="#2563EB"
                  />
                  <Text style={styles.visibilityLabel}>
                    {visiblePasswords ? "Hide passwords" : "Show passwords"}
                  </Text>
                </TouchableOpacity>
                <Field
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!visiblePasswords}
                />
                <Field
                  label="New password (at least 6 characters)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!visiblePasswords}
                />
                <Field
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!visiblePasswords}
                />
                <PrimaryButton
                  title={saving ? "Updating..." : "Update password"}
                  disabled={saving}
                  onPress={() => void changePassword()}
                />
              </>
            )}

            {section === "Audit Logs" && (
              <>
                <Text style={styles.panelDescription}>
                  Recent recorded activity from active school staff accounts.
                </Text>
                {auditLogs.length ? (
                  auditLogs.map((item) => (
                    <View key={item.id} style={styles.auditItem}>
                      <Text style={styles.auditAction}>{item.action}</Text>
                      <Text style={styles.auditDetails}>
                        {[item.entity_type, item.entity_id]
                          .filter(Boolean)
                          .join(" · ") || "School activity"}
                      </Text>
                      {item.created_at ? (
                        <Text style={styles.auditDetails}>
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>No recorded activity yet.</Text>
                )}
              </>
            )}

            {section === "Subscriptions" && (
              <>
                <Text style={styles.panelDescription}>
                  Manage your school plan, invoices, renewal information, and
                  payment options.
                </Text>
                <ActionButton
                  title="Open subscriptions and billing"
                  icon="credit-card"
                  onPress={() => openRoute("/(school)/billing")}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Field = ({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation";
  placeholder?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      placeholder={placeholder}
      autoCapitalize="none"
      style={styles.input}
    />
  </View>
);

const PrimaryButton = ({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.primaryButton, disabled && styles.disabledButton]}
    disabled={disabled}
    onPress={onPress}
  >
    <Text style={styles.primaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const ActionButton = ({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <MaterialIcons name={icon} size={20} color="#2563EB" />
    <Text style={styles.actionButtonText}>{title}</Text>
    <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
  </TouchableOpacity>
);

export default Settings;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 130 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  headerCopy: { flex: 1 },
  title: { color: "#17365E", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 2 },
  sectionList: { gap: 8, marginBottom: 16 },
  sectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  sectionButtonActive: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: "#17365E", fontSize: 13, fontWeight: "700" },
  sectionDescription: { color: "#64748B", fontSize: 11, marginTop: 3 },
  adminAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
  },
  adminAvatar: { width: 76, height: 76, borderRadius: 38 },
  adminAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  adminAvatarCopy: { flex: 1 },
  adminAvatarName: { color: "#17365E", fontSize: 14, fontWeight: "700" },
  panel: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  panelTitle: { color: "#17365E", fontSize: 18, fontWeight: "800" },
  panelDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 13,
  },
  field: { marginTop: 11 },
  fieldLabel: { color: "#334155", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#17365E",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 16,
    borderRadius: 11,
    backgroundColor: "#2563EB",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  actionButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 11,
  },
  actionButtonText: { flex: 1, color: "#17365E", fontSize: 13, fontWeight: "700" },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: "#17365E", fontSize: 13, fontWeight: "700" },
  notificationMessage: { color: "#475569", fontSize: 12, marginTop: 4 },
  notificationDate: { color: "#94A3B8", fontSize: 10, marginTop: 4 },
  readState: { color: "#2563EB", fontSize: 10, fontWeight: "700" },
  readStateRead: { color: "#94A3B8" },
  visibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 5,
  },
  visibilityLabel: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  auditItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  auditAction: { color: "#17365E", fontSize: 13, fontWeight: "700" },
  auditDetails: { color: "#64748B", fontSize: 11, marginTop: 4 },
  loading: { alignItems: "center", paddingVertical: 30, gap: 8 },
  muted: { color: "#64748B", fontSize: 12, marginTop: 12 },
});
