import type { SupportAppSection } from "../types/support";
import React, { useMemo } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { HelpTopicItem } from "./helpConfig";

type Props = {
  section: SupportAppSection;
  topics: HelpTopicItem[];
  supportTelUrl: string;
  onTopicPress?: (action: string) => void;
  onSupportAction?: (action: "call" | "email" | "chat" | "ticket") => void;
};

export function HelpSupportContent({
  section,
  topics,
  supportTelUrl,
  onTopicPress,
  onSupportAction,
}: Props) {
  const contactMethods = useMemo(
    () => [
      {
        title: "Call Support",
        description: "Speak directly with our support team",
        icon: "📞",
        action: () =>
          onSupportAction ? onSupportAction("call") : Linking.openURL(supportTelUrl),
      },
      {
        title: "Email Support",
        description: "Send us an email for detailed assistance",
        icon: "📧",
        action: () =>
          onSupportAction ? onSupportAction("email") : Linking.openURL("mailto:support@trackmykid.com"),
      },
      {
        title: "Live Chat",
        description: "Chat with support agents online",
        icon: "💬",
        action: () =>
          onSupportAction ? onSupportAction("chat") : Linking.openURL("https://trackmykid.com/chat"),
      },
      {
        title: "Lodge a Ticket",
        description: "Help us improve our app",
        icon: "📝",
        action: () =>
          onSupportAction ? onSupportAction("ticket") : Linking.openURL("mailto:support@trackmykid.com?subject=Lodge%20a%20Ticket"),
      },
    ],
    [onSupportAction, supportTelUrl],
  );

  const handleTopic = (action: string) => {
    if (onTopicPress) onTopicPress(action);
    else console.log(`[help:${section}] topic:`, action);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Help topics</Text>
        <Text style={styles.description}>
          Find answers to common questions and learn how to use the app
          effectively.
        </Text>

        <View style={styles.topicsGrid}>
          {topics.map((topic, index) => (
            <TouchableOpacity
              key={`${topic.action}-${index}`}
              style={styles.topicCard}
              onPress={() => handleTopic(topic.action)}
            >
              <Text style={styles.topicIcon}>{topic.icon}</Text>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDescription}>{topic.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact support</Text>
        <Text style={styles.description}>
          Cannot find what you need? Reach our team using any option below.
        </Text>

        {contactMethods.map((method, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactMethod}
            onPress={method.action}
          >
            <View style={styles.contactContent}>
              <Text style={styles.contactIcon}>{method.icon}</Text>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDescription}>
                  {method.description}
                </Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Support hours</Text>
        <Text style={styles.infoText}>
          🕘 Monday - Friday: 6:00 AM - 8:00 PM{"\n"}
          🕘 Saturday: 8:00 AM - 6:00 PM{"\n"}
          🕘 Sunday: 9:00 AM - 5:00 PM{"\n"}
          🕘 Emergency support: 24/7
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },

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

  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  topicCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  topicIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  topicTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },

  topicDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },

  contactMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  contactContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  contactIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: "center",
  },

  contactText: {
    flex: 1,
  },

  contactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },

  contactDescription: {
    fontSize: 14,
    color: "#666",
  },

  arrow: {
    fontSize: 20,
    color: "#CCC",
    fontWeight: "bold",
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
    marginBottom: 12,
  },

  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
});
