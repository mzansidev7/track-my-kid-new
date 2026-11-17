import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const defaultPreferences = {
  push_notifications: true,
  driver_updates: true,
  route_updates: true,
  delay_alerts: true,
  pickup_reminders: true,
  dropoff_reminders: true,
  messages: true,
  safety_alerts: true,
  billing_updates: true,
  account_changes: true,
  system_alerts: true,
};

const preferenceGroups = [
  {
    title: "Trips and transport",
    items: [
      {
        key: "driver_updates",
        title: "Driver updates",
        description: "Changes to your child's driver or vehicle.",
      },
      {
        key: "route_updates",
        title: "Route updates",
        description: "Changes to your child's transport route.",
      },
      {
        key: "delay_alerts",
        title: "Delay alerts",
        description: "Important trip delays and service interruptions.",
      },
      {
        key: "pickup_reminders",
        title: "Pickup reminders",
        description: "Reminders and driver arrival notices for pickup.",
      },
      {
        key: "dropoff_reminders",
        title: "Drop-off reminders",
        description: "Reminders and driver arrival notices for drop-off.",
      },
    ],
  },
  {
    title: "Account and safety",
    items: [
      {
        key: "messages",
        title: "Messages",
        description: "New messages from your driver or school.",
      },
      {
        key: "safety_alerts",
        title: "Safety alerts",
        description: "Safety-related updates about your child.",
      },
      {
        key: "billing_updates",
        title: "Billing updates",
        description: "Payment and subscription updates.",
      },
      {
        key: "account_changes",
        title: "Account changes",
        description: "Changes to your account and profile.",
      },
      {
        key: "system_alerts",
        title: "Service announcements",
        description: "Important Track My Kid service information.",
      },
    ],
  },
];

type Preferences = typeof defaultPreferences;

const NotificationPreferences = () => {
  const { user } = useContext(AuthContext);
  const userToken = user?.token;
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] =
    useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPreferences = useCallback(async () => {
    if (!userToken) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/profile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load notification settings.");
      }
      const nextPreferences = {
        ...defaultPreferences,
        ...(data.notifications_preference || {}),
      };
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load notification settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadPreferences(), 0);
    return () => clearTimeout(timeout);
  }, [loadPreferences]);

  const savePreferences = async () => {
    if (!user?.token) {
      Alert.alert("Session expired", "Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/notifications`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notifications_preference: preferences }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save notification settings.");
      }
      const savedPreferences = {
        ...defaultPreferences,
        ...(data.notifications_preference || preferences),
      };
      setPreferences(savedPreferences);
      setInitialPreferences(savedPreferences);
      Alert.alert("Preferences saved", "Your notification settings were updated.");
    } catch (saveError) {
      Alert.alert(
        "Could not save",
        saveError instanceof Error
          ? saveError.message
          : "Unable to save notification settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(preferences).some(
    (key) =>
      preferences[key as keyof Preferences] !==
      initialPreferences[key as keyof Preferences],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader
        title="Notification Preferences"
        subtitle="Choose the updates you receive"
        showBackButton
        style={styles.header}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C14BFF" />
          <Text style={styles.muted}>Loading preferences…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={28} color="#B45309" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPreferences}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.pushCard}>
            <View style={styles.pushIcon}>
              <MaterialIcons
                name="notifications-active"
                size={23}
                color="#C14BFF"
              />
            </View>
            <View style={styles.pushCopy}>
              <Text style={styles.pushTitle}>App notifications</Text>
              <Text style={styles.pushDescription}>
                Show notifications in your in-app notification list.
              </Text>
            </View>
            <Switch
              value={preferences.push_notifications}
              onValueChange={(value) =>
                setPreferences((current) => ({
                  ...current,
                  push_notifications: value,
                }))
              }
              trackColor={{ false: "#D4DCE5", true: "#9BE2AE" }}
              thumbColor={preferences.push_notifications ? "#C14BFF" : "#FFFFFF"}
            />
          </View>

          {preferenceGroups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, index) => (
                  <View
                    key={item.key}
                    style={[
                      styles.preferenceRow,
                      index === group.items.length - 1 &&
                        styles.preferenceRowLast,
                    ]}
                  >
                    <View style={styles.preferenceCopy}>
                      <Text style={styles.preferenceTitle}>{item.title}</Text>
                      <Text style={styles.preferenceDescription}>
                        {item.description}
                      </Text>
                    </View>
                    <Switch
                      value={preferences[item.key as keyof Preferences]}
                      onValueChange={(value) =>
                        setPreferences((current) => ({
                          ...current,
                          [item.key]: value,
                        }))
                      }
                      trackColor={{ false: "#D4DCE5", true: "#9BE2AE" }}
                      thumbColor={
                        preferences[item.key as keyof Preferences]
                          ? "#C14BFF"
                          : "#FFFFFF"
                      }
                      disabled={!preferences.push_notifications}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || saving) && styles.saveButtonDisabled,
            ]}
            onPress={() => void savePreferences()}
            disabled={!hasChanges || saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save preferences</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  header: { marginBottom: 0 },
  content: { padding: 18, paddingBottom: 36 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  muted: { color: "#B9AFC4", fontSize: 12 },
  errorText: { color: "#8A4B08", fontSize: 13, textAlign: "center" },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1C1026",
  },
  retryText: { color: "#C14BFF", fontSize: 12, fontWeight: "800" },
  pushCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  pushIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#1C1026",
  },
  pushCopy: { flex: 1 },
  pushTitle: { color: "#FBF8FF", fontSize: 13, fontWeight: "800" },
  pushDescription: { marginTop: 3, color: "#B9AFC4", fontSize: 10 },
  group: { marginBottom: 19 },
  groupTitle: {
    marginBottom: 8,
    color: "#FBF8FF",
    fontSize: 13,
    fontWeight: "800",
  },
  groupCard: {
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  preferenceRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  preferenceRowLast: { borderBottomWidth: 0 },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: "#FBF8FF", fontSize: 12, fontWeight: "700" },
  preferenceDescription: {
    marginTop: 3,
    color: "#B9AFC4",
    fontSize: 10,
    lineHeight: 14,
  },
  saveButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    borderRadius: 12,
    backgroundColor: "#9B2BE7",
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});

export default NotificationPreferences;
