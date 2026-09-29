import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";

export default function OwnerOnboarding() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const [checkingState, setCheckingState] = useState(true);

  useEffect(() => {
    const checkOnboardingState = async () => {
      try {
        const onboardingCompleted =
          (await AsyncStorage.getItem("owner_onboarding_complete")) === "true";

        if (onboardingCompleted) {
          router.replace("/(owner)/(tabs)" as never);
          return;
        }
      } catch (error) {
        console.warn("Unable to read owner onboarding state:", error);
      }

      setCheckingState(false);
    };

    checkOnboardingState();
  }, [router]);

  if (checkingState) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Preparing your onboarding setup...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            shadowColor: shadows.md.shadowColor,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <MaterialIcons name="credit-card" size={32} color="#EEF2FF" />
        </View>

        <Text style={[styles.title, { color: colors.text.primary }]}>
          Set up client payments
        </Text>

        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Before you can continue to your dashboard, add your payout details so
          parents and clients can pay for transport services securely.
        </Text>

        <View style={styles.list}>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.listText, { color: colors.text.secondary }]}>
              Connect your payout account for parent/client payments
            </Text>
          </View>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.listText, { color: colors.text.secondary }]}>
              Unlock dashboard access after setup is complete
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push("/(owner)/payments?fromOnboarding=true" as never)
          }
        >
          <Text style={styles.primaryButtonText}>Set up client payments</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  list: {
    marginBottom: 24,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  listText: {
    marginLeft: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
