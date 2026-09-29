import React from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

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
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
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
                    { backgroundColor: colors.background },
                  ],
                  action.blinking && styles.iconContainerBlinking,
                ]}
              >
                <MaterialIcons
                  name={action.icon}
                  size={22}
                  color={colors.primary}
                />
              </View>

              <Text
                style={[styles.label, { color: colors.primary }]}
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
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
  },

  action: {
    alignItems: "center",
    width: 70,
  },

  actionBlinking: {
    padding: 8,
  },

  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  iconContainerBlinking: {
    backgroundColor: "#FF8C42",
  },

  label: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default DriverQuickActions;
