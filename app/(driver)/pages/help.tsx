import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import DriverHeader from "@/components/driver/DriverHeader";
import { HelpSupportContent } from "@/components/HelpSupportContent";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  helpSubtitleBySection,
  helpTopicsBySection,
  supportTelBySection,
} from "@/components/helpConfig";

const DriverHelpPage = () => {
  const router = useRouter();

  const handleTopicPress = (action: string) => {
    switch (action) {
      case "guide":
        router.push("/(driver)/pages/help-guide" as never);
        break;
      case "routes":
        router.push("/(driver)/pages/help-routes" as never);
        break;
      case "checkin":
        router.push("/(driver)/pages/help-checkin" as never);
        break;
      case "vehicle":
        router.push("/(driver)/pages/help-vehicle" as never);
        break;
      case "coordination":
        router.push("/(driver)/pages/help-coordination" as never);
        break;
      case "emergency":
        router.push("/(driver)/pages/help-emergency" as never);
        break;
      default:
        console.log("Unknown driver help topic:", action);
    }
  };

  const handleSupportAction = (action: "call" | "email" | "chat" | "ticket") => {
    switch (action) {
      case "call":
        router.push("/(driver)/pages/support-call" as never);
        break;
      case "email":
        router.push("/(driver)/pages/support-email" as never);
        break;
      case "chat":
        router.push("/(driver)/pages/support-chat" as never);
        break;
      case "ticket":
        router.push("/(driver)/pages/support-ticket" as never);
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DriverHeader
        title="Help & Support"
        subtitle={helpSubtitleBySection.driver}
        showBackButton
      />

      <View style={styles.content}>
        <HelpSupportContent
          section="driver"
          topics={helpTopicsBySection.driver}
          supportTelUrl={supportTelBySection.driver}
          onTopicPress={handleTopicPress}
          onSupportAction={handleSupportAction}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
  },
});

export default DriverHelpPage;
