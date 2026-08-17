import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  driverName: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
};

const DriverHeader = ({
  driverName,
  onNotificationPress,
  onProfilePress,
}: Props) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Hello, {driverName} 👋</Text>
        <Text style={styles.subtitle}>Ready for today&apos;s trips?</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
        >
          <MaterialIcons
            name="notifications-none"
            size={25}
            color="#FFFFFF"
          />

          <View style={styles.notificationDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={onProfilePress}
        >
          <MaterialIcons
            name="person"
            size={23}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  greeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    color: "#AAB8CC",
    fontSize: 13,
    marginTop: 5,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#102B50",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationDot: {
    position: "absolute",
    right: 9,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C7D6",
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0057FF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default DriverHeader;