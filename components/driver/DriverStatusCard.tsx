import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  isOnline: boolean;
  lastUpdated?: string;
  vehicleName?: string;
  licensePlate?: string;
};

const DriverStatusCard = ({
  isOnline,
  lastUpdated,
  vehicleName,
  licensePlate,
}: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Driver Status</Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? "#25D6A2"
                    : "#F59E0B",
                },
              ]}
            />

            <Text style={styles.statusText}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.gpsIcon}>
          <MaterialIcons
            name="gps-fixed"
            size={24}
            color="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.smallLabel}>Vehicle</Text>
          <Text style={styles.value}>
            {vehicleName || "No vehicle assigned"}
          </Text>
        </View>

        <View style={styles.rightInfo}>
          <Text style={styles.smallLabel}>Registration</Text>
          <Text style={styles.value}>
            {licensePlate || "N/A"}
          </Text>
        </View>
      </View>

      {!isOnline && lastUpdated ? (
        <Text style={styles.lastUpdated}>
          Last online: {lastUpdated}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D2850",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#193B68",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#AAB8CC",
    fontSize: 13,
    marginBottom: 7,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  gpsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#0057FF",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#214064",
    marginVertical: 17,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallLabel: {
    color: "#7F94B1",
    fontSize: 11,
    marginBottom: 4,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  rightInfo: {
    alignItems: "flex-end",
  },

  lastUpdated: {
    color: "#F59E0B",
    fontSize: 11,
    marginTop: 12,
  },
});

export default DriverStatusCard;