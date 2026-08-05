import { useTheme } from "../../styles/theme";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OwnerTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string) => {
    switch (routeName) {
      case "index":
        return "home";
      case "drivers":
        return "people";
      case "profile":
        return "person";
      default:
        return "circle";
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case "index":
        return "Home";
      case "drivers":
        return "Drivers";
      case "profile":
        return "Profile";
      default:
        return routeName;
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadows.md,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          console.log({ route, index });
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.85}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name as never)}
            >
              <Animated.View
                style={[
                  styles.activeContainer,
                  focused && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={22}
                  color={focused ? "#FFF" : colors.text.secondary}
                />

                {focused && (
                  <Text style={styles.activeLabel}>{getLabel(route.name)}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
  },

  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    borderRadius: 28,

    borderWidth: 1,

    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  tab: {
    flex: 1,
    alignItems: "center",
  },

  activeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 18,
    height: 48,

    borderRadius: 24,
  },

  activeLabel: {
    color: "#FFF",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },
});
