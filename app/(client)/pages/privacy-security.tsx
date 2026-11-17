import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ClientHeader from "../components/ClientHeader";

const privacySections = [
  {
    icon: "directions-bus",
    title: "Trip and child safety",
    description:
      "Your child's trip information is used to coordinate transport and share relevant updates with their assigned driver and school.",
  },
  {
    icon: "location-on",
    title: "Location information",
    description:
      "Driver location is shared with you for active transport and safety updates. Location data is used to support trip tracking.",
  },
  {
    icon: "lock",
    title: "Account protection",
    description:
      "Use a unique password and keep your child handoff safety PIN private. Never share your password or PIN in messages.",
  },
  {
    icon: "verified-user",
    title: "Your information",
    description:
      "You can review and update your personal details and notification preferences from your account settings.",
  },
];

const PrivacySecurity = () => {
  const router = useRouter();

  const contactPrivacy = async () => {
    try {
      await Linking.openURL(
        "mailto:privacy@trackmykid.com?subject=Privacy%20and%20data%20request",
      );
    } catch (error) {
      console.error("Could not open privacy contact email", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader
        title="Privacy & Security"
        subtitle="Manage your account and data"
        showBackButton
        style={styles.header}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="shield" size={27} color="#C14BFF" />
          </View>
          <Text style={styles.heroTitle}>Your family’s information matters</Text>
          <Text style={styles.heroDescription}>
            See how account details and trip information are used, and find
            shortcuts to important security settings.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Privacy overview</Text>
        <View style={styles.card}>
          {privacySections.map((section, index) => (
            <View
              key={section.title}
              style={[
                styles.infoRow,
                index === privacySections.length - 1 && styles.infoRowLast,
              ]}
            >
              <View style={styles.infoIcon}>
                <MaterialIcons
                  name={section.icon as keyof typeof MaterialIcons.glyphMap}
                  size={19}
                  color="#C14BFF"
                />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoTitle}>{section.title}</Text>
                <Text style={styles.infoDescription}>
                  {section.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Security shortcuts</Text>
        <View style={styles.card}>
          <Shortcut
            icon="lock-outline"
            title="Change password"
            description="Update your sign-in password"
            onPress={() => router.push("/(client)/pages/change-password" as never)}
          />
          <Shortcut
            icon="verified-user"
            title="Child handoff safety PIN"
            description="Manage the PIN used to verify handoff"
            onPress={() => router.push("/(client)/pages/safety-pin" as never)}
          />
          <Shortcut
            icon="notifications-none"
            title="Notification preferences"
            description="Choose which account updates you receive"
            onPress={() =>
              router.push("/(client)/pages/notification-preferences" as never)
            }
            last
          />
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Privacy questions or data request?</Text>
          <Text style={styles.contactDescription}>
            Contact our privacy team for help with your information or data
            rights.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => void contactPrivacy()}
            accessibilityRole="button"
          >
            <MaterialIcons name="mail-outline" size={18} color="#C14BFF" />
            <Text style={styles.contactButtonText}>Email privacy team</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Shortcut = ({
  icon,
  title,
  description,
  onPress,
  last = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  last?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.shortcut, last && styles.shortcutLast]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
  >
    <View style={styles.infoIcon}>
      <MaterialIcons name={icon} size={19} color="#C14BFF" />
    </View>
    <View style={styles.infoCopy}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={22} color="#B9AFC4" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  header: { marginBottom: 0 },
  content: { padding: 18, paddingBottom: 36 },
  hero: {
    alignItems: "center",
    padding: 21,
    marginBottom: 21,
    borderRadius: 18,
    backgroundColor: "#1C1026",
  },
  heroIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#130D1A",
  },
  heroTitle: {
    marginTop: 12,
    color: "#FBF8FF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  heroDescription: {
    marginTop: 6,
    color: "#B9AFC4",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  sectionTitle: {
    marginBottom: 9,
    color: "#FBF8FF",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    paddingHorizontal: 13,
    marginBottom: 21,
    borderRadius: 16,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1C1026",
  },
  infoCopy: { flex: 1 },
  infoTitle: { color: "#FBF8FF", fontSize: 12, fontWeight: "800" },
  infoDescription: {
    marginTop: 4,
    color: "#B9AFC4",
    fontSize: 10,
    lineHeight: 15,
  },
  shortcut: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  shortcutLast: { borderBottomWidth: 0 },
  contactCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  contactTitle: { color: "#FBF8FF", fontSize: 13, fontWeight: "800" },
  contactDescription: {
    marginTop: 5,
    color: "#B9AFC4",
    fontSize: 11,
    lineHeight: 16,
  },
  contactButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#1C1026",
  },
  contactButtonText: { color: "#C14BFF", fontSize: 11, fontWeight: "800" },
});

export default PrivacySecurity;
