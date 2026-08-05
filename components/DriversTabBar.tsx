import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../styles/theme";

export default function DriversTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string) => {
    switch (routeName) {
      case "index":
        return "home";
      case "trips":
        return "navigation";
      case "students":
        return "people";
      case "profile":
        return "person";
      case "messages":
        return "message";
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom,
          },
        ]}
      >
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
              activeOpacity={0.8}
              style={styles.tab}
              onPress={onPress}
            >
              {isFocused ? (
                <View
                  style={[
                    styles.activeTab,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={getIcon(route.name) as any}
                    size={20}
                    color="#fff"
                  />

                  {/* <Text style={styles.activeText}>{getLabel(route.name)}</Text> */}
                </View>
              ) : (
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={24}
                  color="#8B8B8B"
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
    alignSelf: "stretch",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    height: 48,

    borderRadius: 30,

    paddingHorizontal: 18,

    shadowColor: "#2F6BFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,

    elevation: 6,
  },

  activeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});
