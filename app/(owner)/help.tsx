import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { HelpSupportContent } from "../../components/HelpSupportContent";
import {
  helpSubtitleBySection,
  helpTopicsBySection,
  supportTelBySection,
} from "../../components/helpConfig";

const Help = () => {
  const router = useRouter();

  const { renderHeader } = useOwnerPageHeader({
    title: "Help & Support",
    subtitle: `${helpSubtitleBySection.fleet_owner}`,
    onBackPress: () => router.push("/"),
  });

  const handleTopicPress = (action: string) => {
    // Navigate to specific help topic pages
    switch (action) {
      case "guide":
        router.push("/(owner)/help/getting-started");
        break;
      case "drivers":
        router.push("/(owner)/help/driver-management");
        break;
      case "vehicles":
        router.push("/(owner)/help/vehicle-management");
        break;
      case "routes":
        router.push("/(owner)/help/route-planning");
        break;
      case "clients":
        router.push("/(owner)/help/client-management");
        break;
      case "payment":
        router.push("/(owner)/help/billing-payments");
        break;
      default:
        console.log("Unknown help topic:", action);
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <HelpSupportContent
        section="fleet_owner"
        topics={helpTopicsBySection.fleet_owner}
        supportTelUrl={supportTelBySection.fleet_owner}
        onTopicPress={handleTopicPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
});

export default Help;
