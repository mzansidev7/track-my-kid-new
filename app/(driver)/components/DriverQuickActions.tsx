import React from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DRIVER_COLORS } from "@/styles/theme";

type Action = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  blinking?: boolean;
  blinkAnim?: Animated.Value | null;
};

type Props = {
  actions: Action[];
};

const DriverQuickActions = ({ actions }: Props) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: DRIVER_COLORS.card,
          borderColor: DRIVER_COLORS.cardBorder,
        },
      ]}
    >
      {actions.map((action, index) => {
        const opacity = action.blinkAnim
          ? action.blinkAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            })
          : 1;

        return (
          <Animated.View
            key={index}
            style={[
              {
                opacity: action.blinking ? opacity : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.action, action.blinking && styles.actionBlinking]}
              onPress={action.onPress}
              activeOpacity={0.75}
            >
              <View
                style={[
                  [
                    styles.iconContainer,
                    {
                      backgroundColor:
                        action.label === "SOS" ? "#FCE9E7" : "#EAF2ED",
                    },
                  ],
                  action.blinking && styles.iconContainerBlinking,
                ]}
              >
                <MaterialIcons
                  name={action.icon}
                  size={22}
                  color={
                    action.label === "SOS"
                      ? DRIVER_COLORS.danger
                      : DRIVER_COLORS.primary
                  }
                />
              </View>

              <Text
                style={[styles.label, { color: DRIVER_COLORS.text }]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 17,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },

  action: {
    alignItems: "center",
    width: 70,
  },

  actionBlinking: {
    padding: 8,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  iconContainerBlinking: {
    backgroundColor: DRIVER_COLORS.warning,
  },

  label: {
    color: DRIVER_COLORS.text,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default DriverQuickActions;
