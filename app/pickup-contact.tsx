import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../url";

type AuthorizedChild = {
  authorization_id: string;
  child_id: string;
  child_name: string;
  relationship: string;
  valid_until: string | null;
};

export default function PickupContactPage() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const [children, setChildren] = useState<AuthorizedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChildren = useCallback(async (isRefresh = false) => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/pickup-contact/children`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load pickup authorizations.");
      setChildren(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert(
        "Pickup access unavailable",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      void loadChildren();
    }, [loadChildren]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/" as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRACK MY KID</Text>
          <Text style={styles.title}>Pickup access</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Sign out"
          onPress={() => void handleLogout()}
          style={styles.logout}
        >
          <MaterialIcons name="logout" size={20} color="#D9A9FF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Only children whose parent or guardian has authorized you appear here.
        Pickup permissions may be revoked at any time.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C14BFF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadChildren(true)}
              tintColor="#C14BFF"
            />
          }
        >
          {children.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="verified-user" size={42} color="#8F7A9C" />
              <Text style={styles.emptyTitle}>No active pickup access</Text>
              <Text style={styles.subtitle}>
                Ask the parent or guardian to check your invitation and pickup
                authorization.
              </Text>
            </View>
          ) : (
            children.map((item) => (
              <View key={item.authorization_id} style={styles.card}>
                <View style={styles.childIcon}>
                  <MaterialIcons
                    name="child-care"
                    size={24}
                    color="#D9A9FF"
                  />
                </View>
                <View style={styles.childCopy}>
                  <Text style={styles.childName}>{item.child_name}</Text>
                  <Text style={styles.meta}>
                    Authorized as {item.relationship}
                  </Text>
                  <Text style={styles.meta}>
                    {item.valid_until
                      ? `Authorization ends ${item.valid_until}`
                      : "Authorization active until revoked"}
                  </Text>
                </View>
                <MaterialIcons
                  name="check-circle"
                  size={22}
                  color="#22C55E"
                />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#100B16" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#A78AAE",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: "#FBF8FF", fontSize: 26, fontWeight: "800", marginTop: 4 },
  logout: { padding: 10 },
  subtitle: {
    color: "#B9AFC4",
    fontSize: 13,
    lineHeight: 19,
    marginHorizontal: 20,
    marginTop: 10,
  },
  list: { padding: 20, gap: 12, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: "#FBF8FF",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#352341",
    backgroundColor: "#1A1222",
    borderRadius: 16,
    padding: 16,
  },
  childIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A1936",
  },
  childCopy: { flex: 1 },
  childName: { color: "#FBF8FF", fontSize: 15, fontWeight: "800" },
  meta: { color: "#B9AFC4", fontSize: 11, marginTop: 4 },
});
