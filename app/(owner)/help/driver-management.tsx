import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DriverManagement = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* <Header
        setActiveButton={() => router.back()}
        title="Driver Management"
        subTitle="Invite, assign, and manage drivers"
      /> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Managing Your Drivers</Text>
          <Text style={styles.description}>
            Learn how to add drivers to your fleet, assign them to vehicles, and
            manage their activities.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Adding Drivers</Text>
            <Text style={styles.bodyText}>
              1. <Text style={styles.bold}>Navigate to Drivers:</Text> Go to the
              Drivers section from your dashboard.
            </Text>
            <Text style={styles.bodyText}>
              2. <Text style={styles.bold}>Send Invitation:</Text> Enter the
              driver&apos;s phone number to send an invitation.
            </Text>
            <Text style={styles.bodyText}>
              3. <Text style={styles.bold}>Driver Setup:</Text> Drivers will
              receive an SMS with setup instructions.
            </Text>
            <Text style={styles.bodyText}>
              4. <Text style={styles.bold}>Verification:</Text> Drivers complete
              identity verification and license upload.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Assigning Vehicles</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Vehicle Assignment:</Text> Link
              drivers to specific vehicles they will operate.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Route Assignment:</Text> Assign
              drivers to specific routes and schedules.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Capacity Settings:</Text> Configure
              vehicle capacity and passenger limits.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Monitoring Performance</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Real-time Tracking:</Text> Monitor
              driver location and route progress.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Completion Rates:</Text> Track on-time
              pickups and drop-offs.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Communication Logs:</Text> View
              messages between drivers and parents.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Driver Issues</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Emergency Alerts:</Text> Drivers can
              send emergency notifications.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Route Delays:</Text> Automatic
              notifications for schedule changes.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Vehicle Issues:</Text> Report
              maintenance needs or breakdowns.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            // onPress={() => router.push("/(owner)/drivers")}
          >
            <Text style={styles.buttonText}>Manage Drivers</Text>
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

export default DriverManagement;
