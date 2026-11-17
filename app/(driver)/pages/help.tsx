import { useRouter } from "expo-router";
import React from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import { DRIVER_COLORS } from "@/styles/theme";
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
    router.push({
      pathname: "/(driver)/pages/help-topic",
      params: { topic: action },
    } as never);
  };

  const handleSupportAction = (
    action: "call" | "email" | "chat" | "ticket",
  ) => {
    switch (action) {
      case "call":
        void Linking.openURL(supportTelBySection.driver).catch(() => {
          Alert.alert(
            "Unable to open phone",
            "Please check that a phone app is available on this device.",
          );
        });
        break;
      case "email":
        void Linking.openURL("mailto:support@trackmykid.co.za").catch(() => {
          Alert.alert(
            "Unable to open email",
            "Please check that an email app is configured on this device.",
          );
        });
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
    backgroundColor: DRIVER_COLORS.background,
  },
  content: {
    flex: 1,
  },
});

export default DriverHelpPage;
