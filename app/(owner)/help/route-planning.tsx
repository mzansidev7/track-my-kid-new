import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const RoutePlanning = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* <Header
        setActiveButton={() => router.back()}
        title="Route Planning"
        subTitle="Build routes and assign vehicles or drivers"
      /> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Planning Transportation Routes
          </Text>
          <Text style={styles.description}>
            Learn how to create efficient routes, assign drivers and vehicles,
            and optimize your transportation schedule.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗺️ Creating Routes</Text>
            <Text style={styles.bodyText}>
              1. <Text style={styles.bold}>Route Details:</Text> Enter route
              name, description, and service area.
            </Text>
            <Text style={styles.bodyText}>
              2. <Text style={styles.bold}>Stop Sequence:</Text> Add pickup and
              drop-off locations in order.
            </Text>
            <Text style={styles.bodyText}>
              3. <Text style={styles.bold}>Time Windows:</Text> Set scheduled
              pickup and arrival times.
            </Text>
            <Text style={styles.bodyText}>
              4. <Text style={styles.bold}>Capacity Planning:</Text> Assign
              appropriate vehicle sizes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍✈️ Driver Assignment</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Driver Availability:</Text> Check
              driver schedules and certifications.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Route Compatibility:</Text> Match
              drivers with appropriate route types.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Backup Drivers:</Text> Assign
              secondary drivers for coverage.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Communication:</Text> Notify drivers
              of route assignments.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Vehicle Assignment</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Capacity Matching:</Text> Ensure
              vehicle size meets passenger needs.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Equipment Requirements:</Text> Special
              seats, ramps, or accessibility features.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Maintenance Status:</Text> Verify
              vehicle is road-ready.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Fuel Planning:</Text> Ensure
              sufficient fuel for route completion.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Schedule Optimization</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Time Windows:</Text> Respect school
              start/end times and parent preferences.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Traffic Patterns:</Text> Account for
              rush hours and road conditions.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Buffer Time:</Text> Include time for
              unexpected delays or issues.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Route Efficiency:</Text> Minimize
              mileage while maximizing service.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            // onPress={() => router.push("/(owner)/createRoutes")}
          >
            <Text style={styles.buttonText}>Create Route</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "600",
    color: "#333",
  },
  button: {
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RoutePlanning;
