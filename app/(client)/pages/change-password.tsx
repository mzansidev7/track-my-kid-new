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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ClientHeader from "../components/ClientHeader";
import AppNotification from "../../../components/Notification";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const ChangePassword = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "warning"
  >("error");
  const [notificationVisible, setNotificationVisible] = useState(false);

  const showMessage = (
    nextMessage: string,
    type: "success" | "error" | "warning" = "error",
  ) => {
    setMessage(nextMessage);
    setNotificationType(type);
    setNotificationVisible(true);
  };

  const savePassword = async () => {
    if (!currentPassword) return showMessage("Enter your current password.");
    if (newPassword.length < 8) {
      return showMessage("Your new password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      return showMessage("The new passwords do not match.");
    }
    if (!user?.token) return showMessage("Your session has expired. Sign in again.");

    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/change-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage =
          data.error === "INVALID_CURRENT_PASSWORD"
            ? "Your current password is incorrect."
            : data.error === "PASSWORD_TOO_SHORT"
              ? "Your new password must be at least 8 characters."
              : data.error || "Unable to change your password.";
        throw new Error(errorMessage);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showMessage("Your password was changed successfully.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Unable to change your password.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader
        title="Change Password"
        subtitle="Keep your account secure"
        showBackButton
        style={styles.header}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.introCard}>
            <View style={styles.icon}>
              <MaterialIcons name="lock-outline" size={25} color="#C14BFF" />
            </View>
            <Text style={styles.introTitle}>Update your password</Text>
            <Text style={styles.introText}>
              Choose a unique password with at least 8 characters.
            </Text>
          </View>

          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={() => void savePassword()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save new password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppNotification
        message={message}
        type={notificationType}
        visible={notificationVisible}
        onHide={() => {
          setNotificationVisible(false);
          if (notificationType === "success") router.back();
        }}
      />
    </SafeAreaView>
  );
};

const PasswordField = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordInput}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8293A7"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          hitSlop={8}
        >
          <MaterialIcons
            name={visible ? "visibility-off" : "visibility"}
            size={20}
            color="#B9AFC4"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  flex: { flex: 1 },
  header: { marginBottom: 0 },
  content: { padding: 20, paddingBottom: 36 },
  introCard: {
    alignItems: "center",
    padding: 22,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: "#130D1A",
    borderWidth: 1,
    borderColor: "#352341",
  },
  icon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#1C1026",
  },
  introTitle: {
    marginTop: 12,
    color: "#FBF8FF",
    fontSize: 17,
    fontWeight: "800",
  },
  introText: {
    marginTop: 5,
    color: "#B9AFC4",
    fontSize: 12,
    textAlign: "center",
  },
  field: { marginBottom: 16 },
  label: {
    marginBottom: 7,
    color: "#FBF8FF",
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: "#FBF8FF",
    fontSize: 14,
  },
  passwordInput: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#352341",
    borderRadius: 12,
    backgroundColor: "#130D1A",
  },
  saveButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#9B2BE7",
  },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});

export default ChangePassword;
