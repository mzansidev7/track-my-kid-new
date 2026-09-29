import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicatorBase,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/authContext/auth-context";
import { signOut } from "@/functions/auth";

export default function ComingSoon({
  user,
  school,
  loading,
}: {
  user: any;
  school: any;
  loading: boolean;
}) {
  const router = useRouter();
  const { logout } = useContext(AuthContext);
  console.log({ school });
  const userName =
    user?.userData?.admin_profile?.first_name ||
    user?.userData?.name ||
    "there";

  const handleLogout = async () => {
    const userSignedOut = await signOut();

    if (userSignedOut.success) {
      logout();
      router.replace("/(auth)/home");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!school) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>No school data available.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleLogout()}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Good morning 👋,</Text>
            <Text style={styles.greetingName}>{userName} </Text>
          </View>
        </View>
      </View>

      <View style={styles.schoolCard}>
        <View style={styles.schoolIcon}>
          {school?.logo ? (
            <Image source={{ uri: school.logo }} style={styles.schoolLogo} />
          ) : (
            <Ionicons name="school-outline" size={24} color="#fff" />
          )}
        </View>

        <View style={styles.schoolInfo}>
          <Text style={styles.schoolTitle}>
            {school?.name || user?.userData?.name}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="school-outline" size={55} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Coming Soon</Text>

        <Text style={styles.subtitle}>
          {`We're building something great for schools.`}
        </Text>

        <Text style={styles.description}>
          Manage students, drivers, vehicles, routes, attendance, parents and
          live transportation tracking — all from one place.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handleLogout()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerLeft: {
    flex: 1,
  },
  greetingContainer: {
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 11,

    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  greeting: {
    fontSize: 15,
    color: "#888",
    marginBottom: 2,
  },

  greetingName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },

  schoolName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#202124",
  },

  schoolCard: {
    backgroundColor: "#4285F4",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  schoolLogo: {
    width: 42,
    height: 42,
    borderRadius: 11,
  },

  schoolIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  schoolInfo: {
    flex: 1,
    marginLeft: 10,
  },

  schoolTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  schoolSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginTop: 3,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7CFF9B",
    marginRight: 5,
  },
  notActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF7C7C",
    marginRight: 5,
  },

  inActiveText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  activeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  headerSpacer: {
    width: 38,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 50,
  },

  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 340,
  },

  button: {
    marginTop: 28,
    paddingHorizontal: 32,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
