import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/styles/theme";
import { useDriverProfile } from "@/driverHelpers/hooks/useDriverProfile";
import DriverHeader from "@/components/driver/DriverHeader";
import { AuthContext } from "@/context/authContext/auth-context";
import { useContext } from "react";
import { resolveWorkingBaseUrl } from "@/url";

const defaultNotificationSettings = {
  notifications: {
    push: true,
    sound: true,
    vibration: true,
    newMessages: true,
    routeUpdates: true,
    emergencyAlerts: true,
    childDropoffAlerts: true,
    childBoardingAlerts: true,
    maintenanceReminders: true,
  },
  safety: {
    speedAlerts: true,
    fatigueReminders: true,
    seatbeltReminder: true,
    emergencyContactsEnabled: true,
  },
  offline: {
    cacheRoutes: true,
    offlineMaps: false,
  },
  privacy: {
    showPhoneNumber: false,
    showProfilePhoto: true,
    shareLiveLocation: true,
  },
  vehicle: {
    fuelReminders: true,
    serviceReminders: true,
    showFuelEstimate: true,
    tyreCheckReminders: true,
  },
  weather: {
    weatherAlerts: true,
    showWeatherOnDashboard: true,
  },
  security: {
    biometricLogin: false,
    requirePinForLogout: false,
  },
  tracking: {
    highAccuracy: true,
    autoStartLocation: true,
    backgroundTracking: true,
  },
  dashboard: {
    showWeather: true,
    showVehicleCard: true,
    showTodaysRoutes: true,
    showAssignedChildren: true,
  },
  appearance: {
    theme: "system",
    language: "en",
    largeText: false,
  },
  navigation: {
    mapType: "standard",
    avoidTolls: false,
    trafficLayer: true,
    avoidHighways: false,
    voiceGuidance: true,
    autoRecalculateRoute: true,
  },
  availability: {
    status: "online",
    acceptRoutes: true,
    autoOfflineAfterRoute: false,
  },
};

const deepMerge = (base: any, incoming: any): any => {
  if (!incoming || typeof incoming !== "object") return base;
  if (!base || typeof base !== "object") return incoming;

  const merged = Array.isArray(base) ? [...base] : { ...base };

  Object.keys(incoming).forEach((key) => {
    if (
      incoming[key] &&
      typeof incoming[key] === "object" &&
      !Array.isArray(incoming[key]) &&
      merged[key] &&
      typeof merged[key] === "object" &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = deepMerge(merged[key], incoming[key]);
    } else {
      merged[key] = incoming[key];
    }
  });

  return merged;
};

const normalizeSettings = (value: any) => {
  const fallback = deepMerge(defaultNotificationSettings, {});
  return deepMerge(fallback, value || {});
};

const getSectionTitle = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

const NotificationSettingsPage = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { driver, loading, refreshDriver } = useDriverProfile();
  const { colors } = useTheme();
  const [settings, setSettings] = useState(defaultNotificationSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (driver?.notification_settings) {
      setSettings(normalizeSettings(driver.notification_settings));
    } else if (driver?.notificationSettings) {
      setSettings(normalizeSettings(driver.notificationSettings));
    }
  }, [driver]);

  const sections = useMemo(
    () => Object.entries(settings).filter(([_, value]) => typeof value === "object"),
    [settings],
  );

  const toggleSetting = (category: string, key: string) => {
    setSettings((prev) => {
      const section = prev[category as keyof typeof prev] as Record<string, boolean> | undefined;
      return {
        ...prev,
        [category]: {
          ...(section ?? {}),
          [key]: !(section?.[key] ?? false),
        },
      };
    });
  };

  const toggleAllInSection = (category: string) => {
    setSettings((prev) => {
      const section = prev[category as keyof typeof prev] as Record<string, unknown> | undefined;
      if (!section) return prev;

      const booleanEntries = Object.entries(section).filter(([, value]) => typeof value === "boolean");
      if (!booleanEntries.length) return prev;

      const shouldEnable = booleanEntries.some(([, value]) => value === false);

      const updatedSection = Object.fromEntries(
        Object.entries(section).map(([key, value]) => [
          key,
          typeof value === "boolean" ? shouldEnable : value,
        ]),
      );

      return {
        ...prev,
        [category]: updatedSection,
      };
    });
  };

  const saveSettings = async () => {
    if (!user?.token) {
      setMessage("You are not signed in.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/driver/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          notificationSettings: settings,
          notification_settings: settings,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update notification settings.");
      }

      setMessage("Notification settings updated.");
      await refreshDriver();
      setTimeout(() => router.back(), 600);
    } catch (error: any) {
      setMessage(error.message || "Unable to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <DriverHeader title="Notification Settings" subtitle="Manage your driver alerts" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DriverHeader title="Notification Settings" subtitle="Choose what alerts you receive" showBackButton />

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map(([category, values]) => {
          const entries = Object.entries(values as Record<string, unknown>);
          const booleanEntries = entries.filter(([, value]) => typeof value === "boolean");
          if (!entries.length) return null;

          const allEnabled = booleanEntries.length > 0 && booleanEntries.every(([, value]) => value === true);
          const bulkToggleLabel = allEnabled ? "Uncheck all" : "Check all";

          return (
            <View key={category} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{getSectionTitle(category)}</Text>

                {booleanEntries.length > 0 ? (
                  <View style={styles.bulkToggleWrap}>
                    <Text style={[styles.bulkToggleLabel, { color: colors.text.secondary }]}>{bulkToggleLabel}</Text>
                    <Switch
                      value={allEnabled}
                      onValueChange={() => toggleAllInSection(category)}
                      thumbColor={allEnabled ? colors.primary : "#f4f3f4"}
                      trackColor={{ false: "#767577", true: colors.primary }}
                    />
                  </View>
                ) : null}
              </View>

              {entries.map(([key, value]) => {
                if (typeof value !== "boolean") return null;

                return (
                  <View key={`${category}-${key}`} style={styles.row}>
                    <View style={styles.labelWrapper}>
                      <Text style={[styles.rowLabel, { color: colors.text.primary }]}>
                        {getSectionTitle(key)}
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(value)}
                      onValueChange={() => toggleSetting(category, key)}
                      thumbColor={value ? colors.primary : "#f4f3f4"}
                      trackColor={{ false: "#767577", true: colors.primary }}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}

        {message ? (
          <Text style={[styles.message, { color: colors.text.primary }]}>{message}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]} 
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Settings"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 32 },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  bulkToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulkToggleLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.25)",
  },
  labelWrapper: { flex: 1, paddingRight: 12 },
  rowLabel: { fontSize: 14, fontWeight: "500" },
  message: { fontSize: 14, marginBottom: 12, fontWeight: "600" },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default NotificationSettingsPage;
