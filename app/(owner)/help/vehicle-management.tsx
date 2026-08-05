import { useOwnerPageHeader } from "@/ownerHelpers/hooks/useOwnerPageHeader";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const VehicleManagement = () => {
  const router = useRouter();

  const { renderHeader } = useOwnerPageHeader({
    title: "Documentation",
    subtitle: `Documentation for managing routes, vehicles, and drivers`,
    onActionPress: () => router.push("/(owner)/manage-vehicle/[id].tsx"),
  });
  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <Text style={styles.description}>
          Track My Kid helps fleet owners manage school transport by organizing
          vehicles, drivers, routes, stops, and students while giving parents
          real-time visibility of their children&apos;s journeys.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚌 Vehicles</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Register Vehicles:</Text> Add every
            school transport vehicle with its name, model, license plate,
            capacity, and photos.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Assign Drivers:</Text> Link each vehicle
            to a driver responsible for daily routes.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Manage Capacity:</Text> Ensure the
            number of assigned children never exceeds the vehicle&apos;s seating
            capacity.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Routes & Stops</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Create Routes:</Text> Define pickup and
            drop-off routes with starting and ending locations.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Add Stops:</Text> Create stops in the
            correct order so drivers can follow an organized route.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Departure Times:</Text> Configure pickup
            and afternoon departure schedules.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Assign Children:</Text> Allocate
            students to the correct route and stop.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧 Parents</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Invite Parents:</Text> Parents can
            register and link their children to your transport service.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Live Tracking:</Text> Parents can see
            the vehicle&apos;s live location during active trips.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Notifications:</Text> Parents receive
            updates when trips begin, vehicles approach stops, and children are
            picked up or dropped off.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍✈️ Drivers</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Assigned Routes:</Text> Drivers only see
            the routes, vehicles, and children assigned to them.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Trip Management:</Text> Drivers can
            start and end pickup and drop-off trips directly from the app.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Stop Navigation:</Text> View all stops
            in sequence and navigate to each location.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Live Tracking</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Real-Time GPS:</Text> Vehicle location
            updates are shared with parents while a trip is active.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Trip History:</Text> Review completed
            routes and previous journeys.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Route Progress:</Text> Monitor completed
            and upcoming stops during each trip.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 QR Codes</Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Vehicle QR Code:</Text> Every vehicle
            has a unique QR code that can be shared with parents for quick
            linking.
          </Text>

          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Quick Registration:</Text> Scanning the
            QR code opens the registration or linking process automatically.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>

          <Text style={styles.bodyText}>• Trip started and completed.</Text>

          <Text style={styles.bodyText}>• Driver assigned or changed.</Text>

          <Text style={styles.bodyText}>• Route updates.</Text>

          <Text style={styles.bodyText}>
            • Important announcements from the fleet owner.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Best Practices</Text>

          <Text style={styles.bodyText}>
            • Keep vehicle and driver information up to date.
          </Text>

          <Text style={styles.bodyText}>
            • Verify all route stops before assigning children.
          </Text>

          <Text style={styles.bodyText}>
            • Regularly check vehicle capacity to avoid overbooking.
          </Text>

          <Text style={styles.bodyText}>
            • Encourage parents to enable notifications for real-time updates.
          </Text>
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

export default VehicleManagement;
