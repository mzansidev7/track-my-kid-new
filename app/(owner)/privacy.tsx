import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const Privacy = () => {
  const router = useRouter();

  const privacySections = [
    {
      title: "Data Collection",
      content:
        "We collect information you provide directly, such as your name, email, and phone number. We also collect usage data to improve our services.",
      icon: "📊",
    },
    {
      title: "Data Usage",
      content:
        "Your data is used to manage transportation services, communicate with drivers and clients, and ensure safety during operations.",
      icon: "🔄",
    },
    {
      title: "Data Sharing",
      content:
        "We only share your data with authorized drivers and clients for transportation purposes and as required by law.",
      icon: "🤝",
    },
    {
      title: "Data Security",
      content:
        "We implement industry-standard security measures to protect your personal information from unauthorized access.",
      icon: "🔐",
    },
    {
      title: "Your Rights",
      content:
        "You have the right to access, update, or delete your personal data. Contact support for assistance.",
      icon: "⚖️",
    },
  ];

  return (
    <View style={styles.container}>
      {/* <Header
        setActiveButton={() => router.back()}
        title="Privacy & Data"
        subTitle="Your data privacy and rights"
      /> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.description}>
            Learn how we collect, use, and protect your personal information.
          </Text>

          {privacySections.map((section, index) => (
            <View key={index} style={styles.privacySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionTitleSmall}>{section.title}</Text>
              </View>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Data Management</Text>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>📋 Request Data Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>🗑️ Request Data Deletion</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>
              📞 Contact Data Protection Officer
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Need Help?</Text>
          <Text style={styles.infoText}>
            If you have questions about your privacy or data rights, contact our
            support team.
          </Text>
          <Text style={styles.contactInfo}>
            📧 privacy@trackmykid.com{"\n"}
            📞 1-800-PRIVACY
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 20 },

  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },

  privacySection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  sectionContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 32,
  },

  actionsCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 20,
  },

  actionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  actionButton: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  actionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  infoCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },

  contactInfo: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "500",
    lineHeight: 22,
  },
});

export default Privacy;
