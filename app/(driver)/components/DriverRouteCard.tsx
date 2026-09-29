import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/styles/theme";

type Props = {
  routeName: string;
  startLocation: string;
  endLocation: string;
  students: number;
  time?: string;
  onPress: () => void;
};

const DriverRouteCard = ({
  routeName,
  startLocation,
  endLocation,
  students,
  time,
  onPress,
}: Props) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: colors.primary }]}>
            Today&apos;s Route
          </Text>
          <Text style={[styles.routeName, { color: colors.primary }]}>
            {routeName}
          </Text>
        </View>

        <View
          style={[styles.routeIcon, { backgroundColor: colors.background }]}
        >
          <MaterialIcons name="alt-route" size={23} color={colors.primary} />
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.timeline}>
          <View
            style={[styles.startDot, { backgroundColor: colors.primary }]}
          />
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <View style={[styles.endDot, { backgroundColor: colors.primary }]} />
        </View>

        <View style={styles.locations}>
          <View style={styles.location}>
            <Text style={[styles.locationLabel, { color: colors.primary }]}>
              START
            </Text>
            <Text style={[styles.locationText, { color: colors.primary }]}>
              {startLocation}
            </Text>
          </View>

          <View style={styles.location}>
            <Text style={[styles.locationLabel, { color: colors.primary }]}>
              DESTINATION
            </Text>
            <Text style={[styles.locationText, { color: colors.primary }]}>
              {endLocation}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.info}>
          <MaterialIcons name="schedule" size={17} color={colors.primary} />

          <Text style={[styles.infoText, { color: colors.primary }]}>
            {time || "Not scheduled"}
          </Text>
        </View>

        <View style={styles.info}>
          <MaterialIcons name="groups" size={17} color={colors.primary} />

          <Text style={[styles.infoText, { color: colors.primary }]}>
            {students} students
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: colors.surface }]}>
          View Route
        </Text>

        <MaterialIcons name="arrow-forward" size={19} color={colors.surface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 157, 88, 0.16)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#4B5563",
    fontSize: 12,
  },

  routeName: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 4,
  },

  routeIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#0F9D58",
    justifyContent: "center",
    alignItems: "center",
  },

  route: {
    flexDirection: "row",
    marginTop: 22,
  },

  timeline: {
    width: 25,
    alignItems: "center",
  },

  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
  },

  line: {
    width: 2,
    height: 45,
    backgroundColor: "#BBF7D0",
  },

  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0F9D58",
  },

  locations: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "space-between",
  },

  location: {
    marginBottom: 15,
  },

  locationLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  locationText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },

  infoRow: {
    flexDirection: "row",
    marginTop: 5,
    gap: 20,
  },

  info: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoText: {
    color: "#334155",
    fontSize: 12,
    marginLeft: 6,
  },

  button: {
    backgroundColor: "#0F9D58",
    height: 46,
    borderRadius: 13,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default DriverRouteCard;
