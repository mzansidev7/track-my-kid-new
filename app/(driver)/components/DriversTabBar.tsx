import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, TouchableOpacity, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../styles/theme";

export default function DriversTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string) => {
    switch (routeName) {
      case "index":
        return "dashboard";
      case "trips":
        return "navigation";
      case "students":
        return "people";
      case "messages":
        return "chat-bubble-outline";
      case "profile":
        return "person-outline";
      default:
        return "circle";
    }
  };

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
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={styles.tab}
            >
              <View
                style={[
                  styles.iconContainer,
                  isFocused && {
                    backgroundColor: colors.primary + "12",
                  },
                ]}
              >
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={isFocused ? 23 : 22}
                  color={
                    isFocused ? colors.primary : colors.secondary || "#8A8A8A"
                  }
                />
              </View>

              {isFocused && (
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

    // Modern Android/iOS elevation
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
  },

  tab: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  iconContainer: {
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
