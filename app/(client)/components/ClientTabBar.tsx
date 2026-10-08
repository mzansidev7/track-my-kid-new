import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  {
    key: "home",
    icon: "home",
    label: "Home",
    route: "/(client)/(tabs)",
  },
  {
    key: "trips",
    icon: "alt-route",
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

export default function ClientTabBar(props: any) {
  void props;
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

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
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: "#FFFFFF",
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: "#FFFFFF",
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.75}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && {
                    backgroundColor: "#E9F8EE",
                  },
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={isActive ? 23 : 22}
                  color={isActive ? "#159B3A" : "#496481"}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? "#159B3A" : "#496481" },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
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
    paddingHorizontal: 0,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },

      android: {
        elevation: 12,
      },
    }),
  },

  tabBar: {
    height: 66,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    paddingHorizontal: 6,

    borderTopWidth: 1,
    borderTopColor: "#E4EDF6",
  },

  tabItem: {
    flex: 1,
    height: 66,

    alignItems: "center",
    justifyContent: "center",

    position: "relative",
  },

  iconWrapper: {
    width: 42,
    height: 34,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 12,
  },

  tabLabel: {
    fontSize: 9,
    marginTop: 1,
  },

  activeTabLabel: {
    fontWeight: "700",
  },

  activeIndicator: {
    position: "absolute",

    bottom: 0,
    width: 30,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#159B3A",
  },
});
