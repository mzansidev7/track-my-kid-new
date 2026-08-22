import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import VerifyOTP from "./(auth)/verify-otp";

import { useAuth } from "../context/authContext/auth-context";
// import ThemeToggle from "../components/ThemeToggle";
import { useAuthStyles } from "../styles/authStyles";
import { useTheme } from "../styles/theme";
import WelcomeScreen from "./(auth)/home";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const redirectKeyRef = React.useRef<string | null>(null);

  const { colors, isDark } = useTheme();
  const styles = useAuthStyles();

  useEffect(() => {
    if (loading) return;

    if (!user || !user.userData) {
      redirectKeyRef.current = null;
      return;
    }

    const { role, userData } = user;
    const isVerified = userData?.is_verified ?? userData?.isVerified ?? false;
    const currentRoot = segments[0];
    const isInsideGroupedRoute =
      typeof currentRoot === "string" && currentRoot.startsWith("(");

    if (!isVerified) {
      if (currentRoot !== "verify-otp") {
        const redirectKey = `verify:${userData?.id ?? "guest"}`;
        if (redirectKeyRef.current !== redirectKey) {
          redirectKeyRef.current = redirectKey;
          router.replace("/verify-otp");
        }
      }
      return;
    }

    if (isInsideGroupedRoute) {
      redirectKeyRef.current = null;
      return;
    }

    const userKey = `${userData?.id ?? "guest"}:${role ?? "unknown"}`;
    let targetRoute = "/";

    switch (role) {
      case "owner":
        targetRoute = "/(owner)/(tabs)";
        break;

      case "client":
        targetRoute = "/(client)/(tabs)";
        break;

      case "driver":
        targetRoute = "/(driver)/(tabs)";
        break;

      case "school":
        targetRoute = "/(school)/(tabs)";
        break;

      case "admin":
        targetRoute = "/(admin)";
        break;

      default:
        targetRoute = "/";
        break;
    }

    if (redirectKeyRef.current === userKey) {
      return;
    }

    redirectKeyRef.current = userKey;
    router.replace(targetRoute as any);
  }, [loading, user, router, segments]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.header}
        >
          <View style={styles.heroContent}>
            <Image
              source={require("@/assets/images/logo-light.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.appTitle}>Track My Kid 🚗</Text>

            <Text style={styles.tagline}>
              Real-time School Transport Monitoring
            </Text>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text.primary} />

              <Text style={styles.loadingText}>
                Preparing your experience...
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!user || !user.userData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <WelcomeScreen />
      </View>
    );
  }

  const { userData } = user;
  const isVerified = userData?.is_verified ?? userData?.isVerified ?? false;

  if (!isVerified) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.primary} />
          <Text style={styles.loadingText}>Redirecting to verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={[colors.background, colors.background]}
        style={styles.header}
      >
        <View style={styles.heroContent}>
          {isDark ? (
            <Image
              source={require("@/assets/images/logo-dark.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={require("@/assets/images/logo-light.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          )}

          <Text style={[styles.appTitle, { color: colors.text.primary }]}>
            Track My Kid
          </Text>

          <Text style={[styles.tagline, { color: colors.text.secondary }]}>
            Real-time School Transport Monitoring
          </Text>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text.primary} />

            <Text style={styles.loadingText}>Hang on tight, loading...</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
