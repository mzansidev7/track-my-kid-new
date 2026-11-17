import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useContext } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../styles/theme";
import { SchoolBillingAccessContext } from "@/app-support/school/schoolBillingAccess";
import { AuthContext } from "../../../context/authContext/auth-context";

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
    key: "trips",
    icon: "directions-bus",
    route: "/(school)/(tabs)/trips",
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

export default function SchoolTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const { trialExpired } = useContext(SchoolBillingAccessContext);
  const { user } = useContext(AuthContext);
  const isDriver = user?.userData?.admin_profile?.role === "driver";
  const visibleTabs = isDriver
    ? tabs.filter((tab) =>
        ["trips", "messages", "more"].includes(tab.key),
      )
    : tabs;

  const activeSegment = String(segments[segments.length - 1] || "school");

  const getActiveKey = () => {
    switch (activeSegment) {
      case "students":
        return "students";

      case "routes":
        return "routes";

      case "trips":
        return "trips";

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
    <View pointerEvents="box-none" style={[styles.container]}>
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: "#061A3A",
          },
        ]}
      >
        {(trialExpired
          ? [
              ...visibleTabs,
              {
                key: "billing",
                icon: "credit-card",
                route: "/(school)/billing",
              },
            ]
          : visibleTabs
        ).map((tab) => {
          const isActive = tab.key === activeKey;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => router.push(tab.route as any)}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityLabel={
                tab.key === "billing" ? "Subscription and billing" : tab.key
              }
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
    backgroundColor: "transparent",
  },

  floatingBar: {
    width: "100%",
    height: 62,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 5,
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
    borderRadius: 50,
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
