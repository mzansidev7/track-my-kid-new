import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Today&apos;s Route</Text>
          <Text style={styles.routeName}>{routeName}</Text>
        </View>

        <View style={styles.routeIcon}>
          <MaterialIcons
            name="alt-route"
            size={23}
            color="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.timeline}>
          <View style={styles.startDot} />
          <View style={styles.line} />
          <View style={styles.endDot} />
        </View>

        <View style={styles.locations}>
          <View style={styles.location}>
            <Text style={styles.locationLabel}>START</Text>
            <Text style={styles.locationText}>
              {startLocation}
            </Text>
          </View>

          <View style={styles.location}>
            <Text style={styles.locationLabel}>DESTINATION</Text>
            <Text style={styles.locationText}>
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
            color="#22C7D6"
          />

          <Text style={styles.infoText}>
            {time || "Not scheduled"}
          </Text>
        </View>

        <View style={styles.info}>
          <MaterialIcons
            name="groups"
            size={17}
            color="#22C7D6"
          />

          <Text style={styles.infoText}>
            {students} students
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>View Route</Text>

        <MaterialIcons
          name="arrow-forward"
          size={19}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D2850",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#193B68",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#7F94B1",
    fontSize: 12,
  },

  routeName: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 4,
  },

  routeIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#0057FF",
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
    backgroundColor: "#22C7D6",
  },

  line: {
    width: 2,
    height: 45,
    backgroundColor: "#31557C",
  },

  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0057FF",
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
    color: "#6F86A4",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  locationText: {
    color: "#FFFFFF",
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
    color: "#C7D3E2",
    fontSize: 12,
    marginLeft: 6,
  },

  button: {
    backgroundColor: "#0057FF",
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