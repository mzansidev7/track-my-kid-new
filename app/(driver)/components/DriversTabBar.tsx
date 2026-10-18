import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DriversTabBar({
  state,
  navigation,
}: {
  state: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string) => {
    switch (routeName) {
      case "index":
        return "home";
      case "trips":
        return "route";
      case "students":
        return "people";
      case "messages":
        return "message";
      case "profile":
        return "person";
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
          backgroundColor: "#17385F",
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: "#17385F",
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
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
                  focused && {
                    backgroundColor: "white",
                  },
                ]}
              >
                <MaterialIcons
                  name={getIcon(route.name) as any}
                  size={focused ? 23 : 22}
                  color={focused ? "#17385F" : "white"}
                />
              </View>

              {focused && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: "white" },
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
