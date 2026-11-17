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

export default function TemporaryPasswordChangePage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useContext(AuthContext);
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
      Alert.alert(
        "Sign in required",
        "Please sign in with your temporary password again.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/account/change-temporary-password`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        },
      );
      const data = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          NEW_PASSWORD_MUST_BE_DIFFERENT:
            "Choose a password different from your temporary password.",
          PASSWORD_TOO_LONG:
            "Use a password of no more than 72 bytes. Try a shorter password.",
        };
        throw new Error(
          messages[data.error] || data.error || "Unable to update your password.",
        );
      }

      await updateUser({ must_change_password: false });
      await refreshUser();
      router.replace("/" as never);
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
        <Text style={styles.title}>Create a new password</Text>
        <Text style={styles.description}>
          Your administrator provided a temporary password. Replace it now to
          continue using your account.
        </Text>
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="#8B8195"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
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
          autoComplete="new-password"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          disabled={submitting}
          onPress={() => void changePassword()}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>Save new password</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={submitting}
          onPress={() => void logout()}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sign out</Text>
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
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#1C1026",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: "#FBF8FF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: "#B9AFC4",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
  },
  label: {
    color: "#FBF8FF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1C1026",
    color: "#FBF8FF",
    borderColor: "#352341",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: "#C14BFF",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: { opacity: 0.65 },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  logoutButton: { alignItems: "center", padding: 16, marginTop: 8 },
  logoutText: { color: "#B9AFC4", fontSize: 14, fontWeight: "700" },
});
