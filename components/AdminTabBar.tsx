import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const navItems = [
  { key: "home", icon: "home", label: "Home", route: "/(admin)/(tabs)" },
  { key: "live", icon: "location-on", label: "Live", route: "/(admin)/(tabs)/live" },
//   { key: "fab", icon: "add", label: "Create", route: "/(client)/(tabs)/children" },
  { key: "support", icon: "support-agent", label: "Support", route: "/(admin)/(tabs)/support" },
  { key: "more", icon: "more-horiz", label: "More", route: "/(admin)/(tabs)/more" },
];

export default function AdminTabBar(_props: BottomTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const activeSegment = String(segments[segments.length - 1] || "admin");

  const getActiveKey = () => {
    if (activeSegment === "" || activeSegment === "index") return "index";
    if (activeSegment === "live") return "live";
    if (activeSegment === "support" || activeSegment === "support") return "support";
    if (activeSegment === "more" || activeSegment === "more") return "more";
    return "index";
  };


  const activeKey = getActiveKey();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}> 
        {navItems.map((item) => {
          const isFab = item.key === "fab";
          const isActive = item.key === activeKey;

          if (isFab) {
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={styles.fabWrapper}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.fabButton}>
                  <MaterialIcons name={item.icon as any} size={28} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => router.push(item.route as any)}
            >
              <MaterialIcons name={item.icon as any} size={24} color={isActive ? "#10B981" : "#6B7280"} />
              <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 100,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: { alignItems: "center", flex: 1 },
  navText: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  navTextActive: { color: "#10B981", fontWeight: "700" },
  fabWrapper: { position: "absolute", alignSelf: "center", top: -28 },
  fabButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#10B981", justifyContent: "center", alignItems: "center", elevation: 8 },
});
