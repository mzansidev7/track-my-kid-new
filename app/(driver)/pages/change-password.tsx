import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverTheme } from "@/styles/theme";
import { AuthContext } from "@/context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "@/url";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import AppNotification from "@/components/Notification";

const ChangePassword = () => {
  const router = useRouter();
  const { colors } = useDriverTheme();
  const { user } = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifType, setNotifType] = useState<"success" | "error" | "warning">(
    "error",
  );

  const validate = () => {
    if (!currentPassword.trim()) return "Enter current password";
    if (!newPassword.trim()) return "Enter new password";
    if (newPassword.length < 8)
      return "New password must be at least 8 characters";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setMessage(err);
      setNotifType("error");
      setNotifVisible(true);
      return;
    }
    if (!user?.token) {
      setMessage("You are not signed in.");
      setNotifType("error");
      setNotifVisible(true);
      return;
    }

    try {
      setSaving(true);
      const baseUrl = await resolveWorkingBaseUrl();
      const resp = await fetch(`${baseUrl}/driver/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMessage(data.error || "Failed to change password");
        return;
      }

      setMessage("Password changed successfully");
      setNotifType("success");
      setNotifVisible(true);
      setTimeout(() => router.back(), 800);
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : "Failed to change password";
      setMessage(errMsg);
      setNotifType("error");
      setNotifVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <DriverHeader
          title="Change Password"
          subtitle="Update your account password"
          showBackButton
        />

        <View style={{ padding: 16 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text.primary, marginBottom: 6 }}>
              Current Password
            </Text>
            <View
              style={[
                styles.passwordInput,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry={!visiblePasswords.current}
                style={[
                  styles.passwordTextInput,
                  { color: colors.text.primary },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() =>
                  setVisiblePasswords((visible) => ({
                    ...visible,
                    current: !visible.current,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  visiblePasswords.current
                    ? "Hide current password"
                    : "Show current password"
                }
                hitSlop={8}
              >
                <MaterialIcons
                  name={visiblePasswords.current ? "visibility-off" : "visibility"}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text.primary, marginBottom: 6 }}>
              New Password
            </Text>
            <View
              style={[
                styles.passwordInput,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry={!visiblePasswords.new}
                style={[
                  styles.passwordTextInput,
                  { color: colors.text.primary },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() =>
                  setVisiblePasswords((visible) => ({
                    ...visible,
                    new: !visible.new,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  visiblePasswords.new ? "Hide new password" : "Show new password"
                }
                hitSlop={8}
              >
                <MaterialIcons
                  name={visiblePasswords.new ? "visibility-off" : "visibility"}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.text.primary, marginBottom: 6 }}>
              Confirm New Password
            </Text>
            <View
              style={[
                styles.passwordInput,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.text.secondary}
                secureTextEntry={!visiblePasswords.confirm}
                style={[
                  styles.passwordTextInput,
                  { color: colors.text.primary },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() =>
                  setVisiblePasswords((visible) => ({
                    ...visible,
                    confirm: !visible.confirm,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  visiblePasswords.confirm
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                hitSlop={8}
              >
                <MaterialIcons
                  name={
                    visiblePasswords.confirm ? "visibility-off" : "visibility"
                  }
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification component handles showing messages */}
          <AppNotification
            message={message || ""}
            type={notifType}
            visible={notifVisible}
            onHide={() => {
              setNotifVisible(false);
              setMessage(null);
            }}
          />

          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 8 }}
          >
            <TouchableOpacity
              onPress={handleSave}
              style={{ paddingVertical: 14, alignItems: "center" }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  passwordInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordTextInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
  },
});

export default ChangePassword;
