import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../styles/theme";

export default function DriversTabBar({
  state,
  navigation,
}: {
  state: any;
  navigation: any;
}) {
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
          styles.tabBar,
          {
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(15, 157, 88, 0.16)",
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
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
              activeOpacity={0.75}
              onPress={onPress}
              style={styles.tab}
            >
              <View
                style={[
                  styles.iconContainer,
                  isFocused && {
                    backgroundColor: "rgba(15, 157, 88, 0.08)",
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

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

  tab: {
    flex: 1,
    height: 64,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  iconContainer: {
    width: 44,
    height: 38,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 13,
  },

  activeIndicator: {
    position: "absolute",

    bottom: 5,

    width: 20,
    height: 3,

    borderRadius: 10,
  },
});
