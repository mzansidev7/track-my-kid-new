import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ClientManagement = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* <Header
        setActiveButton={() => router.back()}
        title="Client Management"
        subTitle="Link families and handle communications"
      /> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Managing Client Relationships</Text>
          <Text style={styles.description}>
            Learn how to connect with families, manage their transportation
            needs, and maintain effective communication.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Connecting Families</Text>
            <Text style={styles.bodyText}>
              1. <Text style={styles.bold}>Client Registration:</Text> Families
              create accounts through the parent app.
            </Text>
            <Text style={styles.bodyText}>
              2. <Text style={styles.bold}>QR Code Linking:</Text> Parents scan
              your QR code to link to your service.
            </Text>
            <Text style={styles.bodyText}>
              3. <Text style={styles.bold}>Child Information:</Text> Collect
              student details, allergies, and special needs.
            </Text>
            <Text style={styles.bodyText}>
              4. <Text style={styles.bold}>Route Assignment:</Text> Assign
              children to appropriate transportation routes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Communication Channels</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Real-time Updates:</Text> Automatic
              notifications for pickups and drop-offs.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Direct Messaging:</Text> Chat with
              parents about specific concerns.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Emergency Alerts:</Text> Immediate
              notifications for urgent situations.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Schedule Changes:</Text> Notify
              families of route or timing modifications.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Client Information</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Contact Details:</Text> Primary and
              emergency contact information.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Medical Information:</Text> Allergies,
              medications, and health conditions.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Pickup/Drop-off Locations:</Text> Home
              addresses and alternative locations.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Authorization Forms:</Text> Emergency
              contacts and medical permissions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Building Trust</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Transparency:</Text> Share route
              details and driver information.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Reliability:</Text> Maintain
              consistent service and communication.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Feedback:</Text> Collect and respond
              to parent feedback and concerns.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Safety Assurance:</Text> Communicate
              safety measures and emergency procedures.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(owner)/linked-clients")}
          >
            <Text style={styles.buttonText}>View Clients</Text>
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

export default ClientManagement;
