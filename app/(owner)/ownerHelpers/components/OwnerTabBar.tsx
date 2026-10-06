import { useTheme } from "@/styles/theme";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OwnerTabBarProps = {
  state: {
    routes: { key: string; name: string }[];
    index: number;
  };
  navigation: {
    navigate: (name: string) => void;
  };
};

export default function OwnerTabBar({ state, navigation }: OwnerTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function getIcon(routeName: string) {
    switch (routeName) {
      case "index":
        return "home";
      case "drivers":
        return "people";
      case "vehicles":
        return "directions-car";
      case "routes":
        return "route";
      case "messages":
        return "message";
      case "profile":
        return "person";
      default:
        return "circle";
    }
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.brands.owner.primaryDark,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.75}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name as never)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  focused && {
                    backgroundColor: colors.brands.owner.surface,
                  },
                ]}
              >
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={focused ? 23 : 22}
                  color={
                    focused
                      ? colors.brands.owner.primary
                      : colors.brands.owner.surface
                  }
                />
              </View>

              {focused && (
                <View
                  style={[
                    styles.activeIndicator,
                    {
                      backgroundColor: colors.brands.owner.primary,
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
    paddingHorizontal: 14,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },

      android: {
        elevation: 12,
      },
    }),
  },

  tabBar: {
    height: 64,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    paddingHorizontal: 6,

    borderRadius: 22,

    overflow: "hidden",
  },

  tabItem: {
    flex: 1,
    height: 64,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  iconWrapper: {
    width: 44,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
  },

  activeIndicator: {
    position: "absolute",
    bottom: 5,
    width: 20,
    height: 3,
    borderRadius: 10,
  },
});
