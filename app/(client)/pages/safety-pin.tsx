import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppNotification from "../../../components/Notification";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const SafetyPin = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    message: "",
    type: "success" as "success" | "error" | "warning",
    visible: false,
  });

  const showNotification = (
    message: string,
    type: "success" | "error" | "warning",
  ) => setNotification({ message, type, visible: true });

  const savePin = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      showNotification("PIN must contain 4 to 6 digits.", "warning");
      return;
    }
    if (pin !== confirmation) {
      showNotification("PIN confirmation does not match.", "warning");
      return;
    }
    if (!user?.token) {
      showNotification(
        "Your session has expired. Please log in again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/safety-pin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ pin, confirmation }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update Safety PIN.");

      showNotification("Safety PIN updated successfully.", "success");
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Unable to update Safety PIN.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={23} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Safety PIN</Text>
            <Text style={styles.subtitle}>Secure child handovers</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            <MaterialIcons name="verified-user" size={34} color="#16A34A" />
          </View>
          <Text style={styles.heading}>Set your handover PIN</Text>
          <Text style={styles.description}>
            Use this PIN when confirming an authorized child pickup or drop-off.
          </Text>

          <Text style={styles.label}>New PIN</Text>
          <TextInput
            value={pin}
            onChangeText={(value) =>
              setPin(value.replace(/\D/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={styles.input}
            placeholder="4 to 6 digits"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Confirm PIN</Text>
          <TextInput
            value={confirmation}
            onChangeText={(value) =>
              setConfirmation(value.replace(/\D/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={styles.input}
            placeholder="Enter PIN again"
            placeholderTextColor="#94A3B8"
          />

          <TouchableOpacity
            disabled={saving}
            onPress={savePin}
            style={[styles.saveButton, saving && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save PIN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>How the Safety PIN works</Text>
            <Text style={styles.flowDescription}>
              Create a private 4 to 6 digit PIN and keep it known only to you
              and the person you authorize to collect your child.
            </Text>
            <Text style={styles.flowStep}>
              1. Share the PIN only with the approved driver, guardian, or
              school representative before pickup.
            </Text>
            <Text style={styles.flowStep}>
              2. At pickup or drop-off, the authorized person provides the PIN
              to confirm that they are allowed to hand over your child.
            </Text>
            <Text style={styles.flowStep}>
              3. The PIN helps verify the handover and adds an extra layer of
              protection for your child.
            </Text>
            <Text style={styles.flowWarning}>
              Never share your PIN publicly or with an unapproved person. Change
              it immediately if you believe it has been exposed.
            </Text>
          </View>
        </ScrollView>

        <AppNotification
          message={notification.message}
          type={notification.type}
          visible={notification.visible}
          onHide={() => {
            const success = notification.type === "success";
            setNotification((current) => ({ ...current, visible: false }));
            if (success) router.back();
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SafetyPin;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 3 },
  content: { padding: 24 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#E8F8EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heading: { color: "#0F172A", fontSize: 22, fontWeight: "800" },
  description: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 26,
  },
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 14,
    fontSize: 18,
    letterSpacing: 4,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  disabled: { opacity: 0.65 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  flowCard: {
    backgroundColor: "#E8F8EF",
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  flowTitle: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  flowDescription: {
    color: "#365314",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  flowStep: {
    color: "#365314",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  flowWarning: {
    color: "#166534",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 12,
  },
});
