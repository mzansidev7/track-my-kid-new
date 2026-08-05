import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GettingStarted = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Welcome to Track My Kid</Text>
          <Text style={styles.description}>
            Learn the basics of managing your transportation fleet with our
            comprehensive platform.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚀 Quick Start Guide</Text>
            <Text style={styles.bodyText}>
              1. <Text style={styles.bold}>Set up your profile:</Text> Complete
              your company information and billing details.
            </Text>
            <Text style={styles.bodyText}>
              2. <Text style={styles.bold}>Add your drivers:</Text> Invite
              drivers to join your fleet and assign them to vehicles.
            </Text>
            <Text style={styles.bodyText}>
              3. <Text style={styles.bold}>Register vehicles:</Text> Add your
              fleet vehicles with capacity and route information.
            </Text>
            <Text style={styles.bodyText}>
              4. <Text style={styles.bold}>Create routes:</Text> Build
              transportation routes and assign drivers and vehicles.
            </Text>
            <Text style={styles.bodyText}>
              5. <Text style={styles.bold}>Link clients:</Text> Connect families
              to your transportation services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Key Features</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Real-time tracking:</Text> Monitor
              your fleet and student pickups/drop-offs
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Automated notifications:</Text> Keep
              parents and schools informed
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Route optimization:</Text> Efficient
              routing for your drivers
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Payment processing:</Text> Handle
              billing and payments securely
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(owner)/(tabs)/drivers")}
          >
            <Text style={styles.buttonText}>Add Your First Driver</Text>
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

export default GettingStarted;
