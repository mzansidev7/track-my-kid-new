import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OWNER_COLORS } from "@/styles/theme";

type OwnerTabBarProps = {
  state: {
    routes: { key: string; name: string }[];
    index: number;
  };
  navigateToTab: (routeKey: string) => void;
};

export default function OwnerTabBar({ state, navigateToTab }: OwnerTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (keyboardVisible) return null;

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
          backgroundColor: OWNER_COLORS.background,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: OWNER_COLORS.background,
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
              onPress={() => navigateToTab(route.key)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  focused && {
                    backgroundColor: OWNER_COLORS.primary,
                  },
                ]}
              >
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={focused ? 23 : 22}
                  color={focused ? OWNER_COLORS.background : OWNER_COLORS.textSecondary}
                />
              </View>

              {focused && (
                <View
                  style={[
                    styles.activeIndicator,
                    {
                      backgroundColor: OWNER_COLORS.primaryBright,
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
