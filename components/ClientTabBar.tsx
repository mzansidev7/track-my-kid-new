import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { key: "home", icon: "home", label: "Home", route: "/(client)/(tabs)" },
  {
    key: "trips",
    icon: "location-on",
    label: "Trips",
    route: "/(client)/(tabs)/trips",
  },
  {
    key: "children",
    icon: "child-care",
    label: "Children",
    route: "/(client)/(tabs)/children",
  },
  {
    key: "messages",
    icon: "chat",
    label: "Messages",
    route: "/(client)/(tabs)/messages",
  },
  {
    key: "profile",
    icon: "person",
    label: "Profile",
    route: "/(client)/(tabs)/profile",
  },
];

export default function ClientTabBar(_props: BottomTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const activeSegment = String(segments[segments.length - 1] || "client");

  const getActiveKey = () => {
    if (
      activeSegment === "" ||
      activeSegment === "index" ||
      activeSegment === "client"
    ) {
      return "home";
    }
    if (activeSegment === "trips") return "trips";
    if (activeSegment === "children") return "children";
    if (activeSegment === "messages") return "messages";
    if (activeSegment === "profile") return "profile";
    return "home";
  };

  const activeKey = getActiveKey();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && styles.iconWrapperActive,
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={22}
                  color={isActive ? "#ffffff" : "#6B7280"}
                />
              </View>
              {/* <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text> */}
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
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperActive: {
    backgroundColor: "#2563EB",
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  labelActive: {
    color: "#111827",
  },
});
