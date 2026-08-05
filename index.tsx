import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import VerifyOTP from "./app/(auth)/verify-otp";
import WelcomeScreen from "./app/(auth)/home";
import { useAuth } from "./authContext/auth-context";
import { useAuthStyles } from "./styles/authStyles";
import { useTheme } from "./styles/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const { colors, isDark } = useTheme();
  const styles = useAuthStyles();

  useEffect(() => {
    if (loading) return;

    if (!user || !user.userData) {
      return;
    }

    const { role, userData } = user;
    const isVerified = userData?.is_verified ?? userData?.isVerified ?? false;

    if (!isVerified) {
      return;
    }

    if (role === "owner") {
      router.replace("/(auth)/home");
      return;
    }

    if (role === "driver") {
      router.replace("/(auth)/home");
      return;
    }

    if (role === "client") {
      router.replace("/(auth)/home");
      return;
    }

    if (role === "school") {
      router.replace("/(auth)/home");
      return;
    }
  }, [loading, user, router]);

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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <VerifyOTP user={userData} />
      </View>
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

const indexStyles = StyleSheet.create({
  themeToggleContainer: {
    position: "absolute",
    top: 30,
    right: 10,
    zIndex: 1,
  },
});
