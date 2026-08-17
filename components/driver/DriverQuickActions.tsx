import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Action = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

const DriverQuickActions = ({ actions }: Props) => {
  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={styles.action}
          onPress={action.onPress}
          activeOpacity={0.75}
        >
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={action.icon}
              size={22}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D2850",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#193B68",
  },

  action: {
    alignItems: "center",
    width: 70,
  },

  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#0057FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  label: {
    color: "#DCE6F3",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default DriverQuickActions;