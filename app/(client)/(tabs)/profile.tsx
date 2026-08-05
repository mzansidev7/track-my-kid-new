import React, { useContext } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../styles/theme";
import { AuthContext } from "../../../authContext/auth-context";
import { useClientProfile } from "../../../clientHelpers/hooks/useClientProfile";
import { ClientHeader } from "../../../components/ClientHeader";

const ClientProfile = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { client, loading, error } = useClientProfile();
  const { user, logout } = useContext(AuthContext);
  const clientName = client?.name || user?.userData?.name || "Client";

  const handleLogout = async (logoutFn: () => void) => {
    // Perform any additional cleanup or actions before logging out
    logoutFn();
    await logout();
    router.replace("/(auth)/welcomeScreen" as never);
  };

  const formatAddress = (address: unknown) => {
    if (!address) return "Not provided";
    if (typeof address === "string") return address || "Not provided";

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

    return values.length ? values.join(", ") : "Not provided";
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <ClientHeader
          greeting="My Profile"
          name={clientName}
          subtitle="Manage your account and preferences"
          avatarSource={require("@/assets/images/client.png")}
          avatarStatusColor="#22C55E"
        />

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMeta}>
              <Text
                style={[styles.summaryLabel, { color: colors.text.secondary }]}
              >
                Phone
              </Text>
              <Text
                style={[styles.summaryValue, { color: colors.text.primary }]}
              >
                {client?.phone || user?.userData?.phone || "Not provided"}
              </Text>
            </View>
            <View style={styles.summaryMeta}>
              <Text
                style={[styles.summaryLabel, { color: colors.text.secondary }]}
              >
                Email
              </Text>
              <Text
                style={[styles.summaryValue, { color: colors.text.primary }]}
              >
                {client?.email || user?.userData?.email || "Not provided"}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMeta}>
              <Text
                style={[styles.summaryLabel, { color: colors.text.secondary }]}
              >
                Location
              </Text>
              <Text
                style={[styles.summaryValue, { color: colors.text.primary }]}
              >
                {formatAddress(client?.address) || "Not provided"}
              </Text>
            </View>
            <View style={styles.summaryMeta}>
              <Text
                style={[styles.summaryLabel, { color: colors.text.secondary }]}
              >
                Role
              </Text>
              <Text
                style={[styles.summaryValue, { color: colors.text.primary }]}
              >
                {user?.userData?.role || client?.role || "Parent"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
          {[
            {
              label: "Personal Information",
              icon: "person",
              route: "/(client)/(tabs)/personal-info",
            },
            {
              label: "Account & Security",
              icon: "lock",
              route: "/(client)/(tabs)/account-security",
            },
            {
              label: "Payment & Subscriptions",
              icon: "payment",
              route: "/(client)/(tabs)/payment",
            },
            {
              label: "Help & Support",
              icon: "help-outline",
              route: "/(client)/(tabs)/help",
            },
            {
              label: "About Track My Kid",
              icon: "info",
              route: "/(client)/(tabs)/about",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.actionRow}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.actionLabelRow}>
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.actionLabel, { color: colors.text.primary }]}
                >
                  {item.label}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: "#FEE2E2" }]}
          onPress={() => handleLogout(logout)}
        >
          <MaterialIcons name="logout" size={20} color="#B91C1C" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 140,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  summaryMeta: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  actionCard: {
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,157,88,0.08)",
  },
  actionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 40,
  },
  logoutText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "700",
  },
});
