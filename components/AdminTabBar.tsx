import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const navItems = [
  { key: "home", icon: "home", label: "Home", route: "/(admin)/(tabs)" },
  {
    key: "live",
    icon: "location-on",
    label: "Live",
    route: "/(admin)/(tabs)/live",
  },
  {
    key: "support",
    icon: "support-agent",
    label: "Support",
    route: "/(admin)/(tabs)/support",
  },
  {
    key: "more",
    icon: "more-horiz",
    label: "More",
    route: "/(admin)/(tabs)/more",
  },
];

export default function AdminTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const activeSegment = String(segments[segments.length - 1] || "admin");

  const getActiveKey = () => {
    if (activeSegment === "" || activeSegment === "index") return "home";
    if (activeSegment === "live") return "live";
    if (activeSegment === "support") return "support";
    if (activeSegment === "more") return "more";
    return "home";
  };

  const activeKey = getActiveKey();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: "#FFFFFF",
        },
      ]}
    >
      <View style={styles.tabBar}>
        {navItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.75}
              style={styles.tabItem}
              onPress={() => router.push(item.route as any)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && { backgroundColor: "#E9F8EE" },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={isActive ? 23 : 22}
                  color={isActive ? "#159B3A" : "#496481"}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? "#159B3A" : "#496481" },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  tabBar: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E4EDF6",
  },
  tabItem: {
    position: "relative",
    flex: 1,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 42,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabLabel: {
    marginTop: 1,
    fontSize: 9,
  },
  activeTabLabel: {
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 30,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#159B3A",
  },
});
