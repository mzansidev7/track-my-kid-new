import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/authContext/auth-context";
import FloatingInput from "../../components/FloatingInput";
import AppNotification from "../../components/Notification";
import { loginUser } from "../../functions/auth";
import { useTheme } from "../../styles/theme";
import { BASE_URL } from "../../url";
import { router } from "expo-router";

export default function Login({
  userType,
  setVisible,
  setSignupVisible,
  onSignUpPress,
}: any) {
  const { refreshUser } = useAuth();
  const { colors, shadows, isDark } = useTheme();

  // navigation handled by parent welcome modal props

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setNotification({
        visible: true,
        message: "Please fill in all fields",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await loginUser({ email, password });
      await refreshUser();
      setVisible(false);
      router.replace("/" as never);
    } catch (error: any) {
      // console.error("Login error:", error);
      setNotification({
        visible: true,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Login failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setNotification({
        visible: true,
        message: "Please enter your email address",
        type: "error",
      });
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setNotification({
        visible: true,
        message: data.message || "Password reset email sent successfully",
        type: "success",
      });
      setForgotPasswordModalVisible(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setNotification({
        visible: true,
        message:
          error.message || "Failed to send reset email. Please try again.",
        type: "error",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[loginStyles.container, { backgroundColor: colors.background }]}
    >
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={loginStyles.keyboardAvoiding}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={loginStyles.scrollContent}
        >
          <View style={loginStyles.topSection}>
            <View style={loginStyles.headerRow}>
              <TouchableOpacity
                style={[
                  loginStyles.backButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setVisible?.(false);
                  setSignupVisible?.(false);
                }}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>

              <Text
                style={[loginStyles.roleTitle, { color: colors.text.primary }]}
              >
                Let&apos;s get started!
              </Text>
            </View>
            {isDark ? (
              <Image
                source={require("@/assets/images/logo-dark.png")}
                style={loginStyles.logo}
              />
            ) : (
              <Image
                source={require("@/assets/images/logo-light.png")}
                style={loginStyles.logo}
              />
            )}
            <Text
              style={[loginStyles.subtitle, { color: colors.text.secondary }]}
            >
              Login to continue tracking your child.
            </Text>
          </View>

          <View
            style={[
              loginStyles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: shadows.md.shadowColor,
              },
            ]}
          >
            <FloatingInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              leftIcon={<MaterialIcons name="email" size={18} color="#64809C" />}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FloatingInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<MaterialIcons name="lock" size={18} color="#64809C" />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={18}
                    color="#64809C"
                  />
                </TouchableOpacity>
              }
            />

            <View style={loginStyles.forgotRow}>
              <TouchableOpacity
                onPress={() => setForgotPasswordModalVisible(true)}
              >
                <Text style={loginStyles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={loginStyles.primaryButton}
            >
              <LinearGradient
                colors={["#173F70", "#1683F8"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={loginStyles.primaryButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={loginStyles.primaryButtonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>

          <View style={loginStyles.bottomRow}>
            <Text
              style={[loginStyles.bottomText, { color: colors.text.secondary }]}
            >
              Don’t have an account?
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (onSignUpPress) {
                  onSignUpPress();
                  return;
                }

                setVisible(false);
                setSignupVisible(false);
              }}
            >
              <Text style={loginStyles.linkText}> Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FORGOT PASSWORD MODAL */}
      <Modal
        visible={forgotPasswordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setForgotPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setForgotPasswordModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </Text>

            <View style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  resetLoading && styles.resetButtonDisabled,
                ]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAFF",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
  },
  topSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 104,
    height: 104,
    resizeMode: "contain",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#64809C",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
    maxWidth: 300,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D8EAF9",
    shadowColor: "#174574",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 12,
  },
  forgotText: {
    color: "#1769D2",
    fontWeight: "700",
    fontSize: 10,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 2,
  },
  primaryButtonGradient: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 12,
  },
  bottomText: {
    color: "#64809C",
    fontSize: 10,
  },
  linkText: {
    color: "#1769D2",
    fontSize: 10,
    fontWeight: "700",
  },
  headerRow: {
    width: "100%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 4,
  },
  backButton: {
    position: "absolute",
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    color: "#174574",
  },
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#174574",
  },
  modalSubtitle: {
    color: "#64809C",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  modalForm: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D8E4EF",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#111827",
  },
  resetButton: {
    backgroundColor: "#173F70",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
