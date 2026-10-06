import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../styles/theme";

const Privacy = () => {
  const { colors, shadows, getBrandColors } = useTheme();
  const ownerColors = getBrandColors("owner");
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    card: {
      backgroundColor: ownerColors.surface,
      padding: 20,
      borderRadius: 12,
      ...shadows.md,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    privacySection: {
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: ownerColors.divider,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionIcon: { fontSize: 20, marginRight: 12 },
    sectionTitleSmall: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text.primary,
    },
    sectionContent: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginLeft: 32,
    },
    actionsCard: {
      backgroundColor: ownerColors.surface,
      padding: 20,
      borderRadius: 12,
      ...shadows.md,
      marginBottom: 20,
    },
    actionsTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 16,
    },
    actionButton: {
      backgroundColor: colors.surfaceHover,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: "500",
    },
    infoCard: {
      backgroundColor: ownerColors.surface,
      padding: 20,
      borderRadius: 12,
      ...shadows.md,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    contactInfo: {
      fontSize: 14,
      color: ownerColors.primary,
      fontWeight: "500",
      lineHeight: 22,
    },
  });

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

export default Privacy;
