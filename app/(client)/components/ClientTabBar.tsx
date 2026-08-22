import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../styles/theme";

const tabs = [
  {
    key: "home",
    icon: "dashboard",
    label: "Home",
    route: "/(client)/(tabs)",
  },
  {
    key: "trips",
    icon: "navigation",
    label: "Trips",
    route: "/(client)/(tabs)/trips",
  },
  {
    key: "children",
    icon: "people",
    label: "Children",
    route: "/(client)/(tabs)/children",
  },
  {
    key: "messages",
    icon: "chat-bubble-outline",
    label: "Messages",
    route: "/(client)/(tabs)/messages",
  },
  {
    key: "profile",
    icon: "person-outline",
    label: "Profile",
    route: "/(client)/(tabs)/profile",
  },
];

export default function ClientTabBar(_props: BottomTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border || "#E8E8E8",
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && {
                    backgroundColor: colors.primary + "12",
                  },
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={isActive ? 23 : 22}
                  color={
                    isActive ? colors.primary : colors.secondary || "#8A8A8A"
                  }
                />
              </View>

              {isActive && (
                <View
                  style={[
                    styles.activeIndicator,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              )}
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
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  tabBar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    backgroundColor: "#061A3A",
  },

  tabItem: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  iconWrapper: {
    width: 46,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  activeIndicator: {
    position: "absolute",
    bottom: 5,
    width: 20,
    height: 3,
    borderRadius: 10,
  },
});
