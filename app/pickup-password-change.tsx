import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../context/authContext/auth-context";
import { updateUser } from "../store/asyncStorage/authStore";
import { resolveWorkingBaseUrl } from "../url";

export default function PickupPasswordChangePage() {
  const router = useRouter();
  const { user, refreshUser } = useContext(AuthContext);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const changePassword = async () => {
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Enter the same password twice.");
      return;
    }
    if (!user?.token) {
      Alert.alert("Sign in required", "Please sign in with your temporary password again.");
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/pickup-contact/change-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        throw new Error(
          data.error === "NEW_PASSWORD_MUST_BE_DIFFERENT"
            ? "Choose a password different from the temporary password."
            : data.error || "Unable to update your password.",
        );
      }

      await updateUser({ must_change_password: false });
      await refreshUser();
      router.replace("/pickup-contact" as never);
    } catch (error) {
      Alert.alert(
        "Password not updated",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.icon}>
          <MaterialIcons name="lock-reset" size={34} color="#C14BFF" />
        </View>
        <Text style={styles.title}>Create your password</Text>
        <Text style={styles.description}>
          Your email password was temporary. Set a new password before viewing
          your pickup authorizations.
        </Text>
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="#8B8195"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
          placeholderTextColor="#8B8195"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          disabled={submitting}
          onPress={() => void changePassword()}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>Save new password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#100B16" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#251631",
    marginBottom: 18,
  },
  title: {
    color: "#FBF8FF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: "#C9BDCF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  label: { color: "#D7C5E6", fontSize: 12, fontWeight: "700", marginTop: 14 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#44354E",
    backgroundColor: "#1A1222",
    borderRadius: 10,
    padding: 13,
    color: "#FBF8FF",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#9B2BE7",
    marginTop: 20,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
});
