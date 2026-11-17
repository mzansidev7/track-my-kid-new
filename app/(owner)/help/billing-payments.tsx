import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useOwnerPageHeader } from "@/app-support/owner/ownerHelpers/hooks/useOwnerPageHeader";

const BillingPayments = () => {
  const router = useRouter();

  const { renderHeader } = useOwnerPageHeader({
    title: "Managing Payments & Billing",
    subtitle: ` Learn how to set up payment processing, manage billing rates, and
            handle financial transactions securely.`,
    onBackPress: () => router.push("/(owner)/(tabs)/profile"),
  });

  return (
    <View style={styles.container}>
      {/* {renderHeader()} */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Managing Payments & Billing</Text>
          <Text style={styles.description}>
            Learn how to set up payment processing, manage billing rates, and
            handle financial transactions securely.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Payment Setup</Text>
            <Text style={styles.bodyText}>
              1. <Text style={styles.bold}>Paystack Payments:</Text> Clients can
              pay online by card through Paystack checkout.
            </Text>
            <Text style={styles.bodyText}>
              2. <Text style={styles.bold}>Pricing Configuration:</Text> Set
              rates per child and billing cycles.
            </Text>
            <Text style={styles.bodyText}>
              3. <Text style={styles.bold}>Payment Methods:</Text> Clients can
              use the card payment methods offered during Paystack checkout.
            </Text>
            <Text style={styles.bodyText}>
              4. <Text style={styles.bold}>Billing:</Text> Online subscription
              payments are one-time and must be renewed manually.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Rate Management</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Per Child Pricing:</Text> Set standard
              rates for transportation services.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Distance-Based Rates:</Text> Charge
              based on route distance or zones.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Special Services:</Text> Additional
              fees for special accommodations.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Discount Programs:</Text> Offer
              discounts for multiple children or long-term contracts.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 Invoice Generation</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Automatic Invoicing:</Text> Generate
              invoices at billing cycle end.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Detailed Breakdown:</Text> Itemize
              services, dates, and amounts.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Payment Tracking:</Text> Monitor
              payment status and overdue accounts.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Receipt Delivery:</Text> Send payment
              confirmations to parents.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Security & Compliance</Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>PCI Compliance:</Text> Secure payment
              processing meets industry standards.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Data Encryption:</Text> All payment
              information is encrypted and secure.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Fraud Protection:</Text> Advanced
              fraud detection and prevention.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.bold}>Financial Reporting:</Text> Generate
              reports for tax and accounting purposes.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(owner)/payments")}
          >
            <Text style={styles.buttonText}>Manage Payments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1713" },
  content: { padding: 16 },
  card: {
    backgroundColor: "#0D1713",
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
    color: "#F4FBF8",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#B1C4BC",
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 14,
    color: "#B1C4BC",
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "600",
    color: "#F4FBF8",
  },
  button: {
    backgroundColor: "#00B894",
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

export default BillingPayments;
