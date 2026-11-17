import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";

const supportEmail = "support@trackmykid.co.za";

const HelpCenterPage = () => {
  const router = useRouter();

  const emailSupport = async () => {
    try {
      await Linking.openURL(`mailto:${supportEmail}?subject=Track%20My%20Kid%20support`);
    } catch {
      Alert.alert("Unable to open email", `Please email ${supportEmail} for assistance.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader title="Help Center" subtitle="How can our team help?" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Choose how you would like to get help from the Track My Kid support team.
        </Text>
        <HelpOption
          icon="confirmation-number"
          title="Create a support ticket"
          description="Tell us what happened and track your request."
          onPress={() => router.push("/(client)/pages/support-ticket" as never)}
        />
        <HelpOption
          icon="support-agent"
          title="One-to-one live chat"
          description="Find an active support member and start a private chat."
          onPress={() => router.push("/(client)/pages/support-members" as never)}
        />
        <HelpOption
          icon="email"
          title="Email support"
          description={supportEmail}
          onPress={() => void emailSupport()}
        />
        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={20} color="#52705B" />
          <Text style={styles.noteText}>
            For an urgent safety concern, use the emergency help option in your account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const HelpOption = ({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  description: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.option} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.iconWrap}>
      <MaterialIcons name={icon} size={23} color="#16853B" />
    </View>
    <View style={styles.optionCopy}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#718078" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  content: { padding: 18, paddingBottom: 32 },
  intro: { color: "#607067", fontSize: 14, lineHeight: 21, marginBottom: 18 },
  option: {
    alignItems: "center",
    backgroundColor: "#130D1A",
    borderColor: "#352341",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    minHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#1C1026",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    marginRight: 13,
    width: 46,
  },
  optionCopy: { flex: 1 },
  optionTitle: { color: "#FBF8FF", fontSize: 15, fontWeight: "700" },
  optionDescription: { color: "#697970", fontSize: 13, lineHeight: 18, marginTop: 4 },
  note: {
    alignItems: "flex-start",
    backgroundColor: "#1C1026",
    borderRadius: 12,
    flexDirection: "row",
    gap: 9,
    marginTop: 8,
    padding: 13,
  },
  noteText: { color: "#52705B", flex: 1, fontSize: 12, lineHeight: 18 },
});

export default HelpCenterPage;
