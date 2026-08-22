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
    route: "/(school)/(tabs)",
  },
  {
    key: "students",
    icon: "people-outline",
    route: "/(school)/(tabs)/students",
  },
  {
    key: "routes",
    icon: "alt-route",
    route: "/(school)/(tabs)/routes",
  },
  {
    key: "messages",
    icon: "chat-bubble-outline",
    route: "/(school)/(tabs)/messages",
  },
  {
    key: "more",
    icon: "more-horiz",
    route: "/(school)/more",
  },
];

export default function SchoolTabBar(_props: BottomTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const activeSegment = String(segments[segments.length - 1] || "school");

  const getActiveKey = () => {
    switch (activeSegment) {
      case "students":
        return "students";

      case "routes":
        return "routes";

      case "messages":
        return "messages";

      case "more":
        return "more";

      case "":
      case "index":
      case "school":
      default:
        return "home";
    }
  };

  const activeKey = getActiveKey();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: "#061A3A",
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => router.push(tab.route as any)}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={isActive ? 21 : 21}
                  color={isActive ? "#FFFFFF" : "#AAB5C7"}
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    alignItems: "center",

    paddingHorizontal: 18,

    // Allows the content behind the tab bar
    // to remain visible.
    backgroundColor: "transparent",
  },

  floatingBar: {
    width: "100%",
    height: 62,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,

    // iOS
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },

      // Android
      android: {
        elevation: 12,
      },
    }),
  },

  tabItem: {
    flex: 1,
    height: 62,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  iconWrapper: {
    width: 42,
    height: 42,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",
  },

  activeIndicator: {
    position: "absolute",

    bottom: 5,

    width: 4,
    height: 4,

    borderRadius: 4,
  },
});
