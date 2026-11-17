import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DRIVER_COLORS } from "@/styles/theme";

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
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: DRIVER_COLORS.card,
          borderColor: DRIVER_COLORS.cardBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: DRIVER_COLORS.primary }]}>
            Today&apos;s Route
          </Text>
          <Text style={[styles.routeName, { color: DRIVER_COLORS.text }]}>
            {routeName}
          </Text>
        </View>

        <View
          style={[
            styles.routeIcon,
            { backgroundColor: DRIVER_COLORS.successSurface },
          ]}
        >
          <MaterialIcons
            name="alt-route"
            size={23}
            color={DRIVER_COLORS.primary}
          />
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.timeline}>
          <View
            style={[
              styles.startDot,
              { backgroundColor: DRIVER_COLORS.success },
            ]}
          />
          <View
            style={[
              styles.line,
              { backgroundColor: DRIVER_COLORS.cardBorder },
            ]}
          />
          <View
            style={[
              styles.endDot,
              { backgroundColor: DRIVER_COLORS.warning },
            ]}
          />
        </View>

        <View style={styles.locations}>
          <View style={styles.location}>
            <Text style={[styles.locationLabel, { color: DRIVER_COLORS.muted }]}>
              START
            </Text>
            <Text style={[styles.locationText, { color: DRIVER_COLORS.text }]}>
              {startLocation}
            </Text>
          </View>

          <View style={styles.location}>
            <Text style={[styles.locationLabel, { color: DRIVER_COLORS.muted }]}>
              DESTINATION
            </Text>
            <Text style={[styles.locationText, { color: DRIVER_COLORS.text }]}>
              {endLocation}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.info}>
          <MaterialIcons
            name="schedule"
            size={17}
            color={DRIVER_COLORS.primary}
          />

          <Text style={[styles.infoText, { color: DRIVER_COLORS.muted }]}>
            {time || "Not scheduled"}
          </Text>
        </View>

        <View style={styles.info}>
          <MaterialIcons
            name="groups"
            size={17}
            color={DRIVER_COLORS.primary}
          />

          <Text style={[styles.infoText, { color: DRIVER_COLORS.muted }]}>
            {students} students
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: DRIVER_COLORS.primary }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: DRIVER_COLORS.white }]}>
          View Route
        </Text>

        <MaterialIcons
          name="arrow-forward"
          size={19}
          color={DRIVER_COLORS.white}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: DRIVER_COLORS.muted,
    fontSize: 12,
  },

  routeName: {
    color: DRIVER_COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },

  routeIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: DRIVER_COLORS.successSurface,
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
    backgroundColor: DRIVER_COLORS.cyan,
  },

  line: {
    width: 2,
    height: 45,
    backgroundColor: DRIVER_COLORS.cardBorder,
  },

  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DRIVER_COLORS.primary,
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
    color: DRIVER_COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  locationText: {
    color: DRIVER_COLORS.text,
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
    color: DRIVER_COLORS.muted,
    fontSize: 12,
    marginLeft: 6,
  },

  button: {
    backgroundColor: DRIVER_COLORS.primary,
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
