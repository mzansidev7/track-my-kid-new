import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

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
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.label, { color: colors.primary }]}>
            Driver Status
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline ? colors.success : colors.error,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                isOnline ? { color: colors.success } : { color: colors.error },
              ]}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={[styles.gpsIcon, { backgroundColor: colors.background }]}>
          <MaterialIcons name="gps-fixed" size={24} color={colors.primary} />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.smallLabel, { color: colors.primary }]}>
            Vehicle
          </Text>
          <Text style={[styles.value, { color: colors.primary }]}>
            {vehicleName || "No vehicle assigned"}
          </Text>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.smallLabel, { color: colors.primary }]}>
            Registration
          </Text>
          <Text style={[styles.value, { color: colors.primary }]}>
            {licensePlate || "N/A"}
          </Text>
        </View>
      </View>

      {!isOnline && lastUpdated ? (
        <Text style={[styles.lastUpdated, { color: colors.primary }]}>
          Last online: {lastUpdated}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#4B5563",
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
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
  },

  gpsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#0F9D58",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 17,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallLabel: {
    color: "#64748B",
    fontSize: 11,
    marginBottom: 4,
  },

  value: {
    color: "#0F172A",
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
