import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DRIVER_COLORS } from "@/styles/theme";

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
    <View
      style={[
        styles.card,
        {
          backgroundColor: DRIVER_COLORS.primaryDark,
          borderColor: DRIVER_COLORS.primary,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.label, { color: "rgba(255,255,255,0.72)" }]}>
            Driver Status
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? DRIVER_COLORS.cyan
                    : DRIVER_COLORS.danger,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                isOnline
                  ? { color: DRIVER_COLORS.cyan }
                  : { color: "#FFB4AE" },
              ]}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.gpsIcon}>
          <MaterialIcons
            name="gps-fixed"
            size={24}
            color={DRIVER_COLORS.cyan}
          />
        </View>
      </View>

      <View
        style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.18)" }]}
      />

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.smallLabel, { color: "rgba(255,255,255,0.68)" }]}>
            Vehicle
          </Text>
          <Text style={[styles.value, { color: DRIVER_COLORS.white }]}>
            {vehicleName || "No vehicle assigned"}
          </Text>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.smallLabel, { color: "rgba(255,255,255,0.68)" }]}>
            Registration
          </Text>
          <Text style={[styles.value, { color: DRIVER_COLORS.white }]}>
            {licensePlate || "N/A"}
          </Text>
        </View>
      </View>

      {!isOnline && lastUpdated ? (
        <Text style={[styles.lastUpdated, { color: DRIVER_COLORS.cyan }]}>
          Last online: {lastUpdated}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "rgba(255,255,255,0.72)",
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
    color: DRIVER_COLORS.white,
    fontSize: 22,
    fontWeight: "700",
  },

  gpsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 17,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    marginBottom: 4,
  },

  value: {
    color: DRIVER_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  rightInfo: {
    alignItems: "flex-end",
  },

  lastUpdated: {
    color: DRIVER_COLORS.cyan,
    fontSize: 11,
    marginTop: 12,
  },
});

export default DriverStatusCard;
